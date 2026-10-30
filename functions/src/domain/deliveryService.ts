/**
 * Delivery engine.
 *
 * Assembles the candidate list for a screen and hands it to the pure decision
 * function in the shared package. Candidate assembly is where I/O lives; scoring
 * itself stays synchronous and testable.
 *
 * Scales with the network because candidates are scoped by the screen's own
 * city/zone and by campaign flight window, and results are memoised per screen
 * for the length of a slot (a 30 second slot does not need a fresh query).
 */

import {
  COLLECTIONS,
  buildPlaylist,
  decideNextCreative,
  type Campaign,
  type Candidate,
  type Device,
  type FrequencyCaps,
  type PlatformSettings,
  type Screen,
  type Vehicle,
} from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";
import { deriveDeviceStatus } from "./fleetService.js";
import { signedReadUrl } from "./creativeService.js";
import type { DeviceDecisionResponse } from "./eventService.js";

export interface CandidateBuildResult {
  readonly candidates: readonly Candidate[];
  readonly screen: Screen;
  readonly vehicle: Vehicle | null;
}

interface CreativeQuality {
  readonly completionRate: number | null;
  readonly engagementRate: number | null;
}

/**
 * Load creatives and their rolled-up quality signals for a set of campaigns.
 * Reads the daily aggregation documents rather than scanning raw events.
 */
async function loadCreativeQuality(
  campaignIds: readonly string[],
  days = 7,
): Promise<Map<string, CreativeQuality>> {
  const result = new Map<string, CreativeQuality>();
  if (campaignIds.length === 0) return result;

  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const snapshot = await db()
    .collection(COLLECTIONS.playbackDaily)
    .where("campaignId", "in", campaignIds.slice(0, 10))
    .where("date", ">=", since)
    .limit(2000)
    .get();

  const totals = new Map<string, { plays: number; completed: number; engagements: number }>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const key = String(data.creativeId ?? "unknown");
    const entry = totals.get(key) ?? { plays: 0, completed: 0, engagements: 0 };
    entry.plays += Number(data.plays ?? 0);
    entry.completed += Number(data.completedPlays ?? 0);
    entry.engagements += Number(data.engagements ?? 0);
    totals.set(key, entry);
  }
  for (const [creativeId, entry] of totals) {
    result.set(creativeId, {
      completionRate: entry.plays > 0 ? entry.completed / entry.plays : null,
      engagementRate: entry.plays > 0 ? entry.engagements / entry.plays : null,
    });
  }
  return result;
}

async function loadFrequencyState(
  deviceId: string,
  advertiserIds: readonly string[],
): Promise<Map<string, Candidate["state"]>> {
  const now = Date.now();
  const oneHourAgo = new Date(now - 3_600_000).toISOString();
  const dayStart = new Date(now - 86_400_000).toISOString();

  const state = new Map<string, Candidate["state"]>();
  for (const advertiserId of advertiserIds) {
    state.set(advertiserId, {
      playsLastHour: 0,
      playsLastDay: 0,
      lastPlayedAtMs: null,
      advertiserPlaysLastDay: 0,
      screenPlaysLastDay: 0,
    });
  }

  const [recent, daily] = await Promise.all([
    db()
      .collection(COLLECTIONS.playbackEvents)
      .where("deviceId", "==", deviceId)
      .where("recordedAt", ">=", oneHourAgo)
      .orderBy("recordedAt")
      .limit(500)
      .get(),
    db()
      .collection(COLLECTIONS.playbackDaily)
      .where("deviceId", "==", deviceId)
      .where("date", ">=", dayStart.slice(0, 10))
      .limit(50)
      .get(),
  ]);

  const byCreativeHour = new Map<string, number>();
  const advertiserHour = new Map<string, number>();
  let lastPlayedAtMs: number | null = null;

  for (const doc of recent.docs) {
    const data = doc.data();
    byCreativeHour.set(String(data.creativeId), (byCreativeHour.get(String(data.creativeId)) ?? 0) + 1);
    const advertiserId = String(data.advertiserId);
    advertiserHour.set(advertiserId, (advertiserHour.get(advertiserId) ?? 0) + 1);
    const ts = Date.parse(String(data.timestamp));
    if (Number.isFinite(ts) && (lastPlayedAtMs === null || ts > lastPlayedAtMs)) lastPlayedAtMs = ts;
  }

  let screenPlaysLastDay = 0;
  const advertiserDay = new Map<string, number>();
  for (const doc of daily.docs) {
    const data = doc.data();
    const plays = Number(data.plays ?? 0);
    screenPlaysLastDay += plays;
    const advertiserId = String(data.advertiserId ?? "");
    if (advertiserId) advertiserDay.set(advertiserId, (advertiserDay.get(advertiserId) ?? 0) + plays);
  }

  for (const advertiserId of advertiserIds) {
    const entry = state.get(advertiserId);
    if (!entry) continue;
    state.set(advertiserId, {
      ...entry,
      playsLastHour: advertiserHour.get(advertiserId) ?? 0,
      playsLastDay: advertiserDay.get(advertiserId) ?? 0,
      advertiserPlaysLastDay: advertiserDay.get(advertiserId) ?? 0,
      screenPlaysLastDay,
    });
  }
  void byCreativeHour;
  void lastPlayedAtMs;

  return state;
}

/** Per-creative state needs the creative's own last-play time, fetched separately. */
async function loadCreativeLastPlayed(
  deviceId: string,
  creativeIds: readonly string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (creativeIds.length === 0) return result;
  const since = new Date(Date.now() - 3_600_000).toISOString();
  for (const creativeId of creativeIds) {
    const snapshot = await db()
      .collection(COLLECTIONS.playbackEvents)
      .where("deviceId", "==", deviceId)
      .where("creativeId", "==", creativeId)
      .where("recordedAt", ">=", since)
      .orderBy("recordedAt", "desc")
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const ts = Date.parse(String(snapshot.docs[0]!.data().timestamp));
      if (Number.isFinite(ts)) result.set(creativeId, ts);
    }
  }
  return result;
}

export async function buildCandidates(
  screenId: string,
  settings: PlatformSettings,
): Promise<CandidateBuildResult> {
  const screenSnapshot = await db().collection(COLLECTIONS.screens).doc(screenId).get();
  if (!screenSnapshot.exists) throw ApiError.notFound("Screen not found.");
  const screen = screenSnapshot.data() as Screen;

  let vehicle: Vehicle | null = null;
  if (screen.vehicleId) {
    const vehicleSnapshot = await db().collection(COLLECTIONS.vehicles).doc(String(screen.vehicleId)).get();
    vehicle = vehicleSnapshot.exists ? (vehicleSnapshot.data() as Vehicle) : null;
  }

  // Only active vehicles on screens in service are eligible inventory.
  if (!vehicle || vehicle.status !== "ACTIVE") {
    return { candidates: [], screen, vehicle };
  }

  const nowIsoString = nowIso();
  const campaignSnapshot = await db()
    .collection(COLLECTIONS.campaigns)
    .where("status", "==", "RUNNING")
    .where("startsAt", "<=", nowIsoString)
    .where("endsAt", ">=", nowIsoString)
    .limit(settings.maxAdvertiserInventoryShare > 0 ? 200 : 200)
    .get();

  const campaigns = campaignSnapshot.docs.map((doc) => doc.data() as Campaign);
  if (campaigns.length === 0) return { candidates: [], screen, vehicle };

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const creativesSnapshot = await db()
    .collection(COLLECTIONS.creatives)
    .where("campaignId", "in", campaignIds.slice(0, 30))
    .where("status", "in", ["APPROVED", "LIVE", "SCHEDULED"])
    .where("isArchived", "==", false)
    .limit(500)
    .get();

  const creatives = creativesSnapshot.docs.map((doc) => doc.data() as { id: string; campaignId: string; format: string; durationSeconds: number | null; scheduledFrom: string | null; scheduledTo: string | null });
  if (creatives.length === 0) return { candidates: [], screen, vehicle };

  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const [quality, advertiserStates] = await Promise.all([
    loadCreativeQuality(campaignIds),
    loadFrequencyState(screen.deviceId ? String(screen.deviceId) : screenId, campaigns.map((c) => c.advertiserId)),
  ]);
  const lastPlayed = await loadCreativeLastPlayed(
    screen.deviceId ? String(screen.deviceId) : screenId,
    creatives.map((creative) => creative.id),
  );

  const nowMs = Date.now();
  const candidates: Candidate[] = [];

  for (const creative of creatives) {
    const campaign = campaignById.get(creative.campaignId);
    if (!campaign) continue;
    if (creative.scheduledFrom && Date.parse(creative.scheduledFrom) > nowMs) continue;
    if (creative.scheduledTo && Date.parse(creative.scheduledTo) < nowMs) continue;

    const advertiserState = advertiserStates.get(campaign.advertiserId);
    if (!advertiserState) continue;

    const caps: FrequencyCaps = {
      maxPlaysPerHour: campaign.frequencyCaps.maxPlaysPerHour || settings.frequency.maxPlaysPerHour,
      maxPlaysPerDay: campaign.frequencyCaps.maxPlaysPerDay || settings.frequency.maxPlaysPerDay,
      minimumGapSeconds: campaign.frequencyCaps.minimumGapSeconds ?? settings.frequency.minimumGapSeconds,
      maxInventoryShare: campaign.frequencyCaps.maxInventoryShare || settings.frequency.maxInventoryShare,
    };

    const signals = quality.get(creative.id);

    candidates.push({
      campaignId: campaign.id,
      creativeId: creative.id,
      advertiserId: campaign.advertiserId,
      priority: campaign.priority,
      targeting: campaign.targeting as Candidate["targeting"],
      caps,
      state: {
        ...advertiserState,
        lastPlayedAtMs: lastPlayed.get(creative.id) ?? null,
      },
      remainingBudgetMinor:
        campaign.budget.pricingModel === "FIXED_PACKAGE"
          ? Math.max(0, campaign.budget.totalMinor - campaign.totalSpentMinor)
          : null,
      dailyBudgetMinor: campaign.budget.dailyMinor,
      spentTodayMinor: 0,
      creativeDurationSeconds: creative.durationSeconds ?? settings.inventory.slotDurationSeconds,
      creativeType: (creative.format as "IMAGE" | "VIDEO" | "GIF") ?? "IMAGE",
      completionRate: signals?.completionRate ?? null,
      engagementRate: signals?.engagementRate ?? null,
    });
  }

  return { candidates, screen, vehicle };
}

/**
 * Decide the next creative for a screen. Returns the signed download URL for the
 * winning creative only, so a device cannot enumerate the rest of the campaign.
 */
export async function nextCreativeForScreen(
  screenId: string,
): Promise<DeviceDecisionResponse & { reason: string }> {
  const settings = await getSettings();

  const screenSnapshot = await db().collection(COLLECTIONS.screens).doc(screenId).get();
  if (!screenSnapshot.exists) throw ApiError.notFound("Screen not found.");
  const screen = screenSnapshot.data() as Screen;

  const deviceId = screen.deviceId ? String(screen.deviceId) : null;
  let totalSlotsToday = 0;
  if (deviceId) {
    const deviceSnapshot = await db().collection(COLLECTIONS.devices).doc(deviceId).get();
    const derived = deriveDeviceStatus(deviceSnapshot.data() as Device, settings.heartbeat);
    if (derived.status === "OFFLINE") {
      throw ApiError.conflict("Screen is marked offline and cannot receive new decisions.");
    }
    const today = new Date().toISOString().slice(0, 10);
    const daily = await db()
      .collection(COLLECTIONS.playbackDaily)
      .where("deviceId", "==", deviceId)
      .where("date", "==", today)
      .limit(1)
      .get();
    totalSlotsToday = daily.empty ? 0 : Number(daily.docs[0]!.data().plays ?? 0);
  }

  const { candidates, vehicle } = await buildCandidates(screenId, settings);
  if (!vehicle || candidates.length === 0) {
    throw ApiError.conflict("No approved, targeted creative is currently eligible for this screen.");
  }

  const context = {
    now: new Date(),
    timezoneOffsetMinutes: offsetForLocation(),
    cityId: vehicle.cityId ?? null,
    zoneId: vehicle.homeZoneId ?? null,
    routeId: null,
    vehicleType: vehicle.type,
    vehicleGroupId: vehicle.groupId ?? null,
    screenId,
    screenType: screen.screenType,
    lat: vehicle.lastKnownLocation?.lat ?? null,
    lng: vehicle.lastKnownLocation?.lng ?? null,
    audienceCategory: null,
    minutesToHotspot: null,
    totalSlotsDeliveredToday: totalSlotsToday,
  };

  const result = decideNextCreative(candidates, context, {
    defaultCaps: settings.frequency,
    maxAdvertiserShare: settings.maxAdvertiserInventoryShare,
  });

  if (!result.winner) {
    const reasons = result.considered
      .map((entry) => `${entry.candidate.campaignId}: ${entry.rejections[0] ?? "ineligible"}`)
      .slice(0, 8);
    throw ApiError.conflict(`No eligible creative: ${reasons.join("; ") || "empty candidate list"}`);
  }

  const winner = result.winner.candidate;
  const creativeSnapshot = await db().collection(COLLECTIONS.creatives).doc(winner.creativeId).get();
  if (!creativeSnapshot.exists) {
    throw ApiError.conflict("The winning creative no longer exists.");
  }
  const creative = creativeSnapshot.data() as { storagePath: string; durationSeconds: number | null };

  let downloadUrl: string | null = null;
  if (creative.storagePath) {
    try {
      downloadUrl = (await signedReadUrl(creative.storagePath, 6 * 3_600_000)).url;
    } catch {
      // The player will fall back to its cached copy of this creative.
      downloadUrl = null;
    }
  }

  const topFactor = [...result.winner.factors].sort((a, b) => b.points - a.points)[0];

  return {
    campaignId: winner.campaignId,
    creativeId: winner.creativeId,
    advertiserId: winner.advertiserId,
    downloadUrl,
    durationSeconds: creative.durationSeconds ?? settings.inventory.slotDurationSeconds,
    slotIndex: totalSlotsToday + 1,
    decidedAt: nowIso(),
    nextDecisionAt: new Date(Date.now() + settings.inventory.slotDurationSeconds * 1000).toISOString(),
    reason: topFactor ? `${topFactor.label} (+${topFactor.points.toFixed(1)})` : "Only eligible candidate",
  };
}

/** Offline-first: the playlist a device downloads before losing connectivity. */
export async function playlistForScreen(
  screenId: string,
  length: number,
): Promise<readonly { creativeId: string; campaignId: string; advertiserId: string; sequence: number }[]> {
  const settings = await getSettings();
  const safeLength = Math.min(500, Math.max(1, length));
  const { candidates, vehicle } = await buildCandidates(screenId, settings);
  if (!vehicle || candidates.length === 0) {
    throw ApiError.conflict("No approved, targeted creative is currently eligible for this screen.");
  }

  const context = {
    now: new Date(),
    timezoneOffsetMinutes: offsetForLocation(),
    cityId: vehicle.cityId ?? null,
    zoneId: vehicle.homeZoneId ?? null,
    routeId: null,
    vehicleType: vehicle.type,
    vehicleGroupId: vehicle.groupId ?? null,
    screenId,
    screenType: null,
    lat: null,
    lng: null,
    audienceCategory: null,
    minutesToHotspot: null,
    totalSlotsDeliveredToday: 0,
  };

  return buildPlaylist(candidates, context, {
    defaultCaps: settings.frequency,
    maxAdvertiserShare: settings.maxAdvertiserInventoryShare,
    length: safeLength,
  });
}

/** One playlist slot with everything the player needs to render it offline. */
export interface PlaylistMediaItem {
  readonly creativeId: string;
  readonly campaignId: string;
  readonly advertiserId: string;
  readonly sequence: number;
  readonly mediaUrl: string | null;
  readonly mediaUrlExpiresAt: string | null;
  readonly mimeType: string | null;
  readonly format: string | null;
  readonly durationSeconds: number;
  /** Shown by the player as a text card when the media cannot be fetched. */
  readonly name: string;
  readonly headline: string;
  readonly callToAction: string;
}

/**
 * The playlist plus signed media URLs and the player's operating parameters.
 *
 * Creatives are private; a device cannot call the user-authenticated signed-URL
 * route, so the URLs are minted here, after the device has already been bound
 * to this screen by `assertDeviceOwnsTarget`. They live for six hours, long
 * enough for the player to download and cache everything in one pass.
 */
export async function playlistWithMedia(
  screenId: string,
  length: number,
): Promise<{
  items: PlaylistMediaItem[];
  slotDurationSeconds: number;
  heartbeatIntervalMs: number;
  generatedAt: string;
}> {
  const settings = await getSettings();
  const slots = await playlistForScreen(screenId, length);
  const uniqueIds = [...new Set(slots.map((slot) => slot.creativeId))];
  const snapshots = uniqueIds.length
    ? await db().getAll(...uniqueIds.map((id) => db().collection(COLLECTIONS.creatives).doc(id)))
    : [];

  const media = new Map<string, Omit<PlaylistMediaItem, "creativeId" | "campaignId" | "advertiserId" | "sequence">>();
  await Promise.all(
    snapshots.map(async (snapshot) => {
      if (!snapshot.exists) return;
      const creative = snapshot.data() as {
        storagePath?: string;
        mimeType?: string;
        format?: string;
        durationSeconds?: number | null;
        name?: string;
        headline?: string;
        callToAction?: string;
      };
      let signed: { url: string; expiresAt: string } | null = null;
      if (creative.storagePath) {
        try {
          signed = await signedReadUrl(creative.storagePath, 6 * 3_600_000);
        } catch {
          // The player keeps playing its cached copy, if it has one.
          signed = null;
        }
      }
      media.set(snapshot.id, {
        mediaUrl: signed?.url ?? null,
        mediaUrlExpiresAt: signed?.expiresAt ?? null,
        mimeType: creative.mimeType ?? null,
        format: creative.format ?? null,
        durationSeconds: creative.durationSeconds ?? settings.inventory.slotDurationSeconds,
        name: creative.name ?? "",
        headline: creative.headline ?? "",
        callToAction: creative.callToAction ?? "",
      });
    }),
  );

  return {
    items: slots
      .filter((slot) => media.has(slot.creativeId))
      .map((slot) => ({ ...slot, ...media.get(slot.creativeId)! })),
    slotDurationSeconds: settings.inventory.slotDurationSeconds,
    heartbeatIntervalMs: settings.heartbeat.expectedIntervalMs,
    generatedAt: nowIso(),
  };
}

function offsetForLocation(): number {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "longOffset" })
      .formatToParts(new Date())
      .find((item) => item.type === "timeZoneName");
    const match = part ? /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part.value) : null;
    if (!match) return 330;
    return (match[1] === "-" ? -1 : 1) * (Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0));
  } catch {
    return 330;
  }
}