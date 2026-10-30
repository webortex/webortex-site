/**
 * Screen player logic: the outbox that must never lose or double-send a play,
 * rotation, event shape, credential handling and error classification.
 */

import { describe, expect, it, vi } from "vitest";
import { playbackEventSchema } from "../../packages/shared/src/index.js";
import { credentialsFromHash, loadCredentials, saveCredentials, clearCredentials } from "@/mobility-player/credentials";
import { createDeviceClient, DeviceApiError } from "@/mobility-player/deviceClient";
import { createEventQueue, MAX_BATCH, memoryStore } from "@/mobility-player/eventQueue";
import { newEventId, nextIndex, playbackEvent, slotsFrom } from "@/mobility-player/playlist";

function event(n) {
  return { eventId: `EVT_${String(n).padStart(4, "0")}`, timestamp: new Date(1_700_000_000_000 + n * 1000).toISOString() };
}

describe("event queue", () => {
  it("removes events only after the server accepts their batch", async () => {
    const store = memoryStore();
    const queue = createEventQueue(store);
    await queue.enqueue(event(1));
    await queue.enqueue(event(2));

    await expect(queue.flush(async () => { throw new DeviceApiError("retryable", 503, "down"); })).rejects.toThrow("down");
    expect(await queue.size()).toBe(2);

    const sent = [];
    await queue.flush(async (batch) => { sent.push(...batch.map((e) => e.eventId)); });
    expect(sent).toEqual(["EVT_0001", "EVT_0002"]);
    expect(await queue.size()).toBe(0);
  });

  it("sends oldest first in bounded batches and keeps the failed tail", async () => {
    const queue = createEventQueue(memoryStore());
    for (let n = MAX_BATCH + 10; n > 0; n -= 1) await queue.enqueue(event(n));
    let calls = 0;
    await expect(
      queue.flush(async (batch) => {
        calls += 1;
        expect(batch.length).toBeLessThanOrEqual(MAX_BATCH);
        if (calls === 1) expect(batch[0].eventId).toBe("EVT_0001");
        if (calls === 2) throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
    expect(await queue.size()).toBe(10);
  });

  it("shares one flush between concurrent callers", async () => {
    const queue = createEventQueue(memoryStore());
    await queue.enqueue(event(1));
    const send = vi.fn(async () => undefined);
    await Promise.all([queue.flush(send), queue.flush(send)]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("playlist", () => {
  const response = {
    slotDurationSeconds: 15,
    items: [
      { creativeId: "CRV_2", campaignId: "CMP_1", sequence: 2, format: "VIDEO", durationSeconds: 20 },
      { creativeId: "CRV_1", campaignId: "CMP_1", sequence: 1, mimeType: "image/png", durationSeconds: null },
      { bogus: true },
    ],
  };

  it("orders slots, drops malformed ones and fills durations", () => {
    const slots = slotsFrom(response);
    expect(slots.map((slot) => slot.creativeId)).toEqual(["CRV_1", "CRV_2"]);
    expect(slots[0]).toMatchObject({ isVideo: false, durationSeconds: 15 });
    expect(slots[1]).toMatchObject({ isVideo: true, durationSeconds: 20 });
  });

  it("wraps the rotation and reports an empty playlist", () => {
    expect(nextIndex([], 0)).toBe(-1);
    expect(nextIndex([1, 2, 3], -1)).toBe(0);
    expect(nextIndex([1, 2, 3], 2)).toBe(0);
  });

  it("produces events the API schema accepts", () => {
    const [slot] = slotsFrom(response);
    const record = playbackEvent({ deviceId: "DEV_1", screenId: null, slot, startedAt: Date.now() - 15_000, endedAt: Date.now(), slotIndex: 0, offline: true });
    expect(playbackEventSchema.safeParse(record).success).toBe(true);
    expect(record).toMatchObject({ completed: true, completionRatio: 1, playbackStartedOffline: true, vehicleId: null });
  });

  it("records a cut-short slot as partial", () => {
    const [slot] = slotsFrom(response);
    const start = Date.now();
    const record = playbackEvent({ deviceId: "DEV_1", slot, startedAt: start, endedAt: start + 3_000, slotIndex: 1 });
    expect(record.completed).toBe(false);
    expect(record.completionRatio).toBeCloseTo(0.2);
  });

  it("mints unique, API-valid event ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newEventId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{3,64}$/);
  });
});

describe("credentials", () => {
  const key = "k".repeat(40);

  it("reads a provisioning fragment and rejects malformed ones", () => {
    expect(credentialsFromHash(`#id=DEV_123&key=${key}`)).toEqual({ deviceId: "DEV_123", deviceKey: key });
    expect(credentialsFromHash("#id=DEV_123&key=short")).toBeNull();
    expect(credentialsFromHash(`#id=bad id&key=${key}`)).toBeNull();
    expect(credentialsFromHash("")).toBeNull();
  });

  it("round-trips through storage and clears", () => {
    const storage = new Map();
    const fake = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
    saveCredentials({ deviceId: "DEV_1", deviceKey: key }, fake);
    expect(loadCredentials(fake)).toEqual({ deviceId: "DEV_1", deviceKey: key });
    clearCredentials(fake);
    expect(loadCredentials(fake)).toBeNull();
  });
});

describe("device client", () => {
  function respond(status, body) {
    return vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  }

  it("sends the device credential headers and unwraps the envelope", async () => {
    const fetchImpl = respond(200, { data: { items: [] } });
    const client = createDeviceClient({ baseUrl: "/api/mobility/", deviceId: "DEV_1", deviceKey: "secret", fetchImpl });
    await expect(client.playlist(5)).resolves.toEqual({ items: [] });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/mobility/device/playlist?length=5");
    expect(init.headers).toMatchObject({ "X-Device-Id": "DEV_1", "X-Device-Key": "secret" });
  });

  it("classifies failures so the player can react", async () => {
    const make = (fetchImpl) => createDeviceClient({ baseUrl: "", deviceId: "D", deviceKey: "k", fetchImpl });
    await expect(make(respond(401, { error: { message: "Invalid device credentials." } })).playlist()).rejects.toMatchObject({ kind: "auth" });
    await expect(make(respond(503, {})).playlist()).rejects.toMatchObject({ kind: "retryable" });
    await expect(make(respond(429, {})).playlist()).rejects.toMatchObject({ kind: "retryable" });
    await expect(make(respond(400, {})).playlist()).rejects.toMatchObject({ kind: "fatal" });
    await expect(make(vi.fn(async () => { throw new TypeError("Failed to fetch"); })).playlist()).rejects.toMatchObject({ kind: "retryable", status: 0 });
  });

  it("treats a 204 heartbeat as success", async () => {
    const client = createDeviceClient({ baseUrl: "", deviceId: "D", deviceKey: "k", fetchImpl: respond(204) });
    await expect(client.heartbeat({ timestamp: new Date().toISOString() })).resolves.toBeNull();
  });
});
