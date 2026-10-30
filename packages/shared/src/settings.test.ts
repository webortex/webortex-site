/**
 * Settings defaulting invariants.
 *
 * `DEFAULT_PLATFORM_SETTINGS` is a module-level constant built by parsing a
 * near-empty object. If any section of `platformSettingsSchema` lacks a default,
 * that parse throws *at module load* — which means every Cloud Functions cold
 * start that imports the shared barrel crashes, and the stack trace points at the
 * barrel rather than at the omission. These tests make that failure loud and
 * local instead.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_SETTINGS,
  mergePlatformSettings,
  platformSettingsSchema,
} from "./settings.js";

describe("platform settings defaults", () => {
  it("parses an empty object into a complete settings document", () => {
    const parsed = platformSettingsSchema.parse({});
    for (const key of Object.keys(platformSettingsSchema.shape)) {
      expect(parsed, `section "${key}" is not defaulted`).toHaveProperty(key);
      expect(parsed[key as keyof typeof parsed]).toBeDefined();
    }
  });

  it("does not throw when the shared module is loaded", () => {
    // The real regression: this expression threw before the defaults were added.
    expect(() => platformSettingsSchema.parse({})).not.toThrow();
  });

  it("defaults notifications to in-app only, so seeding cannot email real addresses", () => {
    expect(DEFAULT_PLATFORM_SETTINGS.notifications.channels).toEqual(["IN_APP"]);
  });

  it("discards an invalid stored value field-by-field instead of failing", () => {
    const merged = mergePlatformSettings({ revenue: { platformShare: 999 } });
    expect(merged.revenue.platformShare).toBe(DEFAULT_PLATFORM_SETTINGS.revenue.platformShare);
    expect(merged.currency).toBe(DEFAULT_PLATFORM_SETTINGS.currency);
  });

  it("keeps valid stored values", () => {
    const merged = mergePlatformSettings({ currency: "USD", revenue: { platformShare: 0.3 } });
    expect(merged.currency).toBe("USD");
    expect(merged.revenue.platformShare).toBe(0.3);
  });

  it("rejects a configuration whose shares do not reconcile", () => {
    // platformShare + operationsReserve must leave room for drivers; a value
    // above 1 would mint money out of nothing.
    const result = platformSettingsSchema.safeParse({
      revenue: { platformShare: 0.8, operationsReserve: 0.5 },
    });
    expect(result.success).toBe(false);
  });
});
