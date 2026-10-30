/**
 * Display formatting.
 *
 * Money is the part that matters here. Every amount in the API is an integer in
 * minor units — paise, not rupees — because a float that represents a currency
 * amount eventually displays a value no one can reconcile against an invoice.
 * Conversion to a decimal happens once, at render, and only for display.
 *
 * Every helper accepts null/undefined and returns an em dash. The API models
 * optional fields honestly (`totalMinor: null` when there is no data, which is
 * different from zero), and a formatter that renders those as `0.00` or
 * `NaN` would show an advertiser a number that is not true.
 */

const EM_DASH = "—";

/**
 * Formats minor units as currency.
 *
 * @param {number|null} valueMinor integer minor units
 * @param {string} currency ISO code, default INR
 * @param {{ compact?: boolean }} [options] compact abbreviates large amounts
 */
export function formatMoney(valueMinor, currency = "INR", options = {}) {
  if (valueMinor === null || valueMinor === undefined || Number.isNaN(Number(valueMinor))) return EM_DASH;

  const amount = Number(valueMinor) / 100;
  const compact = options.compact === true && Math.abs(amount) >= 1_00_000;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    }).format(amount);
  } catch {
    // An unknown currency code would otherwise throw and take the screen down.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Splits minor units into whole and fractional parts for a stat card. */
export function formatMoneyParts(valueMinor, currency = "INR") {
  if (valueMinor === null || valueMinor === undefined || Number.isNaN(Number(valueMinor))) {
    return { major: EM_DASH, minor: "" };
  }
  const negative = Number(valueMinor) < 0;
  const absolute = Math.abs(Number(valueMinor));
  const major = Math.floor(absolute / 100).toLocaleString("en-IN");
  const minor = String(absolute % 100).padStart(2, "0");
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return { major: `${negative ? "-" : ""}${symbol}${major}`, minor: `.${minor}` };
}

export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return EM_DASH;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, ...options }).format(Number(value));
}

/**
 * Formats a percentage.
 *
 * The API reports rates as fractions (`0.0432`), not percentages, so the
 * multiply is not optional — treating 0.0432 as 0.04% would misreport conversion
 * rates by a factor of a thousand.
 */
export function formatPercent(fraction, digits = 1) {
  if (fraction === null || fraction === undefined || Number.isNaN(Number(fraction))) return EM_DASH;
  return `${(Number(fraction) * 100).toFixed(digits)}%`;
}

export function formatDate(iso, options = {}) {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(iso) {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Relative time for feeds. Falls back to an absolute date past a week. */
export function formatRelative(iso) {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, "day");
  return formatDate(iso);
}

/** Duration in seconds as `1h 04m`, for playback and dwell time. */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return EM_DASH;
  const total = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  return `${secs}s`;
}

/** Bytes for creative file sizes. */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(Number(bytes))) return EM_DASH;
  const units = ["B", "KB", "MB", "GB"];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Truncates for a label without cutting mid-word where avoidable.
 * Campaign and creative names are user-supplied and can be arbitrarily long.
 */
export function truncate(text, max = 40) {
  if (!text) return EM_DASH;
  const value = String(text);
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}