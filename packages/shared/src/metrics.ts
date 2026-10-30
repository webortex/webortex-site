/**
 * Performance metric formulas.
 *
 * Rule that is enforced everywhere: when the denominator is zero the result is
 * `null`, never `0`. A 0% completion rate and a completion rate that cannot be
 * computed look identical in a dashboard and lead to bad commercial decisions, so
 * the UI renders "N/A" for null. `formatPercent` is the only supported renderer.
 */

export type MetricValue = number | null;

export interface RateInputs {
  readonly numerator: number;
  readonly denominator: number;
}

function safeRatio(inputs: RateInputs): number | null {
  const { numerator, denominator } = inputs;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

/** completed plays / scheduled plays */
export function playbackCompletionRate(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** engagements / plays */
export function engagementRate(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** conversions / engagements */
export function conversionRate(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** leads / interactions */
export function leadConversionRate(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** online seconds / expected operating seconds */
export function screenUptime(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** active hours / scheduled hours */
export function vehicleReliability(inputs: RateInputs): MetricValue {
  return safeRatio(inputs);
}

/** campaign spend / leads. Only meaningful when at least one lead exists. */
export function costPerLead(spendMinor: number, leads: number): MetricValue {
  return safeRatio({ numerator: spendMinor, denominator: leads });
}

/** campaign spend / conversions */
export function costPerConversion(spendMinor: number, conversions: number): MetricValue {
  return safeRatio({ numerator: spendMinor, denominator: conversions });
}

/**
 * Campaign ROI. Revenue is attributed conversion value minus total spend.
 * Returns null when spend is zero because ROI is undefined, not zero.
 */
export function returnOnInvestment(
  attributedRevenueMinor: number,
  spendMinor: number,
): MetricValue {
  const ratio = safeRatio({ numerator: attributedRevenueMinor - spendMinor, denominator: spendMinor });
  return ratio === null ? null : ratio * 100;
}

/** Cost per thousand plays. */
export function cpm(spendMinor: number, plays: number): MetricValue {
  if (plays <= 0) return null;
  return (spendMinor / plays) * 1000;
}

/** Budget consumed as a fraction 0..1, or null when the budget is unknown. */
export function budgetUtilisation(spentMinor: number, budgetMinor: number | null | undefined): MetricValue {
  if (budgetMinor === null || budgetMinor === undefined || budgetMinor <= 0) return null;
  return spentMinor / budgetMinor;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string, locale: string, compact: boolean): Intl.NumberFormat {
  const key = `${currency}|${locale}|${compact}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** All monetary amounts cross the wire as integer minor units to avoid float drift. */
export function formatMoney(
  minorUnits: number | null | undefined,
  options: { currency?: string; locale?: string; compact?: boolean } = {},
): string {
  if (minorUnits === null || minorUnits === undefined || !Number.isFinite(minorUnits)) return "N/A";
  const currency = options.currency ?? "INR";
  const locale = options.locale ?? "en-IN";
  const major = minorUnits / 100;
  return currencyFormatter(currency, locale, options.compact ?? false).format(major);
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

function numberFormatter(locale: string, compact: boolean): Intl.NumberFormat {
  const key = `${locale}|${compact}`;
  let formatter = numberFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 0 });
    numberFormatters.set(key, formatter);
  }
  return formatter;
}

export function formatCount(value: number | null | undefined, locale = "en-IN", compact = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return numberFormatter(locale, compact).format(value);
}

export function formatPercent(value: MetricValue, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDecimal(value: MetricValue, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  return value.toFixed(digits);
}

/** Signed delta for trend chips, formatted as a percentage. */
export function formatDelta(current: MetricValue, previous: MetricValue): string {
  if (current === null || previous === null || previous === 0) return "N/A";
  const delta = (current - previous) / Math.abs(previous);
  return `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(1)}%`;
}

export function deltaDirection(current: MetricValue, previous: MetricValue): "up" | "down" | "flat" | "unknown" {
  if (current === null || previous === null || previous === 0) return "unknown";
  const delta = (current - previous) / Math.abs(previous);
  if (Math.abs(delta) < 0.001) return "flat";
  return delta > 0 ? "up" : "down";
}