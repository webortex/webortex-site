/**
 * Campaign create-form contract.
 *
 * These validate the payload the browser actually builds against the real
 * `campaignCreateSchema`, rather than a hand-written copy of it. The two halves
 * live in different packages and are easy to drift apart silently: a wrong day code
 * or a paise amount in the wrong unit produces a 422 that only a live API call
 * would surface.
 */

import { describe, expect, it } from "vitest";
import { campaignCreateSchema } from "../../../packages/shared/src/index.js";
import {
  budgetError,
  buildCampaignPayload,
  flightWindowError,
  inventoryShareError,
  toIso,
  toMinor,
} from "@/mobility-media/routes/campaignForm";

/** A complete, valid form state. Tests vary one field at a time from this. */
function formState(overrides = {}) {
  return {
    name: "Monsoon beverage run",
    objective: "AWARENESS",
    category: "beverages",
    description: "Cooling campaign across auto rickshaws",
    startsAt: "2026-11-01T00:00",
    endsAt: "2026-12-01T00:00",
    total: "50000",
    daily: "",
    pricingModel: "FIXED_PACKAGE",
    rate: "",
    currency: "INR",
    maxPerHour: "10",
    maxPerDay: "100",
    minGapSeconds: "1800",
    maxInventoryShare: "0.40",
    vehicleTypes: ["AUTO", "CAB"],
    dayOfWeek: ["MON", "TUE"],
    qrEnabled: true,
    nfcEnabled: false,
    destinationUrl: "https://example.com/offer",
    ...overrides,
  };
}

/**
 * `asDraft` is a sibling of the schema, not a field on it, so it is stripped before
 * parsing. Copying and deleting keeps the key out without binding a name the
 * linter has to be told to ignore.
 */
function parse(payload) {
  const body = { ...payload };
  delete body.asDraft;
  return campaignCreateSchema.safeParse(body);
}

describe("buildCampaignPayload", () => {
  it("produces a body the create schema accepts", () => {
    const result = parse(buildCampaignPayload(formState()));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Monsoon beverage run");
      expect(result.data.targeting.vehicleTypes).toEqual(["AUTO", "CAB"]);
    }
  });

  it("converts major units to minor units for every money field", () => {
    const payload = buildCampaignPayload(formState({ total: "50000", daily: "250", rate: "12.5" }));
    expect(payload.budget.totalMinor).toBe(5_000_000);
    expect(payload.budget.dailyMinor).toBe(25_000);
    expect(payload.budget.rateMinor).toBe(1_250);
  });

  it("rounds paise rather than truncating them", () => {
    // 0.1 * 100 is 10.000000000000002 in binary floating point.
    expect(toMinor("0.1")).toBe(10);
    expect(toMinor("1234.567")).toBe(123_457);
  });

  it("sends null rather than omitting the nullable budget fields", () => {
    const payload = buildCampaignPayload(formState({ daily: "", rate: "" }));
    expect(payload.budget).toHaveProperty("dailyMinor");
    expect(payload.budget.dailyMinor).toBeNull();
    expect(payload.budget).toHaveProperty("rateMinor");
    expect(payload.budget.rateMinor).toBeNull();
  });

  it("treats a zero daily budget as unset, since the schema requires positive", () => {
    const payload = buildCampaignPayload(formState({ daily: "0" }));
    expect(payload.budget.dailyMinor).toBeNull();
    expect(parse(payload).success).toBe(true);
  });

  it("omits the optional click-through URL when blank", () => {
    expect(buildCampaignPayload(formState({ destinationUrl: "  " })).engagement).not.toHaveProperty(
      "destinationUrl",
    );
  });

  it("sends flight dates as ISO instants, not local wall-clock strings", () => {
    const payload = buildCampaignPayload(formState());
    expect(payload.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(parse(payload).success).toBe(true);
  });

  it("carries the draft flag outside the schema body", () => {
    expect(buildCampaignPayload(formState(), { asDraft: true }).asDraft).toBe(true);
    expect(buildCampaignPayload(formState()).asDraft).toBe(false);
  });

  it("flags the draft flag so it is never mistaken for a campaign field", () => {
    // If `asDraft` were ever added to the schema this would start failing, which is
    // the point: the route reads it off the raw body, not off the parsed input.
    const parsed = campaignCreateSchema.parse(buildCampaignPayload(formState(), { asDraft: true }));
    expect(parsed).not.toHaveProperty("asDraft");
  });
});

describe("day-of-week codes", () => {
  it("accepts the three-letter codes the targeting schema expects", () => {
    const result = parse(buildCampaignPayload(formState({ dayOfWeek: ["MON", "SUN"] })));
    expect(result.success).toBe(true);
  });

  it("rejects full day names, which is the mistake this guards", () => {
    const result = parse(buildCampaignPayload(formState({ dayOfWeek: ["MONDAY"] })));
    expect(result.success).toBe(false);
  });
});

describe("flightWindowError", () => {
  it("accepts a 30 day flight", () => {
    expect(flightWindowError("2026-11-01T00:00", "2026-12-01T00:00")).toBeNull();
  });

  it("rejects an end at or before the start", () => {
    expect(flightWindowError("2026-12-01T00:00", "2026-11-01T00:00")).toMatch(/after the start/);
    expect(flightWindowError("2026-12-01T00:00", "2026-12-01T00:00")).toMatch(/after the start/);
  });

  it("rejects a flight longer than the platform maximum", () => {
    expect(flightWindowError("2026-01-01T00:00", "2027-06-01T00:00")).toMatch(/longer than 365 days/);
  });

  it("rejects an unparseable timestamp rather than reporting a valid window", () => {
    expect(flightWindowError("", "2026-12-01T00:00")).toMatch(/valid timestamps/);
  });
});

describe("budgetError", () => {
  it("rejects a daily budget above the total", () => {
    expect(budgetError(1_000, 2_000)).toMatch(/cannot exceed/);
  });

  it("accepts a daily budget below the total", () => {
    expect(budgetError(5_000_000, 25_000)).toBeNull();
  });

  it("stays quiet when no budget has been entered yet", () => {
    expect(budgetError(null, 5_000)).toBeNull();
    expect(budgetError(0, null)).toBeNull();
  });
});

describe("inventoryShareError", () => {
  it("accepts the inclusive bounds", () => {
    expect(inventoryShareError("0.01")).toBeNull();
    expect(inventoryShareError("1")).toBeNull();
  });

  it("rejects values outside the range", () => {
    expect(inventoryShareError("0")).toMatch(/0\.01/);
    expect(inventoryShareError("1.5")).toMatch(/0\.01/);
    expect(inventoryShareError("abc")).toBeTruthy();
  });
});

describe("toIso", () => {
  it("returns null for missing or unparseable input", () => {
    expect(toIso("")).toBeNull();
    expect(toIso(undefined)).toBeNull();
    expect(toIso("not-a-date")).toBeNull();
  });
});