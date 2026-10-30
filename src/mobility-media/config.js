/**
 * Runtime configuration for the Mobility Media portal.
 *
 * Values come from Vite env vars so the same bundle can be pointed at the
 * emulator, staging or production without a code change. Defaults match
 * `API_BASE` in `functions/src/lib/config.ts` and the rewrite in
 * `firebase.json`, so a production build needs no env at all.
 */

const env = import.meta.env ?? {};

/** Path the API is served from. Same-origin in production via the hosting rewrite. */
export const API_BASE = (env.VITE_API_BASE_URL ?? "/api/mobility").replace(/\/+$/, "");

/**
 * The Mobility Media Firebase project — a separate project from the legacy
 * site's `Firebaseconfig.jsx` (see `lib/firebase.js`).
 *
 * The default is a `demo-` id, which the emulators treat as offline-only, and
 * matches `.firebaserc`. A production build must set `VITE_MM_FIREBASE_PROJECT_ID`.
 */
export const FIREBASE_PROJECT_ID = env.VITE_MM_FIREBASE_PROJECT_ID ?? "demo-webortex-mobility";

/**
 * Emulator mode.
 *
 * Auto-detected from the dev server rather than set by hand, so a developer
 * cannot accidentally point the emulator at real data. `VITE_USE_EMULATORS`
 * forces it either way.
 */
export const USE_EMULATORS =
  env.VITE_USE_EMULATORS === "true" ||
  (env.VITE_USE_EMULATORS !== "false" && env.DEV === true);

export const EMULATOR_AUTH_HOST = env.VITE_EMULATOR_AUTH_HOST ?? "127.0.0.1:9099";

/** Base path the portal is mounted at inside the legacy router. */
export const PORTAL_BASE = "/mobility";

/** Requests are abandoned after this long so a hung call cannot wedge a screen. */
export const REQUEST_TIMEOUT_MS = env.VITE_API_TIMEOUT_MS ?? 30_000;