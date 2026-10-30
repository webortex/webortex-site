/**
 * Device API client for the screen player.
 *
 * Authenticates with the device credential (`X-Device-Id` + `X-Device-Key`),
 * never a user token. Errors are classified so the player can react correctly:
 *
 *  - `auth`      401/403 — the key was rotated or the device decommissioned.
 *                Retrying cannot help; the player returns to provisioning.
 *  - `retryable` network failure, 408, 429, 5xx — back off and try again.
 *  - `fatal`     anything else — a bug or a contract mismatch; logged, skipped.
 */

export class DeviceApiError extends Error {
  constructor(kind, status, message, code = null) {
    super(message);
    this.name = "DeviceApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

function classify(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 0 || status === 408 || status === 429 || status >= 500) return "retryable";
  return "fatal";
}

/**
 * @param {{ baseUrl: string, deviceId: string, deviceKey: string, fetchImpl?: typeof fetch, timeoutMs?: number }} options
 */
export function createDeviceClient({ baseUrl, deviceId, deviceKey, fetchImpl, timeoutMs = 20_000 }) {
  const doFetch = fetchImpl ?? ((...args) => fetch(...args));
  const root = baseUrl.replace(/\/+$/, "");

  async function request(path, { method = "GET", body, query } = {}) {
    const search = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null)).toString()}` : "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await doFetch(`${root}${path}${search}`, {
        method,
        headers: {
          Accept: "application/json",
          "X-Device-Id": deviceId,
          "X-Device-Key": deviceKey,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new DeviceApiError("retryable", 0, "Network unavailable.");
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 204) return null;
    const text = await response.text().catch(() => "");
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new DeviceApiError(
        classify(response.status),
        response.status,
        payload?.error?.message ?? `Request failed with status ${response.status}.`,
        payload?.error?.code ?? null,
      );
    }
    return payload?.data ?? null;
  }

  return {
    deviceId,
    playlist: (length = 20) => request("/device/playlist", { query: { length } }),
    heartbeat: (body) => request("/device/heartbeat", { method: "POST", body: { deviceId, ...body } }),
    postPlayback: (events) => request("/device/events/playback", { method: "POST", body: { events } }),
  };
}
