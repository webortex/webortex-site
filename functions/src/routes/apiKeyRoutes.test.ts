/**
 * API-key management authorisation, driven through the real router so the
 * permission gate, tenancy check and trust-level rule are tested together.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { permissionsForRoles, type Role } from "../../../packages/shared/src/index.js";

let currentUser: Record<string, unknown>;

vi.mock("firebase-functions", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("../lib/admin.js", () => ({
  auth: () => ({}),
  db: () => ({
    collection: () => ({ doc: () => ({ get: async () => ({ exists: true }) }) }),
  }),
  nowIso: () => "2026-01-01T00:00:00.000Z",
}));
vi.mock("../middleware/auth.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../middleware/auth.js")>()),
  requireUser: async () => currentUser,
}));
vi.mock("../middleware/rateLimit.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../middleware/rateLimit.js")>()),
  enforceRateLimit: async () => ({ allowed: true }),
}));
vi.mock("../middleware/audit.js", () => ({ recordAudit: vi.fn(async () => undefined) }));

const issued: { advertiserId: string; trustLevel?: string }[] = [];
vi.mock("../domain/conversionService.js", () => ({
  issueConversionApiKey: vi.fn(async (advertiserId: string, _label: string, options: { trustLevel?: string }) => {
    issued.push({ advertiserId, trustLevel: options.trustLevel });
    return { advertiserId, keyId: "KEY_0123456789ABCDEF01", plaintext: "mmk_secret", createdAt: "now" };
  }),
  listConversionApiKeys: vi.fn(async () => []),
  revokeConversionApiKey: vi.fn(async () => ({ keyId: "KEY_0123456789ABCDEF01", label: "x", revokedAt: "now" })),
}));

const { ApiRouter } = await import("../lib/router.js");
const { registerApiKeyRoutes } = await import("./apiKeyRoutes.js");

function userWith(roles: Role[], advertiserId: string | null): Record<string, unknown> {
  return { kind: "user", userId: "USR_1", uid: "u1", roles, permissions: permissionsForRoles(roles), advertiserId };
}

async function call(method: string, path: string, body: unknown = {}): Promise<{ status: number; json: any }> {
  const router = new ApiRouter();
  registerApiKeyRoutes(router);
  const headers: Record<string, string> = {};
  const request = {
    method,
    path,
    headers,
    query: {},
    body,
    ip: "127.0.0.1",
    get: (name: string) => headers[name.toLowerCase()],
  };
  const result = { status: 200, json: undefined as unknown };
  const response = {
    headersSent: false,
    set: () => response,
    get: () => undefined,
    status(code: number) {
      result.status = code;
      return response;
    },
    json(payload: unknown) {
      result.json = payload;
      response.headersSent = true;
      return response;
    },
    end: () => undefined,
  };
  await router.handler()(request as never, response as never);
  return result as { status: number; json: any };
}

beforeEach(() => {
  issued.length = 0;
});

describe("conversion API key routes", () => {
  it("lets an advertiser issue an untrusted key for itself and returns the plaintext once", async () => {
    currentUser = userWith(["ADVERTISER"], "ADV_A");
    const result = await call("POST", "/advertisers/ADV_A/api-keys", { label: "Shopify feed" });
    expect(result.status).toBe(201);
    expect(result.json.data.plaintext).toBe("mmk_secret");
    expect(issued).toEqual([{ advertiserId: "ADV_A", trustLevel: "UNTRUSTED" }]);
  });

  it("refuses an advertiser acting on another advertiser's keys", async () => {
    currentUser = userWith(["ADVERTISER"], "ADV_A");
    expect((await call("POST", "/advertisers/ADV_B/api-keys", { label: "x feed" })).status).toBe(403);
    expect((await call("GET", "/advertisers/ADV_B/api-keys")).status).toBe(403);
    expect((await call("POST", "/advertisers/ADV_B/api-keys/KEY_0123456789ABCDEF01/revoke")).status).toBe(403);
    expect(issued).toEqual([]);
  });

  it("refuses an advertiser granting itself a verified-feed key", async () => {
    currentUser = userWith(["ADVERTISER"], "ADV_A");
    const result = await call("POST", "/advertisers/ADV_A/api-keys", { label: "feed", trustLevel: "VERIFIED_FEED" });
    expect(result.status).toBe(403);
    expect(issued).toEqual([]);
  });

  it("lets an admin issue a verified-feed key for any advertiser", async () => {
    currentUser = userWith(["ADMIN"], null);
    const result = await call("POST", "/advertisers/ADV_B/api-keys", { label: "POS", trustLevel: "VERIFIED_FEED" });
    expect(result.status).toBe(201);
    expect(issued).toEqual([{ advertiserId: "ADV_B", trustLevel: "VERIFIED_FEED" }]);
  });

  it("refuses roles without apikeys:manage", async () => {
    currentUser = userWith(["DRIVER"], null);
    expect((await call("GET", "/advertisers/ADV_A/api-keys")).status).toBe(403);
  });
});
