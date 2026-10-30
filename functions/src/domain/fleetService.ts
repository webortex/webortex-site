/**
 * Fleet service: vehicles, screens, devices, drivers and heartbeats.
 *
 * Heartbeat handling is the operational heart of the network. Status is derived
 * from the last heartbeat against configurable thresholds rather than stored as
 * an independent field, so a device that silently dies is reflected in the
 * dashboard without any scheduled job having to run first.
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  canTransition,
  COLLECTIONS,
  newId,
  newReference,
  type Device,
  type DeviceHeartbeat,
  type Driver,
  type Screen,
  type Vehicle,
  type WorkflowStatus,
} from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings, networkTimezoneOffsetMinutes } from "./settingsService.js";
import { hashDeviceSecret } from "../middleware/deviceAuth.js";
import { newDeviceSecret } from "../../../packages/shared/src/ids.js";

function collection(name: string) {
  return db().collection(name);
}

export async function createVehicle(
  input: {
    type: Vehicle["type"];
    registrationNumber: string;
    make?: string;
    model?: string;
    year?: number | null;
    colour?: string;
    cityId?: string | null;
    homeZoneId?: string | null;
    driverId?: string | null;
    ownerUserId?: string | null;
    notes?: string;
  },
  actorId: string,
): Promise<Vehicle> {
  const existing = await collection(COLLECTIONS.vehicles)
    .where("registrationNumber", "==", input.registrationNumber)
    .limit(1)
    .get();
  if (!existing.empty) {
    throw ApiError.conflict("A vehicle with this registration number already exists.");
  }

  const id = newId("VHC");
  const now = nowIso();
  const document = {
    id,
    code: newReference("VHC"),
    ownerUserId: input.ownerUserId ?? null,
    ownerDriverId: null,
    driverId: input.driverId ?? null,
    type: input.type,
    groupId: null,
    registrationNumber: input.registrationNumber.toUpperCase(),
    make: input.make ?? "",
    model: input.model ?? "",
    year: input.year ?? null,
    colour: input.colour ?? "",
    cityId: input.cityId ?? null,
    homeZoneId: input.homeZoneId ?? null,
    status: "PENDING" as WorkflowStatus,
    installedOn: undefined,
    retiredOn: undefined,
    documents: [],
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };

  await collection(COLLECTIONS.vehicles).doc(id).set(document);

  if (input.driverId) await linkDriverToVehicle(id, input.driverId);

  const snapshot = await collection(COLLECTIONS.vehicles).doc(id).get();
  void actorId;
  return snapshot.data() as Vehicle;
}

export async function setVehicleStatus(
  vehicleId: string,
  target: WorkflowStatus,
  options: { reason?: string } = {},
): Promise<Vehicle> {
  const ref = collection(COLLECTIONS.vehicles).doc(vehicleId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw ApiError.notFound("Vehicle not found.");
  const vehicle = snapshot.data() as Vehicle;
  const from = vehicle.status as WorkflowStatus;

  if (!canTransition(from, target)) {
    throw ApiError.conflict(`A vehicle in "${vehicle.status}" cannot be moved to "${target}".`);
  }
  if ((target === "SUSPENDED" || target === "RETIRED") && !options.reason) {
    throw ApiError.badRequest("A reason is required to suspend or retire a vehicle.");
  }
  if (target === "RETIRED") {
    // Retiring a vehicle must take its screen offline, otherwise the device keeps
    // selling inventory that no longer has an earning vehicle behind it.
    await releaseVehicleScreens(vehicleId);
  }

  const now = nowIso();
  await ref.update({
    status: target,
    updatedAt: now,
    ...(target === "RETIRED" ? { retiredOn: now.slice(0, 10) } : {}),
    ...(target === "ACTIVE" && !vehicle.installedOn ? { installedOn: now.slice(0, 10) } : {}),
    ...(options.reason ? { statusReason: options.reason } : {}),
  });

  const updated = await ref.get();
  return updated.data() as Vehicle;
}

async function releaseVehicleScreens(vehicleId: string): Promise<void> {
  const screens = await collection(COLLECTIONS.screens).where("vehicleId", "==", vehicleId).limit(50).get();
  if (screens.empty) return;
  const batch = db().batch();
  for (const doc of screens.docs) {
    batch.update(doc.ref, { status: "MAINTENANCE", updatedAt: nowIso() });
    const deviceId = doc.data().deviceId as string | null;
    if (deviceId) batch.update(collection(COLLECTIONS.devices).doc(deviceId), { status: "MAINTENANCE", updatedAt: nowIso() });
  }
  await batch.commit();
}

async function linkDriverToVehicle(vehicleId: string, driverId: string): Promise<void> {
  const batch = db().batch();
  batch.update(collection(COLLECTIONS.vehicles).doc(vehicleId), { driverId, updatedAt: nowIso() });
  batch.set(
    collection(COLLECTIONS.drivers).doc(driverId),
    { currentVehicleId: vehicleId, updatedAt: nowIso() },
    { merge: true },
  );
  await batch.commit();
}

export async function createScreen(input: {
  vehicleId?: string | null;
  screenType?: Screen["screenType"];
  resolutionWidthPx?: number;
  resolutionHeightPx?: number;
  orientation?: Screen["orientation"];
}): Promise<Screen> {
  const id = newId("SCR");
  const now = nowIso();
  const document = {
    id,
    code: newReference("SCR"),
    vehicleId: input.vehicleId ?? null,
    deviceId: null,
    screenType: input.screenType ?? "LCD",
    resolutionWidthPx: input.resolutionWidthPx ?? 1920,
    resolutionHeightPx: input.resolutionHeightPx ?? 1080,
    orientation: input.orientation ?? "LANDSCAPE",
    brightnessPercent: null,
    status: "UNASSIGNED" as WorkflowStatus,
    installedOn: undefined,
    createdAt: now,
    updatedAt: now,
  };
  await collection(COLLECTIONS.screens).doc(id).set(document);
  const snapshot = await collection(COLLECTIONS.screens).doc(id).get();
  return snapshot.data() as Screen;
}

/**
 * Enrol a device.
 *
 * Returns the plaintext secret exactly once. Only its peppered hash is stored, so
 * a lost secret can only be replaced by rotation, never recovered.
 */
export async function enrolDevice(input: {
  screenId?: string | null;
  vehicleId?: string | null;
  model?: string;
  manufacturer?: string;
  firmwareVersion?: string;
  appVersion?: string;
}): Promise<{ device: Device; secret: string }> {
  let vehicleId = input.vehicleId ?? null;
  if (input.screenId) {
    const screen = await collection(COLLECTIONS.screens).doc(input.screenId).get();
    if (!screen.exists) throw ApiError.notFound("Screen not found.");
    // A device inherits the vehicle of the screen it drives. Without this, a
    // device enrolled against a screen alone has no vehicle, so its plays are
    // never attributed and the driver is never paid for them.
    const screenVehicleId = (screen.data()?.vehicleId as string | null | undefined) ?? null;
    if (vehicleId && screenVehicleId && vehicleId !== screenVehicleId) {
      throw ApiError.unprocessable("That screen is fitted to a different vehicle.");
    }
    vehicleId = vehicleId ?? screenVehicleId;
  }
  if (vehicleId) {
    const vehicle = await collection(COLLECTIONS.vehicles).doc(vehicleId).get();
    if (!vehicle.exists) throw ApiError.notFound("Vehicle not found.");
  }

  const secret = newDeviceSecret();
  const id = newId("DEV");
  const now = nowIso();
  const document = {
    id,
    code: newReference("DEV"),
    screenId: input.screenId ?? null,
    vehicleId,
    credentialHash: hashDeviceSecret(secret),
    model: input.model ?? "",
    manufacturer: input.manufacturer ?? "",
    firmwareVersion: input.firmwareVersion ?? "",
    appVersion: input.appVersion ?? "",
    networkStatus: "UNKNOWN",
    simCarrier: "",
    powerSource: "UNKNOWN",
    batteryPercent: null,
    storageUsedPercent: null,
    temperatureCelsius: null,
    status: (input.screenId ? "ASSIGNED" : "UNASSIGNED") as WorkflowStatus,
    lastHeartbeatAt: null,
    lastScreenshotUrl: null,
    lastSyncAt: null,
    lastKnownLocation: null,
    currentCreativeId: null,
    currentCampaignId: null,
    pendingEventCount: 0,
    errorCount24h: 0,
    enrolledAt: now,
    updatedAt: now,
  };

  const batch = db().batch();
  batch.set(collection(COLLECTIONS.devices).doc(id), document);
  if (input.screenId) {
    batch.update(collection(COLLECTIONS.screens).doc(input.screenId), { deviceId: id, status: "ASSIGNED", updatedAt: now });
  }
  await batch.commit();

  const snapshot = await collection(COLLECTIONS.devices).doc(id).get();
  return { device: snapshot.data() as Device, secret };
}

export async function rotateDeviceSecret(deviceId: string): Promise<{ secret: string }> {
  const secret = newDeviceSecret();
  await collection(COLLECTIONS.devices).doc(deviceId).update({
    credentialHash: hashDeviceSecret(secret),
    updatedAt: nowIso(),
  });
  return { secret };
}

/**
 * Record a heartbeat.
 *
 * The status stored on the device is only allowed to move ONLINE -> OFFLINE, and
 * only via the reconciliation sweep. Here we persist the telemetry and let
 * `deriveDeviceStatus` compute the effective status at read time, so the dashboard
 * is always current even if the sweep has not run.
 */
export async function recordHeartbeat(deviceId: string, heartbeat: DeviceHeartbeat): Promise<void> {
  const settings = await getSettings();
  const firestore = db();
  const deviceRef = collection(COLLECTIONS.devices).doc(deviceId);
  const screenId = heartbeat.screenId ?? null;

  const patch: Record<string, unknown> = {
    lastHeartbeatAt: heartbeat.timestamp,
    lastSyncAt: heartbeat.timestamp,
    firmwareVersion: heartbeat.firmwareVersion || undefined,
    appVersion: heartbeat.appVersion || undefined,
    networkStatus: heartbeat.networkStatus,
    pendingEventCount: heartbeat.pendingEventCount,
    updatedAt: nowIso(),
    lastHeartbeatTs: FieldValue.serverTimestamp(),
  };
  if (heartbeat.simCarrier !== undefined) patch.simCarrier = heartbeat.simCarrier;
  if (heartbeat.powerSource !== undefined) patch.powerSource = heartbeat.powerSource;
  if (heartbeat.batteryPercent !== undefined && heartbeat.batteryPercent !== null) patch.batteryPercent = heartbeat.batteryPercent;
  if (heartbeat.storageUsedPercent !== undefined && heartbeat.storageUsedPercent !== null) patch.storageUsedPercent = heartbeat.storageUsedPercent;
  if (heartbeat.temperatureCelsius !== undefined && heartbeat.temperatureCelsius !== null) patch.temperatureCelsius = heartbeat.temperatureCelsius;
  if (heartbeat.currentCreativeId !== undefined) patch.currentCreativeId = heartbeat.currentCreativeId;
  if (heartbeat.currentCampaignId !== undefined) patch.currentCampaignId = heartbeat.currentCampaignId;

  const location = heartbeat.location ? coarsenLocation(heartbeat.location, settings.retention) : null;
  if (location) patch.lastKnownLocation = location;

  const batch = firestore.batch();
  batch.set(deviceRef, patch, { merge: true });

  if (screenId) {
    batch.set(collection(COLLECTIONS.screens).doc(screenId), { status: "ONLINE", updatedAt: nowIso() }, { merge: true });
  }

  // Vehicle-level last-seen is what drives driver "active today" and reliability.
  const deviceSnapshot = await deviceRef.get();
  const vehicleId = (deviceSnapshot.data()?.vehicleId as string | null) ?? null;
  if (vehicleId) {
    batch.set(
      collection(COLLECTIONS.vehicles).doc(vehicleId),
      {
        lastActiveAt: heartbeat.timestamp,
        lastKnownLocation: location,
        ...(location ? {} : {}),
        updatedAt: nowIso(),
      },
      { merge: true },
    );
  }

  await batch.commit();
}

/**
 * Drop GPS precision before persisting.
 *
 * This is the primary privacy control for passenger-facing inventory: the network
 * needs "which zone was this screen in", never "which passenger was in it".
 */
export function coarsenLocation(
  coordinates: { lat: number; lng: number; accuracyMetres?: number; rounded?: boolean },
  retention: { storePreciseGps: boolean; minGpsAccuracyMeters: number },
): { lat: number; lng: number; accuracyMetres?: number; rounded: boolean } | null {
  if (retention.storePreciseGps) return { ...coordinates, rounded: false };
  const accuracy = coordinates.accuracyMetres ?? 0;
  if (accuracy > 0 && accuracy < retention.minGpsAccuracyMeters) {
    // Too imprecise to place reliably; drop the fix rather than guess.
    return null;
  }
  // ~110 m grid. Enough to resolve a zone, useless for tracing a vehicle route.
  const grid = 0.001;
  return {
    lat: Math.round(coordinates.lat / grid) * grid,
    lng: Math.round(coordinates.lng / grid) * grid,
    accuracyMetres: accuracy,
    rounded: true,
  };
}

export interface DerivedDeviceStatus {
  readonly status: "ONLINE" | "OFFLINE" | "DEGRADED";
  readonly msSinceHeartbeat: number | null;
  readonly severity: "healthy" | "warning" | "offline" | "unknown";
}

/** Effective device status derived from the last heartbeat and configured thresholds. */
export function deriveDeviceStatus(
  device: Pick<Device, "lastHeartbeatAt" | "status" | "networkStatus">,
  thresholds: { warningAfterMs: number; offlineAfterMs: number; neverSeenAfterMs: number },
  nowMs = Date.now(),
): DerivedDeviceStatus {
  if (device.status === "DECOMMISSIONED") {
    return { status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" };
  }
  if (device.status === "MAINTENANCE" || device.status === "UNASSIGNED") {
    return { status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" };
  }
  if (!device.lastHeartbeatAt) {
    return { status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" };
  }
  const msSinceHeartbeat = nowMs - Date.parse(device.lastHeartbeatAt);
  if (Number.isNaN(msSinceHeartbeat)) {
    return { status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" };
  }
  if (msSinceHeartbeat >= thresholds.offlineAfterMs) {
    return { status: "OFFLINE", msSinceHeartbeat, severity: "offline" };
  }
  if (msSinceHeartbeat >= thresholds.warningAfterMs) {
    return { status: "DEGRADED", msSinceHeartbeat, severity: "warning" };
  }
  if (device.networkStatus === "NONE") {
    return { status: "DEGRADED", msSinceHeartbeat, severity: "warning" };
  }
  return { status: "ONLINE", msSinceHeartbeat, severity: "healthy" };
}

/**
 * Sweep that persists OFFLINE so alerting and the screen list agree with the
 * derived status. Idempotent and cheap enough to run every minute.
 */
export async function reconcileDeviceStatus(): Promise<{ offline: number; recovered: number }> {
  const settings = await getSettings();
  const cutoff = new Date(Date.now() - settings.heartbeat.warningAfterMs).toISOString();
  const devices = await collection(COLLECTIONS.devices)
    .where("status", "in", ["ASSIGNED", "ONLINE", "OFFLINE", "DEGRADED"])
    .limit(500)
    .get();

  const now = nowIso();
  const batch = db().batch();
  let offline = 0;
  let recovered = 0;
  const touchedScreens = new Set<string>();

  for (const doc of devices.docs) {
    const device = doc.data() as Device;
    const derived = deriveDeviceStatus(device, settings.heartbeat);
    if (derived.status === "OFFLINE" && device.status !== "OFFLINE") {
      batch.update(doc.ref, { status: "OFFLINE", updatedAt: now });
      offline += 1;
      if (device.screenId) touchedScreens.add(device.screenId);
    } else if (derived.status === "ONLINE" && device.status !== "ONLINE") {
      batch.update(doc.ref, { status: "ONLINE", updatedAt: now });
      recovered += 1;
      if (device.screenId) touchedScreens.add(device.screenId);
    } else if (derived.status === "DEGRADED" && device.status !== "DEGRADED") {
      batch.update(doc.ref, { status: "DEGRADED", updatedAt: now });
      if (device.screenId) touchedScreens.add(device.screenId);
    }
  }

  for (const screenId of touchedScreens) {
    batch.set(collection(COLLECTIONS.screens).doc(screenId), { updatedAt: now }, { merge: true });
  }

  if (offline + recovered > 0) await batch.commit();
  void cutoff;
  return { offline, recovered };
}

export async function listScreensWithDerivedStatus(options: {
  limit: number;
  statusFilter?: string;
  cityId?: string | null;
}): Promise<(Screen & { derivedStatus: string; lastHeartbeatAt: string | null })[]> {
  const settings = await getSettings();
  let query = collection(COLLECTIONS.screens).orderBy("createdAt").limit(options.limit);
  if (options.statusFilter && options.statusFilter !== "ALL") {
    query = collection(COLLECTIONS.screens).where("status", "==", options.statusFilter).orderBy("createdAt").limit(options.limit);
  }
  const snapshot = await query.get();
  if (snapshot.empty) return [];

  const screens = snapshot.docs.map((doc) => doc.data() as Screen);

  // Devices are looked up by the id the *screen* records, not by the screen's
  // own id: `SCR-…` and `DEV-…` are different documents in different
  // collections, and conflating them made every screen look offline.
  const deviceIds = Array.from(
    new Set(
      screens
        .map((screen) => (screen.deviceId ? String(screen.deviceId) : ""))
        .filter((id) => id.length > 0),
    ),
  );
  const deviceById = new Map<string, Device>();
  if (deviceIds.length > 0) {
    const deviceSnapshots = await db().getAll(...deviceIds.map((id) => collection(COLLECTIONS.devices).doc(id)));
    for (const deviceSnapshot of deviceSnapshots) {
      if (deviceSnapshot.exists) deviceById.set(deviceSnapshot.id, deviceSnapshot.data() as Device);
    }
  }

  return screens.map((screen) => {
    const device = screen.deviceId ? deviceById.get(String(screen.deviceId)) : undefined;
    const derived = device
      ? deriveDeviceStatus(device, settings.heartbeat)
      : ({ status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" } as const);
    return { ...screen, derivedStatus: derived.status, lastHeartbeatAt: device?.lastHeartbeatAt ?? null };
  });
}

/**
 * List vehicles for the fleet console.
 *
 * `vehicleIds` is a caller-supplied scope (a driver's own assignment, or a
 * staff-selected subset). The post-read filter is deliberate: a driver whose
 * scope is enforced only in the query could still learn the size of the fleet
 * from the result count.
 */
export async function listVehiclesForFleet(options: {
  limit: number;
  statusFilter?: string;
  cityId?: string | null;
  vehicleIds?: readonly string[];
}): Promise<Vehicle[]> {
  const allowed = options.vehicleIds ? new Set(options.vehicleIds) : null;

  let query = collection(COLLECTIONS.vehicles).orderBy("createdAt").limit(options.limit);
  if (options.statusFilter && options.statusFilter !== "ALL") {
    query = collection(COLLECTIONS.vehicles)
      .where("status", "==", options.statusFilter)
      .orderBy("createdAt")
      .limit(options.limit);
  }
  if (options.cityId) {
    query = collection(COLLECTIONS.vehicles)
      .where("cityId", "==", options.cityId)
      .orderBy("createdAt")
      .limit(options.limit);
  }

  const snapshot = await query.get();
  const vehicles = snapshot.docs.map((doc) => doc.data() as Vehicle);
  return allowed ? vehicles.filter((vehicle) => allowed.has(vehicle.id)) : vehicles;
}

export async function screenHealthSummary(): Promise<{
  total: number;
  online: number;
  offline: number;
  degraded: number;
  maintenance: number;
  unassigned: number;
}> {
  const settings = await getSettings();
  const devices = await collection(COLLECTIONS.devices).limit(5000).get();
  const counts = { total: 0, online: 0, offline: 0, degraded: 0, maintenance: 0, unassigned: 0 };

  for (const doc of devices.docs) {
    const device = doc.data() as Device;
    counts.total += 1;
    if (device.status === "MAINTENANCE") {
      counts.maintenance += 1;
    } else if (device.status === "UNASSIGNED" || device.status === "DECOMMISSIONED") {
      counts.unassigned += 1;
    } else {
      const derived = deriveDeviceStatus(device, settings.heartbeat);
      if (derived.status === "ONLINE") counts.online += 1;
      else if (derived.status === "DEGRADED") counts.degraded += 1;
      else counts.offline += 1;
    }
  }
  return counts;
}

export async function listDriversForFleet(options: { limit: number; status?: string }): Promise<Driver[]> {
  let query = collection(COLLECTIONS.drivers).orderBy("createdAt").limit(options.limit);
  if (options.status && options.status !== "ALL") {
    query = collection(COLLECTIONS.drivers).where("status", "==", options.status).orderBy("createdAt").limit(options.limit);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as Driver);
}

export async function setDriverStatus(
  driverId: string,
  target: WorkflowStatus,
  options: { reason?: string } = {},
): Promise<Driver> {
  const ref = collection(COLLECTIONS.drivers).doc(driverId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw ApiError.notFound("Driver not found.");
  const driver = snapshot.data() as Driver;
  if (!canTransition(driver.status as WorkflowStatus, target)) {
    throw ApiError.conflict(`A driver in "${driver.status}" cannot be moved to "${target}".`);
  }
  const patch: Record<string, unknown> = { status: target, updatedAt: nowIso() };
  if (target === "UNDER_REVIEW" || target === "APPROVED" || target === "REJECTED") {
    patch.reviewedAt = nowIso();
  }
  if (options.reason) patch.rejectionReason = options.reason;
  await ref.update(patch);
  const updated = await ref.get();
  return updated.data() as Driver;
}

/** Assign the network timezone offset so a player's local day matches the platform's. */
export async function currentNetworkOffset(): Promise<number> {
  return networkTimezoneOffsetMinutes(await getSettings());
}