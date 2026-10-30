/**
 * Payload contracts for the portal's write forms, checked against the real
 * shared schemas so a browser/API drift fails here rather than as a 422.
 */

import { describe, expect, it } from "vitest";
import { campaignUpdateSchema, DEFAULT_PLATFORM_SETTINGS } from "../../../packages/shared/src/index.js";
import { buildCampaignPatch, editFormFromCampaign, toLocalInput } from "@/mobility-media/routes/campaignForm";
import { newIdempotencyKey, parseAmountMinor } from "@/mobility-media/lib/mutations";
import { editableSettingsText, validateSettingsText } from "@/mobility-media/routes/settingsValidation";
import { playerLink } from "@/mobility-media/routes/fleetOptions";
import { credentialsFromHash } from "@/mobility-player/credentials";

const campaign = {
  id: "CMP_1",
  name: "Monsoon run",
  category: "beverages",
  description: "",
  status: "DRAFT",
  budget: { totalMinor: 5_000_000, dailyMinor: null, pricingModel: "CPM", rateMinor: 250, currency: "INR" },
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: "2026-12-01T00:00:00.000Z",
};

describe("campaign edit payload", () => {
  it("round-trips a stored campaign into a schema-valid PATCH", () => {
    const patch = buildCampaignPatch(campaign, editFormFromCampaign(campaign));
    const parsed = campaignUpdateSchema.safeParse(patch);
    expect(parsed.success).toBe(true);
    expect(patch.budget).toEqual({ ...campaign.budget, totalMinor: 5_000_000, dailyMinor: null });
    expect(patch.startsAt).toBe(campaign.startsAt);
  });

  it("keeps the stored pricing model and rate when only amounts change", () => {
    const form = { ...editFormFromCampaign(campaign), total: "75000.50", daily: "2500" };
    const patch = buildCampaignPatch(campaign, form);
    expect(patch.budget).toMatchObject({ totalMinor: 7_500_050, dailyMinor: 250_000, pricingModel: "CPM", rateMinor: 250 });
  });

  it("formats datetime-local values without seconds", () => {
    expect(toLocalInput("not a date")).toBe("");
    expect(toLocalInput(campaign.startsAt)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe("money input", () => {
  it("parses major units into integer minor units", () => {
    expect(parseAmountMinor("100")).toBe(10_000);
    expect(parseAmountMinor("99.99")).toBe(9_999);
    expect(parseAmountMinor(" 0.10 ")).toBe(10);
  });

  it("rejects anything that is not a plain positive amount", () => {
    for (const bad of ["", "0", "-5", "1e3", "1.234", "abc", "1,000"]) expect(parseAmountMinor(bad)).toBeNull();
  });

  it("mints distinct, API-valid idempotency keys", () => {
    const a = newIdempotencyKey("credit");
    expect(a).not.toBe(newIdempotencyKey("credit"));
    expect(a).toMatch(/^credit_[A-Za-z0-9]+$/);
    expect(a.length).toBeGreaterThanOrEqual(8);
  });
});

describe("settings editor validation", () => {
  it("accepts the defaults unchanged", () => {
    const result = validateSettingsText(editableSettingsText(DEFAULT_PLATFORM_SETTINGS), DEFAULT_PLATFORM_SETTINGS);
    expect(result.errors).toBeUndefined();
  });

  it("names the field path of an invalid value", () => {
    const edited = JSON.parse(editableSettingsText(DEFAULT_PLATFORM_SETTINGS));
    edited.maxAdvertiserInventoryShare = 7;
    const result = validateSettingsText(JSON.stringify(edited), DEFAULT_PLATFORM_SETTINGS);
    expect(result.errors?.[0]).toMatch(/^maxAdvertiserInventoryShare:/);
  });

  it("reports malformed JSON instead of throwing", () => {
    expect(validateSettingsText("{ nope", DEFAULT_PLATFORM_SETTINGS).errors?.[0]).toMatch(/Not valid JSON/);
  });
});

describe("player provisioning link", () => {
  it("is read back by the player exactly", () => {
    const key = "a+b/c=".repeat(8);
    const link = playerLink("DEV_9", key, "https://www.webortex.com");
    expect(link.startsWith("https://www.webortex.com/player#")).toBe(true);
    expect(credentialsFromHash(new URL(link).hash)).toEqual({ deviceId: "DEV_9", deviceKey: key });
  });
});
