import { z } from "zod";
import { ROLES } from "../roles";
import {
  campaignObjectiveSchema,
  creativeFormatSchema,
  pricingModelSchema,
  vehicleTypeSchema,
} from "../settings";
import { DAY_OF_WEEK_ORDER } from "../targeting";
import {
  coordinatesSchema,
  emailAddress,
  entityId,
  geoPointSchema,
  gstin,
  httpUrl,
  isoDate,
  isoDateTime,
  latitude,
  longitude,
  phoneDestination,
  phoneNumber,
  whatsappDestination,
} from "./common";

const addressSchema = z.object({
  line1: z.string().trim().max(200).default(""),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(80).default(""),
  postalCode: z.string().trim().max(20).default(""),
  country: z.string().trim().max(80).default("India"),
});

export const userStatusSchema = z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "DEACTIVATED"]);

// ---------------------------------------------------------------- users

export const userSchema = z.object({
  id: entityId,
  uid: z.string().min(1),
  roles: z.array(z.enum(ROLES)).min(1),
  status: userStatusSchema,
  fullName: z.string().trim().min(2).max(120),
  email: emailAddress,
  phone: phoneNumber,
  avatarUrl: z.string().max(2048).nullable().default(null),
  phoneVerified: z.boolean().default(false),
  emailVerified: z.boolean().default(false),
  locale: z.string().default("en-IN"),
  theme: z.enum(["dark", "light"]).default("dark"),
  lastLoginAt: isoDateTime.nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type User = z.infer<typeof userSchema>;

export const notificationPreferenceSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  whatsapp: z.boolean().default(false),
  inApp: z.boolean().default(true),
  campaignStatusChanges: z.boolean().default(true),
  paymentAlerts: z.boolean().default(true),
  deviceAlerts: z.boolean().default(false),
  marketing: z.boolean().default(false),
});

export type NotificationPreferences = z.infer<typeof notificationPreferenceSchema>;

export const userProfileUpdateSchema = userSchema
  .pick({ fullName: true, phone: true, avatarUrl: true, locale: true, theme: true })
  .partial()
  .extend({
    notificationPreferences: notificationPreferenceSchema.optional(),
  });

// ---------------------------------------------------------------- documents

export const documentStatusSchema = z.enum([
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const documentSchema = z.object({
  id: entityId,
  kind: z.enum([
    "GST_CERTIFICATE",
    "BUSINESS_LICENCE",
    "VISITING_CARD",
    "DRIVING_LICENCE",
    "VEHICLE_REGISTRATION",
    "INSURANCE",
    "PERMIT",
    "POLLUTION_CERTIFICATE",
    "FITNESS_CERTIFICATE",
    "BANK_PROOF",
    "OTHER",
  ]),
  fileUrl: z.string().max(2048),
  storagePath: z.string().max(512),
  mimeType: z.string().max(120),
  sizeBytes: z.number().int().nonnegative(),
  status: documentStatusSchema.default("PENDING"),
  number: z.string().trim().max(64).default(""),
  issuedOn: isoDate.optional(),
  expiresOn: isoDate.optional(),
  reviewedBy: entityId.nullable().default(null),
  reviewedAt: isoDateTime.nullable().default(null),
  rejectionReason: z.string().max(1000).nullable().default(null),
  uploadedBy: entityId,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type DocumentRecord = z.infer<typeof documentSchema>;

// ---------------------------------------------------------------- organisations

export const organizationSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  ownerUserId: entityId,
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(160).optional(),
  businessType: z.string().trim().max(80),
  gstin: gstin,
  address: addressSchema,
  website: httpUrl.optional().or(z.literal("")),
  whatsappNumber: phoneNumber.optional().or(z.literal("")),
  phone: phoneNumber,
  description: z.string().trim().max(2000).default(""),
  status: z.enum(["PENDING_REVIEW", "APPROVED", "SUSPENDED", "REJECTED"]).default("PENDING_REVIEW"),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Organization = z.infer<typeof organizationSchema>;

export const advertiserVerificationSchema = z.object({
  status: z.enum([
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "NEEDS_MORE_INFORMATION",
    "SUSPENDED",
  ]),
  reviewedBy: entityId.nullable().default(null),
  reviewedAt: isoDateTime.nullable().default(null),
  reasonCode: z.string().max(64).nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
  documents: z.array(documentSchema).default([]),
});

export const billingProfileSchema = z.object({
  billingName: z.string().trim().max(160).default(""),
  billingAddress: addressSchema.optional(),
  taxNumber: z.string().trim().max(40).default(""),
  paymentTermsDays: z.number().int().min(0).max(180).default(15),
  creditLimitMinor: z.number().int().nonnegative().default(0),
});

export const advertiserSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  organizationId: entityId,
  primaryUserId: entityId,
  displayName: z.string().trim().min(2).max(160),
  businessCategory: z.string().trim().max(80),
  preferredAdCategories: z.array(z.string().max(60)).max(20).default([]),
  billingProfile: billingProfileSchema,
  verification: advertiserVerificationSchema,
  /** Convenience denormalised wallet balance, recomputed from the ledger on read. */
  walletBalanceMinor: z.number().int().default(0),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Advertiser = z.infer<typeof advertiserSchema>;

// ---------------------------------------------------------------- drivers

export const payoutProfileSchema = z.object({
  method: z.enum(["BANK", "UPI", "WALLET"]).default("UPI"),
  accountHolderName: z.string().trim().max(120).default(""),
  upiId: z.string().trim().max(120).optional(),
  bankName: z.string().trim().max(120).optional(),
  bankAccountNumber: z.string().trim().max(40).optional(),
  ifsc: z.string().trim().max(20).optional(),
  taxPan: z.string().trim().max(20).optional(),
  verified: z.boolean().default(false),
});

export const driverSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  userId: entityId,
  fullName: z.string().trim().min(2).max(120),
  phone: phoneNumber,
  email: emailAddress.optional().or(z.literal("")),
  photoUrl: z.string().max(2048).nullable().default(null),
  cityId: entityId.nullable().default(null),
  preferredZoneIds: z.array(entityId).max(100).default([]),
  licenceNumber: z.string().trim().max(40).default(""),
  licenceExpiresOn: isoDate.optional(),
  status: z
    .enum(["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION", "SUSPENDED"])
    .default("PENDING"),
  payoutProfile: payoutProfileSchema,
  documents: z.array(documentSchema).default([]),
  agreementAcceptedAt: isoDateTime.nullable().default(null),
  reviewedBy: entityId.nullable().default(null),
  reviewedAt: isoDateTime.nullable().default(null),
  rejectionReason: z.string().max(1000).nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Driver = z.infer<typeof driverSchema>;

// ---------------------------------------------------------------- vehicles

export const vehicleSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  ownerUserId: entityId.nullable().default(null),
  ownerDriverId: entityId.nullable().default(null),
  driverId: entityId.nullable().default(null),
  type: vehicleTypeSchema,
  groupId: entityId.nullable().default(null),
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{5,15}$/, { message: "Enter a valid vehicle registration number" }),
  make: z.string().trim().max(60).default(""),
  model: z.string().trim().max(60).default(""),
  year: z.number().int().min(1980).max(2100).nullable().default(null),
  colour: z.string().trim().max(30).default(""),
  cityId: entityId.nullable().default(null),
  homeZoneId: entityId.nullable().default(null),
  status: z
    .enum(["PENDING", "VERIFIED", "ACTIVE", "MAINTENANCE", "SUSPENDED", "RETIRED"])
    .default("PENDING"),
  installedOn: isoDate.optional(),
  retiredOn: isoDate.optional(),
  documents: z.array(documentSchema).default([]),
  /** Coarsened position from the last heartbeat; see `coarsenLocation` in the API tier. */
  lastKnownLocation: coordinatesSchema.nullable().default(null),
  lastActiveAt: isoDateTime.nullable().default(null),
  notes: z.string().max(2000).default(""),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Vehicle = z.infer<typeof vehicleSchema>;

// ---------------------------------------------------------------- devices & screens

export const screenSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  vehicleId: entityId.nullable().default(null),
  deviceId: entityId.nullable().default(null),
  screenType: z.enum(["LCD", "LED", "OLED", "E_INK", "PROJECTOR"]).default("LCD"),
  resolutionWidthPx: z.number().int().positive().default(1920),
  resolutionHeightPx: z.number().int().positive().default(1080),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).default("LANDSCAPE"),
  brightnessPercent: z.number().int().min(0).max(100).nullable().default(null),
  status: z
    .enum(["UNASSIGNED", "ASSIGNED", "ONLINE", "OFFLINE", "MAINTENANCE", "DECOMMISSIONED"])
    .default("UNASSIGNED"),
  installedOn: isoDate.optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Screen = z.infer<typeof screenSchema>;

export const deviceNetworkStatusSchema = z.enum(["WIFI", "ETHERNET", "CELLULAR", "NONE", "UNKNOWN"]);

export const deviceSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  screenId: entityId.nullable().default(null),
  /** SHA-256 of the device secret. The plaintext secret is shown exactly once at enrolment. */
  credentialHash: z.string().min(32).max(128),
  model: z.string().trim().max(80).default(""),
  manufacturer: z.string().trim().max(80).default(""),
  firmwareVersion: z.string().trim().max(40).default(""),
  appVersion: z.string().trim().max(40).default(""),
  networkStatus: deviceNetworkStatusSchema.default("UNKNOWN"),
  simCarrier: z.string().trim().max(60).default(""),
  powerSource: z.enum(["MAINS", "BATTERY", "VEHICLE_12V", "SOLAR", "UNKNOWN"]).default("UNKNOWN"),
  batteryPercent: z.number().min(0).max(100).nullable().default(null),
  storageUsedPercent: z.number().min(0).max(100).nullable().default(null),
  temperatureCelsius: z.number().min(-40).max(120).nullable().default(null),
  status: z
    .enum(["UNASSIGNED", "ASSIGNED", "ONLINE", "OFFLINE", "DEGRADED", "MAINTENANCE", "DECOMMISSIONED"])
    .default("UNASSIGNED"),
  lastHeartbeatAt: isoDateTime.nullable().default(null),
  lastScreenshotUrl: z.string().max(2048).nullable().default(null),
  lastSyncAt: isoDateTime.nullable().default(null),
  lastKnownLocation: coordinatesSchema.nullable().default(null),
  currentCreativeId: entityId.nullable().default(null),
  currentCampaignId: entityId.nullable().default(null),
  pendingEventCount: z.number().int().nonnegative().default(0),
  errorCount24h: z.number().int().nonnegative().default(0),
  enrolledAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Device = z.infer<typeof deviceSchema>;

export const deviceHeartbeatSchema = z.object({
  deviceId: entityId,
  screenId: entityId.nullable().default(null),
  timestamp: isoDateTime,
  firmwareVersion: z.string().trim().max(40).default(""),
  appVersion: z.string().trim().max(40).default(""),
  networkStatus: deviceNetworkStatusSchema.default("UNKNOWN"),
  simCarrier: z.string().trim().max(60).optional(),
  powerSource: z.enum(["MAINS", "BATTERY", "VEHICLE_12V", "SOLAR", "UNKNOWN"]).optional(),
  batteryPercent: z.number().min(0).max(100).nullable().optional(),
  storageUsedPercent: z.number().min(0).max(100).nullable().optional(),
  temperatureCelsius: z.number().min(-40).max(120).nullable().optional(),
  currentCreativeId: entityId.nullable().default(null),
  currentCampaignId: entityId.nullable().default(null),
  pendingEventCount: z.number().int().nonnegative().default(0),
  location: coordinatesSchema.nullable().default(null),
  errorCount: z.number().int().nonnegative().default(0),
});

export type DeviceHeartbeat = z.infer<typeof deviceHeartbeatSchema>;

// ---------------------------------------------------------------- locations

export const locationSchema = z.object({
  id: entityId,
  code: z.string().min(3).max(24),
  kind: z.enum(["CITY", "ZONE", "ROUTE", "HOTSPOT"]),
  name: z.string().trim().min(2).max(160),
  parentId: entityId.nullable().default(null),
  cityId: entityId.nullable().default(null),
  centre: geoPointSchema.nullable().default(null),
  /** Coarse polygon used to assign a GPS fix to a zone. Never traced to a passenger. */
  boundingBox: z
    .object({
      minLat: z.number(),
      minLng: z.number(),
      maxLat: z.number(),
      maxLng: z.number(),
    })
    .nullable()
    .default(null),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840).default(330),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type LocationRecord = z.infer<typeof locationSchema>;

export const locationAssignmentSchema = z.object({
  vehicleId: entityId,
  currentZoneId: entityId.nullable().default(null),
  currentRouteId: entityId.nullable().default(null),
  currentCityId: entityId.nullable().default(null),
  currentLocation: coordinatesSchema.nullable().default(null),
  observedAt: isoDateTime.nullable().default(null),
});

// ---------------------------------------------------------------- campaigns

export const timeWindowSchema = z
  .object({
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(0).max(1439),
  })
  .refine((window) => window.startMinute !== window.endMinute || window.startMinute === 0, {
    message: "Start and end minute must differ",
  });

export const geofenceSchema = z.object({
  lat: latitude,
  lng: longitude,
  radiusMetres: z.number().int().min(50).max(50_000),
});

export const targetingRulesSchema = z.object({
  cityIds: z.array(entityId).max(50).default([]),
  zoneIds: z.array(entityId).max(200).default([]),
  routeIds: z.array(entityId).max(200).default([]),
  vehicleTypes: z.array(vehicleTypeSchema).max(20).default([]),
  vehicleGroupIds: z.array(entityId).max(100).default([]),
  screenIds: z.array(entityId).max(500).default([]),
  screenTypes: z.array(z.string().max(40)).max(20).default([]),
  dayOfWeek: z.array(z.enum(DAY_OF_WEEK_ORDER as unknown as [string, ...string[]])).max(7).default([]),
  timeWindows: z.array(timeWindowSchema).max(12).default([]),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  geofences: z.array(geofenceSchema).max(50).default([]),
  audienceCategories: z.array(z.string().max(60)).max(30).default([]),
  proximityHotspotMinutes: z.number().int().min(0).max(120).nullable().default(null),
});

export type TargetingRulesInput = z.input<typeof targetingRulesSchema>;

export const frequencyCapsSchema = z.object({
  maxPlaysPerHour: z.number().int().min(0).max(10_000),
  maxPlaysPerDay: z.number().int().min(0).max(200_000),
  minimumGapSeconds: z.number().int().min(0).max(86_400),
  maxInventoryShare: z.number().min(0.01).max(1),
});

export const budgetSchema = z.object({
  totalMinor: z.number().int().positive(),
  dailyMinor: z.number().int().positive().nullable().default(null),
  pricingModel: pricingModelSchema,
  /** Rate in minor units: per mille for CPM, per click for CPC/CPL, per conversion for CPA. */
  rateMinor: z.number().int().min(0).nullable().default(null),
  currency: z.string().length(3).default("INR"),
});

export const engagementConfigSchema = z.object({
  qrEnabled: z.boolean().default(false),
  nfcEnabled: z.boolean().default(false),
  nfcTagId: z.string().trim().max(64).optional(),
  destinationUrl: httpUrl.optional().or(z.literal("")),
  whatsappCta: whatsappDestination.optional().or(z.literal("")),
  phoneCta: phoneDestination.optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional(),
  couponHeadline: z.string().trim().max(120).optional(),
  utmSource: z.string().trim().max(60).default("mobility-screen"),
  utmMedium: z.string().trim().max(60).default("digital_ooh"),
  utmCampaign: z.string().trim().max(80).optional(),
});

export const campaignSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  advertiserId: entityId,
  name: z.string().trim().min(3).max(160),
  objective: campaignObjectiveSchema,
  category: z.string().trim().max(80),
  description: z.string().trim().max(2000).default(""),
  status: z
    .enum([
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "SCHEDULED",
      "RUNNING",
      "PAUSED",
      "COMPLETED",
      "CANCELLED",
    ])
    .default("DRAFT"),
  budget: budgetSchema,
  targeting: targetingRulesSchema,
  frequencyCaps: frequencyCapsSchema,
  engagement: engagementConfigSchema,
  priority: z.number().int().min(0).max(100).default(50),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  submittedAt: isoDateTime.nullable().default(null),
  approvedAt: isoDateTime.nullable().default(null),
  approvedBy: entityId.nullable().default(null),
  rejectionReasonCode: z.string().max(64).nullable().default(null),
  rejectionNotes: z.string().max(2000).nullable().default(null),
  pausedAt: isoDateTime.nullable().default(null),
  totalSpentMinor: z.number().int().nonnegative().default(0),
  createdBy: entityId,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Campaign = z.infer<typeof campaignSchema>;

export const campaignCreateSchema = z.object({
  name: z.string().trim().min(3).max(160),
  objective: campaignObjectiveSchema,
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000).default(""),
  budget: budgetSchema,
  targeting: targetingRulesSchema.default({}),
  frequencyCaps: frequencyCapsSchema,
  engagement: engagementConfigSchema.default({}),
  priority: z.number().int().min(0).max(100).default(50),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export type CampaignCreateInput = z.input<typeof campaignCreateSchema>;

// ---------------------------------------------------------------- creatives

export const creativeSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  campaignId: entityId,
  advertiserId: entityId,
  name: z.string().trim().min(2).max(120),
  format: creativeFormatSchema,
  /** Path inside the private storage bucket. The API mints short-lived signed URLs. */
  storagePath: z.string().max(512),
  thumbnailPath: z.string().max(512).nullable().default(null),
  signedUrl: z.string().max(4096).nullable().default(null),
  signedUrlExpiresAt: isoDateTime.nullable().default(null),
  mimeType: z.string().max(120),
  sizeBytes: z.number().int().nonnegative(),
  widthPx: z.number().int().positive().nullable().default(null),
  heightPx: z.number().int().positive().nullable().default(null),
  durationSeconds: z.number().int().positive().nullable().default(null),
  aspectRatio: z.string().max(16).default("16:9"),
  landingUrl: httpUrl.optional().or(z.literal("")),
  headline: z.string().trim().max(200).default(""),
  bodyText: z.string().trim().max(1000).default(""),
  callToAction: z.string().trim().max(80).default(""),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "APPROVED",
      "SCHEDULED",
      "LIVE",
      "PAUSED",
      "COMPLETED",
      "REJECTED",
    ])
    .default("DRAFT"),
  version: z.number().int().positive().default(1),
  parentCreativeId: entityId.nullable().default(null),
  isArchived: z.boolean().default(false),
  reviewedBy: entityId.nullable().default(null),
  reviewedAt: isoDateTime.nullable().default(null),
  rejectionReasonCode: z.string().max(64).nullable().default(null),
  rejectionNotes: z.string().max(2000).nullable().default(null),
  scheduledFrom: isoDateTime.nullable().default(null),
  scheduledTo: isoDateTime.nullable().default(null),
  uploadedBy: entityId,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Creative = z.infer<typeof creativeSchema>;

export const creativeMetaUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  headline: z.string().trim().max(200).optional(),
  bodyText: z.string().trim().max(1000).optional(),
  callToAction: z.string().trim().max(80).optional(),
  landingUrl: httpUrl.optional().or(z.literal("")),
  scheduledFrom: isoDateTime.optional(),
  scheduledTo: isoDateTime.optional(),
});

export const creativeUploadIntentSchema = z.object({
  campaignId: entityId,
  name: z.string().trim().min(2).max(120),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().positive(),
  widthPx: z.number().int().positive().nullable().default(null),
  heightPx: z.number().int().positive().nullable().default(null),
  durationSeconds: z.number().int().positive().nullable().default(null),
});

export type CreativeUploadIntentInput = z.input<typeof creativeUploadIntentSchema>;

/**
 * Registration, after the bytes have been PUT to the presigned URL.
 *
 * Separate from the intent schema on purpose:
 *
 *  - The intent request must **not** accept a `storagePath`. The server picks the
 *    object key; a client that could choose it would be able to aim an upload at
 *    another campaign's folder.
 *  - The registration request must accept it, because that is how the server
 *    learns which object the just-completed upload landed on.
 *
 * The path is still validated against the campaign's own prefix server-side, so
 * this widening cannot be used to point at a key the intent did not issue.
 */
export const creativeRegistrationSchema = creativeUploadIntentSchema.extend({
  storagePath: z.string().trim().min(1).max(500),
});

export type CreativeRegistrationInput = z.infer<typeof creativeRegistrationSchema>;

export const uploadIntentSchema = z.object({
  /** Signed upload URL. Never a public bucket path. */
  uploadUrl: z.string().min(1),
  storagePath: z.string().min(1),
  method: z.literal("PUT").default("PUT"),
  headers: z.record(z.string()),
  expiresAt: isoDateTime,
  requiredHeaders: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------- moderation

export const moderationDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES", "SUSPEND"]),
  reasonCode: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ModerationDecision = z.infer<typeof moderationDecisionSchema>;

// ---------------------------------------------------------------- notifications / audit / support

export const notificationTypeSchema = z.enum([
  "REGISTRATION_SUBMITTED",
  "REGISTRATION_APPROVED",
  "REGISTRATION_REJECTED",
  "CAMPAIGN_APPROVED",
  "CAMPAIGN_REJECTED",
  "CAMPAIGN_LIVE",
  "CAMPAIGN_COMPLETED",
  "CREATIVE_REJECTED",
  "PAYMENT_SUCCESSFUL",
  "PAYMENT_FAILED",
  "DEVICE_OFFLINE",
  "DOCUMENT_EXPIRING",
  "PAYOUT_PROCESSED",
  "SUPPORT_TICKET_UPDATED",
  "BUDGET_LOW",
  "SYSTEM",
]);

export const notificationSchema = z.object({
  id: entityId,
  userId: entityId,
  type: notificationTypeSchema,
  channel: z.enum(["EMAIL", "SMS", "WHATSAPP", "IN_APP"]),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  href: z.string().max(512).nullable().default(null),
  entityType: z.string().max(40).nullable().default(null),
  entityId: entityId.nullable().default(null),
  readAt: isoDateTime.nullable().default(null),
  deliveryStatus: z.enum(["QUEUED", "SENT", "FAILED", "SUPPRESSED"]).default("QUEUED"),
  createdAt: isoDateTime,
});

export type Notification = z.infer<typeof notificationSchema>;

export const auditLogSchema = z.object({
  id: entityId,
  actorId: entityId.nullable().default(null),
  actorRole: z.string().max(40).nullable().default(null),
  action: z.string().min(1).max(80),
  entityType: z.string().min(1).max(40),
  entityId: z.string().max(64).nullable().default(null),
  summary: z.string().max(500).default(""),
  /** Hashed or truncated; raw IPs are never stored in the audit trail. */
  ipHash: z.string().max(128).nullable().default(null),
  userAgent: z.string().max(300).nullable().default(null),
  metadata: z.record(z.unknown()).default({}),
  timestamp: isoDateTime,
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const supportTicketSchema = z.object({
  id: entityId,
  code: z.string().min(4).max(24),
  raisedBy: entityId,
  raisedByRole: z.string().max(40),
  category: z.enum([
    "PAYMENT",
    "DEVICE",
    "VEHICLE",
    "ADVERTISEMENT",
    "CAMPAIGN",
    "ACCOUNT",
    "PAYOUT",
    "TECHNICAL",
  ]),
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]).default("OPEN"),
  relatedEntityType: z.string().max(40).nullable().default(null),
  relatedEntityId: z.string().max(64).nullable().default(null),
  messages: z
    .array(
      z.object({
        id: entityId,
        authorId: entityId,
        body: z.string().trim().min(1).max(4000),
        isStaff: z.boolean().default(false),
        createdAt: isoDateTime,
      }),
    )
    .default([]),
  assignedTo: entityId.nullable().default(null),
  resolvedAt: isoDateTime.nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type SupportTicket = z.infer<typeof supportTicketSchema>;

// ---------------------------------------------------------------- inventory

export const inventorySlotSchema = z.object({
  screenId: entityId,
  date: isoDate,
  /** 0..slotsPerDay */
  slotIndex: z.number().int().min(0),
  campaignId: entityId.nullable().default(null),
  creativeId: entityId.nullable().default(null),
  bookedByAdvertiserId: entityId.nullable().default(null),
  lockedAt: isoDateTime.nullable().default(null),
});

export type InventorySlot = z.infer<typeof inventorySlotSchema>;