/**
 * Playlist rotation and play records — pure functions, no I/O.
 */

/** Never show a slot for less than this, whatever the creative claims. */
export const MIN_SLOT_SECONDS = 3;

/** Normalise the API response into playable slots, in server order. */
export function slotsFrom(response) {
  const raw = Array.isArray(response?.items) ? response.items : [];
  return raw
    .filter((item) => item && typeof item.creativeId === "string" && typeof item.campaignId === "string")
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    .map((item) => ({
      creativeId: item.creativeId,
      campaignId: item.campaignId,
      mediaUrl: item.mediaUrl ?? null,
      mimeType: item.mimeType ?? null,
      isVideo: item.format === "VIDEO" || (item.mimeType ?? "").startsWith("video/"),
      durationSeconds: Math.max(MIN_SLOT_SECONDS, Math.round(Number(item.durationSeconds) || response?.slotDurationSeconds || 15)),
      name: item.name ?? "",
      headline: item.headline ?? "",
      callToAction: item.callToAction ?? "",
    }));
}

/** Index of the slot after `current`, wrapping. -1 when there is nothing to play. */
export function nextIndex(slots, current) {
  if (!slots.length) return -1;
  return current < 0 ? 0 : (current + 1) % slots.length;
}

/** A client-generated, API-valid (`[A-Za-z0-9_-]{3,64}`) event id. */
export function newEventId() {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  return `EVT_${random}`.slice(0, 64);
}

/**
 * The playback event for one finished (or cut-short) slot.
 *
 * `vehicleId` is left null: the API fills it from the device's own binding,
 * which is the only trustworthy source.
 */
export function playbackEvent({ deviceId, screenId, slot, startedAt, endedAt, slotIndex, offline }) {
  const playedSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));
  const ratio = Math.min(1, playedSeconds / slot.durationSeconds);
  return {
    eventId: newEventId(),
    deviceId,
    screenId: screenId ?? null,
    vehicleId: null,
    campaignId: slot.campaignId,
    creativeId: slot.creativeId,
    timestamp: new Date(startedAt).toISOString(),
    durationPlayedSeconds: Math.min(3600, playedSeconds),
    completed: ratio >= 0.99,
    completionRatio: Number(ratio.toFixed(3)),
    slotIndex,
    playbackStartedOffline: Boolean(offline),
    gps: null,
  };
}
