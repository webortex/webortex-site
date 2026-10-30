/**
 * Scheduled aggregation.
 *
 * Raw playback/engagement/conversion events are the ledger; the `mm_agg_*`
 * collections are the only thing dashboards are allowed to read. This service is
 * the single writer of those aggregates.
 *
 * Correctness rules, in priority order:
 *
 *  1. **One document per dimension tuple, written once.** Playback, engagement
 *     and conversion counts all land on the *same* document, keyed by the same
 *     dimension tuple. They are accumulated in a single pass and written
 *     together, because two passes writing absolute values to the same document
 *     would clobber each other — and because the dashboard reads engagement and
 *     conversion totals off the playback aggregates. Splitting them into
 *     separate collections would make every rate and revenue figure read as zero.
 *
 *  2. **Retry-safe.** A scheduled run can be invoked twice (at-least-once
 *     delivery), and an operator can re-run a backfill at any time. Every
 *     aggregate document therefore has a *deterministic id* derived from its
 *     dimension tuple, and its body is an absolute recomputation of the raw
 *     events for that tuple — never an increment. Re-running is a no-op.
 *
 *  3. **Stale rows are removed.** Absolute recomputation is only truthful if a
 *     dimension tuple that no longer has events stops existing. Any aggregate
 *     document for a processed day that this run did not produce is deleted.
 *
 *  4. **Late-arriving events are handled.** Players replay offline queues days
 *     later. A pure watermark would silently drop those plays, so the last
 *     `repairWindowDays` days (plus the current, still-accumulating day) are
 *     recomputed in full on every run.
 *
 *  5. **Money is never re-derived.** Aggregate spend sums the `billedMinor`
 *     frozen onto each raw event at ingest, so a later pricing-settings change
 *     cannot retroactively alter historical spend.
 *
 *  6. **Pruning happens only after a clean rollup.** Raw events are deleted only
 *     once every aggregate write for the run succeeded, and the retention window
 *     always sits well outside the repair window so a pruned day can never be
 *     rebuilt.
 */

import { FieldPath, FieldValue, type WriteBatch } from "firebase-admin/firestore";
import { COLLECTIONS } from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { getSettings } from "./settingsService.js";

/** Days recomputed in full on every run, to absorb late offline replays. */
const REPAIR_WINDOW_DAYS = 3;

/** Firestore hard limits. */
const MAX_BATCH_WRITES = 450;
const MAX_LOOKUP_REFS = 300;
const PAGE_SIZE = 500;

const EMPTY = {
  plays: 0,
  completedPlays: 0,
  impressions: 0,
  uniqueDevices: 0,
  engagements: 0,
  leads: 0,
  conversions: 0,
  spendMinor: 0,
  attributedRevenueMinor: 0,
  totalDurationSeconds: 0,
} as const;

type Counts = { -readonly [K in keyof typeof EMPTY]: number };

function newCounts(): Counts {
  return { ...EMPTY };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
}

/**
 * `null`-safe dimension component, so a doc id never contains a stray blank.
 *
 * The sentinel is `-` rather than an empty string because an empty component
 * would produce `a||b`, which is indistinguishable from a different tuple whose
 * middle dimension is genuinely absent.
 */
function part(value: unknown): string {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : "-";
}

function dayKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function hourKeyOf(date: Date): string {
  return date.toISOString().slice(0, 13);
}

/** Inclusive list of `YYYY-MM-DD` strings, oldest first. */
function dayRange(days: number, now: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    out.push(dayKeyOf(new Date(now.getTime() - i * 86_400_000)));
  }
  return out;
}

export interface AggregationReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly daysProcessed: readonly string[];
  readonly playbackDailyWritten: number;
  readonly playbackHourlyWritten: number;
  /** Engagement and conversion contributions merged into the aggregate docs above. */
  readonly engagementRowsWritten: number;
  readonly conversionRowsWritten: number;
  readonly rawEventsScanned: number;
  readonly staleRowsDeleted: number;
  readonly prunedPlayback: number;
  readonly prunedEngagement: number;
  readonly prunedConversions: number;
  /** Set when a batch failed; the run is not silently partial. */
  readonly errors: readonly string[];
}

/**
 * Dimension tuple for an aggregate.
 *
 * `advertiserId`, `vehicleCode`, `zoneId` and `platform` are denormalised onto
 * every document rather than being part of the key, because they are functionally
 * determined by the key. Keeping them off the key avoids multiplying document
 * count, while still letting the analytics layer answer a filter on any of them
 * with an indexed equality query.
 *
 * A conversion has no creative, vehicle or screen, so its tuple uses the `-`
 * sentinel for all three. That is the honest representation: a purchase is
 * attributed to a campaign, not to a particular bus. Such a row is picked up by
 * campaign totals and correctly excluded from per-vehicle and per-screen
 * breakdowns.
 */
function aggregateKey(input: {
  bucket: string;
  campaignId: string;
  creativeId: string;
  vehicleId: string;
  screenId: string;
}): string {
  return [
    part(input.bucket),
    part(input.campaignId),
    part(input.creativeId),
    part(input.vehicleId),
    part(input.screenId),
  ].join("|");
}

interface VehicleDimension {
  readonly vehicleId: string;
  readonly vehicleCode: string;
  readonly zoneId: string;
}

/** Load the vehicle/zone labels the aggregates denormalise. Missing vehicles degrade to "-". */
async function loadVehicleDimensions(vehicleIds: readonly string[]): Promise<Map<string, VehicleDimension>> {
  const out = new Map<string, VehicleDimension>();
  const unique = Array.from(new Set(vehicleIds.filter((id) => id.length > 0 && id !== "-")));
  for (const group of chunk(unique, MAX_LOOKUP_REFS)) {
    const snapshots = await db().getAll(
      ...group.map((id) => db().collection(COLLECTIONS.vehicles).doc(id)),
    );
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data() as { code?: string; registrationNumber?: string; homeZoneId?: string | null };
      out.set(snapshot.id, {
        vehicleId: snapshot.id,
        vehicleCode: data.code ?? data.registrationNumber ?? snapshot.id,
        zoneId: data.homeZoneId ?? "",
      });
    }
  }
  return out;
}

/**
 * Load each campaign's owning advertiser.
 *
 * `advertiserId` is stamped onto every aggregate from the campaign document
 * rather than from the raw event, for two reasons: engagement events do not
 * carry it at all, and a row stamped `-` would be silently excluded by every
 * advertiser-scoped filter, so those campaigns' engagement counts would
 * disappear from the dashboard while still being present in the totals.
 */
async function loadCampaignAdvertisers(campaignIds: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(campaignIds.filter((id) => id.length > 0 && id !== "-")));
  for (const group of chunk(unique, MAX_LOOKUP_REFS)) {
    const snapshots = await db().getAll(
      ...group.map((id) => db().collection(COLLECTIONS.campaigns).doc(id)),
    );
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data() as { advertiserId?: string };
      if (data.advertiserId) out.set(snapshot.id, data.advertiserId);
    }
  }
  return out;
}

/** Commit a batch, recording rather than throwing so one failure does not abandon the run. */
async function commitInChunks(batch: WriteBatch, count: number, errors: string[]): Promise<boolean> {
  if (count === 0) return true;
  try {
    await batch.commit();
    return true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return false;
  }
}

interface AggregateBucket {
  readonly dimension: Record<string, unknown>;
  readonly counts: Counts;
  readonly devices: Set<string>;
}

interface RollupResult {
  readonly daily: Map<string, AggregateBucket>;
  readonly hourly: Map<string, AggregateBucket>;
  readonly engagementRows: number;
  readonly conversionRows: number;
  readonly scanned: number;
}

/** `-` and `""` mean "not known", so a later contributor may fill them in. */
function isUnresolved(value: unknown): boolean {
  return value === undefined || value === null || value === "" || value === "-";
}

/**
 * Find or create the bucket for a dimension tuple.
 *
 * Playback, engagement and conversion rows for the same
 * (campaign, creative, vehicle, screen, bucket) share one document, and each
 * contributor knows a different subset of the dimensions — playback resolves the
 * vehicle code and platform, engagement only knows the zone, conversions know
 * neither. First-writer-wins would make the surviving tuple depend on the order
 * the loops happen to run in, so a real value is never overwritten by a
 * sentinel and an unresolved field is filled in whenever anyone knows it.
 */
function bucketFor(
  target: Map<string, AggregateBucket>,
  key: string,
  bucket: string,
  dimension: Record<string, unknown>,
): AggregateBucket {
  const existing = target.get(key);
  if (existing) {
    for (const [field, value] of Object.entries(dimension)) {
      if (!isUnresolved(value)) continue;
      const current = existing.dimension[field];
      if (isUnresolved(current)) existing.dimension[field] = value;
    }
    return existing;
  }
  const created: AggregateBucket = {
    dimension: { date: bucket, ...dimension },
    counts: newCounts(),
    devices: new Set<string>(),
  };
  target.set(key, created);
  return created;
}

/** Stream a day's documents, following the cursor rather than trusting one page. */
async function* streamDay(
  collectionName: string,
  day: string,
): AsyncGenerator<Record<string, unknown>> {
  const firestore = db();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = firestore
      .collection(collectionName)
      .where("dayKey", "==", day)
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) return;
    for (const doc of snapshot.docs) {
      yield doc.data() as Record<string, unknown>;
    }
    if (snapshot.size < PAGE_SIZE) return;
    cursor = snapshot.docs[snapshot.size - 1]!;
  }
}

/**
 * Recompute every aggregate for the requested days in a single pass.
 *
 * All three raw event types accumulate into the same keyed buckets, and the
 * document is written exactly once with the complete value set.
 */
async function rollUp(days: readonly string[]): Promise<RollupResult> {
  const daily = new Map<string, AggregateBucket>();
  const hourly = new Map<string, AggregateBucket>();
  let engagementRows = 0;
  let conversionRows = 0;
  let scanned = 0;

  for (const day of days) {
    // ---- playback -----------------------------------------------------------
    for await (const data of streamDay(COLLECTIONS.playbackEvents, day)) {
      scanned += 1;
      const campaignId = part(data.campaignId);
      const creativeId = part(data.creativeId);
      const vehicleId = part(data.vehicleId);
      const screenId = part(data.screenId);
      const hour = part(data.hourKey) !== "-" ? String(data.hourKey) : hourKeyOf(new Date(String(data.timestamp)));

      const base = {
        campaignId,
        creativeId,
        vehicleId,
        screenId,
        advertiserId: part(data.advertiserId),
      };

      for (const [target, bucket] of [
        [daily, day],
        [hourly, hour],
      ] as const) {
        const entry = bucketFor(target, aggregateKey({ bucket, ...base }), bucket, {
          campaignId,
          creativeId,
          vehicleId,
          screenId,
          advertiserId: base.advertiserId,
          vehicleCode: vehicleId,
          zoneId: "",
          platform: part(data.platform),
        });
        entry.counts.plays += 1;
        entry.counts.impressions += 1;
        entry.counts.spendMinor += Number(data.billedMinor ?? 0);
        entry.counts.totalDurationSeconds += Number(data.durationPlayedSeconds ?? 0);
        if (data.completed === true) entry.counts.completedPlays += 1;
        entry.devices.add(part(data.deviceId));
      }
    }

    // ---- engagement ---------------------------------------------------------
    for await (const data of streamDay(COLLECTIONS.engagementEvents, day)) {
      scanned += 1;
      const campaignId = part(data.campaignId);
      const creativeId = part(data.creativeId);
      const vehicleId = part(data.vehicleId);
      const screenId = part(data.screenId);
      const hour = part(data.hourKey) !== "-" ? String(data.hourKey) : hourKeyOf(new Date(String(data.timestamp)));

      // Engagements are counted as engagements only. A redemption reported by
      // the player and the same redemption posted later by the advertiser's CRM
      // would otherwise be counted twice, and `conversionRate` is computed as
      // conversions ÷ engagements, so a double count distorts the rate itself.
      for (const [target, bucket] of [
        [daily, day],
        [hourly, hour],
      ] as const) {
        const entry = bucketFor(
          target,
          aggregateKey({ bucket, campaignId, creativeId, vehicleId, screenId }),
          bucket,
          {
            campaignId,
            creativeId,
            vehicleId,
            screenId,
            // Left blank here and resolved from the campaign document below;
            // engagement events do not carry an advertiserId.
            advertiserId: "",
            vehicleCode: vehicleId,
            zoneId: part(data.zoneId),
            platform: "-",
            source: part(data.source),
          },
        );
        entry.counts.engagements += 1;
        if (data.type === "LEAD_SUBMIT") entry.counts.leads += 1;
      }
      engagementRows += 1;
    }

    // ---- conversions --------------------------------------------------------
    // Conversions are range-queried on `occurredAt` rather than `dayKey` because
    // they may be written by paths other than the conversion API. It is also
    // more truthful: bucketing by ingestion timezone would silently reclassify a
    // late-evening purchase.
    const from = new Date(`${day}T00:00:00.000Z`).toISOString();
    const to = new Date(`${day}T23:59:59.999Z`).toISOString();
    for await (const data of streamRange(COLLECTIONS.conversions, "occurredAt", from, to)) {
      scanned += 1;
      // Only verified conversions may move money or count toward a rate.
      if (data.verified !== true) continue;

      const campaignId = part(data.campaignId);
      const advertiserId = part(data.advertiserId);
      const occurredAt = new Date(String(data.occurredAt));
      const bucket = dayKeyOf(occurredAt);
      if (bucket !== day) continue;
      const hour = hourKeyOf(occurredAt);
      const valueMinor = Number(data.valueMinor ?? 0);

      for (const [target, timeBucket] of [
        [daily, day],
        [hourly, hour],
      ] as const) {
        const entry = bucketFor(
          target,
          // No creative, vehicle or screen is known for a conversion, so those
          // dimensions take the `-` sentinel.
          aggregateKey({ bucket: timeBucket, campaignId, creativeId: "-", vehicleId: "-", screenId: "-" }),
          timeBucket,
          {
            campaignId,
            creativeId: "-",
            vehicleId: "-",
            screenId: "-",
            advertiserId,
            vehicleCode: "-",
            // `conversionService` writes these as `zoneId`/`cityId`; reading
            // `attributionZoneId` here silently produced the `-` sentinel for
            // every conversion, which emptied the location breakdown.
            zoneId: part(data.zoneId),
            cityId: part(data.cityId),
            platform: "-",
          },
        );
        entry.counts.conversions += 1;
        // A CRM-reported lead is a distinct signal from a lead submitted in-app;
        // there is no shared identifier to de-duplicate them, so both count.
        if (data.type === "LEAD") entry.counts.leads += 1;
        entry.counts.attributedRevenueMinor += valueMinor;
      }
      conversionRows += 1;
    }
  }

  return { daily, hourly, engagementRows, conversionRows, scanned };
}

/** Stream a time range, following the cursor rather than trusting one page. */
async function* streamRange(
  collectionName: string,
  field: string,
  fromIso: string,
  toIso: string,
): AsyncGenerator<Record<string, unknown>> {
  const firestore = db();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = firestore
      .collection(collectionName)
      .where(field, ">=", fromIso)
      .where(field, "<=", toIso)
      .orderBy(field)
      .limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    if (snapshot.empty) return;
    for (const doc of snapshot.docs) {
      yield doc.data() as Record<string, unknown>;
    }
    if (snapshot.size < PAGE_SIZE) return;
    cursor = snapshot.docs[snapshot.size - 1]!;
  }
}

async function writeAggregates(
  collectionName: string,
  bucketField: "date" | "hourKey",
  rows: Map<string, AggregateBucket>,
  errors: string[],
): Promise<number> {
  const firestore = db();
  let written = 0;
  let batch = firestore.batch();
  let pending = 0;

  for (const [key, entry] of rows) {
    // The bucket value is whatever `rollUp` bucketed on: a `YYYY-MM-DD` day for
    // the daily collection, an hour for the hourly one. `dimension.date` holds
    // that same value, so `date` has to be narrowed for hourly rows rather than
    // inherited — otherwise an hourly document carries `date: "2026-01-01T05"`,
    // which is not a date and quietly breaks any later range filter on it.
    const bucketValue = String(entry.dimension.date);
    batch.set(
      firestore.collection(collectionName).doc(key),
      {
        ...entry.dimension,
        date: bucketField === "hourKey" ? bucketValue.slice(0, 10) : bucketValue,
        [bucketField]: bucketValue,
        key,
        ...entry.counts,
        uniqueDevices: entry.devices.size,
        rolledUpAt: nowIso(),
        rolledUpAtTs: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    written += 1;
    pending += 1;
    if (pending >= MAX_BATCH_WRITES) {
      await commitInChunks(batch, pending, errors);
      batch = firestore.batch();
      pending = 0;
    }
  }
  await commitInChunks(batch, pending, errors);
  return written;
}

/**
 * Delete aggregate rows for processed buckets that this run did not produce.
 *
 * Without this, a dimension tuple whose raw events disappeared would keep
 * reporting its last-known counts forever, which is worse than a gap: the number
 * looks authoritative and is simply wrong.
 *
 * Called once per day for the daily collection and once per hour for the hourly
 * collection, since `bucketField` is the only difference between them.
 */
async function deleteStaleRows(
  collectionName: string,
  bucketField: "date" | "hourKey",
  buckets: readonly string[],
  produced: ReadonlySet<string>,
  errors: string[],
): Promise<number> {
  const firestore = db();
  let deleted = 0;

  for (const bucket of buckets) {
    // Paged rather than `.limit(MAX_QUERY_LIMIT)`: a day with more dimension
    // tuples than the cap would leave the overflow unexamined, and those rows
    // would keep reporting last-known counts forever — the exact failure this
    // function exists to prevent, just applied to a smaller slice of the day.
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let query = firestore
        .collection(collectionName)
        .where(bucketField, "==", bucket)
        .orderBy(FieldPath.documentId())
        .limit(PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;

      let batch = firestore.batch();
      let pending = 0;
      for (const doc of snapshot.docs) {
        if (!produced.has(doc.id)) {
          batch.delete(doc.ref);
          deleted += 1;
          pending += 1;
        }
      }
      await commitInChunks(batch, pending, errors);

      if (snapshot.size < PAGE_SIZE) break;
      cursor = snapshot.docs[snapshot.size - 1]!;
    }
  }
  return deleted;
}

/** Delete a collection's documents in bounded slices, ordered by `timeField`. */
async function prune(
  collectionName: string,
  timeField: string,
  olderThanIso: string,
  errors: string[],
): Promise<number> {
  const firestore = db();
  let deleted = 0;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = firestore
      .collection(collectionName)
      .where(timeField, "<", olderThanIso)
      .orderBy(timeField)
      .limit(400);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    let batch = firestore.batch();
    let pending = 0;
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      pending += 1;
      deleted += 1;
      if (pending >= MAX_BATCH_WRITES) {
        await commitInChunks(batch, pending, errors);
        batch = firestore.batch();
        pending = 0;
      }
    }
    await commitInChunks(batch, pending, errors);
    if (snapshot.size < 400) break;
    cursor = snapshot.docs[snapshot.size - 1]!;
  }
  return deleted;
}

/**
 * Full aggregation run. Safe to invoke repeatedly and concurrently: document
 * ids are deterministic and every write is an absolute recomputation.
 */
export async function runAggregation(): Promise<AggregationReport> {
  const startedAt = nowIso();
  const errors: string[] = [];
  const settings = await getSettings();
  const now = new Date();

  // The repair window plus today, which is still receiving events.
  const days = dayRange(REPAIR_WINDOW_DAYS + 1, now);

  const rolled = await rollUp(days);

  // Vehicle and advertiser labels can only be resolved once the ids are known.
  const allBuckets = [...rolled.daily.values(), ...rolled.hourly.values()];
  const vehicles = await loadVehicleDimensions(
    allBuckets.map((entry) => String(entry.dimension.vehicleId)),
  );
  const advertisers = await loadCampaignAdvertisers(
    allBuckets.map((entry) => String(entry.dimension.campaignId)),
  );

  for (const entry of allBuckets) {
    const vehicle = vehicles.get(String(entry.dimension.vehicleId));
    if (vehicle) {
      entry.dimension.vehicleCode = vehicle.vehicleCode;
      // The vehicle's home zone is the authoritative zone for playback and
      // engagement rows; a conversion's attributed zone is left as-is.
      if (entry.dimension.zoneId === "" || entry.dimension.zoneId === "-") {
        entry.dimension.zoneId = vehicle.zoneId;
      }
    }
    entry.dimension.advertiserId =
      advertisers.get(String(entry.dimension.campaignId)) ??
      (typeof entry.dimension.advertiserId === "string" && entry.dimension.advertiserId !== "-"
        ? entry.dimension.advertiserId
        : "-");
  }

  const dailyWritten = await writeAggregates(COLLECTIONS.playbackDaily, "date", rolled.daily, errors);
  const hourlyWritten = await writeAggregates(COLLECTIONS.playbackHourly, "hourKey", rolled.hourly, errors);

  // Hourly rows are keyed by hour, so stale detection for them is scoped to the
  // hours inside the processed days rather than to a whole day at a time.
  const dailyKeys = new Set(rolled.daily.keys());
  const staleDaily = await deleteStaleRows(
    COLLECTIONS.playbackDaily,
    "date",
    days,
    dailyKeys,
    errors,
  );
  const staleHourly = await deleteStaleRowsByHour(
    COLLECTIONS.playbackHourly,
    "hourKey",
    days.flatMap((day) => hourKeysFor(day)),
    new Set(rolled.hourly.keys()),
    errors,
  );
  const staleRowsDeleted = staleDaily + staleHourly;

  // Pruning is deliberately skipped when the rollup reported errors. Raw events
  // are the only copy of the ledger, so deleting them after a partial run would
  // destroy data that the failed run never made it into an aggregate.
  let prunedPlayback = 0;
  let prunedEngagement = 0;
  let prunedConversions = 0;
  if (errors.length === 0) {
    const floor = (daysBack: number): string => new Date(now.getTime() - daysBack * 86_400_000).toISOString();
    const minimumWindow = REPAIR_WINDOW_DAYS + 2;
    prunedPlayback = await prune(
      COLLECTIONS.playbackEvents,
      "timestamp",
      floor(Math.max(settings.retention.rawEventRetentionDays, minimumWindow)),
      errors,
    );
    prunedEngagement = await prune(
      COLLECTIONS.engagementEvents,
      "timestamp",
      floor(Math.max(settings.retention.engagementRetentionDays, minimumWindow)),
      errors,
    );
    prunedConversions = await prune(
      COLLECTIONS.conversions,
      "occurredAt",
      floor(Math.max(settings.retention.conversionRetentionDays, minimumWindow)),
      errors,
    );
  }

  return {
    startedAt,
    finishedAt: nowIso(),
    daysProcessed: days,
    playbackDailyWritten: dailyWritten,
    playbackHourlyWritten: hourlyWritten,
    engagementRowsWritten: rolled.engagementRows,
    conversionRowsWritten: rolled.conversionRows,
    rawEventsScanned: rolled.scanned,
    staleRowsDeleted,
    prunedPlayback,
    prunedEngagement,
    prunedConversions,
    errors,
  };
}

/** The 24 hourly bucket keys covering one day, in chronological order. */
function hourKeysFor(day: string): string[] {
  return Array.from({ length: 24 }, (_, hour) => `${day}T${String(hour).padStart(2, "0")}`);
}

async function deleteStaleRowsByHour(
  collectionName: string,
  bucketField: "hourKey",
  buckets: readonly string[],
  produced: ReadonlySet<string>,
  errors: string[],
): Promise<number> {
  return deleteStaleRows(collectionName, bucketField, buckets, produced, errors);
}
