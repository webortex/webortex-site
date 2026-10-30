/**
 * HTTP helpers: consistent JSON envelopes, CORS and error mapping.
 *
 * Error discipline: internal failures are logged with a correlation id and the
 * client receives a generic message plus that id. Stack traces, Firestore paths,
 * gateway payloads and secrets never cross the wire.
 */

import type { Response } from "express";
import { logger } from "firebase-functions";
import type { Request } from "firebase-functions/v1/https";
import { ZodError, type ZodSchema } from "zod";
import { config } from "./config.js";

/**
 * `firebase-functions/v1/https` re-exports Express' request type but not the
 * response, so the response side is imported from `express` directly. Both are
 * the same object the Functions runtime actually passes to the handler.
 */
export type { Request, Response };

export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly correlationId: string;
    readonly details?: unknown;
  };
}

export interface ApiSuccessBody<T> {
  readonly data: T;
  readonly correlationId: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static unauthorised(message = "Sign in to continue."): ApiError {
    return new ApiError(401, "UNAUTHORISED", message);
  }

  static forbidden(message = "You do not have permission to perform this action."): ApiError {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(message = "The requested resource was not found."): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, "UNPROCESSABLE", message, details);
  }

  static tooManyRequests(message = "Too many requests. Please slow down.", retryAfterSeconds = 60): ApiError {
    const error = new ApiError(429, "RATE_LIMITED", message, { retryAfterSeconds });
    return error;
  }

  static internal(correlationId: string): ApiError {
    return new ApiError(500, "INTERNAL", `Something went wrong. Reference: ${correlationId}`, { correlationId });
  }
}

export function newCorrelationId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function applyCors(req: Request, res: Response): boolean {
  const origin = req.get("origin") ?? "";
  // Local dev serves the portal from Vite on a loopback port. Those origins are
  // only accepted by the emulator, never by a deployed function.
  const isLoopbackDevOrigin = config.isEmulator && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const allowed = origin.length === 0 || config.corsOrigins.includes(origin) || isLoopbackDevOrigin;
  if (!allowed) {
    res.set("Vary", "Origin");
    res.status(403).json({
      error: { code: "ORIGIN_NOT_ALLOWED", message: "This origin is not permitted.", correlationId: newCorrelationId() },
    });
    return false;
  }
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Origin", origin.length ? origin : config.corsOrigins[0]);
  res.set("Access-Control-Allow-Credentials", "true");
  res.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Idempotency-Key, X-Device-Key, X-Device-Id, X-Conversion-Api-Key, X-Request-Id",
  );
  res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Max-Age", "3600");
  // Dashboards and event endpoints must never be cached by a shared proxy.
  res.set("Cache-Control", "no-store, max-age=0");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  return true;
}

/**
 * Read a single request header value.
 *
 * Header names are case-insensitive per RFC 7230, and Express exposes them
 * lower-cased — but a header repeated by a client can arrive as an array, so a
 * repeated credential header is rejected rather than silently taking the first
 * value, which would let a proxy and a client disagree about the secret.
 */
export function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return undefined;
  return undefined;
}

export interface ErrorMapping {
  readonly status: number;
  readonly code: string;
}

const ZOD_STATUS: Record<string, ErrorMapping> = {
  INVALID_BODY: { status: 400, code: "INVALID_BODY" },
  UNAUTHORISED: { status: 401, code: "UNAUTHORISED" },
  FORBIDDEN: { status: 403, code: "FORBIDDEN" },
  NOT_FOUND: { status: 404, code: "NOT_FOUND" },
  CONFLICT: { status: 409, code: "CONFLICT" },
  UNPROCESSABLE: { status: 422, code: "UNPROCESSABLE" },
  RATE_LIMITED: { status: 429, code: "RATE_LIMITED" },
};

export function statusForZodIssue(issue: ZodError): ErrorMapping {
  const code = issue.issues[0]?.code ?? "INVALID_BODY";
  return ZOD_STATUS[code] ?? { status: 400, code: "INVALID_BODY" };
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const mapping = statusForZodIssue(result.error);
    throw new ApiError(
      mapping.status,
      mapping.code,
      summariseZodError(result.error),
      fieldErrors(result.error),
    );
  }
  return result.data;
}

function summariseZodError(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return "The request payload is invalid.";
  const path = first.path.join(".");
  return path ? `${path}: ${first.message}` : first.message;
}

export function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

export interface HandlerContext {
  readonly correlationId: string;
  readonly request: Request;
  readonly response: Response;
}

/**
 * Wraps a handler so every exit path produces a valid envelope and nothing
 * escapes to the Functions runtime's HTML error page.
 */
export function withApiErrorHandling(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => Promise<void> {
  return async (req, res) => {
    const correlationId = newCorrelationId();
    res.set("X-Request-Id", correlationId);
    try {
      await handler(req, res);
    } catch (error) {
      if (res.headersSent) {
        logger.error("Failure after response was sent", { correlationId }, error);
        res.end();
        return;
      }
      if (error instanceof ApiError) {
        if (error.status >= 500) {
          logger.error("Request failed", { correlationId, code: error.code }, error);
        } else {
          logger.info("Request rejected", { correlationId, code: error.code, status: error.status });
        }
        const body: ApiErrorBody = {
          error: {
            code: error.code,
            message: error.message,
            correlationId,
            ...(error.details ? { details: error.details } : {}),
          },
        };
        res.status(error.status).json(body);
        return;
      }
      logger.error("Unhandled error", { correlationId }, error);
      const body: ApiErrorBody = {
        error: { code: "INTERNAL", message: `Something went wrong. Reference: ${correlationId}`, correlationId },
      };
      res.status(500).json(body);
    }
  };
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data, correlationId: res.get("X-Request-Id") ?? newCorrelationId() } satisfies ApiSuccessBody<T>);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}

export function getIdempotencyKey(req: Request): string | null {
  const key = req.get("X-Idempotency-Key");
  if (!key || key.length < 8 || key.length > 128) return null;
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : null;
}