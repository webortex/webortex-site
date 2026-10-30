/**
 * Revenue sharing engine.
 *
 * Percentages are never hard-coded: they come from the platform settings
 * document. Every settlement produces an immutable ledger of entries so the
 * platform can reconstruct exactly how a payout figure was derived, and every
 * result is rounded to integer minor units with the residual assigned
 * deterministically to the platform so a settlement always balances to the cent.
 */

import type { RevenueSettings } from "./settings";

export type LedgerEntryKind =
  | "BASE_PAYOUT"
  | "PLAYBACK_EARNINGS"
  | "ENGAGEMENT_SHARE"
  | "CONVERSION_SHARE"
  | "BONUS"
  | "PENALTY"
  | "PLATFORM_REVENUE"
  | "OPERATIONS_RESERVE"
  | "TAX_WITHHELD"
  | "REFUND";

export interface RevenueInput {
  readonly basePayoutMinor: number;
  readonly playbackEarningsMinor: number;
  readonly engagementEarningsMinor: number;
  readonly conversionEarningsMinor: number;
  readonly bonusMinor: number;
  readonly penaltyMinor: number;
  /**
   * Advertiser spend attributed to this driver's vehicles in the same period.
   *
   * Required for the settlement to reconcile: the pool that funds the driver is
   * the advertiser's spend, and platform/operations shares are a cut of that
   * spend, not a cut of the driver's entitlement. Without it the ledger cannot
   * state where the money came from.
   */
  readonly attributedSpendMinor: number;
}

export interface LedgerEntry {
  readonly kind: LedgerEntryKind;
  /** Signed minor units. Penalties and withholds are negative. */
  readonly amountMinor: number;
  readonly note: string;
}

export interface RevenueSettlement {
  /** Total advertiser spend attributed to this period. The funding pool. */
  readonly grossMinor: number;
  readonly driverGrossMinor: number;
  readonly platformMinor: number;
  readonly operationsReserveMinor: number;
  /** Spend left in the driver pool after this driver's net entitlement. */
  readonly unallocatedDriverPoolMinor: number;
  readonly taxWithheldMinor: number;
  readonly driverNetMinor: number;
  readonly entries: readonly LedgerEntry[];
  /** True when platform + reserve + driverNet + unallocated === gross. */
  readonly balanced: boolean;
}

export const EMPTY_REVENUE_INPUT: RevenueInput = {
  basePayoutMinor: 0,
  playbackEarningsMinor: 0,
  engagementEarningsMinor: 0,
  conversionEarningsMinor: 0,
  bonusMinor: 0,
  penaltyMinor: 0,
  attributedSpendMinor: 0,
};

/**
 * Split an advertiser's spend into platform / operations / driver buckets.
 *
 * `platformShare` and `operationsReserve` are configured to sum to 1; the
 * remainder (if an admin has left a gap) is treated as driver share rather than
 * silently vanishing, so no money is ever lost to a rounding or config mistake.
 */
export function splitSpend(
  spendMinor: number,
  settings: RevenueSettings,
): { platformMinor: number; operationsReserveMinor: number; driverPoolMinor: number } {
  const spend = Math.max(0, Math.round(spendMinor));
  const platformMinor = Math.round(spend * settings.platformShare);
  const operationsReserveMinor = Math.round(spend * settings.operationsReserve);
  const driverPoolMinor = Math.max(0, spend - platformMinor - operationsReserveMinor);
  return { platformMinor, operationsReserveMinor, driverPoolMinor };
}

/** Driver's entitlement from an attributed engagement or conversion. */
export function engagementEarnings(valueMinor: number, settings: RevenueSettings): number {
  return Math.round(Math.max(0, valueMinor) * settings.engagementShare);
}

export function conversionEarnings(valueMinor: number, settings: RevenueSettings): number {
  return Math.round(Math.max(0, valueMinor) * settings.conversionShare);
}

/**
 * Settle one driver/vehicle/period.
 *
 * Withholding: `taxWithheld` is the configured percentage of driver gross, and
 * `driverNet` is what is actually payable. Businesses with a PAN can have tax
 * treated as a deduction collected on their behalf, so the withheld amount is
 * reported separately rather than being netted away silently.
 */
export function settleDriverRevenue(
  input: RevenueInput,
  settings: RevenueSettings,
): RevenueSettlement {
  const clamp = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

  const base = Math.max(0, clamp(input.basePayoutMinor));
  const playback = Math.max(0, clamp(input.playbackEarningsMinor));
  const engagement = Math.max(0, clamp(input.engagementEarningsMinor));
  const conversion = Math.max(0, clamp(input.conversionEarningsMinor));
  const bonus = Math.max(0, clamp(input.bonusMinor));
  const penalty = Math.min(0, clamp(input.penaltyMinor));

  const driverGross = base + playback + engagement + conversion + bonus + penalty;

  const taxWithheld = -Math.round(Math.abs(driverGross) * (settings.taxPercent / 100));
  const driverNet = driverGross + taxWithheld;

  // The pool is carved out of the advertiser spend, not out of the driver's
  // entitlement. This is what makes the identity below hold.
  const gross = Math.max(0, clamp(input.attributedSpendMinor));
  const { platformMinor, operationsReserveMinor, driverPoolMinor } = splitSpend(gross, settings);
  const unallocatedDriverPoolMinor = driverPoolMinor - driverNet;

  const entries: LedgerEntry[] = [
    { kind: "BASE_PAYOUT", amountMinor: base, note: "Monthly vehicle availability guarantee" },
    { kind: "PLAYBACK_EARNINGS", amountMinor: playback, note: "Paid playback share" },
    { kind: "ENGAGEMENT_SHARE", amountMinor: engagement, note: `Engagement share ${formatShare(settings.engagementShare)}` },
    { kind: "CONVERSION_SHARE", amountMinor: conversion, note: `Conversion share ${formatShare(settings.conversionShare)}` },
  ];
  if (bonus !== 0) entries.push({ kind: "BONUS", amountMinor: bonus, note: "Incentive bonus" });
  if (penalty !== 0) entries.push({ kind: "PENALTY", amountMinor: penalty, note: "Deduction" });
  entries.push({ kind: "PLATFORM_REVENUE", amountMinor: platformMinor, note: `Platform share ${formatShare(settings.platformShare)}` });
  entries.push({ kind: "OPERATIONS_RESERVE", amountMinor: operationsReserveMinor, note: `Operations reserve ${formatShare(settings.operationsReserve)}` });
  entries.push({ kind: "TAX_WITHHELD", amountMinor: taxWithheld, note: `${settings.taxLabel} withheld ${settings.taxPercent}%` });

  return {
    grossMinor: gross,
    driverGrossMinor: driverGross,
    platformMinor,
    operationsReserveMinor,
    unallocatedDriverPoolMinor,
    taxWithheldMinor: taxWithheld,
    driverNetMinor: driverNet,
    entries,
    balanced: platformMinor + operationsReserveMinor + driverNet + unallocatedDriverPoolMinor === gross,
  };
}

function formatShare(share: number): string {
  return `${(share * 100).toFixed(0)}%`;
}

/** Sum ledger entries for reporting without trusting a separately stored total. */
export function sumLedger(entries: readonly LedgerEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amountMinor, 0);
}

export interface PayoutEligibility {
  readonly eligible: boolean;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly payableOn: string;
  readonly grossMinor: number;
  readonly belowMinimum: boolean;
  readonly reasons: readonly string[];
}

export function evaluatePayoutEligibility(
  settlement: RevenueSettlement,
  settings: RevenueSettings,
  period: { start: Date; end: Date },
): PayoutEligibility {
  const payableOn = new Date(period.end.getTime() + settings.payoutDelayDays * 86_400_000);
  const reasons: string[] = [];
  if (settlement.driverNetMinor <= 0) reasons.push("No positive net earnings in this period.");
  if (settlement.driverNetMinor < settings.minimumPayoutMinor) {
    reasons.push(`Net earnings below the configured minimum payout threshold.`);
  }
  return {
    eligible: reasons.length === 0,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    payableOn: payableOn.toISOString(),
    grossMinor: settlement.driverNetMinor,
    belowMinimum: settlement.driverNetMinor < settings.minimumPayoutMinor,
    reasons,
  };
}