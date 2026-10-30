/**
 * Service worker for the screen player (registered with scope `/player`).
 *
 * Its one job is to let a screen that reboots with no signal start the player
 * at all: the app shell (the `/player` page and the hashed JS/CSS it loads) is
 * cached as it is fetched. Media and the outbox are handled by the app itself
 * (Cache Storage + IndexedDB), and API calls are never cached here.
 *
 *  - navigations: network first, cached shell when offline;
 *  - `/assets/*`: cache first (file names are content-hashed, so a cached copy
 *    is never stale);
 *  - everything else, including `/api/*`: straight to the network.
 */

const SHELL_CACHE = "webortex-player-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("webortex-player-shell-") && name !== SHELL_CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put("/player", response.clone());
          return response;
        } catch {
          return (await cache.match("/player")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});
