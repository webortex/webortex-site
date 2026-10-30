/**
 * Analytics endpoints.
 *
 * Every route here reads pre-aggregated collections only; raw event collections
 * are never queried from the request path. That is what keeps a dashboard load
 * cheap and predictable regardless of how many plays the network served.
 *
 * Tenancy: a non-staff caller is always pinned to their own advertiser, and to
 * their own vehicles for fleet views, before the service layer is reached.
 */

import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { dayFromQuery, first, list, rangeFromQuery } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { isStaff, assertOwnsAdvertiser } from "../middleware/auth.js";
import {
  campaignAnalytics,
  campaignAnalyticsDetail,
  perCampaignTable,
  platformAnalytics,
  screenAnalytics,
  seriesToCsv,
  vehicleAnalytics,
  type CampaignFilter,
} from "../domain/analyticsService.js";
import { screenHealthSummary } from "../domain/fleetService.js";
import { revenueAnalytics } from "../domain/financeService.js";
import { campaignsForAdvertiser, getCampaign, statusCounts } from "../domain/campaignService.js";
import { paginationFromQuery } from "../lib/params.js";
import type { Role } from "../../../packages/shared/src/index.js";

/** The parts of a principal that a scoping decision depends on. */
interface Viewer {
  readonly roles: readonly Role[];
  readonly advertiserId: string | null;
  readonly vehicleIds: readonly string[];
}

/** Resolves the advertiser a caller is allowed to see, or throws. */
function scopedAdvertiserId(viewer: Viewer, requested: string | undefined): string | undefined {
  if (isStaff(viewer)) return requested;
  if (!viewer.advertiserId) {
    throw ApiError.forbidden("Your account is not linked to an advertiser.");
  }
  if (requested && requested !== viewer.advertiserId) {
    // Confirms the rule without revealing whether the other advertiser exists.
    throw ApiError.forbidden("You can only view your own records.");
  }
  return viewer.advertiserId;
}

function vehicleScope(viewer: Viewer, requested: string[] | undefined): string[] {
  if (isStaff(viewer)) return requested ?? [];
  // Drivers only ever see their own assigned vehicles.
  return requested ? requested.filter((id) => viewer.vehicleIds.includes(id)) : [...viewer.vehicleIds];
}

function filterFromQuery(query: unknown, viewer: Viewer): CampaignFilter {
  const record = (query ?? {}) as Record<string, unknown>;
  const advertiserId = scopedAdvertiserId(viewer, first(record.advertiserId));
  const requestedVehicles = list(record.vehicleIds, 30);
  if (requestedVehicles && requestedVehicles.length > 0 && !isStaff(viewer)) {
    const permitted = requestedVehicles.filter((id) => viewer.vehicleIds.includes(id));
    if (permitted.length !== requestedVehicles.length) {
      throw ApiError.forbidden("You can only view vehicles assigned to you.");
    }
  }
  const vehicleIds = vehicleScope(viewer, requestedVehicles);
  return {
    advertiserId,
    campaignIds: list(record.campaignIds, 100),
    creativeIds: list(record.creativeIds, 100),
    vehicleIds: vehicleIds.length > 0 ? vehicleIds : undefined,
    screenIds: list(record.screenIds, 100),
    zoneIds: list(record.zoneIds, 100),
  };
}

export function registerAnalyticsRoutes(router: ApiRouter): void {
  // Platform-wide network metrics. Staff only: an advertiser must never see
  // another advertiser's network totals.
  router.get(
    "/analytics/platform",
    "user",
    async (context) => {
      const user = context.user();
      if (!isStaff(user)) throw ApiError.forbidden("Platform analytics are restricted to staff.");
      return platformAnalytics(rangeFromQuery(context.query));
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/campaigns",
    "user",
    async (context) => {
      const user = context.user();
      return campaignAnalytics(rangeFromQuery(context.query), filterFromQuery(context.query, user));
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  // Registered before `/analytics/campaigns/:campaignId` on purpose. The router
  // matches in registration order, so a dynamic route listed first swallows
  // this path and reads a campaign whose id is literally "table".
  router.get(
    "/analytics/campaigns/table",
    "user",
    async (context) => {
      const user = context.user();
      const range = rangeFromQuery(context.query);
      const filter = filterFromQuery(context.query, user);
      const paging = paginationFromQuery(context.query);
      const rows = await perCampaignTable(range, filter);
      const start = (paging.page - 1) * paging.pageSize;
      return {
        items: rows.slice(start, start + paging.pageSize),
        page: paging.page,
        pageSize: paging.pageSize,
        total: rows.length,
        hasMore: start + paging.pageSize < rows.length,
      };
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/campaigns/:campaignId",
    "user",
    async (context) => {
      const user = context.user();
      const campaignId = context.params.campaignId!;
      // Tenancy is decided from the campaign document itself, before any
      // aggregate is read, so a guessed id returns 403 without touching data.
      const campaign = await getCampaign(campaignId);
      assertOwnsAdvertiser(user, campaign.advertiserId);
      return campaignAnalyticsDetail(rangeFromQuery(context.query), { campaignIds: [campaignId] });
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/vehicles",
    "user",
    async (context) => {
      const user = context.user();
      return vehicleAnalytics(rangeFromQuery(context.query), vehicleScope(user, list(context.query.vehicleIds, 30)));
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/screens",
    "user",
    async (context) => {
      const user = context.user();
      return screenAnalytics(rangeFromQuery(context.query), vehicleScope(user, list(context.query.screenIds, 100)));
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/export.csv",
    "user",
    async (context) => {
      const user = context.user();
      const envelope = await campaignAnalytics(rangeFromQuery(context.query), filterFromQuery(context.query, user));
      const csv = seriesToCsv(envelope.series);
      context.response.set("Content-Type", "text/csv; charset=utf-8");
      context.response.set("Content-Disposition", `attachment; filename="mobility-analytics-${dayFromQuery(context.query, "from")}.csv"`);
      // Written directly rather than through the JSON envelope.
      context.response.status(200).send(csv);
      return undefined;
    },
    { permissions: ["analytics:export"], rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/analytics/revenue",
    "user",
    async (context) => {
      const user = context.user();
      if (!user.permissions.has("revenue:read")) throw ApiError.forbidden("Your role does not allow revenue reporting.");
      const range = rangeFromQuery(context.query);
      return revenueAnalytics({ from: range.from, to: range.to });
    },
    { permissions: ["revenue:read"], rateLimit: RATE_LIMITS.read },
  );

  /** Single call backing the admin dashboard header tiles. */
  router.get(
    "/analytics/summary",
    "user",
    async (context) => {
      const user = context.user();
      const staff = isStaff(user);
      const range = rangeFromQuery(context.query);
      const [health, campaigns] = await Promise.all([
        staff ? screenHealthSummary() : Promise.resolve(null),
        staff
          ? Promise.resolve(null)
          : campaignsForAdvertiser(user.advertiserId ?? "").then((list) => statusCounts(list)),
      ]);
      return { range, fleetHealth: health, campaignStatusCounts: campaigns };
    },
    { permissions: ["analytics:read"], rateLimit: RATE_LIMITS.read },
  );
}
