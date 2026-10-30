/**
 * In-vehicle screen player.
 *
 * Runs fullscreen in a kiosk browser on the screen's hardware and does four
 * things on independent timers, so a failure in one never stops the others:
 *
 *  - plays the playlist on a loop, from cached media where possible;
 *  - records every slot as a playback event in a durable local outbox;
 *  - uploads the outbox every minute and whenever the network returns;
 *  - sends a heartbeat so operations can see the screen is alive.
 *
 * The last playlist is kept in localStorage, so a screen that reboots with no
 * signal resumes the same rotation from cache instead of going black.
 *
 * Deliberately free of MUI and the portal's providers: this bundle runs on
 * low-end hardware for days at a time.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/mobility-media/config";
import { clearCredentials, credentialsFromHash, loadCredentials, saveCredentials } from "@/mobility-player/credentials";
import { createDeviceClient } from "@/mobility-player/deviceClient";
import { createEventQueue, indexedDbStore } from "@/mobility-player/eventQueue";
import { prefetch, prune, sourceFor } from "@/mobility-player/mediaCache";
import { nextIndex, playbackEvent, slotsFrom } from "@/mobility-player/playlist";

const PLAYLIST_REFRESH_MS = 5 * 60_000;
const FLUSH_INTERVAL_MS = 60_000;
const DEFAULT_HEARTBEAT_MS = 60_000;
const LAST_PLAYLIST_KEY = "webortex.player.lastPlaylist";
const APP_VERSION = "web-player-1.0.0";

const styles = {
  root: { position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "system-ui, sans-serif", overflow: "hidden", cursor: "none" },
  media: { width: "100%", height: "100%", objectFit: "contain", display: "block" },
  card: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "6vw", background: "linear-gradient(135deg,#0b1d3a,#1d4ed8)" },
  status: { position: "absolute", left: 12, bottom: 10, fontSize: 12, opacity: 0.55, letterSpacing: 0.3, pointerEvents: "none" },
  panel: { position: "absolute", top: 16, left: 16, background: "rgba(15,23,42,.92)", borderRadius: 12, padding: 16, fontSize: 14, maxWidth: 360, cursor: "auto", lineHeight: 1.5 },
  form: { maxWidth: 420, margin: "12vh auto", padding: 24, background: "#0f172a", borderRadius: 16, cursor: "auto" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", margin: "6px 0 14px", borderRadius: 8, border: "1px solid #334155", background: "#020617", color: "#fff", fontSize: 15 },
  button: { padding: "10px 16px", borderRadius: 8, border: 0, background: "#2563eb", color: "#fff", fontSize: 15, cursor: "pointer" },
};

function readLastPlaylist() {
  try {
    return JSON.parse(localStorage.getItem(LAST_PLAYLIST_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writeLastPlaylist(response) {
  try {
    localStorage.setItem(LAST_PLAYLIST_KEY, JSON.stringify(response));
  } catch {
    // Storage full or disabled: the in-memory playlist still plays.
  }
}

function networkStatus() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "NONE";
  const type = navigator?.connection?.type;
  if (type === "wifi") return "WIFI";
  if (type === "ethernet") return "ETHERNET";
  if (type === "cellular") return "CELLULAR";
  return "UNKNOWN";
}

export default function PlayerApp() {
  const [credentials, setCredentials] = useState(() => {
    const fromHash = typeof window !== "undefined" ? credentialsFromHash(window.location.hash) : null;
    if (fromHash) {
      saveCredentials(fromHash);
      // Take the key out of the address bar and history immediately.
      window.history.replaceState(null, "", window.location.pathname);
      return fromHash;
    }
    return loadCredentials();
  });
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/player-sw.js", { scope: "/player" }).catch(() => undefined);
    }
  }, []);

  if (!credentials) {
    return (
      <ProvisionForm
        message={authError}
        onSave={(next) => {
          saveCredentials(next);
          setAuthError(null);
          setCredentials(next);
        }}
      />
    );
  }

  return (
    <Player
      key={credentials.deviceId}
      credentials={credentials}
      onAuthFailure={(message) => {
        clearCredentials();
        setAuthError(message);
        setCredentials(null);
      }}
    />
  );
}

function Player({ credentials, onAuthFailure }) {
  const client = useMemo(
    () => createDeviceClient({ baseUrl: API_BASE, deviceId: credentials.deviceId, deviceKey: credentials.deviceKey }),
    [credentials],
  );
  const queueRef = useRef(null);
  const [slots, setSlots] = useState(() => slotsFrom(readLastPlaylist()));
  const [index, setIndex] = useState(-1);
  const [source, setSource] = useState(null);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const [pending, setPending] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const heartbeatMs = useRef(DEFAULT_HEARTBEAT_MS);
  const errorCount = useRef(0);
  const slotStart = useRef(0);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const handleError = useCallback(
    (error) => {
      if (error?.kind === "auth") {
        onAuthFailure("This screen's key was rejected. It may have been rotated — enter the new one.");
        return;
      }
      errorCount.current += 1;
      setLastError(error?.message ?? String(error));
    },
    [onAuthFailure],
  );

  const refreshPlaylist = useCallback(async () => {
    try {
      const response = await client.playlist(20);
      if (response?.heartbeatIntervalMs) heartbeatMs.current = response.heartbeatIntervalMs;
      const next = slotsFrom(response);
      writeLastPlaylist(response);
      setSlots(next);
      setLastError(null);
      void prefetch(next).then(() => prune(next.map((slot) => slot.creativeId)));
    } catch (error) {
      // A 409 means nothing is eligible right now; keep playing what we have.
      if (error?.status === 409) {
        setLastError("No eligible campaigns right now.");
        return;
      }
      handleError(error);
    }
  }, [client, handleError]);

  const flush = useCallback(async () => {
    const queue = queueRef.current;
    if (!queue) return;
    try {
      await queue.flush((batch) => client.postPlayback(batch));
    } catch (error) {
      handleError(error);
    } finally {
      setPending(await queue.size());
    }
  }, [client, handleError]);

  // Outbox, playlist and upload timers.
  useEffect(() => {
    let cancelled = false;
    void indexedDbStore().then((store) => {
      if (cancelled) return;
      queueRef.current = createEventQueue(store);
      void queueRef.current.size().then(setPending);
      void flush();
    });
    void refreshPlaylist();
    const playlistTimer = setInterval(refreshPlaylist, PLAYLIST_REFRESH_MS);
    const flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    const goOnline = () => {
      setOnline(true);
      void flush();
      void refreshPlaylist();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      clearInterval(playlistTimer);
      clearInterval(flushTimer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshPlaylist, flush]);

  // Heartbeat, rescheduled each time so a changed interval takes effect.
  const current = index >= 0 ? slots[index] : null;
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    let timer;
    const beat = async () => {
      try {
        await client.heartbeat({
          // The API binds the heartbeat to the device's own screen.
          screenId: null,
          timestamp: new Date().toISOString(),
          appVersion: APP_VERSION,
          networkStatus: networkStatus(),
          currentCreativeId: currentRef.current?.creativeId ?? null,
          currentCampaignId: currentRef.current?.campaignId ?? null,
          pendingEventCount: queueRef.current ? await queueRef.current.size() : 0,
          errorCount: errorCount.current,
        });
      } catch (error) {
        handleError(error);
      }
      timer = setTimeout(beat, heartbeatMs.current);
    };
    timer = setTimeout(beat, 2_000);
    return () => clearTimeout(timer);
  }, [client, handleError]);

  // Start the rotation once there is something to play.
  useEffect(() => {
    if (index === -1 && slots.length > 0) setIndex(0);
    if (index >= slots.length && slots.length > 0) setIndex(0);
  }, [slots, index]);

  // Resolve the media source whenever the slot changes.
  useEffect(() => {
    let cancelled = false;
    slotStart.current = Date.now();
    if (!current) {
      setSource(null);
      return undefined;
    }
    void sourceFor(current).then((url) => {
      if (!cancelled) setSource(url);
    });
    return () => {
      cancelled = true;
    };
  }, [current, index]);

  const finishSlot = useCallback(() => {
    const slot = currentRef.current;
    if (slot) {
      const event = playbackEvent({
        deviceId: credentials.deviceId,
        screenId: null,
        slot,
        startedAt: slotStart.current,
        endedAt: Date.now(),
        slotIndex: index,
        offline: typeof navigator !== "undefined" && navigator.onLine === false,
      });
      void queueRef.current?.enqueue(event).then(() => queueRef.current.size().then(setPending));
    }
    setIndex((value) => nextIndex(slotsRef.current, value));
  }, [credentials.deviceId, index]);

  // Images and text cards advance on a timer; videos advance on `ended` (with
  // the timer as a backstop in case a broken file never fires it).
  useEffect(() => {
    if (!current) return undefined;
    const backstop = current.isVideo ? current.durationSeconds * 1000 + 5_000 : current.durationSeconds * 1000;
    const timer = setTimeout(finishSlot, backstop);
    return () => clearTimeout(timer);
  }, [current, index, finishSlot]);

  return (
    <div
      style={styles.root}
      onClick={() => {
        setShowPanel((value) => !value);
        document.documentElement.requestFullscreen?.().catch(() => undefined);
      }}
    >
      {current ? (
        source ? (
          current.isVideo ? (
            <video key={`${current.creativeId}-${index}`} src={source} style={styles.media} autoPlay muted playsInline onEnded={finishSlot} onError={finishSlot} />
          ) : (
            <img key={`${current.creativeId}-${index}`} src={source} alt={current.name} style={styles.media} />
          )
        ) : (
          <TextCard slot={current} />
        )
      ) : (
        <div style={styles.card}>
          <div style={{ fontSize: "4vw", fontWeight: 700 }}>Webortex</div>
          <div style={{ fontSize: "1.6vw", opacity: 0.8, marginTop: 12 }}>{lastError ?? "Loading playlist…"}</div>
        </div>
      )}

      <div style={styles.status}>
        {online ? "●" : "○"} {credentials.deviceId} · {pending} queued
      </div>

      {showPanel ? (
        <div style={styles.panel} onClick={(event) => event.stopPropagation()}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Screen status</div>
          <div>Device: {credentials.deviceId}</div>
          <div>Network: {online ? "online" : "offline"}</div>
          <div>Playlist: {slots.length} slot(s)</div>
          <div>Queued plays: {pending}</div>
          {lastError ? <div style={{ color: "#fca5a5" }}>Last error: {lastError}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={styles.button} onClick={() => { void flush(); void refreshPlaylist(); }}>Sync now</button>
            <button
              style={{ ...styles.button, background: "#7f1d1d" }}
              onClick={() => {
                if (window.confirm("Remove this screen's key? It will stop playing until a new key is entered.")) {
                  onAuthFailure(null);
                }
              }}
            >
              Reset device
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TextCard({ slot }) {
  return (
    <div style={styles.card}>
      <div style={{ fontSize: "5vw", fontWeight: 800 }}>{slot.headline || slot.name || "Webortex"}</div>
      {slot.callToAction ? <div style={{ fontSize: "2.4vw", marginTop: "2vw", opacity: 0.9 }}>{slot.callToAction}</div> : null}
    </div>
  );
}

function ProvisionForm({ message, onSave }) {
  const [deviceId, setDeviceId] = useState("");
  const [deviceKey, setDeviceKey] = useState("");
  const ok = /^[A-Za-z0-9_-]{3,64}$/.test(deviceId.trim()) && deviceKey.trim().length >= 32;
  return (
    <div style={{ ...styles.root, cursor: "auto", overflowY: "auto" }}>
      <form
        style={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (ok) onSave({ deviceId: deviceId.trim(), deviceKey: deviceKey.trim() });
        }}
      >
        <h1 style={{ fontSize: 22, margin: "0 0 6px" }}>Set up this screen</h1>
        <p style={{ opacity: 0.75, marginTop: 0 }}>
          Open the player link from the portal (Fleet → Screens → Enrol), or enter the device id and key here.
        </p>
        {message ? <p style={{ color: "#fca5a5" }}>{message}</p> : null}
        <label>
          Device id
          <input style={styles.input} value={deviceId} onChange={(event) => setDeviceId(event.target.value)} autoComplete="off" />
        </label>
        <label>
          Device key
          <input style={styles.input} value={deviceKey} onChange={(event) => setDeviceKey(event.target.value)} type="password" autoComplete="off" />
        </label>
        <button style={{ ...styles.button, opacity: ok ? 1 : 0.5 }} type="submit" disabled={!ok}>
          Start playing
        </button>
      </form>
    </div>
  );
}
