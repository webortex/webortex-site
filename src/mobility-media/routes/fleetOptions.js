/**
 * Fleet option lists and helpers, kept apart from the dialog components so
 * those modules export only components (React Fast Refresh).
 */

export const VEHICLE_TYPES = ["AUTO", "CAB", "TAXI", "TOURIST", "BUS", "EV", "OTHER"];
export const SCREEN_TYPES = ["LCD", "LED", "OLED", "E_INK", "PROJECTOR"];
/** Must match `VEHICLE_STATUSES` / `DRIVER_STATUSES` in `functions/src/lib/fleetInputs.ts`. */
export const VEHICLE_STATUS_OPTIONS = ["PENDING", "VERIFIED", "ACTIVE", "MAINTENANCE", "SUSPENDED", "RETIRED"];
export const DRIVER_STATUS_OPTIONS = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION", "SUSPENDED"];

/**
 * The URL a screen opens to run as the given device.
 *
 * The credential travels in the fragment, which browsers never send to a
 * server; the player removes it from the address bar once stored.
 */
export function playerLink(deviceId, secret, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const fragment = new URLSearchParams({ id: deviceId, key: secret }).toString();
  return `${origin}/player#${fragment}`;
}
