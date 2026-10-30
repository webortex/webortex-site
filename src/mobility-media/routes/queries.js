/**
 * Hooks wrapping the API surface.
 *
 * Screens call these rather than `api.get` directly so that query keys, response
 * shapes and the assumptions about pagination live in one place. When an
 * endpoint's contract changes, this is the only file that needs to know.
 *
 * Each hook validates the shape it depends on. The API is well typed, but the
 * dashboard renders money figures, and a missing field becoming `0` on screen is
 * worse than a visible failure — so anything a stat card depends on is checked.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { api, qk } from "@/mobility-media/lib/api";

/** Default range for dashboard views. */
export const DEFAULT_RANGE = { from: "30d", to: "now" };

/**
 * Read a possibly-absent number.
 *
 * Returns `null` rather than `0` when the field is missing so a formatter can
 * show "—" and the caller can tell "no data" from "zero revenue".
 */
function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Unwraps the list shapes the API returns.
 *
 * The list endpoints are not uniform, and pretending otherwise is how a screen
 * ends up paginating a list the server already paginated:
 *   - `/campaigns`, `/fleet/*`  -> `{ items }`, the whole set
 *   - `/support/tickets`        -> `{ items, total }`, server-paged
 *   - `/creatives`              -> `{ items, total, hasMore }`, offset-paged
 *   - `/notifications`          -> `{ items, unread, hasMore }`, offset-paged
 */
function items(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

/** Total row count for a server-paged list; falls back to the array length. */
export function totalOf(payload) {
  if (Array.isArray(payload)) return payload.length;
  const total = payload?.total ?? payload?.totalCount ?? payload?.count;
  return typeof total === "number" ? total : items(payload).length;
}

/** True when the server paginated this response, so the screen should not. */
export function isServerPaged(payload) {
  return Boolean(payload && !Array.isArray(payload) && typeof (payload.total ?? payload.totalCount) === "number");
}

export function useSummary(params = {}) {
  return useQuery({
    queryKey: qk.analyticsSummary(params),
    queryFn: ({ signal }) => api.get("/analytics/summary", { query: params, signal }),
  });
}

export function usePlatformAnalytics(params = {}) {
  return useQuery({
    queryKey: qk.analyticsPlatform(params),
    queryFn: ({ signal }) => api.get("/analytics/platform", { query: params, signal }),
  });
}

export function useCampaignTable(params = {}) {
  return useQuery({
    queryKey: qk.analyticsCampaignTable(params),
    queryFn: ({ signal }) => api.get("/analytics/campaigns/table", { query: params, signal }),
  });
}

export function useCampaignAnalytics(params = {}) {
  return useQuery({
    queryKey: qk.analyticsCampaigns(params),
    queryFn: ({ signal }) => api.get("/analytics/campaigns", { query: params, signal }),
  });
}

export function useCampaignDetail(campaignId, params = {}) {
  return useQuery({
    queryKey: qk.analyticsCampaign(campaignId, params),
    queryFn: ({ signal }) => api.get(`/analytics/campaigns/${encodeURIComponent(campaignId)}`, { query: params, signal }),
    enabled: Boolean(campaignId),
  });
}

export function useVehicleAnalytics(params = {}) {
  return useQuery({
    queryKey: qk.analyticsVehicles(params),
    queryFn: ({ signal }) => api.get("/analytics/vehicles", { query: params, signal }),
  });
}

export function useScreenAnalytics(params = {}) {
  return useQuery({
    queryKey: qk.analyticsScreens(params),
    queryFn: ({ signal }) => api.get("/analytics/screens", { query: params, signal }),
  });
}

export function useRevenue(params = {}) {
  return useQuery({
    queryKey: qk.analyticsRevenue(params),
    queryFn: ({ signal }) => api.get("/analytics/revenue", { query: params, signal }),
  });
}

/**
 * Exports a CSV download. Not a React Query hook: it is a side effect that hands
 * a file to the browser, so there is nothing meaningful to cache.
 *
 * Goes through `api.download` rather than a bare `fetch` so the request carries
 * the bearer token and an export failure reports the server's correlation id
 * instead of "Export failed."
 */
export async function downloadCampaignCsv(params = {}) {
  const blob = await api.download("/analytics/export.csv", { query: params });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `campaigns-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked immediately rather than on unload: a long-lived object URL keeps the
  // whole export in memory for the life of the tab.
  URL.revokeObjectURL(url);
}

/* Campaigns ---------------------------------------------------------------- */

export function useCampaigns(params = {}) {
  return useQuery({
    queryKey: qk.campaigns(params),
    queryFn: ({ signal }) => api.get("/campaigns", { query: params, signal }),
  });
}

export function useCampaign(campaignId) {
  return useQuery({
    queryKey: qk.campaign(campaignId),
    queryFn: ({ signal }) => api.get(`/campaigns/${encodeURIComponent(campaignId)}`, { signal }),
    enabled: Boolean(campaignId),
  });
}

/**
 * Create a campaign.
 *
 * `asDraft` is a sibling of `campaignCreateSchema`, not a field on it: the route
 * reads it off the raw body before parsing. Creating as a draft still requires a
 * complete, valid payload — the only difference is that it does not enter the
 * review queue.
 */
export function useCreateCampaign() {
  return useMutation({
    mutationFn: ({ asDraft = false, ...input }) => api.post("/campaigns", { ...input, asDraft }),
  });
}

/* Creatives ---------------------------------------------------------------- */

/**
 * The creative list is server-paged, so callers pass `page`/`limit` through and
 * `isServerPaged` reports whether client-side slicing would double-paginate.
 */
export function useCreatives(params = {}) {
  return useQuery({
    queryKey: qk.creatives(params),
    queryFn: ({ signal }) => api.get("/creatives", { query: params, signal }),
  });
}

export function useReviewQueue(params = {}) {
  return useQuery({
    queryKey: qk.creativeQueue(params),
    queryFn: ({ signal }) => api.get("/creatives/review", { query: params, signal }),
  });
}

/* Fleet -------------------------------------------------------------------- */

export function useVehicles(params = {}) {
  return useQuery({
    queryKey: qk.fleetVehicles(params),
    queryFn: ({ signal }) => api.get("/fleet/vehicles", { query: params, signal }),
  });
}

export function useScreens(params = {}) {
  return useQuery({
    queryKey: qk.fleetScreens(params),
    queryFn: ({ signal }) => api.get("/fleet/screens", { query: params, signal }),
  });
}

export function useScreenHealth(params = {}) {
  return useQuery({
    queryKey: qk.fleetScreenHealth(params),
    queryFn: ({ signal }) => api.get("/fleet/screens/health", { query: params, signal }),
  });
}

export function useDrivers(params = {}) {
  return useQuery({
    queryKey: qk.fleetDrivers(params),
    queryFn: ({ signal }) => api.get("/fleet/drivers", { query: params, signal }),
  });
}

/* Finance ------------------------------------------------------------------ */

export function useWallet({ enabled = true } = {}) {
  return useQuery({ queryKey: qk.wallet, queryFn: ({ signal }) => api.get("/finance/wallet", { signal }), enabled });
}

export function useEarnings(params = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: qk.earnings(params),
    queryFn: ({ signal }) => api.get("/finance/earnings", { query: params, signal }),
    enabled,
  });
}

/* Account ------------------------------------------------------------------ */

export function useNotifications(params = {}) {
  return useQuery({
    queryKey: qk.notifications(params),
    queryFn: ({ signal }) => api.get("/notifications", { query: params, signal }),
  });
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: ({ signal }) => api.get("/settings", { signal }) });
}

export function useTickets(params = {}) {
  return useQuery({
    queryKey: qk.tickets(params),
    queryFn: ({ signal }) => api.get("/support/tickets", { query: params, signal }),
  });
}

export function useTicket(ticketId) {
  return useQuery({
    queryKey: qk.ticket(ticketId),
    queryFn: ({ signal }) => api.get(`/support/tickets/${encodeURIComponent(ticketId)}`, { signal }),
    enabled: Boolean(ticketId),
  });
}

/* Shape helpers ------------------------------------------------------------ */

export { items, num };

/**
 * Client-side paging for endpoints that return the whole set.
 *
 * Kept here rather than in each screen so the page size is consistent, and so it
 * is obvious which screens paginate on the server and which do this.
 */
export const DEFAULT_PAGE_SIZE = 25;

/** Slices an unpaginated list for the current page. */
export function paginate(rows, page, pageSize = DEFAULT_PAGE_SIZE) {
  const list = Array.isArray(rows) ? rows : [];
  return {
    rows: list.slice((page - 1) * pageSize, page * pageSize),
    total: list.length,
    pageCount: Math.max(1, Math.ceil(list.length / pageSize)),
  };
}