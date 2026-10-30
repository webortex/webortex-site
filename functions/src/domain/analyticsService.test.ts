/**
 * Paged aggregate reads.
 *
 * Every analytics query here produces a *total*. A bare `.limit(n).get()`
 * truncates silently, and a truncated page does not look like missing data — it
 * looks like a smaller number. That is the dangerous case for a dashboard
 * reporting revenue, so `readAll` pages to completion and throws rather than
 * return a partial sum once its guard is reached.
 *
 * The page size and cap are constants in production, so these tests drive
 * `readAll` with a small cap against a fake query and check the paging rules
 * directly.
 */

import { describe, expect, it } from "vitest";

import { readAll } from "./analyticsService.js";

interface FakeSnapshot {
  docs: { id: string }[];
  empty: boolean;
  size: number;
}

type FakeQuery = {
  limit: (n: number) => FakeQuery;
  startAfter: (cursor: { id: string }) => FakeQuery;
  get: () => Promise<FakeSnapshot>;
};

/**
 * A query over `total` synthetic documents that honours `limit` and `startAfter`,
 * so paging bugs in the caller are visible rather than papered over.
 */
function fakeQuery(total: number): { query: FakeQuery; pageCount: () => number } {
  let limit = total;
  let after: string | null = null;
  let pages = 0;

  const build = (): FakeQuery => ({
    limit(n: number) {
      limit = n;
      return build();
    },
    startAfter(cursor: { id: string }) {
      after = cursor.id;
      return build();
    },
    async get() {
      pages += 1;
      const start = after === null ? 0 : Number(after.replace("doc-", "")) + 1;
      const end = Math.min(start + limit, total);
      const docs = [];
      for (let i = start; i < end; i += 1) docs.push({ id: `doc-${i}` });
      return { docs, empty: docs.length === 0, size: docs.length };
    },
  });

  return { query: build(), pageCount: () => pages };
}

describe("readAll", () => {
  it("returns every document when the result set fits under the cap", async () => {
    const { query } = fakeQuery(37);
    const docs = await readAll(query as never, 1_000);
    expect(docs).toHaveLength(37);
  });

  it("returns nothing for an empty result set", async () => {
    const { query } = fakeQuery(0);
    expect(await readAll(query as never, 1_000)).toHaveLength(0);
  });

  it("pages rather than stopping at the first read", async () => {
    // `PAGE_SIZE` is 5_000 in production, so a result set has to exceed that
    // before the cursor logic is exercised at all.
    const fake = fakeQuery(12_000);
    const docs = await readAll(fake.query as never, 20_000);
    expect(docs).toHaveLength(12_000);
    expect(fake.pageCount()).toBeGreaterThan(1);
  });

  it("returns a result set of exactly the cap, having read one probe past it", async () => {
    // The boundary case: stopping the moment `docs.length === hardCap` cannot
    // tell "finished" from "more to come", so exactly-at-the-cap must succeed.
    const { query } = fakeQuery(100);
    const docs = await readAll(query as never, 100);
    expect(docs).toHaveLength(100);
  });

  it("throws instead of returning a partial total when the cap is exceeded", async () => {
    const { query } = fakeQuery(101);
    await expect(readAll(query as never, 100)).rejects.toThrow(/cannot be reported accurately/i);
  });

  it("throws rather than silently truncating by a large margin", async () => {
    const { query } = fakeQuery(9_000);
    await expect(readAll(query as never, 100)).rejects.toThrow();
  });

  it("does not throw for a result set comfortably under the cap", async () => {
    const { query } = fakeQuery(99);
    await expect(readAll(query as never, 100)).resolves.toHaveLength(99);
  });
});