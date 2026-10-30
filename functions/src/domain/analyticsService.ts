/**
 * Analytics service.
 *
 * Reads the pre-aggregated `mm_agg_*` collections, never raw events, for anything
 * dashboard-facing. That is the point of the aggregation pipeline: a platform
 * dashboard must stay responsive at 10k+ screens where a raw scan would mean
 * millions of reads per request.
 *
 * Every rate is computed through the shared metric helpers, so a zero
 * denominator yields `null` and the UI renders "N/A" rather than a misleading 0%.
 */

import {
  costPerConversion,
  costPerLead,
  COLLECTIONS,
  conversionRate,
  engagementRate,
  formatPercent,
  leadConversionRate,
  playbackCompletionRate,
  returnOnInvestment,
  splitSpend,
  type AnalyticsEnvelope,
  type AnalyticsRange,
  type BreakdownRow,
  type Campaign,
  type CampaignMetrics,
  type Device,
  type MetricSeriesPoint,
  type PlatformMetrics,
  type ScreenMetrics,
  type Vehicle,
  type VehicleMetrics,
} from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { deriveDeviceStatus, screenHealthSummary } from "./fleetService.js";
import { getSettings } from "./settingsService.js";

/** Firestore's hard per-query ceiling. */
const PAGE_SIZE = 5_000;

/**
 * Read every document a query matches, following the cursor.
 *
 * A bare `.limit(5_000).get()` truncates silently, and because these queries
 * produce *totals*, a truncated page does not look like missing data - it looks
 * like a smaller number. A dashboard that quietly under-reports revenue is worse
 * than one that errors, so every aggregate read is paged to completion.
 *
 * `hardCap` is a runaway guard, not a page size. Hitting it means the result set
 * is larger than this function is prepared to total, and returning a partial sum
 * would be exactly the quiet under-reporting this exists to prevent — so it
 * throws and the caller sees a failure instead of a plausible wrong number.
 *
 * Every call site wants a complete total; none of them deliberately cap. If a
 * query genuinely needs a bounded read, use an explicit `.limit()` at the call
 * site so the truncation is visible in the query rather than hidden here.
 *
 * Exported so the paging behaviour can be tested directly; it is not part of the
 * service's contract and callers should go through the query helpers.
 */
export async function readAll(
  query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  hardCap = 50_000,
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let exhausted = false;

  // The loop condition is `<=` rather than `<`, and the page size is allowed to
  // reach `hardCap + 1`. Stopping as soon as `docs.length === hardCap` cannot
  // distinguish "exactly at the cap and finished" from "at the cap with more to
  // come", so one probe row past the cap is read to settle it. Without that, a
  // result set of precisely `hardCap` documents would be rejected even though it
  // is complete.
  while (docs.length <= hardCap) {
    const pageSize = Math.min(PAGE_SIZE, hardCap + 1 - docs.length);
    let page = query.limit(pageSize);
    if (cursor) page = page.startAfter(cursor);

    const snapshot = await page.get();
    if (snapshot.empty) {
      exhausted = true;
      break;
    }
    docs.push(...snapshot.docs);
    // A short page means the query is exhausted; there is nothing after it.
    if (snapshot.size < pageSize) {
      exhausted = true;
      break;
    }
    cursor = snapshot.docs[snapshot.size - 1]!;
  }

  if (!exhausted) {
    throw ApiError.unprocessable(
      `This query matched more than ${hardCap.toLocaleString("en-IN")} documents, so its total ` +
        "cannot be reported accurately. Narrow the date range or the filter, or report this to an " +
        "administrator so a maintained counter can be introduced.",
    );
  }
  return docs;
}

export function granularityFor(range: AnalyticsRange): "HOURLY" | "DAILY" {
  if (range.granularity) return range.granularity;
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000;
  return days <= 3 ? "HOURLY" : "DAILY";
}

interface AggregateRow {
  readonly bucket: string;
  readonly plays: number;
  readonly completedPlays: number;
  readonly impressions: number;
  readonly engagements: number;
  readonly leads: number;
  readonly conversions: number;
  readonly spendMinor: number;
  readonly attributedRevenueMinor: number;
}

const ZERO_ROW: Omit<AggregateRow, "bucket"> = {
  plays: 0,
  completedPlays: 0,
  impressions: 0,
  engagements: 0,
  leads: 0,
  conversions: 0,
  spendMinor: 0,
  attributedRevenueMinor: 0,
};

function emptyAggregate(bucket: string): AggregateRow {
  return { bucket, ...ZERO_ROW };
}

function addRows(a: Omit<AggregateRow, "bucket">, b: Omit<AggregateRow, "bucket">): Omit<AggregateRow, "bucket"> {
  return {
    plays: a.plays + b.plays,
    completedPlays: a.completedPlays + b.completedPlays,
    impressions: a.impressions + b.impressions,
    engagements: a.engagements + b.engagements,
    leads: a.leads + b.leads,
    conversions: a.conversions + b.conversions,
    spendMinor: a.spendMinor + b.spendMinor,
    attributedRevenueMinor: a.attributedRevenueMinor + b.attributedRevenueMinor,
  };
}

function sumRows(rows: readonly Omit<AggregateRow, "bucket">[]): Omit<AggregateRow, "bucket"> {
  return rows.reduce(addRows, ZERO_ROW);
}

function bucketKey(date: Date, granularity: "HOURLY" | "DAILY"): string {
  return granularity === "HOURLY" ? date.toISOString().slice(0, 13) : date.toISOString().slice(0, 10);
}

/** Build a dense series so charts never show a gap where a day had no traffic. */
function densify(
  rows: readonly AggregateRow[],
  range: AnalyticsRange,
  granularity: "HOURLY" | "DAILY",
): MetricSeriesPoint[] {
  const byBucket = new Map(rows.map((row) => [row.bucket, row]));
  const stepMs = granularity === "HOURLY" ? 3_600_000 : 86_400_000;
  const start = Date.parse(`${range.from}T00:00:00.000Z`);
  const end = Date.parse(`${range.to}T23:59:59.999Z`);
  const output: MetricSeriesPoint[] = [];
  // Hard cap so a pathological range cannot spin here; the schema already limits
  // spans to 730 days, which is 730 buckets at DAILY granularity.
  for (let cursor = start, guard = 0; cursor <= end && guard < 5_000; cursor += stepMs, guard += 1) {
    const key = bucketKey(new Date(cursor), granularity);
    const row = byBucket.get(key) ?? emptyAggregate(key);
    output.push(row);
  }
  return output;
}

export interface CampaignFilter {
  readonly campaignIds?: readonly string[];
  readonly advertiserId?: string;
  readonly creativeIds?: readonly string[];
  readonly vehicleIds?: readonly string[];
  readonly screenIds?: readonly string[];
  readonly zoneIds?: readonly string[];
}

/** Firestore `in` is capped at 30 values; longer filter lists are chunked. */
const IN_QUERY_LIMIT = 30;

function chunk<T>(items: readonly T[], size = IN_QUERY_LIMIT): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
}

/**
 * Fetch aggregate rows for a range, always filtered by at least one equality
 * field so Firestore can use an index instead of scanning the collection.
 */
async function fetchAggregateRows(
  range: AnalyticsRange,
  filter: CampaignFilter,
): Promise<AggregateRow[]> {
  const granularity = granularityFor(range);
  const collectionName = granularity === "HOURLY" ? COLLECTIONS.playbackHourly : COLLECTIONS.playbackDaily;
  const keyField = granularity === "HOURLY" ? "hourKey" : "date";

  // Decide the single equality filter that anchors the query.
  let equality: { field: string; value: string } | null = null;
  if (filter.campaignIds && filter.campaignIds.length > 0) {
    equality = { field: "campaignId", value: filter.campaignIds[0]! };
  } else if (filter.advertiserId) {
    equality = { field: "advertiserId", value: filter.advertiserId };
  } else if (filter.vehicleIds && filter.vehicleIds.length > 0) {
    equality = { field: "vehicleId", value: filter.vehicleIds[0]! };
  } else if (filter.screenIds && filter.screenIds.length > 0) {
    equality = { field: "screenId", value: filter.screenIds[0]! };
  }

  const remainingCampaignIds = (filter.campaignIds ?? []).filter((id) => id !== equality?.value);
  const remainingVehicleIds = (filter.vehicleIds ?? []).filter((id) => id !== equality?.value);
  const remainingScreenIds = (filter.screenIds ?? []).filter((id) => id !== equality?.value);
  const hasMoreFilters =
    remainingCampaignIds.length > 0 || remainingVehicleIds.length > 0 || remainingScreenIds.length > 0;

  const creativeFilter = filter.creativeIds && filter.creativeIds.length > 0 ? new Set(filter.creativeIds) : null;
  const zoneFilter = filter.zoneIds && filter.zoneIds.length > 0 ? new Set(filter.zoneIds) : null;

  const grouped = new Map<string, Omit<AggregateRow, "bucket">>();
  const matchesFilters = (data: Record<string, unknown>): boolean => {
    if (creativeFilter && !creativeFilter.has(String(data.creativeId ?? ""))) return false;
    if (zoneFilter && !zoneFilter.has(String(data.zoneId ?? ""))) return false;
    if (filter.advertiserId && String(data.advertiserId ?? "") !== filter.advertiserId) return false;
    if (filter.campaignIds?.length && !filter.campaignIds.includes(String(data.campaignId ?? ""))) return false;
    if (filter.vehicleIds?.length && !filter.vehicleIds.includes(String(data.vehicleId ?? ""))) return false;
    if (filter.screenIds?.length && !filter.screenIds.includes(String(data.screenId ?? ""))) return false;
    return true;
  };

  const collect = (data: Record<string, unknown>): void => {
    if (!matchesFilters(data)) return;
    const bucket = String(data[keyField] ?? "");
    if (bucket.length === 0) return;
    grouped.set(
      bucket,
      addRows(grouped.get(bucket) ?? ZERO_ROW, {
        plays: Number(data.plays ?? 0),
        completedPlays: Number(data.completedPlays ?? 0),
        impressions: Number(data.impressions ?? 0),
        engagements: Number(data.engagements ?? 0),
        leads: Number(data.leads ?? 0),
        conversions: Number(data.conversions ?? 0),
        spendMinor: Number(data.spendMinor ?? 0),
        attributedRevenueMinor: Number(data.attributedRevenueMinor ?? 0),
      }),
    );
  };

  const baseQuery = () => {
    let query = db()
      .collection(collectionName)
      .where(keyField, ">=", range.from)
      .where(keyField, "<=", range.to);
    if (equality) query = query.where(equality.field, "==", equality.value);
    return query;
  };

  if (!hasMoreFilters) {
    const rows = await readAll(baseQuery());
    for (const doc of rows) collect(doc.data() as Record<string, unknown>);
    return [...grouped.entries()].map(([bucket, totals]) => ({ bucket, ...totals }));
  }

  // More than one id dimension was requested: issue one query per chunk of the
  // secondary dimension and intersect in memory. Bounded by chunk count.
  const secondaryChunks: { field: string; values: string[] }[] = [];
  if (remainingCampaignIds.length > 0) secondaryChunks.push({ field: "campaignId", values: remainingCampaignIds });
  if (remainingVehicleIds.length > 0) secondaryChunks.push({ field: "vehicleId", values: remainingVehicleIds });
  if (remainingScreenIds.length > 0) secondaryChunks.push({ field: "screenId", values: remainingScreenIds });

  const tasks: Promise<void>[] = [];
  let combinations = 1;
  for (const secondary of secondaryChunks) {
    const groups = chunk(secondary.values);
    combinations = Math.max(combinations, groups.length);
    for (const values of groups) {
      tasks.push(
        baseQuery()
          .where(secondary.field, "in", values)
          .limit(2_000)
          .get()
          .then((snapshot) => {
            for (const doc of snapshot.docs) collect(doc.data() as Record<string, unknown>);
          }),
      );
    }
  }
  if (combinations > 40) {
    throw ApiError.unprocessable("Too many filters combined. Narrow the selection and retry.");
  }
  await Promise.all(tasks);

  return [...grouped.entries()].map(([bucket, totals]) => ({ bucket, ...totals }));
}

export async function campaignAnalytics(
  range: AnalyticsRange,
  filter: CampaignFilter,
): Promise<AnalyticsEnvelope<CampaignMetrics>> {
  const granularity = granularityFor(range);
  const rows = await fetchAggregateRows(range, filter);
  const totals = sumRows(rows);
  const breakdowns = await breakdownRows(range, filter);

  return {
    range: { from: range.from, to: range.to, granularity },
    totals: buildCampaignMetrics("aggregate", "All campaigns", "N/A", totals),
    series: densify(rows, range, granularity),
    breakdowns,
    generatedAt: new Date().toISOString(),
    isDemoData: false,
  };
}

function buildCampaignMetrics(
  campaignId: string,
  campaignName: string,
  status: string,
  totals: Omit<AggregateRow, "bucket">,
): CampaignMetrics {
  return {
    campaignId,
    campaignName,
    status,
    plays: totals.plays,
    completedPlays: totals.completedPlays,
    impressions: totals.impressions,
    engagements: totals.engagements,
    leads: totals.leads,
    conversions: totals.conversions,
    spendMinor: totals.spendMinor,
    attributedRevenueMinor: totals.attributedRevenueMinor,
    completionRate: playbackCompletionRate({ numerator: totals.completedPlays, denominator: totals.plays }),
    engagementRate: engagementRate({ numerator: totals.engagements, denominator: totals.plays }),
    conversionRate: conversionRate({ numerator: totals.conversions, denominator: totals.engagements }),
    leadConversionRate: leadConversionRate({ numerator: totals.leads, denominator: totals.engagements }),
    costPerLeadMinor: costPerLead(totals.spendMinor, totals.leads),
    costPerConversionMinor: costPerConversion(totals.spendMinor, totals.conversions),
    roiPercent: returnOnInvestment(totals.attributedRevenueMinor, totals.spendMinor),
  };
}

export interface CampaignAnalyticsDetail {
  readonly envelope: AnalyticsEnvelope<CampaignMetrics>;
  readonly campaigns: readonly CampaignMetrics[];
}

/** Full campaign analytics payload: KPI envelope plus a per-campaign table. */
export async function campaignAnalyticsDetail(
  range: AnalyticsRange,
  filter: CampaignFilter,
): Promise<CampaignAnalyticsDetail> {
  const granularity = granularityFor(range);
  const rows = await fetchAggregateRows(range, filter);
  const totals = sumRows(rows);
  const [breakdowns, campaigns] = await Promise.all([
    breakdownRows(range, filter),
    perCampaignTable(range, filter),
  ]);

  return {
    envelope: {
      range: { from: range.from, to: range.to, granularity },
      totals: buildCampaignMetrics("aggregate", "All campaigns", "N/A", totals),
      series: densify(rows, range, granularity),
      breakdowns,
      generatedAt: new Date().toISOString(),
      isDemoData: false,
    },
    campaigns,
  };
}

/**
 * Breakdown tables.
 *
 * The aggregation documents carry one row per (campaign, creative, screen,
 * vehicle, zone, day) combination, so a single grouped pass over the same rows
 * produces every breakdown the UI needs.
 */
async function breakdownRows(
  range: AnalyticsRange,
  filter: CampaignFilter,
): Promise<AnalyticsEnvelope<unknown>["breakdowns"]> {
  const granularity = granularityFor(range);
  const collectionName = granularity === "HOURLY" ? COLLECTIONS.playbackHourly : COLLECTIONS.playbackDaily;
  const keyField = granularity === "HOURLY" ? "hourKey" : "date";

  let query = db()
    .collection(collectionName)
    .where(keyField, ">=", range.from)
    .where(keyField, "<=", range.to);
  if (filter.campaignIds && filter.campaignIds.length > 0) {
    query = query.where("campaignId", "==", filter.campaignIds[0]!);
  } else if (filter.advertiserId) {
    query = query.where("advertiserId", "==", filter.advertiserId);
  }
  const rows = await readAll(query);

  const byLocation = new Map<string, BreakdownRow>();
  const byVehicle = new Map<string, BreakdownRow>();
  const byCreative = new Map<string, BreakdownRow>();
  const byTimeOfDay = new Map<string, BreakdownRow>();
  const byDayOfWeek = new Map<string, BreakdownRow>();
  const byZone = new Map<string, BreakdownRow>();

  const add = (map: Map<string, BreakdownRow>, key: string | null, label: string, data: Record<string, unknown>): void => {
    if (!key) return;
    const existing = map.get(key);
    const increment = {
      plays: Number(data.plays ?? 0),
      impressions: Number(data.impressions ?? 0),
      engagements: Number(data.engagements ?? 0),
      leads: Number(data.leads ?? 0),
      conversions: Number(data.conversions ?? 0),
      spendMinor: Number(data.spendMinor ?? 0),
    };
    map.set(key, {
      key,
      label,
      plays: (existing?.plays ?? 0) + increment.plays,
      impressions: (existing?.impressions ?? 0) + increment.impressions,
      engagements: (existing?.engagements ?? 0) + increment.engagements,
      leads: (existing?.leads ?? 0) + increment.leads,
      conversions: (existing?.conversions ?? 0) + increment.conversions,
      spendMinor: (existing?.spendMinor ?? 0) + increment.spendMinor,
    });
  };

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

  for (const doc of rows) {
    const data = doc.data() as Record<string, unknown>;
    if (filter.campaignIds && filter.campaignIds.length > 0 && !filter.campaignIds.includes(String(data.campaignId))) continue;
    if (filter.advertiserId && String(data.advertiserId) !== filter.advertiserId) continue;

    const cityId = String(data.cityId ?? "");
    const zoneId = String(data.zoneId ?? "");
    const locationKey = cityId || zoneId;
    add(byLocation, locationKey, String(data.cityLabel ?? locationKey), data);
    add(byZone, zoneId, String(data.zoneLabel ?? zoneId), data);
    add(byVehicle, String(data.vehicleId ?? ""), String(data.vehicleCode ?? data.vehicleId ?? ""), data);
    add(byCreative, String(data.creativeId ?? ""), String(data.creativeName ?? data.creativeId ?? ""), data);

    const timeOfDay = String(data.timeOfDay ?? "unknown");
    add(byTimeOfDay, timeOfDay, timeOfDay, data);

    const bucket = String(data[keyField] ?? "");
    if (bucket.length >= 10) {
      const dayIndex = new Date(`${bucket.slice(0, 10)}T00:00:00.000Z`).getUTCDay();
      const day = dayNames[dayIndex] ?? "UNKNOWN";
      add(byDayOfWeek, day, day, data);
    }
  }

  const top = (map: Map<string, BreakdownRow>): BreakdownRow[] =>
    [...map.values()].sort((a, b) => b.plays - a.plays).slice(0, 50);

  return {
    byLocation: top(byLocation),
    byVehicle: top(byVehicle),
    byCreative: top(byCreative),
    byTimeOfDay: top(byTimeOfDay),
    byDayOfWeek: top(byDayOfWeek),
    byZone: top(byZone),
  };
}

export async function perCampaignTable(
  range: AnalyticsRange,
  filter: CampaignFilter,
): Promise<CampaignMetrics[]> {
  const campaigns = await loadCampaigns(filter);
  if (campaigns.length === 0) return [];

  const byCampaign = new Map<string, Omit<AggregateRow, "bucket">>();
  for (const campaign of campaigns) {
    byCampaign.set(campaign.id, ZERO_ROW);
  }

  // Second pass keyed by campaign, using the same filtered documents.
  const granularity = granularityFor(range);
  const collectionName = granularity === "HOURLY" ? COLLECTIONS.playbackHourly : COLLECTIONS.playbackDaily;
  const keyField = granularity === "HOURLY" ? "hourKey" : "date";
  let query = db()
    .collection(collectionName)
    .where(keyField, ">=", range.from)
    .where(keyField, "<=", range.to)
    .where("campaignId", "in", campaigns.slice(0, IN_QUERY_LIMIT).map((campaign) => campaign.id));
  const rows = await readAll(query);

  for (const doc of rows) {
    const data = doc.data() as Record<string, unknown>;
    const campaignId = String(data.campaignId ?? "");
    if (!byCampaign.has(campaignId)) continue;
    byCampaign.set(
      campaignId,
      addRows(byCampaign.get(campaignId)!, {
        plays: Number(data.plays ?? 0),
        completedPlays: Number(data.completedPlays ?? 0),
        impressions: Number(data.impressions ?? 0),
        engagements: Number(data.engagements ?? 0),
        leads: Number(data.leads ?? 0),
        conversions: Number(data.conversions ?? 0),
        spendMinor: Number(data.spendMinor ?? 0),
        attributedRevenueMinor: Number(data.attributedRevenueMinor ?? 0),
      }),
    );
  }

  return campaigns.map((campaign) =>
    buildCampaignMetrics(
      campaign.id,
      campaign.name,
      campaign.status,
      byCampaign.get(campaign.id) ?? ZERO_ROW,
    ),
  );
}

async function loadCampaigns(filter: CampaignFilter): Promise<Campaign[]> {
  if (filter.campaignIds && filter.campaignIds.length > 0) {
    const snapshots = await db().getAll(
      ...filter.campaignIds.slice(0, IN_QUERY_LIMIT).map((id) => db().collection(COLLECTIONS.campaigns).doc(id)),
    );
    return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.data() as Campaign);
  }
  if (!filter.advertiserId) return [];
  const snapshot = await db()
    .collection(COLLECTIONS.campaigns)
    .where("advertiserId", "==", filter.advertiserId)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snapshot.docs.map((doc) => doc.data() as Campaign);
}

export async function platformAnalytics(range: AnalyticsRange): Promise<AnalyticsEnvelope<PlatformMetrics>> {
  const settings = await getSettings();
  const granularity = granularityFor(range);
  const rows = await fetchAggregateRows(range, {});
  const totals = sumRows(rows);
  const breakdowns = await breakdownRows(range, {});

  // Firestore's `count()` aggregation is exact and does not read documents, so
  // entity counts are safe at any scale. Ledger documents cannot be counted
  // that way — the totals below are sums of amounts, not row counts — so they
  // are paged in full. A truncated read here would report less revenue than the
  // platform actually collected, with nothing on screen to indicate it.
  const [advertisers, campaigns, drivers, health, successTransactions, pendingPayouts, totalVehicles] =
    await Promise.all([
      db().collection(COLLECTIONS.advertisers).count().get(),
      db().collection(COLLECTIONS.campaigns).count().get(),
      db().collection(COLLECTIONS.drivers).count().get(),
      screenHealthSummary(),
      readAll(db().collection(COLLECTIONS.transactions).where("status", "==", "SUCCESS")),
      readAll(
        db()
          .collection(COLLECTIONS.payouts)
          .where("status", "in", ["PENDING", "SCHEDULED", "PROCESSING"]),
      ),
      db().collection(COLLECTIONS.vehicles).count().get(),
    ]);

  // `count().where(...)` is not available: the filter has to be part of the
  // query that produces the aggregate. Both forms still avoid reading documents.
  const [activeAdvertisers, activeCampaigns, activeVehicles] = await Promise.all([
    db()
      .collection(COLLECTIONS.advertisers)
      .where("verification.status", "==", "APPROVED")
      .count()
      .get(),
    db().collection(COLLECTIONS.campaigns).where("status", "==", "RUNNING").count().get(),
    db().collection(COLLECTIONS.vehicles).where("status", "==", "ACTIVE").count().get(),
  ]);

  let grossRevenueMinor = 0;
  let outstandingMinor = 0;
  let spendInRangeMinor = 0;
  for (const doc of successTransactions) {
    const data = doc.data() as Record<string, unknown>;
    const amount = Math.abs(Number(data.amountMinor ?? 0));
    const type = String(data.type ?? "");
    if (type === "CREDIT" || type === "TOPUP") grossRevenueMinor += amount;
    if (type === "CHARGE" || type === "DEBIT") outstandingMinor += amount;
    if (String(data.createdAt ?? "").slice(0, 10) >= range.from && String(data.createdAt ?? "").slice(0, 10) <= range.to) {
      spendInRangeMinor += amount;
    }
  }

  let pendingPayoutsMinor = 0;
  for (const doc of pendingPayouts) {
    pendingPayoutsMinor += Number(doc.data().netMinor ?? 0);
  }

  const platform = splitSpend(spendInRangeMinor, settings.revenue);

  const platformMetrics: PlatformMetrics = {
    totalAdvertisers: advertisers.data().count,
    activeAdvertisers: activeAdvertisers.data().count,
    totalCampaigns: campaigns.data().count,
    activeCampaigns: activeCampaigns.data().count,
    totalScreens: health.total,
    onlineScreens: health.online,
    offlineScreens: health.offline,
    degradedScreens: health.degraded,
    unassignedScreens: health.unassigned,
    // Previously this repeated the *active* count, so "total vehicles" could
    // never exceed the number currently in service and a fleet that had been
    // partly decommissioned would look fully staffed.
    totalVehicles: totalVehicles.data().count,
    activeVehicles: activeVehicles.data().count,
    totalDrivers: drivers.data().count,
    totalPlays: totals.plays,
    totalImpressions: totals.impressions,
    totalEngagements: totals.engagements,
    totalLeads: totals.leads,
    totalConversions: totals.conversions,
    grossRevenueMinor,
    platformRevenueMinor: platform.platformMinor,
    outstandingMinor,
    pendingPayoutsMinor,
    engagementRate: engagementRate({ numerator: totals.engagements, denominator: totals.plays }),
    conversionRate: conversionRate({ numerator: totals.conversions, denominator: totals.engagements }),
  };

  return {
    range: { from: range.from, to: range.to, granularity },
    totals: platformMetrics,
    series: densify(rows, range, granularity),
    breakdowns,
    generatedAt: new Date().toISOString(),
    isDemoData: false,
  };
}

export async function vehicleAnalytics(
  range: AnalyticsRange,
  vehicleIds: readonly string[],
): Promise<VehicleMetrics[]> {
  if (vehicleIds.length === 0) return [];
  const scheduledSeconds = Math.max(1, (Date.parse(range.to) - Date.parse(range.from)) / 1000);

  const totalsByVehicle = new Map<string, Omit<AggregateRow, "bucket">>();
  const activeDaysByVehicle = new Map<string, Set<string>>();

  for (const group of chunk(vehicleIds)) {
    const rows = await readAll(
      db()
        .collection(COLLECTIONS.playbackDaily)
        .where("vehicleId", "in", group)
        .where("date", ">=", range.from)
        .where("date", "<=", range.to),
    );
    for (const doc of rows) {
      const data = doc.data() as Record<string, unknown>;
      const vehicleId = String(data.vehicleId);
      totalsByVehicle.set(
        vehicleId,
        addRows(totalsByVehicle.get(vehicleId) ?? ZERO_ROW, {
          plays: Number(data.plays ?? 0),
          completedPlays: Number(data.completedPlays ?? 0),
          impressions: Number(data.impressions ?? 0),
          engagements: Number(data.engagements ?? 0),
          leads: Number(data.leads ?? 0),
          conversions: Number(data.conversions ?? 0),
          spendMinor: Number(data.spendMinor ?? 0),
          attributedRevenueMinor: Number(data.attributedRevenueMinor ?? 0),
        }),
      );
      if (!activeDaysByVehicle.has(vehicleId)) activeDaysByVehicle.set(vehicleId, new Set());
      activeDaysByVehicle.get(vehicleId)!.add(String(data.date));
    }
  }

  const vehicleSnapshots = await db().getAll(
    ...vehicleIds.slice(0, IN_QUERY_LIMIT).map((id) => db().collection(COLLECTIONS.vehicles).doc(id)),
  );
  const byId = new Map<string, Vehicle>();
  for (const snapshot of vehicleSnapshots) {
    if (snapshot.exists) byId.set(snapshot.id, snapshot.data() as Vehicle);
  }

  return vehicleIds.map((vehicleId) => {
    const totals = totalsByVehicle.get(vehicleId) ?? ZERO_ROW;
    const vehicle = byId.get(vehicleId);
    const activeDays = activeDaysByVehicle.get(vehicleId)?.size ?? 0;
    // A vehicle that delivered on a day was reachable that day, so uptime is the
    // share of the range's seconds it was actually present for.
    const onlineSeconds = Math.min(scheduledSeconds, activeDays * 86_400);
    return {
      key: vehicleId,
      label: vehicle?.code ?? vehicle?.registrationNumber ?? vehicleId,
      plays: totals.plays,
      impressions: totals.impressions,
      engagements: totals.engagements,
      leads: totals.leads,
      conversions: totals.conversions,
      spendMinor: totals.spendMinor,
      vehicleId,
      uptimeRate: scheduledSeconds > 0 ? onlineSeconds / scheduledSeconds : null,
      onlineSeconds,
      scheduledSeconds,
    };
  });
}

export async function screenAnalytics(
  range: AnalyticsRange,
  screenIds: readonly string[],
): Promise<ScreenMetrics[]> {
  if (screenIds.length === 0) return [];
  const settings = await getSettings();
  const scheduledSeconds = Math.max(1, (Date.parse(range.to) - Date.parse(range.from)) / 1000);

  const totalsByScreen = new Map<string, Omit<AggregateRow, "bucket">>();
  for (const group of chunk(screenIds)) {
    const rows = await readAll(
      db()
        .collection(COLLECTIONS.playbackDaily)
        .where("screenId", "in", group)
        .where("date", ">=", range.from)
        .where("date", "<=", range.to),
    );
    for (const doc of rows) {
      const data = doc.data() as Record<string, unknown>;
      const screenId = String(data.screenId);
      totalsByScreen.set(
        screenId,
        addRows(totalsByScreen.get(screenId) ?? ZERO_ROW, {
          plays: Number(data.plays ?? 0),
          completedPlays: Number(data.completedPlays ?? 0),
          impressions: Number(data.impressions ?? 0),
          engagements: Number(data.engagements ?? 0),
          leads: Number(data.leads ?? 0),
          conversions: Number(data.conversions ?? 0),
          spendMinor: Number(data.spendMinor ?? 0),
          attributedRevenueMinor: Number(data.attributedRevenueMinor ?? 0),
        }),
      );
    }
  }

  const screenSnapshots = await db().getAll(
    ...screenIds.slice(0, IN_QUERY_LIMIT).map((id) => db().collection(COLLECTIONS.screens).doc(id)),
  );
  const screensById = new Map<string, Record<string, unknown>>();
  for (const snapshot of screenSnapshots) {
    if (snapshot.exists) screensById.set(snapshot.id, snapshot.data() as Record<string, unknown>);
  }

  const deviceIds = [...screensById.values()]
    .map((screen) => screen.deviceId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const devicesById = new Map<string, Device>();
  if (deviceIds.length > 0) {
    const deviceSnapshots = await db().getAll(
      ...deviceIds.slice(0, IN_QUERY_LIMIT).map((id) => db().collection(COLLECTIONS.devices).doc(id)),
    );
    for (const snapshot of deviceSnapshots) {
      if (snapshot.exists) devicesById.set(snapshot.id, snapshot.data() as Device);
    }
  }

  return screenIds.map((screenId) => {
    const totals = totalsByScreen.get(screenId) ?? ZERO_ROW;
    const screen = screensById.get(screenId);
    const device = typeof screen?.deviceId === "string" ? devicesById.get(String(screen.deviceId)) : undefined;
    const derived = device
      ? deriveDeviceStatus(device, settings.heartbeat)
      : ({ status: "OFFLINE", msSinceHeartbeat: null, severity: "unknown" } as const);

    // Uptime over the range is only meaningful for a device that has reported
    // within it; otherwise it stays null rather than claiming 100%.
    let uptimeRate: number | null = null;
    let onlineSeconds = 0;
    if (device?.lastHeartbeatAt) {
      const lastBeat = Date.parse(device.lastHeartbeatAt);
      if (!Number.isNaN(lastBeat) && lastBeat >= Date.parse(range.from) && lastBeat <= Date.parse(range.to)) {
        const presentSeconds = Math.min(scheduledSeconds, Math.max(0, lastBeat - Date.parse(range.from)) + settings.heartbeat.warningAfterMs / 1000);
        onlineSeconds = presentSeconds;
        uptimeRate = presentSeconds / scheduledSeconds;
      }
    }

    return {
      key: screenId,
      label: (screen?.code as string | undefined) ?? screenId,
      plays: totals.plays,
      impressions: totals.impressions,
      engagements: totals.engagements,
      leads: totals.leads,
      conversions: totals.conversions,
      spendMinor: totals.spendMinor,
      screenId,
      status: derived.status,
      uptimeRate,
      onlineSeconds,
      errorCount: device?.errorCount24h ?? 0,
      currentCampaignId: (device?.currentCampaignId as string | null) ?? null,
    };
  });
}

/** CSV export of a campaign's performance series. */
export function seriesToCsv(series: readonly MetricSeriesPoint[]): string {
  const header = [
    "bucket",
    "plays",
    "completed_plays",
    "impressions",
    "engagements",
    "leads",
    "conversions",
    "spend_minor",
    "attributed_revenue_minor",
  ];
  const rows = series.map((point) =>
    [
      point.bucket,
      point.plays,
      point.completedPlays,
      point.impressions,
      point.engagements,
      point.leads,
      point.conversions,
      point.spendMinor,
      point.attributedRevenueMinor,
    ].join(","),
  );
  const totals = sumRows(series);
  rows.push("");
  rows.push(
    [
      "TOTAL",
      totals.plays,
      totals.completedPlays,
      totals.impressions,
      totals.engagements,
      totals.leads,
      totals.conversions,
      totals.spendMinor,
      totals.attributedRevenueMinor,
    ].join(","),
  );
  rows.push(
    `engagement_rate,${formatPercent(engagementRate({ numerator: totals.engagements, denominator: totals.plays }))}`,
  );
  return [header.join(","), ...rows].join("\n");
}
