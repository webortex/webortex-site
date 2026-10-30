/**
 * Device endpoints: ad decisioning and event ingestion for the screen player.
 *
 * These are the only routes authenticated by a device key rather than a user
 * token, and they are deliberately strict:
 *  - the device may only write events for the screen and vehicle it is bound to;
 *  - ingestion is idempotent by `eventId`, so a replayed offline queue is free;
 *  - the "what should I play next" endpoint is read-only and cheap, because a
 *    player calls it on every slot boundary.
 */

import { z } from "zod";
import type { ApiRouter, RouteContext } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { HANDLED } from "../lib/router.js";
import { parseJsonBody, parseQuery, first } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { assertDeviceOwnsTarget } from "../middleware/deviceAuth.js";
import { recordAudit } from "../middleware/audit.js";
import { isStaff, requirePermission, type AuthContext, type DeviceContext } from "../middleware/auth.js";
import { COLLECTIONS } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import {
  deviceHeartbeatSchema,
  engagementBatchSchema,
  playbackBatchSchema,
} from "../../../packages/shared/src/index.js";
import { ingestEngagementEvents, ingestPlaybackEvents } from "../domain/eventService.js";
import { nextCreativeForScreen, playlistWithMedia } from "../domain/deliveryService.js";
import { recordHeartbeat, rotateDeviceSecret } from "../domain/fleetService.js";

/**
 * Confirm a user may act on a specific device.
 *
 * Scoped to the caller's own vehicles rather than to a permission alone, because
 * a device secret is a bearer credential: whoever holds the new one controls the
 * screen. Without this, a vehicle owner holding `devices:write` could rotate the
 * secret of a competitor's screen and take it offline.
 */
async function assertUserOwnsDevice(user: AuthContext, deviceId: string): Promise<void> {
  if (isStaff(user)) return;

  const snapshot = await db().collection(COLLECTIONS.devices).doc(deviceId).get();
  if (!snapshot.exists) throw ApiError.notFound("Device not found.");

  const device = snapshot.data() as { vehicleId?: string | null; screenId?: string | null };
  if (device.vehicleId && user.vehicleIds.includes(device.vehicleId)) return;

  // An unassigned screen is claimable by staff only; treating a null vehicle as
  // "everyone's problem" would let any user seize an orphaned device.
  throw ApiError.forbidden("You can only manage devices assigned to your own vehicles.");
}

/**
 * Narrows the principal to a device. The router only resolves a device context
 * for `"device"` routes, so reaching the else branch means a wiring bug rather
 * than a client error, and it is reported as such rather than silently.
 */
function deviceOf(context: RouteContext): DeviceContext {
  const principal = context.principal;
  if (!principal || principal.kind !== "device") {
    throw ApiError.unauthorised("This endpoint requires device credentials.");
  }
  return principal;
}

const playlistQuerySchema = z.object({
  screenId: z.string().min(3).max(64).optional(),
  length: z.coerce.number().int().min(1).max(50).default(10),
});

export function registerDeviceRoutes(router: ApiRouter): void {
  /** Ad decision for the next slot. Called on every slot boundary. */
  router.get(
    "/device/next-creative",
    "device",
    async (context) => {
      const device = deviceOf(context);
      const screenId = first(context.query.screenId) ?? device.screenId;
      if (!screenId) throw ApiError.badRequest("Query parameter \"screenId\" is required for this device.");
      assertDeviceOwnsTarget(device, { screenId });
      return nextCreativeForScreen(screenId);
    },
    { rateLimit: RATE_LIMITS.read },
  );

  /** Pre-fetch a playlist so the player can buffer through a connectivity gap. */
  router.get(
    "/device/playlist",
    "device",
    async (context) => {
      const device = deviceOf(context);
      const query = parseQuery(playlistQuerySchema, context.query);
      // Defaults to the screen the device is bound to, so a player needs only
      // its own credentials to start.
      const screenId = query.screenId ?? device.screenId;
      if (!screenId) throw ApiError.conflict("This device is not bound to a screen yet.");
      assertDeviceOwnsTarget(device, { screenId });
      return playlistWithMedia(screenId, query.length);
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/device/heartbeat",
    "device",
    async (context) => {
      const device = deviceOf(context);
      const heartbeat = parseJsonBody(deviceHeartbeatSchema, context.body);
      // A device cannot heartbeat on behalf of another screen.
      assertDeviceOwnsTarget(device, { screenId: heartbeat.screenId, vehicleId: device.vehicleId });
      await recordHeartbeat(device.deviceId, { ...heartbeat, deviceId: device.deviceId });
      // Heartbeats are high-frequency and carry no useful response body.
      context.response.status(204).end();
      return HANDLED;
    },
    { rateLimit: RATE_LIMITS.events },
  );

  router.post(
    "/device/events/playback",
    "device",
    async (context) => {
      const device = deviceOf(context);
      const batch = parseJsonBody(playbackBatchSchema, context.body);
      for (const event of batch.events) {
        assertDeviceOwnsTarget(device, { screenId: event.screenId, vehicleId: event.vehicleId });
      }
      return ingestPlaybackEvents(batch.events, device);
    },
    { rateLimit: RATE_LIMITS.events },
  );

  router.post(
    "/device/events/engagement",
    "device",
    async (context) => {
      const device = deviceOf(context);
      const batch = parseJsonBody(engagementBatchSchema, context.body);
      for (const event of batch.events) {
        assertDeviceOwnsTarget(device, { screenId: event.screenId, vehicleId: event.vehicleId });
      }
      // Identity comes from the credential, not the payload.
      return ingestEngagementEvents(
        batch.events.map((event) => ({
          ...event,
          deviceId: device.deviceId,
          screenId: event.screenId ?? device.screenId,
          vehicleId: event.vehicleId ?? device.vehicleId,
        })),
      );
    },
    { rateLimit: RATE_LIMITS.events },
  );

  /**
   * Secret rotation. Requires a *user* token with device-write permission, not
   * the device key: a compromised player must not be able to re-provision
   * itself and lock the operator out.
   */
  router.post(
    "/devices/:deviceId/rotate-secret",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "devices:write");
      const deviceId = context.params.deviceId!;
      // Rotating a secret immediately bricks the screen until the new one is
      // installed, so permission alone is not enough: a vehicle owner with
      // `devices:write` must not be able to take another fleet's screen
      // offline. Staff may rotate any device; everyone else only their own.
      await assertUserOwnsDevice(user, deviceId);
      const { secret } = await rotateDeviceSecret(deviceId);
      await recordAudit({
        action: "DEVICE_SECRET_ROTATED",
        entityType: "DEVICE",
        entityId: deviceId,
        summary: "Device secret rotated",
        principal: user,
      });
      // The plaintext secret is returned exactly once and is never stored.
      return { deviceId, secret, warning: "This secret is shown once and cannot be retrieved again." };
    },
    { rateLimit: RATE_LIMITS.write },
  );
}
