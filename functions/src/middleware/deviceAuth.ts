/**
 * Device (screen player) authentication.
 *
 * The player presents `X-Device-Key: <plaintext secret>`; the API compares it
 * against a peppered SHA-256 of the stored hash with a constant-time compare.
 * The plaintext secret exists only in the enrolment response and is never stored.
 *
 * Comparison is constant-time so a timing oracle cannot be used to recover a hash
 * byte by byte.
 */

import { timingSafeEqual, createHmac } from "node:crypto";
import type { Request } from "firebase-functions/v1/https";
import { COLLECTIONS } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import { config } from "../lib/config.js";
import { ApiError, newCorrelationId } from "../lib/http.js";
import type { DeviceContext } from "./auth.js";

/** Server-side peppered hash. Never stored, never logged. */
export function hashDeviceSecret(plaintext: string): string {
  return createHmac("sha256", config.deviceSecretPepper).update(plaintext, "utf8").digest("hex");
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    // Still perform a comparison so the timing does not leak length via early return.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

export async function requireDevice(req: Request, correlationId = newCorrelationId()): Promise<DeviceContext> {
  const key = req.get("x-device-key");
  if (!key || key.length < 32 || key.length > 256) {
    throw ApiError.unauthorised("Missing or malformed device key.");
  }

  // Device ids are also supplied in the body/params; resolve the candidate
  // documents, then verify. The candidate list is derived from the key's prefix
  // so a lookup is a single range query rather than a scan.
  const deviceIdHint = req.get("x-device-id");
  let snapshot;
  if (deviceIdHint && /^[A-Za-z0-9_-]{3,64}$/.test(deviceIdHint)) {
    snapshot = await db().collection(COLLECTIONS.devices).doc(deviceIdHint).get();
  } else {
    return rejectDevice();
  }

  if (!snapshot.exists) return rejectDevice();
  const device = snapshot.data();
  if (!device || device.status === "DECOMMISSIONED") return rejectDevice();
  if (!constantTimeEquals(String(device.credentialHash ?? ""), hashDeviceSecret(key))) return rejectDevice();

  return {
    kind: "device",
    deviceId: snapshot.id,
    screenId: (device.screenId as string | null) ?? null,
    vehicleId: (device.vehicleId as string | null) ?? null,
    correlationId,
  };
}

function rejectDevice(): never {
  throw ApiError.unauthorised("Invalid device credentials.");
}

/**
 * Guard against a device writing events attributed to a different vehicle or
 * screen. Without this a compromised player could inflate another vehicle's
 * earnings.
 */
export function assertDeviceOwnsTarget(
  device: DeviceContext,
  claimed: { screenId?: string | null; vehicleId?: string | null },
): void {
  // A device with no binding is authorised for nothing. Skipping the check when
  // the device side is null let an unassigned (or freshly enrolled) device
  // post plays against any screen and pull any screen's playlist.
  if (claimed.screenId && claimed.screenId !== device.screenId) {
    throw ApiError.forbidden("This device is not authorised for the supplied screen.");
  }
  if (claimed.vehicleId && claimed.vehicleId !== device.vehicleId) {
    throw ApiError.forbidden("This device is not authorised for the supplied vehicle.");
  }
}