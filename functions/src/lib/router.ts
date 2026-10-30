/**
 * Minimal path router for the API tier.
 *
 * `firebase-functions` v1 `onRequest` hands us a bare Express request, so this
 * provides just enough path matching to keep every endpoint on one pipeline:
 * CORS -> correlation id -> match -> authenticate -> rate limit -> handle ->
 * JSON envelope -> mapped error. A hand-rolled matcher is used instead of
 * `express.Router` so the Functions bundle does not take a second, redundant copy
 * of Express and so the auth/rate-limit order is enforced in exactly one place.
 */

import type { Request, Response } from "./http.js";
import { applyCors, ApiError, newCorrelationId, sendSuccess } from "./http.js";
import { requireUser, type AuthContext, type Principal } from "../middleware/auth.js";
import { requireDevice } from "../middleware/deviceAuth.js";
import { enforceRateLimit, subjectFromRequest, type RateLimitPolicy } from "../middleware/rateLimit.js";
import type { Permission } from "../../../packages/shared/src/index.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** How a route authenticates. Enforced before the handler ever runs. */
export type AuthMode = "user" | "device" | "public";

export interface RouteContext {
  readonly request: Request;
  readonly response: Response;
  readonly correlationId: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Request["query"];
  readonly body: unknown;
  /** Populated for `user` and `device` routes. */
  readonly principal: Principal | null;
  /** Convenience accessor; throws for routes that are not user-authenticated. */
  user(): AuthContext;
  require(permission: Permission): AuthContext;
}

interface Route {
  readonly method: HttpMethod;
  readonly segments: readonly string[];
  readonly auth: AuthMode;
  readonly permissions: readonly Permission[];
  readonly rateLimit: RateLimitPolicy | null;
  readonly handler: (context: RouteContext) => Promise<unknown>;
}

export interface RouteOptions {
  readonly permissions?: readonly Permission[];
  readonly rateLimit?: RateLimitPolicy | null;
}

/** Sentinel returned by a handler that has already written the response itself. */
export const HANDLED = Symbol("handled");

/**
 * Mount prefixes the function can be reached under. Routes are registered
 * without them (`/campaigns`), so the prefix is removed before matching:
 *
 *  - `/api/mobility/…` — through the Hosting rewrite, which forwards the full path;
 *  - `/mobility/…`     — through the function's own URL (`…/api/mobility/…`) or the
 *                        emulator (`/{project}/{region}/api/mobility/…`), where the
 *                        runtime has already consumed the function name `api`.
 *
 * Without this every request missed every route and the API answered 404.
 */
const MOUNT_PREFIXES = ["/api/mobility", "/mobility"] as const;

export function routePath(path: string): string {
  for (const prefix of MOUNT_PREFIXES) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) return path.slice(prefix.length);
  }
  return path;
}

function splitPath(path: string): string[] {
  return path.split("/").filter((segment) => segment.length > 0);
}

function matchSegments(route: readonly string[], actual: readonly string[]): Record<string, string> | null {
  if (route.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < route.length; i += 1) {
    const expected = route[i]!;
    const received = actual[i]!;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(received);
      continue;
    }
    if (expected !== received) return null;
  }
  return params;
}

export class ApiRouter {
  private readonly routes: Route[] = [];

  add(
    method: HttpMethod,
    path: string,
    auth: AuthMode,
    handler: (context: RouteContext) => Promise<unknown>,
    options: RouteOptions = {},
  ): this {
    const segments = splitPath(path);
    const existing = this.routes.find(
      (route) => route.method === method && route.segments.join("/") === segments.join("/"),
    );
    if (existing) {
      // A silently shadowed route is a bug that only shows up as a wrong
      // response at runtime, so it is refused at registration time instead.
      throw new Error(`Duplicate route registered: ${method} /${segments.join("/")}`);
    }
    this.routes.push({
      method,
      segments,
      auth,
      permissions: options.permissions ?? [],
      rateLimit: options.rateLimit === undefined ? null : options.rateLimit,
      handler,
    });
    return this;
  }

  get(path: string, auth: AuthMode, handler: (context: RouteContext) => Promise<unknown>, options?: RouteOptions): this {
    return this.add("GET", path, auth, handler, options);
  }

  post(path: string, auth: AuthMode, handler: (context: RouteContext) => Promise<unknown>, options?: RouteOptions): this {
    return this.add("POST", path, auth, handler, options);
  }

  patch(path: string, auth: AuthMode, handler: (context: RouteContext) => Promise<unknown>, options?: RouteOptions): this {
    return this.add("PATCH", path, auth, handler, options);
  }

  delete(path: string, auth: AuthMode, handler: (context: RouteContext) => Promise<unknown>, options?: RouteOptions): this {
    return this.add("DELETE", path, auth, handler, options);
  }

  private match(method: string, path: string): { route: Route; params: Record<string, string> } | null {
    const actual = splitPath(path);
    let pathMatched = false;
    // Two passes so a concrete path always beats a parameterised one regardless
    // of registration order. Without this, registering
    // `/analytics/campaigns/:campaignId` before `/analytics/campaigns/table`
    // makes the literal word "table" resolve as a campaign id — a bug that
    // returns plausible-looking data instead of failing loudly.
    const candidates: { route: Route; params: Record<string, string> }[] = [];
    for (const route of this.routes) {
      const params = matchSegments(route.segments, actual);
      if (!params) continue;
      pathMatched = true;
      if (route.method === method) candidates.push({ route, params });
    }

    if (candidates.length > 0) {
      const dynamicness = (entry: { route: Route }): number =>
        entry.route.segments.filter((segment) => segment.startsWith(":")).length;
      // Stable: among equally specific routes the first registered one wins.
      let best = candidates[0];
      for (const candidate of candidates) {
        if (dynamicness(candidate) < dynamicness(best)) best = candidate;
      }
      return best;
    }

    if (pathMatched) {
      throw new ApiError(405, "METHOD_NOT_ALLOWED", "That method is not supported for this endpoint.");
    }
    return null;
  }

  /** Build the Express handler. All middleware order lives here. */
  handler(): (request: Request, response: Response) => Promise<void> {
    return async (request, response) => {
      const correlationId = newCorrelationId();
      response.set("X-Request-Id", correlationId);

      try {
        if (!applyCors(request, response)) return;

        const matched = this.match(request.method, routePath(request.path));
        if (!matched) throw ApiError.notFound("Unknown endpoint.");
        const { route, params } = matched;

        let principal: Principal | null = null;
        if (route.auth === "user") {
          principal = await requireUser(request, correlationId);
        } else if (route.auth === "device") {
          principal = await requireDevice(request, correlationId);
        }

        // Permissions are checked before the rate limit is charged, so a caller
        // without access cannot burn another user's quota.
        if (route.auth === "user" && route.permissions.length > 0) {
          const user = principal as AuthContext;
          const missing = route.permissions.filter((permission) => !user.permissions.has(permission));
          if (missing.length > 0) {
            throw ApiError.forbidden(`Your role does not allow: ${missing.join(", ")}.`);
          }
        }

        if (route.rateLimit) {
          const subject = principal
            ? `${route.rateLimit.name}:${principal.kind}:${principal.kind === "user" ? principal.userId : principal.deviceId}`
            : subjectFromRequest(request, route.rateLimit.name);
          await enforceRateLimit(subject, route.rateLimit);
        }

        const context: RouteContext = {
          request,
          response,
          correlationId,
          params,
          query: request.query,
          body: request.body,
          principal,
          user(): AuthContext {
            if (!principal || principal.kind !== "user") {
              throw ApiError.unauthorised("This endpoint requires a signed-in user.");
            }
            return principal;
          },
          require(permission: Permission): AuthContext {
            const user = context.user();
            if (!user.permissions.has(permission)) {
              throw ApiError.forbidden(`Your role does not allow "${permission}".`);
            }
            return user;
          },
        };

        const result = await route.handler(context);
        if (result === HANDLED) return;
        if (response.headersSent) return;
        sendSuccess(response, result, request.method === "POST" ? 201 : 200);
      } catch (error) {
        await respondWithError(response, correlationId, error);
      }
    };
  }
}

async function respondWithError(response: Response, correlationId: string, error: unknown): Promise<void> {
  if (response.headersSent) {
    response.end();
    return;
  }
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }
  // Unknown failures are logged in full server-side and reported opaquely, so
  // stack traces and Firestore paths never reach the client.
  const { logger } = await import("firebase-functions");
  logger.error("Unhandled API error", { correlationId }, error);
  response.status(500).json({
    error: { code: "INTERNAL", message: `Something went wrong. Reference: ${correlationId}`, correlationId },
  });
}
