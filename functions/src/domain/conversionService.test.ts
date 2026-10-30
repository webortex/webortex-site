/**
 * Conversion ingestion: batch atomicity on a duplicate race.
 *
 * A Firestore batch commit is all-or-nothing. If one document in a batch already
 * exists, the entire commit fails and *nothing* is written. The previous
 * implementation responded to that by subtracting the whole group from the
 * written count, which reported up to 399 valid conversions as duplicates even
 * though they had never been written and never would be. Revenue and driver
 * payouts both derive from these rows, so that was silent data loss.
 *
 * These tests use a fake Firestore that models batch atomicity faithfully —
 * a commit that contains any already-existing document writes nothing and
 * throws ALREADY_EXISTS — because a fake that committed writes up to the
 * failure point would reproduce the original bug as a pass.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

interface Doc {
  data: () => Record<string, unknown>;
  exists: boolean;
  id: string;
}

/** The stored documents, keyed by collection/document id. */
let store: Map<string, Record<string, unknown>>;
/** Number of `batch.commit()` calls, so the retry is observable. */
let commits: number;

function alreadyExists(): Error & { code: number } {
  const error = new Error("6 ALREADY_EXISTS: the document already exists") as Error & { code: number };
  error.code = 6;
  return error;
}

/**
 * Minimal Firestore double covering exactly what `writeConversions` touches:
 * `collection().doc()`, `batch().create()`, `batch.commit()` and `getAll()`.
 */
const fakeFirestore = {
  collection(name: string) {
    return {
      doc(id: string) {
        const path = `${name}/${id}`;
        return {
          id,
          path,
          get: async () => ({ data: () => store.get(path) ?? {}, exists: store.has(path), id }),
        };
      },
      /**
       * Equality-only `where`, enough for the duplicate-reference pre-check. The
       * production code filters `advertiserId` and `externalReference` by equality
       * against documents this same fake is storing.
       */
      where(field: string, _op: string, value: unknown) {
        const predicates: [string, unknown][] = [[field, value]];
        const builder = {
          where(nextField: string, _nextOp: string, nextValue: unknown) {
            predicates.push([nextField, nextValue]);
            return builder;
          },
          limit(count: number) {
            return {
              async get() {
                const docs: Doc[] = [];
                for (const [path, data] of store) {
                  if (!path.startsWith(`${name}/`)) continue;
                  const row = data as Record<string, unknown>;
                  if (!predicates.every(([f, v]) => row[f] === v)) continue;
                  docs.push({ data: () => row, exists: true, id: path.slice(name.length + 1) });
                  if (docs.length >= count) break;
                }
                return { docs, empty: docs.length === 0, size: docs.length };
              },
            };
          },
        };
        return builder;
      },
    };
  },
  batch() {
    const writes: { path: string; data: Record<string, unknown> }[] = [];
    return {
      create(ref: { path: string }, data: Record<string, unknown>) {
        writes.push({ path: ref.path, data });
      },
      async commit() {
        commits += 1;
        // Atomic: every existing document in the batch fails the whole commit.
        if (writes.some((write) => store.has(write.path))) throw alreadyExists();
        for (const write of writes) store.set(write.path, write.data);
      },
    };
  },
  async getAll(...refs: { path: string; id: string }[]): Promise<Doc[]> {
    return refs.map((ref) => ({ data: () => store.get(ref.path) ?? {}, exists: store.has(ref.path), id: ref.id }));
  },
};

vi.mock("../lib/admin.js", () => ({
  db: () => fakeFirestore,
  nowIso: () => "2026-01-01T00:00:00.000Z",
}));

const { resolveConversions, writeConversions } = await import("./conversionService.js");
type ConversionInput = import("./conversionService.js").ConversionInput;
type ConversionPrincipal = import("./conversionService.js").ConversionPrincipal;
type ResolvedConversion = import("./conversionService.js").ResolvedConversion;

function principal(trustLevel: "UNTRUSTED" | "VERIFIED_FEED"): ConversionPrincipal {
  return { advertiserId: "ADV_1", keyId: "KEY_1", trustLevel };
}

function claim(overrides: Partial<ConversionInput> = {}): ConversionInput {
  return {
    campaignId: "CMP_1",
    source: "API",
    type: "PURCHASE",
    valueMinor: 1_000,
    currency: "INR",
    advertiserId: "ADV_1",
    verified: false,
    ...overrides,
    // Spreading a `Partial` widens `verified` back to optional, so the merged
    // object is asserted rather than leaving every call site to supply it.
  } as ConversionInput;
}

function seedCampaign(): void {
  store.set("mm_campaigns/CMP_1", { id: "CMP_1", advertiserId: "ADV_1", zoneId: "ZONE_1" });
}

/** The document id the service derives for a given advertiser + reference. */
function idFor(reference: string): string {
  return `CNV_${createHash("sha256").update(`ADV_1:${reference}`).digest("hex").slice(0, 24)}`;
}

function resolved(reference: string, valueMinor = 1_000): ResolvedConversion {  return {
    advertiserId: "ADV_1",
    campaignId: "CMP_1",
    creativeId: null,
    zoneId: "ZONE_1",
    type: "PURCHASE",
    source: "web",
    valueMinor,
    currency: "INR",
    occurredAt: Date.parse("2026-01-01T10:00:00.000Z"),
    externalReference: reference,
    verified: true,
    verificationSource: "gateway",
  };
}

beforeEach(() => {
  store = new Map();
  commits = 0;
});

describe("writeConversions", () => {
  it("writes every row when none of them are duplicates", async () => {
    const written = await writeConversions([resolved("a"), resolved("b"), resolved("c")]);

    expect(written).toBe(3);
    expect(store.size).toBe(3);
    expect(commits).toBe(1);
  });

  it("still writes the non-duplicate rows when one row in the batch already exists", async () => {
    // Pre-seed the row that "b" will collide with, as a concurrent feed would.
    const seedId = idFor("b");
    store.set(`mm_conversions/${seedId}`, { id: seedId, externalReference: "b" });

    const written = await writeConversions([resolved("a"), resolved("b"), resolved("c")]);

    // "a" and "c" are new and must survive. Only "b" is a duplicate.
    expect(written).toBe(2);
    expect(store.size).toBe(3); // the pre-existing one plus the two new ones
    expect(commits).toBe(2); // the failed attempt, then the retry of the remainder
  });

  it("counts a fully duplicate batch as zero written", async () => {
    const ids = ["a", "b"].map(idFor);
    for (const id of ids) store.set(`mm_conversions/${id}`, { id });

    const written = await writeConversions([resolved("a"), resolved("b")]);

    expect(written).toBe(0);
    expect(store.size).toBe(2); // nothing added, nothing destroyed
  });

  it("keeps revenue fields intact on the rows it does write", async () => {
    await writeConversions([resolved("a", 7_500)]);

    const stored = [...store.values()][0]!;
    expect(stored.valueMinor).toBe(7_500);
    expect(stored.currency).toBe("INR");
    expect(stored.externalReference).toBe("a");
    expect(stored.dayKey).toBe("2026-01-01");
  });

  it("returns zero for an empty batch without touching Firestore", async () => {
    expect(await writeConversions([])).toBe(0);
    expect(commits).toBe(0);
  });

  it("converges in a bounded number of commits when everything already exists", async () => {
    for (const reference of ["a", "b", "c"]) {
      const id = idFor(reference);
      store.set(`mm_conversions/${id}`, { id, externalReference: reference });
    }

    const written = await writeConversions([resolved("a"), resolved("b"), resolved("c")]);

    // Nothing new may be created, and the retry must stop rather than spin. The
    // re-read after the failed commit shows every row present, so pending empties
    // and the loop exits without a second commit.
    expect(written).toBe(0);
    expect(store.size).toBe(3);
    expect(commits).toBe(1);
  });

  it("preserves the pre-existing duplicate untouched", async () => {
    const seedId = idFor("b");
    const original = { id: seedId, externalReference: "b", valueMinor: 42 };
    store.set(`mm_conversions/${seedId}`, original);

    await writeConversions([resolved("a", 99_999), resolved("b", 1)]);

    // The duplicate must not be rewritten: `create` is a no-op on an existing id,
    // so the original value stands and the new amount is not applied.
    expect(store.get(`mm_conversions/${seedId}`)).toEqual(original);
  });
});

/**
 * `verified` decides whether a conversion counts toward driver payouts, so it
 * must not be something the reporting party asserts about itself. An API key
 * proves which advertiser is posting; only a key the platform has vouched for may
 * additionally claim the event is true.
 */
describe("resolveConversions verification gating", () => {
  beforeEach(() => {
    store = new Map();
    commits = 0;
    seedCampaign();
  });

  it("refuses to mark a conversion verified for an untrusted key", async () => {
    const { resolved, verificationDowngraded } = await resolveConversions(
      principal("UNTRUSTED"),
      [claim({ externalReference: "ref-1", verified: true, verificationSource: "gateway" })],
    );

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.verified).toBe(false);
    expect(verificationDowngraded).toBe(1);
  });

  it("honours the claim for a key the platform vouched for", async () => {
    const { resolved, verificationDowngraded } = await resolveConversions(
      principal("VERIFIED_FEED"),
      [claim({ externalReference: "ref-1", verified: true, verificationSource: "gateway" })],
    );

    expect(resolved[0]!.verified).toBe(true);
    expect(resolved[0]!.verificationSource).toBe("gateway");
    expect(verificationDowngraded).toBe(0);
  });

  it("records the refusal for audit instead of quietly keeping the claim", async () => {
    const { resolved } = await resolveConversions(principal("UNTRUSTED"), [
      claim({ externalReference: "ref-1", verified: true, verificationSource: "gateway" }),
    ]);

    // The claim is preserved so an operator can see a feed asked for this and was
    // denied, but it is visibly marked as refused.
    expect(resolved[0]!.verificationSource).toBe("REFUSED_UNTRUSTED_KEY:gateway");
  });

  it("still ingests the row rather than rejecting it", async () => {
    const { resolved, rejected } = await resolveConversions(principal("UNTRUSTED"), [
      claim({ externalReference: "ref-1", verified: true }),
    ]);

    // Downgrading is not a rejection: the conversion is attributed and visible,
    // it simply does not pay out until confirmed.
    expect(rejected).toHaveLength(0);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.valueMinor).toBe(1_000);
  });

  it("does not count a downgrade for a row that never claimed verification", async () => {
    const { verificationDowngraded } = await resolveConversions(principal("UNTRUSTED"), [
      claim({ externalReference: "ref-1", verified: false }),
    ]);

    expect(verificationDowngraded).toBe(0);
  });

  it("never lets a trusted key attribute to an advertiser it does not own", async () => {
    const { resolved, rejected } = await resolveConversions(principal("VERIFIED_FEED"), [
      claim({ externalReference: "ref-1", campaignId: "CMP_OTHER", verified: true }),
    ]);

    expect(rejected).toHaveLength(1);
    expect(resolved).toHaveLength(0);
  });
});
