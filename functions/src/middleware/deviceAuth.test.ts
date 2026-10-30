/**
 * Device binding: a device may only act for the screen and vehicle it is bound
 * to, and a device bound to nothing may act for nothing.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/admin.js", () => ({ db: () => ({}), nowIso: () => "" }));

const { assertDeviceOwnsTarget } = await import("./deviceAuth.js");

const bound = { kind: "device", deviceId: "DEV_1", screenId: "SCR_1", vehicleId: "VEH_1", correlationId: "c" } as const;
const unbound = { ...bound, screenId: null, vehicleId: null } as const;

describe("assertDeviceOwnsTarget", () => {
  it("allows the device's own screen and vehicle", () => {
    expect(() => assertDeviceOwnsTarget(bound, { screenId: "SCR_1", vehicleId: "VEH_1" })).not.toThrow();
  });

  it("refuses another screen or vehicle", () => {
    expect(() => assertDeviceOwnsTarget(bound, { screenId: "SCR_2" })).toThrow(/screen/);
    expect(() => assertDeviceOwnsTarget(bound, { vehicleId: "VEH_2" })).toThrow(/vehicle/);
  });

  it("refuses an unbound device claiming any screen or vehicle", () => {
    expect(() => assertDeviceOwnsTarget(unbound, { screenId: "SCR_1" })).toThrow(/screen/);
    expect(() => assertDeviceOwnsTarget(unbound, { vehicleId: "VEH_1" })).toThrow(/vehicle/);
  });

  it("allows events that claim no binding", () => {
    expect(() => assertDeviceOwnsTarget(unbound, { screenId: null, vehicleId: null })).not.toThrow();
  });
});
