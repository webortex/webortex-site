import { z } from "zod";
import { coordinatesSchema, entityId, isoDateTime, type EntityId } from "./common";

/**
 * Event ingestion.
 *
 * Design rules:
 *  - Events are append-only and idempotent. The device supplies `eventId`, which
 *    is the de-duplication key, so an offline player that reconnects and replays
 *    its queue never double-counts.
 *  - Events carry identifiers only. No passenger data, no device fingerprint, no
 *    advertising identifier. GPS is optional and coarsened per retention settings.
 */

export const playbackEventSchema = z.object({
  eventId: entityId,
  deviceId: entityId,
  screenId: entityId.nullable().default(null),
  vehicleId: entityId.nullable().default(null),
  campaignId: entityId,
  creativeId: entityId,
  /** Device clock. The server records its own `receivedAt` as the source of truth. */
  timestamp: isoDateTime,
  durationPlayedSeconds: z.number().int().min(0).max(3600),
  completed: z.boolean().default(false),
  /** Fraction actually played 0..1; more reliable than a boolean for partial plays. */
  completionRatio: z.number().min(0).max(1).nullable().default(null),
  slotIndex: z.number().int().min(0).nullable().default(null),
  playbackStartedOffline: z.boolean().default(false),
  gps: coordinatesSchema.nullable().default(null),
});

export type PlaybackEvent = z.infer<typeof playbackEventSchema>;

export const playbackBatchSchema = z.object({
  events: z.array(playbackEventSchema).min(1).max(500),
});

export const engagementEventSchema = z.object({
  eventId: entityId,
  type: z.enum([
    "QR_SCAN",
    "NFC_TAP",
    "LANDING_PAGE_VIEW",
    "WHATSAPP_CLICK",
    "PHONE_CLICK",
    "COUPON_CLAIM",
    "LEAD_SUBMIT",
    "STORE_VISIT_REDEEM",
  ]),
  campaignId: entityId,
  creativeId: entityId,
  screenId: entityId.nullable().default(null),
  deviceId: entityId.nullable().default(null),
  vehicleId: entityId.nullable().default(null),
  zoneId: entityId.nullable().default(null),
  timestamp: isoDateTime,
  /**
   * Short-lived, single-purpose token minted by the player. Resolved server-side
   * to the campaign/creative/zone rather than trusting anything in the URL.
   */
  token: z.string().min(8).max(256).optional(),
  couponCode: z.string().trim().max(40).optional(),
  gps: coordinatesSchema.nullable().default(null),
  /**
   * Free-form but bounded: an object of short string values, capped both per value
   * and by key count. Zod records have no `.max`, so the key budget is enforced
   * with a refine rather than silently allowing unbounded metadata onto an
   * append-only collection.
   */
  metadata: z
    .record(z.string().max(120))
    .default({})
    .refine((record) => Object.keys(record).length <= 20, {
      message: "metadata may contain at most 20 keys",
    }),
});

export type EngagementEvent = z.infer<typeof engagementEventSchema>;

export const engagementBatchSchema = z.object({
  events: z.array(engagementEventSchema).min(1).max(500),
});

export const conversionSchema = z.object({
  id: entityId,
  campaignId: entityId,
  advertiserId: entityId,
  creativeId: entityId.nullable().default(null),
  source: z.enum([
    "LANDING_PAGE",
    "WHATSAPP",
    "PHONE",
    "COUPON",
    "POS",
    "CRM",
    "MANUAL",
    "API",
  ]),
  type: z.enum(["LEAD", "COUPON_REDEMPTION", "PURCHASE", "STORE_VISIT"]),
  valueMinor: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default("INR"),
  occurredAt: isoDateTime,
  /** Set when the conversion is confirmed by a trusted server-side source. */
  verified: z.boolean().default(false),
  verificationSource: z.string().max(60).nullable().default(null),
  externalReference: z.string().max(120).nullable().default(null),
  attributionZoneId: entityId.nullable().default(null),
  createdAt: isoDateTime,
});

export type Conversion = z.infer<typeof conversionSchema>;

export const conversionCreateSchema = z.object({
  campaignId: entityId,
  creativeId: entityId.optional(),
  source: conversionSchema.shape.source,
  type: conversionSchema.shape.type,
  valueMinor: z.number().int().nonnegative().default(0),
  currency: z.string().length(3).default("INR"),
  occurredAt: isoDateTime.optional(),
  externalReference: z.string().max(120).optional(),
  verified: z.boolean().default(false),
  verificationSource: z.string().max(60).optional(),
});

/**
 * How much a conversion API key is trusted to assert that a conversion really
 * happened.
 *
 * `UNTRUSTED` is the default and the only value a new key can get. A key proves
 * *who is reporting*, never *that it is true*, so an untrusted key may not mark
 * its own rows `verified`. `VERIFIED_FEED` is granted only where the key is
 * issued to an integration the platform has actually checked — a payment gateway
 * webhook relay, say — and is what allows a row to count toward payouts.
 */
export const conversionKeyTrustSchema = z.enum(["UNTRUSTED", "VERIFIED_FEED"]);

export type ConversionKeyTrust = z.infer<typeof conversionKeyTrustSchema>;

export const conversionApiIngestSchema = z.object({
  /**
   * The API key is NOT part of this body.
   *
   * It travels in the `X-Conversion-Api-Key` request header. A secret in a JSON
   * body is the first thing captured by request logs and error reporters, so the
   * shape of this schema is deliberate about the field being absent.
   */
  conversions: z.array(conversionCreateSchema).min(1).max(200),
});

/** Response returned to a device after a batch. */
export const ingestResultSchema = z.object({
  accepted: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  rejected: z
    .array(z.object({ eventId: entityId, reason: z.string().max(200) }))
    .max(500),
  /**
   * Rows that were accepted but stored as unverified because the presenting key
   * is not trusted to assert verification.
   *
   * Reported separately rather than folded into `rejected`: the conversion was
   * ingested successfully and will still be attributed, it just will not count
   * toward payouts until it is confirmed. Silently dropping the `verified` flag
   * would leave an integrator debugging missing payouts with no signal.
   */
  verificationDowngraded: z.number().int().nonnegative().optional(),
  serverTime: isoDateTime,
});

export type IngestResult = z.infer<typeof ingestResultSchema>;

// ---------------------------------------------------------------- analytics

export const analyticsRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Pre-aggregated buckets are hourly below this span and daily above it. */
    granularity: z.enum(["HOURLY", "DAILY"]).optional(),
  })
  .refine((range) => range.from <= range.to, { message: "from must be on or before to" })
  .refine((range) => {
    const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000;
    return days <= 730;
  }, { message: "Range may not exceed 730 days" });

export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;

export interface MetricSeriesPoint {
  /** ISO date for DAILY, ISO hour for HOURLY. */
  readonly bucket: string;
  readonly plays: number;
  readonly completedPlays: number;
  readonly impressions: number;
  readonly engagements: number;
  readonly leads: number;
  readonly conversions: number;
  readonly spendMinor: number;
  readonly attributedRevenueMinor: number;
}

export interface CampaignMetrics {
  readonly campaignId: EntityId;
  readonly campaignName: string;
  readonly status: string;
  readonly plays: number;
  readonly completedPlays: number;
  readonly impressions: number;
  readonly engagements: number;
  readonly leads: number;
  readonly conversions: number;
  readonly spendMinor: number;
  readonly attributedRevenueMinor: number;
  readonly completionRate: number | null;
  readonly engagementRate: number | null;
  readonly conversionRate: number | null;
  readonly leadConversionRate: number | null;
  readonly costPerLeadMinor: number | null;
  readonly costPerConversionMinor: number | null;
  readonly roiPercent: number | null;
}

export interface BreakdownRow {
  readonly key: string;
  readonly label: string;
  readonly plays: number;
  readonly impressions: number;
  readonly engagements: number;
  readonly leads: number;
  readonly conversions: number;
  readonly spendMinor: number;
}

export interface VehicleMetrics extends BreakdownRow {
  readonly vehicleId: EntityId;
  readonly uptimeRate: number | null;
  readonly onlineSeconds: number;
  readonly scheduledSeconds: number;
}

export interface ScreenMetrics extends BreakdownRow {
  readonly screenId: EntityId;
  readonly status: string;
  readonly uptimeRate: number | null;
  readonly onlineSeconds: number;
  readonly errorCount: number;
  readonly currentCampaignId: EntityId | null;
}

export interface PlatformMetrics {
  readonly totalAdvertisers: number;
  readonly activeAdvertisers: number;
  readonly totalCampaigns: number;
  readonly activeCampaigns: number;
  readonly totalScreens: number;
  readonly onlineScreens: number;
  readonly offlineScreens: number;
  readonly degradedScreens: number;
  readonly unassignedScreens: number;
  readonly totalVehicles: number;
  readonly activeVehicles: number;
  readonly totalDrivers: number;
  readonly totalPlays: number;
  readonly totalImpressions: number;
  readonly totalEngagements: number;
  readonly totalLeads: number;
  readonly totalConversions: number;
  readonly grossRevenueMinor: number;
  readonly platformRevenueMinor: number;
  readonly outstandingMinor: number;
  readonly pendingPayoutsMinor: number;
  readonly engagementRate: number | null;
  readonly conversionRate: number | null;
}

export interface AnalyticsEnvelope<T> {
  readonly range: { readonly from: string; readonly to: string; readonly granularity: "HOURLY" | "DAILY" };
  readonly totals: T;
  readonly series: readonly MetricSeriesPoint[];
  readonly breakdowns: {
    readonly byLocation: readonly BreakdownRow[];
    readonly byVehicle: readonly BreakdownRow[];
    readonly byCreative: readonly BreakdownRow[];
    readonly byTimeOfDay: readonly BreakdownRow[];
    readonly byDayOfWeek: readonly BreakdownRow[];
    readonly byZone: readonly BreakdownRow[];
  };
  readonly generatedAt: string;
  /** True when the figures come from the seed/demo provider. Never show them as real. */
  readonly isDemoData: boolean;
}