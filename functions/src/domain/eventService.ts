/**
 * Event ingestion.
 *
 * High-volume path. Design constraints:
 *  - Idempotent by `eventId`, so an offline player replaying its queue after
 *    reconnecting never double-counts.
 *  - Batched writes, never one document per request.
 *  - Cheap guards first (bounds, date sanity) so a malformed batch costs nothing.
 *  - Spend is charged per completed play against the campaign, using a rate
 *    derived from the campaign's pricing model and the current settings.
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  newId,
  sellableSlotsPerDay,
  type Campaign,
  type EngagementEvent,
  type IngestResult,
  type PlaybackEvent,
} from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";
import { coarsenLocation } from "./fleetService.js";

/** Reject timestamps wildly outside the past/future window: almost always clock drift. */
const MAX_CLOCK_SKEW_MS = 6 * 3_600_000;

/** Minimum share of the creative that must run for the play to earn. */
const BILLABLE_COMPLETION_RATIO = 0.25;

/** Firestore `in` and `getAll` both cap the number of references per request. */
const MAX_LOOKUP_REFS = 300;

interface ValidatedPlayback {
  readonly event: PlaybackEvent;
  readonly occurredAt: number;
  readonly completionRatio: number;
  readonly billable: boolean;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
}

/**
 * True when a commit failed because one of the documents already existed.
 *
 * Firestore surfaces create-on-existing as ALREADY_EXISTS (6) for a single
 * write and FAILED_PRECONDITION (9) for a batch, so both codes are checked.
 * Nothing else is retried: a genuine precondition failure has to surface to the
 * caller rather than being silently re-attempted.
 */
function isDuplicateRace(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code;
  if (code === 6 || code === 9 || code === "ALREADY_EXISTS" || code === "FAILED_PRECONDITION") return true;
  const message = (error as { message?: string } | null)?.message ?? "";
  return message.includes("ALREADY_EXISTS") || message.includes("already exists");
}

/**
 * Run an ingest pass, re-running it once if it lost a create race.
 *
 * The retry is bounded to a single attempt and is safe by construction: the
 * second pass re-reads stored documents, so anything the concurrent request
 * committed is now reported as a duplicate and nothing is written or billed
 * twice. A second conflict propagates so the device can retry — a visible
 * failure is better than a silently dropped or double-charged play.
 */
async function withDuplicateRetry<T>(pass: () => Promise<T>): Promise<T> {
  try {
    return await pass();
  } catch (error) {
    if (!isDuplicateRace(error)) throw error;
    return await pass();
  }
}

function validatePlayback(events: readonly PlaybackEvent[]): { valid: ValidatedPlayback[]; rejected: IngestResult["rejected"] } {
  const now = Date.now();
  const valid: ValidatedPlayback[] = [];
  const rejected: IngestResult["rejected"] = [];

  for (const event of events) {
    const occurredAt = Date.parse(event.timestamp);
    if (Number.isNaN(occurredAt)) {
      rejected.push({ eventId: event.eventId, reason: "Invalid timestamp." });
      continue;
    }
    if (now - occurredAt > MAX_CLOCK_SKEW_MS) {
      rejected.push({ eventId: event.eventId, reason: "Timestamp is too far in the past." });
      continue;
    }
    if (occurredAt - now > MAX_CLOCK_SKEW_MS) {
      rejected.push({ eventId: event.eventId, reason: "Timestamp is too far in the future." });
      continue;
    }
    // The device is expected to report `completionRatio`. When it does not, the
    // only honest inference is "ran to the end" or "we cannot tell" — never a
    // fabricated partial value, which would be indistinguishable from real data
    // in the rollups.
    const ratio =
      event.completionRatio !== null && event.completionRatio !== undefined
        ? Math.min(1, Math.max(0, event.completionRatio))
        : event.completed
          ? 1
          : 0;

    valid.push({
      event,
      occurredAt,
      completionRatio: ratio,
      // A play only earns when the creative ran to at least 25% of its duration.
      billable: ratio >= BILLABLE_COMPLETION_RATIO,
    });
  }

  return { valid, rejected };
}

/**
 * Unit price for one completed play, derived from the campaign's pricing model.
 *
 * Flat-price campaigns have no per-impression rate, so the budget is spread
 * across the inventory the flight can realistically deliver: the number of
 * slots a screen turns over per day times the length of the flight. That keeps
 * a flat campaign's accrual inside its budget instead of charging an arbitrary
 * per-play amount that would overspend it on day one.
 */
export function priceForPlay(campaign: Campaign, expectedPlaysPerDayPerScreen = 1): number {
  switch (campaign.budget.pricingModel) {
    case "CPM":
      return Math.round((campaign.budget.rateMinor ?? 0) / 1000);
    case "CPC":
    case "CPL":
    case "CPA":
      // Charged on the downstream click or conversion, not the play. Zero here
      // prevents double-charging the same money twice.
      return 0;
    case "FIXED_PACKAGE":
    case "CUSTOM":
    default: {
      const flightDays = Math.max(1, (Date.parse(campaign.endsAt) - Date.parse(campaign.startsAt)) / 86_400_000);
      const expectedPlays = Math.max(1, Math.round(flightDays * expectedPlaysPerDayPerScreen));
      return Math.max(0, Math.round(campaign.budget.totalMinor / expectedPlays));
    }
  }
}

export async function ingestPlaybackEvents(
  events: readonly PlaybackEvent[],
  device: { deviceId: string; screenId: string | null; vehicleId: string | null },
): Promise<IngestResult> {
  return withDuplicateRetry(() => ingestPlaybackPass(events, device));
}

async function ingestPlaybackPass(
  events: readonly PlaybackEvent[],
  device: { deviceId: string; screenId: string | null; vehicleId: string | null },
): Promise<IngestResult> {
  if (events.length === 0) throw ApiError.badRequest("No playback events supplied.");

  const settings = await getSettings();
  const { valid, rejected } = validatePlayback(events);
  if (valid.length === 0) {
    return { accepted: 0, duplicates: 0, rejected, serverTime: nowIso() };
  }

  const campaignIds = Array.from(new Set(valid.map((item) => item.event.campaignId)));
  const campaignSnapshots = await db().getAll(...campaignIds.map((id) => db().collection(COLLECTIONS.campaigns).doc(id)));
  const campaignsById = new Map<string, Campaign>();
  for (const snapshot of campaignSnapshots) {
    if (snapshot.exists) campaignsById.set(snapshot.id, snapshot.data() as Campaign);
  }

  // Idempotency has two layers, and both are needed.
  //
  // 1. Read-before-write below, which handles the common case: a device retries
  //    the same batch after a timeout, and the stored documents are already
  //    visible. A `WriteResult` always carries a writeTime, so a post-commit
  //    check can never detect a duplicate.
  //
  // 2. `batch.create` for the event documents themselves, which closes the race
  //    the pre-read cannot: two concurrent requests can both read "absent" and
  //    then both apply `increment` to campaign spend. Create-on-write makes the
  //    second commit fail instead of double-charging, and `withDuplicateRetry`
  //    re-runs the pass, at which point the committed documents are visible and
  //    are correctly reported as duplicates.
  const firestore = db();
  const alreadyStored = new Set<string>();
  const incoming = valid.map((item) => item.event);
  const uniqueIncoming = Array.from(new Map(incoming.map((event) => [event.eventId, event])).values());
  for (const group of chunk(uniqueIncoming, MAX_LOOKUP_REFS)) {
    const existing = await firestore.getAll(
      ...group.map((event) => firestore.collection(COLLECTIONS.playbackEvents).doc(event.eventId)),
    );
    for (const snapshot of existing) {
      if (snapshot.exists) alreadyStored.add(snapshot.id);
    }
  }

  const batch = firestore.batch();
  let accepted = 0;
  let duplicates = 0;
  /** Guards against the same id appearing twice inside a single request. */
  const written = new Set<string>();
  const spendByCampaign = new Map<string, number>();
  const capacityPerScreen = sellableSlotsPerDay(settings.inventory);

  for (const item of valid) {
    const { event } = item;
    if (alreadyStored.has(event.eventId) || written.has(event.eventId)) {
      duplicates += 1;
      continue;
    }
    const campaign = campaignsById.get(event.campaignId);
    if (!campaign) {
      rejected.push({ eventId: event.eventId, reason: "Unknown campaign." });
      continue;
    }
    const status = campaign.status;
    // `SCHEDULED` is accepted so a player that was mid-slot when an admin paused
    // the campaign can still flush its local queue without losing the play.
    if (status !== "RUNNING" && status !== "SCHEDULED") {
      rejected.push({ eventId: event.eventId, reason: `Campaign is ${status}, not delivering.` });
      continue;
    }
    if (Date.parse(campaign.startsAt) > item.occurredAt || Date.parse(campaign.endsAt) < item.occurredAt) {
      rejected.push({ eventId: event.eventId, reason: "Playback timestamp falls outside the campaign flight window." });
      continue;
    }

    const eventRef = firestore.collection(COLLECTIONS.playbackEvents).doc(event.eventId);
    const location = event.gps ? coarsenLocation(event.gps, settings.retention) : null;

    const billedMinor = item.billable ? priceForPlay(campaign, capacityPerScreen) : 0;

    batch.create(eventRef, {
      id: event.eventId,
      // The authenticated device, not the payload: a device must not be able to
      // attribute plays to another device.
      deviceId: device.deviceId,
      screenId: event.screenId ?? device.screenId,
      vehicleId: event.vehicleId ?? device.vehicleId,
      campaignId: event.campaignId,
      creativeId: event.creativeId,
      advertiserId: campaign.advertiserId,
      timestamp: event.timestamp,
      dayKey: dayKey(new Date(item.occurredAt)),
      hourKey: hourKey(new Date(item.occurredAt)),
      durationPlayedSeconds: event.durationPlayedSeconds,
      completed: event.completed,
      completionRatio: Number(item.completionRatio.toFixed(3)),
      slotIndex: event.slotIndex ?? null,
      playbackStartedOffline: event.playbackStartedOffline,
      location,
      // The billed amount is frozen here at ingest. The rollup sums this field
      // rather than re-deriving a price, so changing pricing settings later can
      // never retroactively alter what was already charged.
      billedMinor,
      recordedAt: nowIso(),
      recordedAtTs: FieldValue.serverTimestamp(),
    });
    accepted += 1;
    written.add(event.eventId);

    if (billedMinor > 0) {
      spendByCampaign.set(campaign.id, (spendByCampaign.get(campaign.id) ?? 0) + billedMinor);
    }
  }

  // Guard against a large batch overflowing the 500-write limit.
  const MAX_WRITES = 450;
  if (accepted > MAX_WRITES) {
    throw ApiError.badRequest(`Batch too large: ${accepted} accepted events exceeds the ${MAX_WRITES} write limit.`);
  }

  if (accepted > 0) {
    for (const [campaignId, amount] of spendByCampaign) {
      batch.update(firestore.collection(COLLECTIONS.campaigns).doc(campaignId), {
        totalSpentMinor: FieldValue.increment(amount),
        updatedAt: nowIso(),
      });
    }
    batch.set(
      firestore.collection(COLLECTIONS.devices).doc(device.deviceId),
      { lastHeartbeatTs: FieldValue.serverTimestamp(), pendingEventCount: 0, updatedAt: nowIso() },
      { merge: true },
    );
    await batch.commit();
  }

  return { accepted, duplicates, rejected, serverTime: nowIso() };
}

export async function ingestEngagementEvents(
  events: readonly EngagementEvent[],
): Promise<IngestResult> {
  return withDuplicateRetry(() => ingestEngagementPass(events));
}

async function ingestEngagementPass(events: readonly EngagementEvent[]): Promise<IngestResult> {
  if (events.length === 0) throw ApiError.badRequest("No engagement events supplied.");
  const settings = await getSettings();
  const firestore = db();

  // Same read-before-write idempotency as playback: an offline player that
  // replays its queue must not inflate QR scans, taps or leads.
  const alreadyStored = new Set<string>();
  const uniqueIncoming = Array.from(new Map(events.map((event) => [event.eventId, event])).values());
  for (const group of chunk(uniqueIncoming, MAX_LOOKUP_REFS)) {
    const existing = await firestore.getAll(
      ...group.map((event) => firestore.collection(COLLECTIONS.engagementEvents).doc(event.eventId)),
    );
    for (const snapshot of existing) {
      if (snapshot.exists) alreadyStored.add(snapshot.id);
    }
  }

  const batch = firestore.batch();
  const rejected: IngestResult["rejected"] = [];
  const written = new Set<string>();
  let accepted = 0;
  let duplicates = 0;

  for (const event of events) {
    if (alreadyStored.has(event.eventId) || written.has(event.eventId)) {
      duplicates += 1;
      continue;
    }
    const occurredAt = Date.parse(event.timestamp);
    if (Number.isNaN(occurredAt)) {
      rejected.push({ eventId: event.eventId, reason: "Invalid timestamp." });
      continue;
    }
    if (Date.now() - occurredAt > MAX_CLOCK_SKEW_MS) {
      rejected.push({ eventId: event.eventId, reason: "Timestamp is too far in the past." });
      continue;
    }
    const location = event.gps ? coarsenLocation(event.gps, settings.retention) : null;
    const at = new Date(occurredAt);

    batch.create(firestore.collection(COLLECTIONS.engagementEvents).doc(event.eventId), {
      id: event.eventId,
      type: event.type,
      campaignId: event.campaignId,
      creativeId: event.creativeId,
      screenId: event.screenId,
      deviceId: event.deviceId,
      vehicleId: event.vehicleId,
      zoneId: event.zoneId,
      timestamp: event.timestamp,
      dayKey: dayKey(at),
      hourKey: hourKey(at),
      source: sourceForEngagementType(event.type),
      couponCode: event.couponCode ?? null,
      location,
      metadata: event.metadata ?? {},
      recordedAt: nowIso(),
      recordedAtTs: FieldValue.serverTimestamp(),
    });
    accepted += 1;
    written.add(event.eventId);
  }

  const MAX_WRITES = 450;
  if (accepted > MAX_WRITES) {
    throw ApiError.badRequest(`Batch too large: ${accepted} accepted events exceeds the ${MAX_WRITES} write limit.`);
  }

  if (accepted > 0) await batch.commit();
  return { accepted, duplicates, rejected, serverTime: nowIso() };
}

function sourceForEngagementType(type: EngagementEvent["type"]): string {
  switch (type) {
    case "QR_SCAN":
      return "QR";
    case "NFC_TAP":
      return "NFC";
    case "LANDING_PAGE_VIEW":
      return "LANDING_PAGE";
    case "WHATSAPP_CLICK":
      return "WHATSAPP";
    case "PHONE_CLICK":
      return "PHONE";
    case "COUPON_CLAIM":
      return "COUPON";
    case "LEAD_SUBMIT":
      return "FORM";
    case "STORE_VISIT_REDEEM":
      return "REDEEM";
    default:
      return "UNKNOWN";
  }
}

export interface DeviceDecisionResponse {
  readonly campaignId: string;
  readonly creativeId: string;
  readonly advertiserId: string;
  readonly downloadUrl: string | null;
  readonly durationSeconds: number;
  readonly slotIndex: number;
  readonly decidedAt: string;
  readonly nextDecisionAt: string;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function hourKey(date: Date): string {
  return date.toISOString().slice(0, 13);
}

export { newId };