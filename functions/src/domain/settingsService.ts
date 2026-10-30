/**
 * Platform settings service.
 *
 * Reads the live `mm_settings/platform` document and merges it over the shipped
 * defaults, caching for a short window. Every commercial rule the business can
 * reasonably change resolves through here, which is what keeps percentages and
 * thresholds out of source code.
 */

import { COLLECTIONS, mergePlatformSettings, type PlatformSettings } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";

let cache: { value: PlatformSettings; expiresAt: number } | null = null;
const CACHE_TTL_MS = 30_000;
const inflight = new Map<string, Promise<PlatformSettings>>();

export async function getSettings(forceRefresh = false): Promise<PlatformSettings> {
  if (!forceRefresh && cache && cache.expiresAt > Date.now()) return cache.value;

  const existing = inflight.get("platform");
  if (existing) return existing;

  const promise = (async (): Promise<PlatformSettings> => {
    try {
      const snapshot = await db().collection(COLLECTIONS.settings).doc("platform").get();
      const merged = mergePlatformSettings(snapshot.exists ? snapshot.data() : {});
      cache = { value: merged, expiresAt: Date.now() + CACHE_TTL_MS };
      return merged;
    } catch {
      // A settings read failure must not take the delivery path down; the
      // shipped defaults are always safe to deliver against.
      const fallback = mergePlatformSettings({});
      cache = { value: fallback, expiresAt: Date.now() + CACHE_TTL_MS };
      return fallback;
    } finally {
      inflight.delete("platform");
    }
  })();

  inflight.set("platform", promise);
  return promise;
}

export async function saveSettings(next: PlatformSettings, actorId: string | null): Promise<PlatformSettings> {
  const merged = mergePlatformSettings({ ...next, updatedAt: new Date().toISOString(), updatedBy: actorId ?? "system" });
  await db()
    .collection(COLLECTIONS.settings)
    .doc("platform")
    .set(merged, { merge: true });
  cache = { value: merged, expiresAt: Date.now() + CACHE_TTL_MS };
  return merged;
}

export function invalidateSettingsCache(): void {
  cache = null;
}

/** Timezone offset currently in force for the network. */
export function networkTimezoneOffsetMinutes(settings: PlatformSettings): number {
  try {
    // Derive the *current* offset for the configured IANA zone, which handles
    // daylight-saving transitions. Campaigns store their own offset in the
    // targeting document; this is the network default.
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone,
      timeZoneName: "longOffset",
    });
    const part = formatter.formatToParts(now).find((item) => item.type === "timeZoneName");
    if (!part) return 330;
    const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part.value);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    const hours = Number(match[2] ?? 0);
    const minutes = Number(match[3] ?? 0);
    return sign * (hours * 60 + minutes);
  } catch {
    return 330;
  }
}