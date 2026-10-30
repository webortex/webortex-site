/**
 * Formatting.
 *
 * Money is the reason these tests exist. Amounts cross the wire as integer minor
 * units, and every wrong conversion here either misreports revenue or loses the
 * paise someone will later try to reconcile against an invoice.
 */

import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  formatMoney,
  formatMoneyParts,
  formatNumber,
  formatPercent,
  formatRelative,
  truncate,
} from "@/mobility-media/lib/format";

const DASH = "—";

describe("formatMoney", () => {
  it("converts minor units to a decimal exactly once", () => {
    expect(formatMoney(1_00_000)).toContain("1,000.00");
  });

  it("renders paise rather than truncating them", () => {
    // 50 paise is not zero, and rounding it away loses real money.
    expect(formatMoney(50)).toContain("0.50");
  });

  it("renders a whole rupee amount without inventing paise", () => {
    expect(formatMoney(100)).toContain("1.00");
  });

  it("handles zero", () => {
    expect(formatMoney(0)).toContain("0.00");
  });

  it("distinguishes absent data from zero", () => {
    // The API uses `null` for "no data", which is not the same as zero. Showing
    // 0.00 would claim a figure that was never measured.
    expect(formatMoney(null)).toBe(DASH);
    expect(formatMoney(undefined)).toBe(DASH);
    expect(formatMoney(0)).not.toBe(DASH);
  });

it("abbreviates only when asked and only above one lakh", () => {
    // `en-IN` compact notation abbreviates one lakh to "L", not "lakh".
    expect(formatMoney(1_00_00_000, "INR", { compact: true })).toMatch(/1L|1 lakh/i);
    expect(formatMoney(500, "INR", { compact: true })).toContain("5.00");
  });

  it("does not abbreviate without the compact option", () => {
    expect(formatMoney(1_00_00_000)).toContain("1,00,000.00");
  });

  it("falls back gracefully for an unknown currency code", () => {
    // An Intl exception here would take the whole screen down.
    expect(() => formatMoney(100, "NOT_A_CURRENCY")).not.toThrow();
    expect(formatMoney(100, "NOT_A_CURRENCY")).toContain("1.00");
  });
});

describe("formatMoneyParts", () => {
  it("splits whole and fractional units", () => {
    const parts = formatMoneyParts(1_23_45_678);
    expect(parts.minor).toBe(".78");
    // Indian digit grouping: 123456.78 is 1,23,456 — not 12,34,56.
    expect(parts.major).toContain("1,23,456");
  });

  it("pads single-digit paise with a zero", () => {
    expect(formatMoneyParts(1_05).minor).toBe(".05");
  });

  it("keeps the sign outside the symbol", () => {
    expect(formatMoneyParts(-500).major.startsWith("-")).toBe(true);
  });

  it("returns a dash for absent data", () => {
    expect(formatMoneyParts(null)).toEqual({ major: DASH, minor: "" });
  });
});

describe("formatPercent", () => {
  it("multiplies a fraction into a percentage", () => {
    // The API reports rates as fractions. Treating 0.0432 as a percentage would
    // understate conversion by a factor of a thousand.
    expect(formatPercent(0.0432)).toBe("4.3%");
  });

  it("renders zero rather than a dash", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("returns a dash for an absent rate", () => {
    // A null rate means there was no denominator, not that the rate was zero.
    expect(formatPercent(null)).toBe(DASH);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(1_23_456)).toBe("1,23,456");
  });

  it("returns a dash for null", () => {
    expect(formatNumber(null)).toBe(DASH);
  });
});

describe("formatDuration", () => {
  it("renders hours and minutes", () => {
    expect(formatDuration(3_845)).toBe("1h 04m");
  });

  it("renders minutes and seconds below an hour", () => {
    expect(formatDuration(125)).toBe("2m 05s");
  });

  it("renders bare seconds", () => {
    expect(formatDuration(42)).toBe("42s");
  });

  it("clamps a negative duration to zero", () => {
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("formatBytes", () => {
  it("scales to the largest fitting unit", () => {
    expect(formatBytes(2_097_152)).toBe("2.0 MB");
  });

  it("renders whole bytes without a decimal", () => {
    expect(formatBytes(512)).toBe("512 B");
  });
});

describe("formatRelative", () => {
  it("describes recent times relatively", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(formatRelative(twoHoursAgo)).toMatch(/hour/);
  });

  it("falls back to an absolute date beyond a week", () => {
    // Relative wording stops being useful once everything says "12 days ago".
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    expect(formatRelative(old)).not.toMatch(/day/);
  });

  it("returns a dash for absent or unparseable input", () => {
    expect(formatRelative(null)).toBe(DASH);
    expect(formatRelative("not-a-date")).toBe(DASH);
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("Short", 10)).toBe("Short");
  });

  it("truncates long text with an ellipsis", () => {
    const result = truncate("A very long campaign name indeed", 12);
    expect(result.length).toBeLessThanOrEqual(12);
    expect(result.endsWith("…")).toBe(true);
  });
});