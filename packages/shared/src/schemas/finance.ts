import { z } from "zod";
import { entityId, isoDate, isoDateTime } from "./common";
import type { BreakdownRow } from "./events";

// ---------------------------------------------------------------- wallets & transactions

export const transactionStatusSchema = z.enum([
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const transactionTypeSchema = z.enum([
  "CREDIT",
  "DEBIT",
  "REFUND",
  "ADJUSTMENT",
  "TOPUP",
  "CHARGE",
]);

export const transactionSchema = z.object({
  id: entityId,
  reference: z.string().min(4).max(40),
  advertiserId: entityId.nullable().default(null),
  userId: entityId.nullable().default(null),
  campaignId: entityId.nullable().default(null),
  type: transactionTypeSchema,
  status: transactionStatusSchema,
  /** Signed minor units; credits positive, debits negative. */
  amountMinor: z.number().int(),
  currency: z.string().length(3).default("INR"),
  description: z.string().trim().max(300),
  gateway: z.enum(["RAZORPAY", "STRIPE", "MANUAL", "NETBANKING", "UPI", "NONE"]).default("NONE"),
  /** Gateway identifiers only. No card numbers, no CVV, no raw bank responses. */
  gatewayPaymentId: z.string().max(120).nullable().default(null),
  gatewayOrderId: z.string().max(120).nullable().default(null),
  gatewaySignature: z.string().max(256).nullable().default(null),
  failureCode: z.string().max(64).nullable().default(null),
  failureReason: z.string().max(500).nullable().default(null),
  /**
   * True only when confirmed by a server-side gateway verification or webhook
   * signature check. Frontend state can never set this.
   */
  verifiedAt: isoDateTime.nullable().default(null),
  refundedMinor: z.number().int().nonnegative().default(0),
  taxMinor: z.number().int().nonnegative().default(0),
  invoiceId: entityId.nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Transaction = z.infer<typeof transactionSchema>;

export const walletSchema = z.object({
  advertiserId: entityId,
  currency: z.string().length(3).default("INR"),
  /** Opening + successful credits - debits, reconciled from the ledger on read. */
  balanceMinor: z.number().int().default(0),
  totalCreditedMinor: z.number().int().default(0),
  totalDebitedMinor: z.number().int().default(0),
  creditLimitMinor: z.number().int().nonnegative().default(0),
  autoTopUpEnabled: z.boolean().default(false),
  autoTopUpThresholdMinor: z.number().int().nonnegative().default(0),
  autoTopUpAmountMinor: z.number().int().nonnegative().default(0),
  updatedAt: isoDateTime,
});

export type Wallet = z.infer<typeof walletSchema>;

// ---------------------------------------------------------------- invoices

export const invoiceSchema = z.object({
  id: entityId,
  number: z.string().min(4).max(40),
  advertiserId: entityId,
  status: z.enum(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"]).default("DRAFT"),
  periodStart: isoDate,
  periodEnd: isoDate,
  currency: z.string().length(3).default("INR"),
  subtotalMinor: z.number().int().nonnegative().default(0),
  taxPercent: z.number().min(0).max(100).default(18),
  taxMinor: z.number().int().nonnegative().default(0),
  totalMinor: z.number().int().nonnegative().default(0),
  paidMinor: z.number().int().nonnegative().default(0),
  dueMinor: z.number().int().nonnegative().default(0),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().max(300),
        campaignId: entityId.nullable().default(null),
        quantity: z.number().int().nonnegative().default(1),
        unitMinor: z.number().int().nonnegative().default(0),
        amountMinor: z.number().int().nonnegative().default(0),
      }),
    )
    .default([]),
  issuedAt: isoDateTime.nullable().default(null),
  dueOn: isoDate.optional(),
  paidAt: isoDateTime.nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Invoice = z.infer<typeof invoiceSchema>;

// ---------------------------------------------------------------- payouts

export const payoutSchema = z.object({
  id: entityId,
  reference: z.string().min(4).max(40),
  driverId: entityId.nullable().default(null),
  vehicleId: entityId.nullable().default(null),
  ownerUserId: entityId.nullable().default(null),
  periodStart: isoDate,
  periodEnd: isoDate,
  currency: z.string().length(3).default("INR"),
  grossMinor: z.number().int().nonnegative(),
  taxWithheldMinor: z.number().int().nonnegative().default(0),
  netMinor: z.number().int().nonnegative(),
  status: z.enum(["PENDING", "SCHEDULED", "PROCESSING", "PAID", "FAILED", "ON_HOLD"]).default("PENDING"),
  ledger: z
    .array(
      z.object({
        kind: z.enum([
          "BASE_PAYOUT",
          "PLAYBACK_EARNINGS",
          "ENGAGEMENT_SHARE",
          "CONVERSION_SHARE",
          "BONUS",
          "PENALTY",
          "PLATFORM_REVENUE",
          "OPERATIONS_RESERVE",
          "TAX_WITHHELD",
          "REFUND",
        ]),
        amountMinor: z.number().int(),
        note: z.string().max(300).default(""),
      }),
    )
    .default([]),
  method: z.enum(["BANK", "UPI", "WALLET", "MANUAL"]).default("UPI"),
  gatewayReference: z.string().max(120).nullable().default(null),
  failureReason: z.string().max(500).nullable().default(null),
  scheduledFor: isoDate.optional(),
  processedAt: isoDateTime.nullable().default(null),
  approvedBy: entityId.nullable().default(null),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Payout = z.infer<typeof payoutSchema>;

export const driverEarningsSchema = z.object({
  driverId: entityId,
  vehicleId: entityId.nullable().default(null),
  periodStart: isoDate,
  periodEnd: isoDate,
  currency: z.string().length(3).default("INR"),
  baseMinor: z.number().int().nonnegative().default(0),
  playbackMinor: z.number().int().nonnegative().default(0),
  engagementMinor: z.number().int().nonnegative().default(0),
  conversionMinor: z.number().int().nonnegative().default(0),
  bonusMinor: z.number().int().nonnegative().default(0),
  penaltyMinor: z.number().int().nonnegative().default(0),
  grossMinor: z.number().int().nonnegative().default(0),
  /**
   * Advertiser spend the vehicles attracted over the period. This is the pool
   * the entitlement was drawn from, so a payout can be reconciled against it
   * rather than settled in isolation.
   */
  attributedSpendMinor: z.number().int().nonnegative().default(0),
  taxWithheldMinor: z.number().int().nonnegative().default(0),
  netMinor: z.number().int().nonnegative().default(0),
  activeDays: z.number().int().nonnegative().default(0),
  plays: z.number().int().nonnegative().default(0),
  engagements: z.number().int().nonnegative().default(0),
});

export type DriverEarnings = z.infer<typeof driverEarningsSchema>;

// ---------------------------------------------------------------- platform revenue

export interface RevenueBreakdown {
  readonly grossSpendMinor: number;
  readonly platformRevenueMinor: number;
  readonly operationsReserveMinor: number;
  readonly driverPayoutMinor: number;
  readonly advertisingSpendMinor: number;
  readonly outstandingMinor: number;
  readonly pendingPaymentsMinor: number;
  readonly refundsMinor: number;
  readonly taxCollectedMinor: number;
  readonly netRevenueMinor: number;
}

export interface RevenueSeriesPoint {
  readonly bucket: string;
  readonly grossMinor: number;
  readonly platformMinor: number;
  readonly driverMinor: number;
}

export interface RevenueAnalytics {
  readonly range: { readonly from: string; readonly to: string };
  readonly totals: RevenueBreakdown;
  readonly series: readonly RevenueSeriesPoint[];
  readonly byAdvertiser: readonly BreakdownRow[];
  readonly byCampaign: readonly BreakdownRow[];
  readonly byVehicle: readonly BreakdownRow[];
  readonly byZone: readonly BreakdownRow[];
  readonly isDemoData: boolean;
}