/**
 * HTTP client for the Mobility Media API.
 *
 * Every call goes through `request`, which owns four concerns that are easy to
 * get subtly wrong per-caller:
 *
 *  - **The envelope.** Success is `{ data, correlationId }`, failure is
 *    `{ error: { code, message, correlationId, details } }`. Unwrapping here
 *    means no screen has to know that.
 *  - **Auth.** A Firebase ID token is attached as `Authorization: Bearer`. The
 *    token provider is injected rather than imported, which keeps this module
 *    free of a dependency on the auth context and makes it testable without one.
 *  - **Sign-out.** A 401 means the token is gone or was revoked server-side. The
 *    session is ended centrally instead of each query deciding what to do, so a
 *    revoked token cannot leave the UI showing stale data as if signed in.
 *  - **Cancellation.** Aborts are re-thrown untouched. They are control flow,
 *    not failures, and must not trigger a toast or a sign-out.
 *
 * Authorisation is never decided here. The client renders what the server says
 * it may; every endpoint re-checks independently.
 */

import { API_BASE, REQUEST_TIMEOUT_MS } from "@/mobility-media/config";

/** A non-2xx response, or a response whose body did not match the envelope. */
export class ApiError extends Error {
  constructor(status, code, message, { correlationId = null, details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.details = details;
  }

  /** True when retrying the same request might succeed. */
  get isRetryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }

  /** True when the user is signed in but not allowed to do this. */
  get isForbidden() {
    return this.status === 403;
  }

  get isUnauthorised() {
    return this.status === 401;
  }
}

/** Thrown when the request was aborted by the caller. Never surfaced to the user. */
export function isAbortError(error) {
  return (
    error instanceof DOMException
      ? error.name === "AbortError"
      : error?.name === "AbortError" || error?.code === 20
  );
}

let getToken = async () => null;
let onUnauthorised = () => {};

/**
 * Wires the client to a session. Called once by the auth provider on mount.
 * Passing `null` for either restores the defaults, which is what the tests use.
 */
export function configureApiClient({ tokenProvider, onSessionExpired } = {}) {
  getToken = tokenProvider ?? (async () => null);
  onUnauthorised = onSessionExpired ?? (() => {});
}

/** Build a query string, dropping `undefined`/`null` and keeping arrays repeated. */
function buildQuery(query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.append(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

/**
 * A timeout that composes with a caller-supplied signal.
 *
 * `AbortSignal.any` is not used: it is unavailable in some supported browsers,
 * and the fallback has to clear its timer or the node process is held open by a
 * pending timeout in tests.
 */
function withTimeout(signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), REQUEST_TIMEOUT_MS);

  if (!signal) return { signal: controller.signal, done: () => clearTimeout(timer) };

  if (signal.aborted) controller.abort(signal.reason);
  const forward = () => controller.abort(signal.reason);
  signal.addEventListener("abort", forward, { once: true });

  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", forward);
    },
  };
}

async function request(path, { method = "GET", body, query, signal, headers = {} } = {}) {
  const { signal: effectiveSignal, done } = withTimeout(signal);

  const requestHeaders = { Accept: "application/json", ...headers };
  let payload;
  if (body !== undefined && body !== null) {
    requestHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const token = await getToken();
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
      method,
      headers: requestHeaders,
      body: payload,
      signal: effectiveSignal,
    });
  } catch (error) {
    if (isAbortError(error) || error?.name === "TimeoutError") throw error;
    // `fetch` only rejects on a network-level failure, so there is no status to
  // report and no correlation id to offer support.
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
  } finally {
    done();
  }

  // 204 carries no body by definition. It has to return here rather than falling
  // through, because there is no envelope to unwrap and the check below would
  // reject a legitimate empty response.
  if (response.status === 204) return undefined;

  const text = await response.text().catch(() => "");
  let body_ = null;
  if (text) {
    try {
      body_ = JSON.parse(text);
    } catch {
      body_ = null;
    }
  }

  if (!response.ok) {
    const error = body_?.error;
    const apiError = new ApiError(
      response.status,
      error?.code ?? "HTTP_ERROR",
      // Prefer the server's message: it is written for the person who hit it.
      error?.message ?? `Request failed with status ${response.status}.`,
      { correlationId: error?.correlationId ?? null, details: error?.details ?? null },
    );
    if (apiError.isUnauthorised) onUnauthorised();
    throw apiError;
  }

  // A 200 with an unparseable body means something between here and the API is
  // rewriting responses. Surfacing it beats handing a screen `undefined`.
  if (!body_ || typeof body_ !== "object") {
    throw new ApiError(response.status, "MALFORMED_RESPONSE", "The server returned an unexpected response.");
  }

  return body_.data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),

  /**
   * Fetches a binary body as a Blob.
   *
   * Kept separate from `request` because a CSV export is not a JSON envelope, so
   * the unwrap step there would reject it. It still goes through the same token
   * injection, timeout and error mapping, so an unauthenticated export fails
   * loudly here instead of returning a login page saved as `campaigns.csv`.
   */
  async download(path, { query, signal } = {}) {
    const { signal: effectiveSignal, done } = withTimeout(signal);
    const headers = { Accept: "text/csv,application/octet-stream" };

    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${API_BASE}${path}${buildQuery(query)}`, {
        method: "GET",
        headers,
        signal: effectiveSignal,
      });
    } catch (error) {
      if (isAbortError(error) || error?.name === "TimeoutError") throw error;
      throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again.");
    } finally {
      done();
    }

    if (!response.ok) {
      // Errors still arrive as the JSON envelope even on this route.
      const body_ = await response.json().catch(() => null);
      const error = body_?.error;
      const apiError = new ApiError(
        response.status,
        error?.code ?? "HTTP_ERROR",
        error?.message ?? `Export failed with status ${response.status}.`,
        { correlationId: error?.correlationId ?? null, details: error?.details ?? null },
      );
      if (apiError.isUnauthorised) onUnauthorised();
      throw apiError;
    }

    return response.blob();
  },
};

/**
 * Query keys.
 *
 * Centralised because React Query matches on prefix: an ad-hoc key in one screen
 * that does not start with the matching namespace will not be invalidated when
 * a mutation succeeds, and the screen silently shows stale data.
 */
export const qk = {
  me: ["me"],
  settings: ["settings"],
  campaigns: (params) => ["campaigns", "list", params ?? {}],
  campaign: (campaignId) => ["campaigns", "detail", campaignId],
  creatives: (params) => ["creatives", "list", params ?? {}],
  creativeQueue: (params) => ["creatives", "review", params ?? {}],
  fleetVehicles: (params) => ["fleet", "vehicles", params ?? {}],
  fleetScreens: (params) => ["fleet", "screens", params ?? {}],
  fleetScreenHealth: (params) => ["fleet", "screens", "health", params ?? {}],
  fleetDrivers: (params) => ["fleet", "drivers", params ?? {}],
  analyticsSummary: (params) => ["analytics", "summary", params ?? {}],
  analyticsPlatform: (params) => ["analytics", "platform", params ?? {}],
  analyticsCampaigns: (params) => ["analytics", "campaigns", params ?? {}],
  analyticsCampaignTable: (params) => ["analytics", "campaigns", "table", params ?? {}],
  analyticsCampaign: (campaignId, params) => ["analytics", "campaigns", campaignId, params ?? {}],
  analyticsVehicles: (params) => ["analytics", "vehicles", params ?? {}],
  analyticsScreens: (params) => ["analytics", "screens", params ?? {}],
  analyticsRevenue: (params) => ["analytics", "revenue", params ?? {}],
  wallet: ["finance", "wallet"],
  earnings: (params) => ["finance", "earnings", params ?? {}],
  notifications: (params) => ["notifications", "list", params ?? {}],
  tickets: (params) => ["support", "tickets", params ?? {}],
  ticket: (ticketId) => ["support", "tickets", ticketId],
};