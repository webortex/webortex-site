/**
 * API client behaviour.
 *
 * These are the tests that matter most in the client, because the client is the
 * only place that unwraps the API's envelope and interprets its error codes. Get
 * this wrong and a failure shows up as an empty screen rather than an error, or
 * a revoked token leaves the UI looking signed in.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { ApiError, api, configureApiClient, isAbortError } from "@/mobility-media/lib/api";

// jsdom serves the page from `http://localhost:3000`, and `API_BASE` is the
// relative `/api/mobility`, so handlers have to be registered against the
// resolved origin — not the bare path.
const BASE = "http://localhost:3000/api/mobility";

const server = setupServer(
  http.get(`${BASE}/ok`, () => HttpResponse.json({ data: { value: 42 }, correlationId: "corr-1" })),

  http.get(`${BASE}/empty`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${BASE}/broken-json`, () => new HttpResponse("not json", { status: 200 })),

  http.get(`${BASE}/forbidden`, () =>
    HttpResponse.json(
      { error: { code: "FORBIDDEN", message: "Your role does not allow this.", correlationId: "corr-2" } },
      { status: 403 },
    ),
  ),

  http.get(`${BASE}/missing`, () =>
    HttpResponse.json(
      { error: { code: "NOT_FOUND", message: "The requested resource was not found.", correlationId: "corr-3", details: { id: "X" } } },
      { status: 404 },
    ),
  ),

  // No envelope at all: a proxy returned an HTML error page.
  http.get(`${BASE}/html-error`, () => new HttpResponse("<html>502</html>", { status: 502 })),

  http.get(`${BASE}/slow`, async () => {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    return HttpResponse.json({ data: { late: true }, correlationId: "corr-4" });
  }),

  http.post(`${BASE}/echo`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: body, correlationId: "corr-5" });
  }),

  http.get(`${BASE}/auth-check`, ({ request }) =>
    HttpResponse.json({ data: { seen: request.headers.get("authorization") }, correlationId: "corr-6" }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  // Reset to the defaults so a test that configures a token or handler cannot
  // leak into the next one.
  configureApiClient({ tokenProvider: async () => null, onSessionExpired: () => {} });
});
afterAll(() => server.close());

describe("api client", () => {
  it("unwraps the success envelope and returns only the data", async () => {
    await expect(api.get("/ok")).resolves.toEqual({ value: 42 });
  });

  it("treats 204 as a successful no-op rather than a parse failure", async () => {
    await expect(api.get("/empty")).resolves.toBeUndefined();
  });

  it("attaches the bearer token from the injected provider", async () => {
    configureApiClient({ tokenProvider: async () => "token-abc" });
    await expect(api.get("/auth-check")).resolves.toEqual({ seen: "Bearer token-abc" });
  });

  it("sends no Authorization header when the provider yields nothing", async () => {
    await expect(api.get("/auth-check")).resolves.toEqual({ seen: null });
  });

  it("serialises a JSON body on POST", async () => {
    await expect(api.post("/echo", { a: 1 })).resolves.toEqual({ a: 1 });
  });

  it("raises the server's error code, message and correlation id", async () => {
    // The correlation id is what makes a failure reportable to support, so it is
    // part of the contract rather than a diagnostic extra.
    const error = await api.get("/missing").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe("The requested resource was not found.");
    expect(error.correlationId).toBe("corr-3");
    expect(error.details).toEqual({ id: "X" });
  });

  it("classifies 403 as forbidden and not retryable", async () => {
    const error = await api.get("/forbidden").catch((caught) => caught);
    expect(error.isForbidden).toBe(true);
    expect(error.isRetryable).toBe(false);
  });

  it("classifies 5xx as retryable", async () => {
    const error = await api.get("/html-error").catch((caught) => caught);
    expect(error.isRetryable).toBe(true);
  });

  it("falls back to a generic message when the error body is not an envelope", async () => {
    const error = await api.get("/html-error").catch((caught) => caught);
    expect(error.code).toBe("HTTP_ERROR");
    expect(error.correlationId).toBeNull();
  });

  it("signals session expiry on 401 so the app can end the session", async () => {
    const onSessionExpired = vi.fn();
    server.use(
      http.get(`${BASE}/gone`, () =>
        HttpResponse.json({ error: { code: "UNAUTHORISED", message: "Your session has expired.", correlationId: "c" } }, { status: 401 }),
      ),
    );
    configureApiClient({ tokenProvider: async () => "token", onSessionExpired });

    const error = await api.get("/gone").catch((caught) => caught);

    expect(error.isUnauthorised).toBe(true);
    // This is what stops a revoked token leaving cached data on screen as though
    // the user were still signed in.
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("does not signal session expiry for other statuses", async () => {
    const onSessionExpired = vi.fn();
    configureApiClient({ tokenProvider: async () => "token", onSessionExpired });

    await api.get("/forbidden").catch(() => undefined);

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("raises a network failure as a retryable ApiError with status 0", async () => {
    server.use(http.get(`${BASE}/down`, () => HttpResponse.error()));
    const error = await api.get("/down").catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.isRetryable).toBe(true);
  });

  it("rejects a 200 whose body is not an envelope", async () => {
    // Handing a screen `undefined` because a proxy rewrote the body would show
    // an empty dashboard instead of an error.
    const error = await api.get("/broken-json").catch((caught) => caught);
    expect(error.code).toBe("MALFORMED_RESPONSE");
  });

  it("re-throws an abort as an abort, not as an error", async () => {
    // React Query aborts in-flight queries on every filter change. Treating that
    // as a failure would flash an error on each keystroke.
    const controller = new AbortController();
    const pending = api.get("/slow", { signal: controller.signal });
    controller.abort();

    const error = await pending.catch((caught) => caught);
    expect(isAbortError(error)).toBe(true);
  });

  it("omits undefined and null query parameters", async () => {
    let seen = "";
    server.use(
      http.get(`${BASE}/params`, ({ request }) => {
        seen = request.url;
        return HttpResponse.json({ data: {}, correlationId: "c" });
      }),
    );

    await api.get("/params", { query: { a: "1", b: undefined, c: null, d: "", e: 2 } });

    const params = new URL(seen).searchParams;
    expect(params.get("a")).toBe("1");
    expect(params.has("b")).toBe(false);
    expect(params.has("c")).toBe(false);
    // Empty strings are dropped: the API treats `?status=` as "no filter", but
    // sending it makes request keys differ for identical queries.
    expect(params.has("d")).toBe(false);
    expect(params.get("e")).toBe("2");
  });
});

describe("api.download", () => {
  it("sends the bearer token with the export request", async () => {
    // Without the token the export returns a 401 and the browser saves the login
    // page as `campaigns.csv` — a failure that looks like a successful download.
    let auth = null;
    server.use(
      http.get(`${BASE}/analytics/export.csv`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse("campaign,leads\r\nA,3\r\n", {
          status: 200,
          headers: { "Content-Type": "text/csv" },
        });
      }),
    );
    configureApiClient({ tokenProvider: async () => "token-123" });

    const blob = await api.download("/analytics/export.csv");
    expect(auth).toBe("Bearer token-123");
    expect(await blob.text()).toContain("campaign,leads");
  });

  it("does not unwrap an envelope, since the body is CSV", async () => {
    server.use(
      http.get(`${BASE}/analytics/export.csv`, () => new HttpResponse("a,b\n1,2\n", { status: 200 })),
    );
    const blob = await api.download("/analytics/export.csv");
    // Checked by behaviour rather than `instanceof Blob`: the blob comes from
    // undici's realm, which is not the same constructor as jsdom's global Blob.
    expect(typeof blob.text).toBe("function");
    expect(await blob.text()).toBe("a,b\n1,2\n");
  });

  it("surfaces the server's error and correlation id on failure", async () => {
    // The export is not wrapped in the generic "Export failed." message, because
    // support needs the correlation id to find the server log.
    server.use(
      http.get(`${BASE}/analytics/export.csv`, () =>
        HttpResponse.json(
          { error: { code: "FORBIDDEN", message: "Your role does not allow this.", correlationId: "corr-export" } },
          { status: 403 },
        ),
      ),
    );

    const error = await api.download("/analytics/export.csv").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Your role does not allow this.");
    expect(error.correlationId).toBe("corr-export");
    expect(error.isForbidden).toBe(true);
  });

  it("re-uses the configured token for repeated downloads", async () => {
    let calls = 0;
    configureApiClient({
      tokenProvider: async () => {
        calls += 1;
        return "cached";
      },
    });
    server.use(
      http.get(`${BASE}/analytics/export.csv`, () => new HttpResponse("x\n1\n", { status: 200 })),
    );

    await api.download("/analytics/export.csv");
    await api.download("/analytics/export.csv");
    expect(calls).toBe(2);
  });
});