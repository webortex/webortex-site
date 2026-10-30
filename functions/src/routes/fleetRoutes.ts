/**
 * Fleet endpoints: vehicles, drivers, screens and devices.
 *
 * Device health is never read from the stored `status` field alone. Heartbeat
 * freshness is derived server-side, so a screen that stopped reporting shows as
 * offline even though nothing wrote a new status to Firestore.
 */

import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { clampInt, first, list, parseJsonBody } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { assertOwnsVehicle, isStaff, requirePermission, type AuthContext } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  deviceEnrolSchema,
  driverStatusSchema,
  screenCreateSchema,
  vehicleCreateSchema,
  vehicleStatusSchema,
} from "../lib/fleetInputs.js";
import {
  createScreen,
  createVehicle,
  currentNetworkOffset,
  enrolDevice,
  listDriversForFleet,
  listScreensWithDerivedStatus,
  listVehiclesForFleet,
  screenHealthSummary,
  setDriverStatus,
  setVehicleStatus,
} from "../domain/fleetService.js";

function scopeVehicles(user: AuthContext, requested: string[] | undefined): string[] | undefined {
  if (isStaff(user)) return requested;
  // Drivers are silently narrowed to their own vehicles rather than being told
  // a vehicle exists that they may not see.
  return requested ? requested.filter((id) => user.vehicleIds.includes(id)) : [...user.vehicleIds];
}


export function registerFleetRoutes(router: ApiRouter): void {
  router.get(
    "/fleet/vehicles",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "vehicles:read");
      const requested = list(context.query.vehicleIds, 100);
      if (requested && requested.length > 0 && !isStaff(user)) {
        const permitted = requested.filter((id) => user.vehicleIds.includes(id));
        if (permitted.length !== requested.length) {
          throw ApiError.forbidden("You can only view vehicles assigned to you.");
        }
      }
      const items = await listVehiclesForFleet({
        limit: clampInt(first(context.query.limit), 1, 500, 100),
        statusFilter: first(context.query.status),
        cityId: first(context.query.cityId) ?? null,
        vehicleIds: scopeVehicles(user, requested),
      });
      return { items };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/fleet/vehicles",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "vehicles:write");
      const input = parseJsonBody(vehicleCreateSchema, context.body);
      // A non-staff caller cannot assign a vehicle to somebody else's account.
      const vehicle = await createVehicle(
        { ...input, ownerUserId: isStaff(user) ? (input.ownerUserId ?? null) : user.userId },
        user.userId,
      );
      await recordAudit({
        action: "VEHICLE_CREATED",
        entityType: "VEHICLE",
        entityId: vehicle.id,
        summary: `Vehicle ${vehicle.registrationNumber} registered`,
        principal: user,
      });
      return vehicle;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/fleet/vehicles/:vehicleId/status",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "vehicles:write");
      const vehicleId = context.params.vehicleId!;
      // Ownership is enforced even for staff-level writes, so a mistake in the
      // UI cannot reassign another tenant's vehicle.
      assertOwnsVehicle(user, vehicleId);
      const body = parseJsonBody(vehicleStatusSchema, context.body);
      const vehicle = await setVehicleStatus(vehicleId, body.status, { reason: body.reason });
      await recordAudit({
        action: "VEHICLE_STATUS_CHANGED",
        entityType: "VEHICLE",
        entityId: vehicle.id,
        summary: `Vehicle ${vehicle.registrationNumber} set to ${body.status}`,
        metadata: { reason: body.reason },
        principal: user,
      });
      return vehicle;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.get(
    "/fleet/screens",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "screens:read");
      const requested = list(context.query.vehicleIds, 100);
      if (requested && !isStaff(user)) {
        const permitted = requested.filter((id) => user.vehicleIds.includes(id));
        if (permitted.length !== requested.length) {
          throw ApiError.forbidden("You can only view vehicles assigned to you.");
        }
      }
      const items = await listScreensWithDerivedStatus({
        limit: clampInt(first(context.query.limit), 1, 500, 100),
        statusFilter: first(context.query.status),
        cityId: first(context.query.cityId) ?? null,
      });
      const allowed = scopeVehicles(user, requested);
      const filtered = allowed ? items.filter((screen) => !screen.vehicleId || allowed.includes(screen.vehicleId)) : items;
      return { items: filtered, networkOffsetMinutes: await currentNetworkOffset() };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/fleet/screens/health",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "screens:read");
      return screenHealthSummary();
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/fleet/screens",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "screens:write");
      const input = parseJsonBody(screenCreateSchema, context.body);
      if (input.vehicleId) assertOwnsVehicle(user, input.vehicleId);
      const screen = await createScreen(input);
      await recordAudit({
        action: "SCREEN_CREATED",
        entityType: "SCREEN",
        entityId: screen.id,
        summary: `Screen ${screen.code} registered`,
        principal: user,
      });
      return screen;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/fleet/devices/enrol",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "devices:write");
      const input = parseJsonBody(deviceEnrolSchema, context.body);
      if (input.vehicleId) assertOwnsVehicle(user, input.vehicleId);
      const result = await enrolDevice(input);
      await recordAudit({
        action: "DEVICE_ENROLLED",
        entityType: "DEVICE",
        entityId: result.device.id,
        summary: `Device ${result.device.code} enrolled`,
        principal: user,
      });
      // The plaintext secret is returned once here and never stored in plaintext.
      return result;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.get(
    "/fleet/drivers",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "drivers:read");
      const items = await listDriversForFleet({
        limit: clampInt(first(context.query.limit), 1, 200, 50),
        status: first(context.query.status),
      });
      // A driver sees only their own record.
      const visible = isStaff(user)
        ? items
        : items.filter((driver) => !user.driverId || driver.id === user.driverId);
      return { items: visible };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/fleet/drivers/:driverId/status",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "drivers:write");
      const driverId = context.params.driverId!;
      const body = parseJsonBody(driverStatusSchema, context.body);
      const driver = await setDriverStatus(driverId, body.status, { reason: body.reason });
      await recordAudit({
        action: "DRIVER_STATUS_CHANGED",
        entityType: "DRIVER",
        entityId: driver.id,
        summary: `Driver ${driver.code} set to ${body.status}`,
        metadata: { reason: body.reason },
        principal: user,
      });
      return driver;
    },
    { rateLimit: RATE_LIMITS.write },
  );
}

