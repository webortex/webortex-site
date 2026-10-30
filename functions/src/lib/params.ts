/**
 * Query-string and body parsing shared by the route modules.
 *
 * Everything arriving from a query string is untrusted, so each helper
 * normalises and validates before a domain service ever sees it.
 */

import { z, type ZodTypeAny } from "zod";
import {
  analyticsRangeSchema,
  cursorPageSchema,
  paginationSchema,
  type AnalyticsRange,
} from "../../../packages/shared/src/index.js";
import { ApiError, parseBody } from "./http.js";

/**
 * Express types a query value as `string | string[] | ParsedQs | ...`. Nested
 * objects are never legitimate here, so they are ignored rather than coerced
 * into a string that would silently produce a wrong filter.
 */
function asScalar(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const head = value.find((item) => typeof item === "string");
    return typeof head === "string" ? head : undefined;
  }
  return undefined;
}

/** First scalar value for a key, or undefined. */
export function first(value: unknown): string | undefined {
  return asScalar(value);
}

/** Comma-separated list, de-duplicated, with a hard cap. */
export function list(value: unknown, max = 100): string[] | undefined {
  const raw = asScalar(value);
  if (raw === undefined) return undefined;
  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (parts.length > max) throw ApiError.badRequest(`Too many values supplied (maximum ${max}).`);
  return Array.from(new Set(parts));
}

/**
 * Validates a query object against `schema`.
 *
 * Only keys the schema declares are read, so extra fields cannot be smuggled
 * into a service call. `fallback` applies only when *no* recognised key was
 * present, which means an explicit but invalid `?from=` is still rejected
 * rather than silently replaced with a default.
 */
export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown, fallback?: z.output<S>): z.output<S> {
  const source = (query ?? {}) as Record<string, unknown>;
  const shape = (schema as unknown as { shape: Record<string, unknown> }).shape;
  const cleaned: Record<string, unknown> = {};
  let seen = 0;
  for (const key of Object.keys(shape)) {
    const value = asScalar(source[key]);
    if (value === undefined) continue;
    cleaned[key] = value;
    seen += 1;
  }
  if (fallback !== undefined && seen === 0) return fallback;
  return parseBody(schema, cleaned) as z.output<S>;
}

export function parseJsonBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  // A body that is not an object usually means it was never parsed as JSON.
  if (body === undefined || body === null || typeof body !== "object" || Array.isArray(body)) {
    throw ApiError.badRequest("A JSON request body is required.");
  }
  return parseBody(schema, body) as z.output<S>;
}

/** Default window: the last 30 days ending today, which is what dashboards open on. */
export function defaultRange(): AnalyticsRange {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86_400_000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function rangeFromQuery(query: unknown): AnalyticsRange {
  return parseQuery(analyticsRangeSchema, query, defaultRange());
}

export const paginationFromQuery = (query: unknown) => parseQuery(paginationSchema, query);
export const cursorFromQuery = (query: unknown) => parseQuery(cursorPageSchema, query);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function dayFromQuery(query: unknown, key = "day", fallback?: string): string {
  const source = (query ?? {}) as Record<string, unknown>;
  const value = asScalar(source[key]) ?? fallback;
  if (!value) throw ApiError.badRequest(`Query parameter "${key}" is required.`);
  if (!ISO_DAY.test(value)) throw ApiError.badRequest(`Query parameter "${key}" must be an ISO date (YYYY-MM-DD).`);
  return value;
}

export const periodSchema = z
  .object({ start: z.string().regex(ISO_DAY, "Use YYYY-MM-DD"), end: z.string().regex(ISO_DAY, "Use YYYY-MM-DD") })
  .refine((period) => period.start <= period.end, { message: "start must be on or before end" });

export type PeriodInput = z.infer<typeof periodSchema>;
/**
 * Parse a numeric query parameter into a bounded integer.
 *
 * Every list endpoint clamps its limit this way: an unbounded `limit` lets one
 * caller read an entire collection in a single request.
 */
export function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}