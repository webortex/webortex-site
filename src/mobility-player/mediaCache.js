/**
 * Offline media cache.
 *
 * Signed URLs expire and change on every playlist refresh, so media is cached
 * under a stable key per creative instead of under its URL. A creative is
 * downloaded once and keeps playing from the cache through any outage.
 */

const CACHE_NAME = "webortex-player-media-v1";

function keyFor(creativeId) {
  return new Request(`/__player-media/${encodeURIComponent(creativeId)}`);
}

const objectUrls = new Map();

/** Download any slot media not already cached. Failures are left for the next refresh. */
export async function prefetch(slots) {
  if (typeof caches === "undefined") return;
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    slots.map(async (slot) => {
      if (!slot.mediaUrl) return;
      if (await cache.match(keyFor(slot.creativeId))) return;
      try {
        const response = await fetch(slot.mediaUrl, { mode: "cors" });
        if (response.ok) await cache.put(keyFor(slot.creativeId), response);
      } catch {
        // Offline or blocked: the slot falls back to its live URL or a text card.
      }
    }),
  );
}

/**
 * A playable URL for the slot: cached bytes first, then the live signed URL,
 * then null (the player shows a text card).
 */
export async function sourceFor(slot) {
  if (objectUrls.has(slot.creativeId)) return objectUrls.get(slot.creativeId);
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(keyFor(slot.creativeId));
      if (hit) {
        const url = URL.createObjectURL(await hit.blob());
        objectUrls.set(slot.creativeId, url);
        return url;
      }
    } catch {
      // Fall through to the network URL.
    }
  }
  return slot.mediaUrl;
}

/** Drop cached creatives no longer in the playlist so storage does not grow forever. */
export async function prune(keepCreativeIds) {
  if (typeof caches === "undefined") return;
  const keep = new Set(keepCreativeIds.map((id) => keyFor(id).url));
  const cache = await caches.open(CACHE_NAME);
  for (const request of await cache.keys()) {
    if (!keep.has(request.url)) await cache.delete(request);
  }
  for (const [creativeId, url] of objectUrls) {
    if (!keepCreativeIds.includes(creativeId)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(creativeId);
    }
  }
}
