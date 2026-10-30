/**
 * Permission helpers.
 *
 * These decide what gets rendered. They never authorise anything — the API
 * re-checks every request — but a wrong result here means a user sees controls
 * they cannot use, or misses ones they can.
 */

import { describe, expect, it } from "vitest";
import {
  AREA_PERMISSIONS,
  areaDeniedReason,
  canAccessArea,
  hasAnyPermission,
  hasEveryPermission,
  hasPermission,
} from "@/mobility-media/auth/permissions";

describe("hasPermission", () => {
  it("grants a permission the server returned", () => {
    expect(hasPermission(["campaigns:read"], "campaigns:read")).toBe(true);
  });

  it("denies a permission the server did not return", () => {
    expect(hasPermission(["campaigns:read"], "finance:write")).toBe(false);
  });

  it("denies an empty permission list", () => {
    // This is the important case: a session that failed to load permissions must
    // deny everything, not allow everything.
    expect(hasPermission([], "campaigns:read")).toBe(false);
  });

  it("denies a missing or malformed permission list", () => {
    expect(hasPermission(undefined, "campaigns:read")).toBe(false);
    expect(hasPermission(null, "campaigns:read")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("grants when one of the required permissions is present", () => {
    expect(hasAnyPermission(["finance:read"], ["finance:write", "finance:read"])).toBe(true);
  });

  it("denies when none are present", () => {
    expect(hasAnyPermission(["campaigns:read"], ["finance:write", "finance:read"])).toBe(false);
  });

  it("denies for an empty list", () => {
    expect(hasAnyPermission([], ["finance:read"])).toBe(false);
  });
});

describe("hasEveryPermission", () => {
  it("grants only when all are present", () => {
    expect(hasEveryPermission(["finance:read", "finance:write"], ["finance:read", "finance:write"])).toBe(true);
    expect(hasEveryPermission(["finance:read"], ["finance:read", "finance:write"])).toBe(false);
  });

  it("grants an empty requirement", () => {
    expect(hasEveryPermission([], [])).toBe(true);
  });
});

describe("canAccessArea", () => {
  it("opens an area with no required permission to any signed-in user", () => {
    expect(AREA_PERMISSIONS.dashboard).toBeNull();
    expect(canAccessArea([], "dashboard")).toBe(true);
  });

  it("requires the mapped permission where one exists", () => {
    expect(canAccessArea(["campaigns:read"], "campaigns")).toBe(true);
    expect(canAccessArea(["support:read"], "campaigns")).toBe(false);
  });

  it("opens finance to either wallet access or payout access", () => {
    // A driver holds `payouts:read` but not `finance:read`. Requiring only the
    // stricter one would deny the screen and hide the earnings they may read.
    expect(canAccessArea(["finance:read"], "finance")).toBe(true);
    expect(canAccessArea(["payouts:read"], "finance")).toBe(true);
    expect(canAccessArea(["support:read"], "finance")).toBe(false);
  });

  it("opens settings to any signed-in role, since the API narrows the response", () => {
    expect(AREA_PERMISSIONS.settings).toBe("platform:read");
    expect(canAccessArea(["platform:read"], "settings")).toBe(true);
  });

  it("denies every gated area when permissions failed to load", () => {
    for (const area of ["finance", "campaigns", "settings", "fleet"]) {
      expect(canAccessArea([], area)).toBe(false);
    }
  });
});

describe("areaDeniedReason", () => {
  it("explains a denial rather than leaving a silent absence", () => {
    // A missing navigation entry with no explanation reads as a bug.
    expect(areaDeniedReason("finance").toLowerCase()).toContain("finance");
    expect(areaDeniedReason("campaigns").length).toBeGreaterThan(0);
  });

  it("falls back to a generic reason for an unknown area", () => {
    expect(areaDeniedReason("nonsense").length).toBeGreaterThan(0);
  });
});