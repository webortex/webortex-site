/**
 * Device credential storage.
 *
 * Provisioning links carry the credential in the URL fragment
 * (`/player#id=DEV_…&key=…`). Fragments are never sent to a server, and the
 * player removes it from the address bar as soon as it is stored, so it does
 * not linger in history or get read off the screen by a passenger.
 *
 * Stored in localStorage: a player is a dedicated kiosk browser, and the key
 * only authorises posting plays for this one screen.
 */

const STORAGE_KEY = "webortex.player.credentials";

/** Parse `#id=…&key=…`. Returns null unless both are present and plausible. */
export function credentialsFromHash(hash) {
  const params = new URLSearchParams(String(hash ?? "").replace(/^#/, ""));
  const deviceId = params.get("id")?.trim() ?? "";
  const deviceKey = params.get("key")?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(deviceId)) return null;
  if (deviceKey.length < 32 || deviceKey.length > 256) return null;
  return { deviceId, deviceKey };
}

export function loadCredentials(storage = safeStorage()) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
    return parsed && parsed.deviceId && parsed.deviceKey ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials, storage = safeStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(credentials));
  } catch {
    // Storage disabled: the player still runs for this session.
  }
}

export function clearCredentials(storage = safeStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

function safeStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}
