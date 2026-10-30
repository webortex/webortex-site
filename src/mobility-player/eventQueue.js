/**
 * Durable outbox for playback events.
 *
 * A play is recorded locally first and uploaded later, so a screen that loses
 * signal in a tunnel or a basement car park keeps earning. Every event carries a
 * client-generated `eventId`, and the API de-duplicates on it, which is what
 * makes "send again after any doubt" safe:
 *
 *  - an event is deleted only after the server answered 2xx for its batch
 *    (accepted, duplicate and rejected all count — a rejection is final);
 *  - on any failure the batch stays queued and is re-sent next flush.
 *
 * The store is injected: IndexedDB in the browser, an in-memory map in tests.
 */

/** The API accepts at most 500 events per request. */
export const MAX_BATCH = 200;
/** Bound on local storage. Oldest events go first; the API refuses ones older than 6h anyway. */
export const MAX_QUEUED = 5_000;

export function memoryStore() {
  const rows = new Map();
  return {
    async put(event) {
      rows.set(event.eventId, event);
    },
    async all() {
      return [...rows.values()];
    },
    async remove(ids) {
      for (const id of ids) rows.delete(id);
    },
    async count() {
      return rows.size;
    },
  };
}

const DB_NAME = "webortex-player";
const STORE = "playback";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "eventId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(db, mode, work) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const result = work(store);
    transaction.oncomplete = () => resolve(result?.result ?? result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/** IndexedDB-backed store. Falls back to memory when IndexedDB is unavailable (private mode). */
export async function indexedDbStore() {
  if (typeof indexedDB === "undefined") return memoryStore();
  let db;
  try {
    db = await openDb();
  } catch {
    return memoryStore();
  }
  return {
    put: (event) => tx(db, "readwrite", (store) => store.put(event)),
    all: () => tx(db, "readonly", (store) => store.getAll()),
    remove: (ids) => tx(db, "readwrite", (store) => ids.forEach((id) => store.delete(id))),
    count: () => tx(db, "readonly", (store) => store.count()),
  };
}

export function createEventQueue(store) {
  let flushing = null;

  async function enqueue(event) {
    await store.put(event);
    const size = await store.count();
    if (size > MAX_QUEUED) {
      const all = await store.all();
      all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      await store.remove(all.slice(0, size - MAX_QUEUED).map((row) => row.eventId));
    }
  }

  /**
   * Upload everything queued, oldest first, in batches.
   *
   * Concurrent calls share one flush. Returns how many events left the queue;
   * rethrows the first failure after keeping its batch queued.
   */
  function flush(send) {
    if (flushing) return flushing;
    flushing = (async () => {
      let sent = 0;
      try {
        const pending = (await store.all()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        for (let index = 0; index < pending.length; index += MAX_BATCH) {
          const batch = pending.slice(index, index + MAX_BATCH);
          await send(batch);
          await store.remove(batch.map((event) => event.eventId));
          sent += batch.length;
        }
        return sent;
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  return { enqueue, flush, size: () => store.count() };
}
