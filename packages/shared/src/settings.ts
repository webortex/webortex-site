/**
 * Platform configuration.
 *
 * Every commercial and operational rule an administrator may reasonably change
 * lives here as a schema-validated document in Firestore, not in code. The
 * `DEFAULT_PLATFORM_SETTINGS` below is only the seed written on first run; the
 * API tier reads the live document and merges it over the defaults so a new
 * setting can be introduced without a redeploy.
 */

import { z } from "zod";

export const MINUTES = 60_000;

export const vehicleTypeSchema = z.enum([
  "AUTO",
  "CAB",
  "TAXI",
  "TOURIST",
  "BUS",
  "EV",
  "OTHER",
]);

export const creativeFormatSchema = z.enum(["IMAGE", "VIDEO", "GIF"]);

export const pricingModelSchema = z.enum([
  "FIXED_PACKAGE",
  "CPM",
  "CPC",
  "CPL",
  "CPA",
  "CUSTOM",
]);

export const campaignObjectiveSchema = z.enum([
  "AWARENESS",
  "REACH",
  "ENGAGEMENT",
  "LEAD_GENERATION",
  "STORE_VISIT",
  "CONVERSION",
  "PROMOTION",
]);

export const creativeConstraintsSchema = z.object({
  allowedFormats: z.array(creativeFormatSchema).min(1).default(["IMAGE", "VIDEO"]),
  maxFileSizeBytes: z.number().int().positive().max(2 * 1024 * 1024 * 1024).default(100 * 1024 * 1024),
  /** Landscape 16:9 is the native screen format. */
  preferredAspectRatio: z.string().default("16:9"),
  acceptedAspectRatios: z.array(z.string()).min(1).default(["16:9", "9:16", "1:1", "4:3"]),
  minWidthPx: z.number().int().positive().default(640),
  minHeightPx: z.number().int().positive().default(360),
  maxDurationSeconds: z.number().int().positive().default(30),
  minDurationSeconds: z.number().int().positive().default(3),
  maxCreativesPerCampaign: z.number().int().positive().default(20),
});

export const heartbeatSettingsSchema = z.object({
  /** Below this many ms since last beat the device is surfaced as degraded. */
  warningAfterMs: z.number().int().positive().default(5 * MINUTES),
  /** At or above this the device is treated as offline. */
  offlineAfterMs: z.number().int().positive().default(15 * MINUTES),
  /** Device-side cadence the player is expected to follow. */
  expectedIntervalMs: z.number().int().positive().default(60_000),
  /** Grace period before a stale device is reported as "never seen". */
  neverSeenAfterMs: z.number().int().positive().default(24 * 60 * MINUTES),
});

export const revenueSettingsSchema = z
  .object({
    /** Fixed monthly guarantee per active vehicle. */
    baseVehiclePayoutMinor: z.number().int().min(0).default(70_000),
    /** Share of an attributed conversion value that goes to the earning driver. */
    engagementShare: z.number().min(0).max(1).default(0.1),
    conversionShare: z.number().min(0).max(1).default(0.15),
    platformShare: z.number().min(0).max(1).default(0.6),
    operationsReserve: z.number().min(0).max(1).default(0.15),
    /** Payout cadence in days since period end. */
    payoutDelayDays: z.number().int().min(0).default(7),
    minimumPayoutMinor: z.number().int().min(0).default(50_000),
    taxPercent: z.number().min(0).max(100).default(18),
    taxLabel: z.string().default("GST"),
  })
  /**
   * The platform share and the operations reserve are carved out of the same
   * pool, so together they cannot exceed 1. Each field being individually valid
   * is not enough: `platformShare: 0.8` with `operationsReserve: 0.5` is
   * 1.3, which would drive the driver pool negative and make every settlement
   * disagree with the ledger. `engagementShare` and `conversionShare` are
   * sub-shares of what is left, so they are bounded by 1 on their own.
   */
  .refine((value) => value.platformShare + value.operationsReserve <= 1, {
    message: "platformShare + operationsReserve cannot exceed 1; the remainder is the driver pool.",
    path: ["operationsReserve"],
  });

export const campaignSettingsSchema = z.object({
  minimumBudgetMinor: z.number().int().positive().default(50_000),
  maximumBudgetMinor: z.number().int().positive().default(50_000_000),
  minimumDurationDays: z.number().int().positive().default(1),
  maximumDurationDays: z.number().int().positive().default(365),
  /** Lead time required between approval and the earliest start date. */
  minimumLeadTimeHours: z.number().int().min(0).default(24),
  defaultDailyBudgetMinor: z.number().int().positive().default(25_000),
  allowAdvertiserSelfPause: z.boolean().default(true),
});

export const inventorySettingsSchema = z.object({
  /** Share of each screen's hourly slots that any single advertiser may occupy. */
  defaultAdvertiserShareCap: z.number().min(0.05).max(1).default(0.4),
  /** Percentage of slots reserved for house/promotional content. */
  houseContentShare: z.number().min(0).max(0.9).default(0.05),
  /** Slot length in seconds used by the capacity planner. */
  slotDurationSeconds: z.number().int().positive().default(30),
  /**
   * Hours a screen is powered on and selling inventory per day. This drives the
   * capacity planner and the per-play rate of flat-price campaigns, so a taxi
   * running two shifts is not billed as if it ran around the clock.
   */
  operatingHoursPerDay: z.number().min(1).max(24).default(18),
  /** Refuse a booking that would leave a screen below this many free slots/day. */
  minFreeSlotsPerDay: z.number().int().min(0).default(10),
});

/** Ad slots one screen can realistically sell in a day, after house content. */
export function sellableSlotsPerDay(inventory: {
  slotDurationSeconds: number;
  operatingHoursPerDay: number;
  houseContentShare: number;
}): number {
  const capacity = Math.floor((inventory.operatingHoursPerDay * 3_600) / inventory.slotDurationSeconds);
  return Math.max(1, Math.floor(capacity * (1 - inventory.houseContentShare)));
}

export const defaultFrequencyCapsSchema = z.object({
  maxPlaysPerHour: z.number().int().positive().default(60),
  maxPlaysPerDay: z.number().int().positive().default(600),
  /** Minimum wall-clock gap in seconds between two plays of the same campaign. */
  minimumGapSeconds: z.number().int().min(0).default(60),
  maxInventoryShare: z.number().min(0.01).max(1).default(0.4),
});

export const moderationSettingsSchema = z.object({
  /**
   * Rejection reasons offered in the review UI, plus the free-text path.
   *
   * The default is a bare marker rather than the full reason list: the canonical
   * list lives in `DEFAULT_REJECTION_REASONS` below, which is declared *after*
   * this schema, so referencing it here would be a temporal-dead-zone error at
   * module load. Seeding writes the full list explicitly.
   */
  rejectionReasons: z
    .array(
      z.object({
        code: z.string().min(1),
        label: z.string().min(1),
        detail: z.string().default(""),
      }),
    )
    .min(1)
    .default([{ code: "POLICY_VIOLATION", label: "Policy violation", detail: "" }]),
  /** When true a submission is auto-queued for review instead of auto-approved. */
  requireManualReview: z.boolean().default(true),
  autoRejectWhenBudgetBelowMinimum: z.boolean().default(true),
});

export const retentionSettingsSchema = z.object({
  /** Raw playback events are rolled up then pruned; the rollup keeps daily metrics. */
  rawEventRetentionDays: z.number().int().positive().default(180),
  engagementRetentionDays: z.number().int().positive().default(730),
  conversionRetentionDays: z.number().int().positive().default(2555),
  auditRetentionDays: z.number().int().positive().default(2555),
  /**
   * GPS precision. Coordinates below this accuracy are dropped rather than stored,
   * which is the main privacy control for passenger-facing inventory.
   */
  minGpsAccuracyMeters: z.number().min(0).default(50),
  storePreciseGps: z.boolean().default(false),
});

export const notificationSettingsSchema = z.object({
  channels: z
    .array(z.enum(["EMAIL", "SMS", "WHATSAPP", "IN_APP"]))
    .min(1)
    // `IN_APP` only by default: a freshly seeded platform must not start
    // sending email or SMS to real addresses before anyone has opted in.
    .default(["IN_APP"]),
  quietHoursLocal: z
    .object({ startHour: z.number().int().min(0).max(23), endHour: z.number().int().min(0).max(23) })
    .default({ startHour: 22, endHour: 7 }),
  deviceOfflineAlertEnabled: z.boolean().default(true),
  documentExpiryWarningDays: z.number().int().min(1).default(30),
});

export const platformSettingsSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  updatedAt: z.string().default(""),
  updatedBy: z.string().default(""),
  currency: z.string().default("INR"),
  locale: z.string().default("en-IN"),
  timezone: z.string().default("Asia/Kolkata"),
  gstinRequired: z.boolean().default(false),
  supportedVehicleTypes: z.array(vehicleTypeSchema).min(1).default(["AUTO", "CAB", "TAXI", "TOURIST", "BUS", "EV", "OTHER"]),
  // Every section is defaulted. `DEFAULT_PLATFORM_SETTINGS` parses an almost
  // empty object, so a section without a default would throw at module load —
  // and because it is a module-level constant, that would crash every cold start
  // that imports the shared barrel rather than failing where the omission is.
  creative: creativeConstraintsSchema.default({}),
  heartbeat: heartbeatSettingsSchema.default({}),
  revenue: revenueSettingsSchema.default({}),
  campaigns: campaignSettingsSchema.default({}),
  inventory: inventorySettingsSchema.default({}),
  frequency: defaultFrequencyCapsSchema.default({}),
  moderation: moderationSettingsSchema.default({}),
  retention: retentionSettingsSchema.default({}),
  notifications: notificationSettingsSchema.default({}),
  /** Share-of-inventory ceiling that stops one advertiser monopolising the network. */
  maxAdvertiserInventoryShare: z.number().min(0.05).max(1).default(0.4),
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
export type CreativeConstraints = z.infer<typeof creativeConstraintsSchema>;
export type HeartbeatSettings = z.infer<typeof heartbeatSettingsSchema>;
export type RevenueSettings = z.infer<typeof revenueSettingsSchema>;
export type CampaignSettings = z.infer<typeof campaignSettingsSchema>;
export type InventorySettings = z.infer<typeof inventorySettingsSchema>;
export type FrequencyCaps = z.infer<typeof defaultFrequencyCapsSchema>;
export type ModerationSettings = z.infer<typeof moderationSettingsSchema>;
export type RetentionSettings = z.infer<typeof retentionSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type CreativeFormat = z.infer<typeof creativeFormatSchema>;
export type PricingModel = z.infer<typeof pricingModelSchema>;
export type CampaignObjective = z.infer<typeof campaignObjectiveSchema>;

export const DEFAULT_REJECTION_REASONS: ModerationSettings["rejectionReasons"] = [
  { code: "INVALID_DIMENSIONS", label: "Incorrect dimensions", detail: "Creative does not match an accepted aspect ratio or minimum resolution." },
  { code: "PROHIBITED_CONTENT", label: "Prohibited content", detail: "Creative falls under a prohibited category." },
  { code: "MISLEADING_CLAIM", label: "Misleading claim", detail: "Creative contains a claim that cannot be substantiated." },
  { code: "INVALID_DESTINATION", label: "Invalid destination", detail: "Destination URL, QR target or phone number is unreachable or malformed." },
  { code: "MISSING_INFORMATION", label: "Missing information", detail: "Required disclosures or advertiser details are absent." },
  { code: "POLICY_VIOLATION", label: "Policy violation", detail: "Creative breaches an accepted platform policy." },
  { code: "TECHNICAL_ISSUE", label: "Technical issue", detail: "File is corrupt, unplayable, or exceeds the configured limits." },
];

/**
 * Parsed shape of the live settings document. Invalid or partial documents fall
 * back to defaults per-field rather than failing the whole request.
 */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = platformSettingsSchema.parse({
  updatedAt: "",
  updatedBy: "system:seed",
  moderation: { rejectionReasons: DEFAULT_REJECTION_REASONS },
});

/**
 * Merge a stored document over the defaults.
 * Invalid stored values are discarded field-by-field so a bad write cannot take
 * the platform down.
 */
export function mergePlatformSettings(stored: unknown): PlatformSettings {
  const candidate = { ...DEFAULT_PLATFORM_SETTINGS, ...(stored as object | null ?? {}) } as Record<string, unknown>;
  const result: Record<string, unknown> = { ...candidate };
  for (const key of Object.keys(DEFAULT_PLATFORM_SETTINGS)) {
    const fallback = DEFAULT_PLATFORM_SETTINGS[key as keyof PlatformSettings];
    const value = candidate[key];
    if (value === undefined) continue;
    const parsed = safeParseField(key, value);
    result[key] = parsed ?? fallback;
  }
  return platformSettingsSchema.parse(result);
}

function safeParseField(key: string, value: unknown): unknown {
  try {
    switch (key) {
      case "creative":
        return creativeConstraintsSchema.parse(value);
      case "heartbeat":
        return heartbeatSettingsSchema.parse(value);
      case "revenue":
        return revenueSettingsSchema.parse(value);
      case "campaigns":
        return campaignSettingsSchema.parse(value);
      case "inventory":
        return inventorySettingsSchema.parse(value);
      case "frequency":
        return defaultFrequencyCapsSchema.parse(value);
      case "moderation":
        return moderationSettingsSchema.parse(value);
      case "retention":
        return retentionSettingsSchema.parse(value);
      case "notifications":
        return notificationSettingsSchema.parse(value);
      default:
        return value;
    }
  } catch {
    return undefined;
  }
}

/** Sanity check used by the settings screen so an admin cannot save a broken mix. */
export function validateRevenueSplit(settings: RevenueSettings): string[] {
  const problems: string[] = [];
  const total = settings.platformShare + settings.operationsReserve;
  if (Math.abs(total - 1) > 0.0001) {
    problems.push(`platformShare + operationsReserve must equal 1 (currently ${total.toFixed(4)}).`);
  }
  if (settings.engagementShare > settings.conversionShare) {
    problems.push("engagementShare should not exceed conversionShare.");
  }
  return problems;
}