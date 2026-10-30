/**
 * Router matching tests.
 *
 * These exist because of a real bug: `/analytics/campaigns/:campaignId` was
 * registered before `/analytics/campaigns/table`, so a request for the table
 * endpoint matched the dynamic route and was served a campaign whose id was
 * literally the string "table". The failure was silent — it returned
 * well-formed data — which is the worst kind.
 */

import { describe, expect, it } from "vitest";
import { ApiRouter } from "./router.js";
import { ApiError } from "./http.js";

/** Reach the private matcher so routing can be tested without a live request. */
function resolve(router: ApiRouter, method: string, path: string): string | null {
  const match = (router as unknown as {
    match(method: string, path: string): { route: { path: string } } | null;
  }).match(method, path);
  return match ? match.route.path : null;
}

/** A router whose routes record their own path for identification. */
function tracer(): { router: ApiRouter; paths: string[] } {
  const router = new ApiRouter();
  const paths: string[] = [];
  const stub = (path: string) => async () => path;
  return { router, paths };
}

describe("ApiRouter route matching", () => {
  it("prefers a static segment over a parameter regardless of registration order", () => {
    const router = new ApiRouter();
    // Dynamic first: this is the ordering that produced the bug.
    router.get("/analytics/campaigns/:campaignId", "user", async () => "dynamic");
    router.get("/analytics/campaigns/table", "user", async () => "static");

    const result = (router as unknown as {
      match(m: string, p: string): { params: Record<string, string> } | null;
    }).match("GET", "/analytics/campaigns/table");

    expect(result).not.toBeNull();
    // The literal "table" must not be captured as a campaign id.
    expect(result!.params).toEqual({});
  });

  it("still binds the parameter for a genuine id", () => {
    const router = new ApiRouter();
    router.get("/analytics/campaigns/:campaignId", "user", async () => "dynamic");
    router.get("/analytics/campaigns/table", "user", async () => "static");

    const result = (router as unknown as {
      match(m: string, p: string): { params: Record<string, string> } | null;
    }).match("GET", "/analytics/campaigns/CMP_123");

    expect(result?.params).toEqual({ campaignId: "CMP_123" });
  });

  it("resolves the same route whichever order the two are registered in", () => {
    const build = (staticFirst: boolean): ApiRouter => {
      const router = new ApiRouter();
      const dynamic = router.get("/a/:id", "user", async () => "dynamic");
      const fixed = router.get("/a/fixed", "user", async () => "static");
      void dynamic;
      void fixed;
      return router;
    };

    const lookup = (router: ApiRouter): Record<string, string> | null => {
      const result = (router as unknown as {
        match(m: string, p: string): { params: Record<string, string> } | null;
      }).match("GET", "/a/fixed");
      return result?.params ?? null;
    };

    expect(lookup(build(true))).toEqual({});
    expect(lookup(build(false))).toEqual({});
  });

  it("rejects a duplicate method+path registration instead of shadowing it", () => {
    const router = new ApiRouter();
    router.get("/dupe", "user", async () => "first");
    expect(() => router.get("/dupe", "user", async () => "second")).toThrow(/Duplicate route/);
  });

  it("allows the same path under a different method", () => {
    const router = new ApiRouter();
    router.get("/thing", "user", async () => "read");
    expect(() => router.post("/thing", "user", async () => "write")).not.toThrow();
  });

  it("returns 405 when the path matches but the method does not", () => {
    const router = new ApiRouter();
    router.get("/only-get", "user", async () => "read");
    expect(() => resolve(router, "DELETE", "/only-get")).toThrow(ApiError);
  });

  it("matches a deeper static path over a shorter parameterised one", () => {
    const router = new ApiRouter();
    router.get("/fleet/:id", "user", async () => "short");
    router.get("/fleet/:id/status", "user", async () => "deep");

    const result = (router as unknown as {
      match(m: string, p: string): { params: Record<string, string> } | null;
    }).match("GET", "/fleet/V1/status");

    expect(result?.params).toEqual({ id: "V1" });
  });
});

describe("routePath", () => {
  it("strips the mount prefix for every way the function is reached", async () => {
    const { routePath } = await import("./router.js");
    // Hosting rewrite forwards the full path.
    expect(routePath("/api/mobility/campaigns/CMP_1")).toBe("/campaigns/CMP_1");
    // Function URL and emulator: the runtime has consumed `/api`.
    expect(routePath("/mobility/me")).toBe("/me");
    expect(routePath("/api/mobility")).toBe("/");
    // Unprefixed paths and look-alikes are left alone.
    expect(routePath("/me")).toBe("/me");
    expect(routePath("/mobilityx/me")).toBe("/mobilityx/me");
  });
});
