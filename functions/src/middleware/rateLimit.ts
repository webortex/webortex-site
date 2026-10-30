/**
 * Fixed-window rate limiting backed by Firestore.
 *
 * Chosen over in-memory counters because Cloud Functions instances are ephemeral
 * and horizontally scaled: an in-memory limiter would be per-instance and would
 * be trivially bypassed by parallel requests.
 *
 * Uses a transaction on a single counter document, so concurrent increments are
 * serialised. Keys are hashed so phone numbers and emails never appear as
 * Firestore document ids.
 */

import { createHash } from "node:crypto";
import type { Request } from "firebase-functions/v1/https";
import { COLLECTIONS } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";

export interface RateLimitRule {
  /** Max requests allowed inside the window. */
  readonly limit: number;
  /** Window length in seconds. */
  readonly windowSeconds: number;
}

export interface RateLimitPolicy {
  readonly name: string;
  readonly rules: readonly RateLimitRule[];
}

export const RATE_LIMITS = {
  /** Login/registration: credential-stuffing protection. */
  auth: { name: "auth", rules: [{ limit: 10, windowSeconds: 300 }, { limit: 30, windowSeconds: 3600 }] },
  /** Password reset / OTP: cost-bearing and abuse-prone. */
  otp: { name: "otp", rules: [{ limit: 5, windowSeconds: 300 }, { limit: 15, windowSeconds: 86_400 }] },
  /** Device event ingestion: high volume by design. */
  events: { name: "events", rules: [{ limit: 600, windowSeconds: 60 }, { limit: 20_000, windowSeconds: 3600 }] },
  /** Screen monitoring reads. */
  read: { name: "read", rules: [{ limit: 300, windowSeconds: 60 }] },
  /** Writes from the dashboards. */
  write: { name: "write", rules: [{ limit: 120, windowSeconds: 60 }] },
  /** Unauthenticated public endpoints. */
  public: { name: "public", rules: [{ limit: 60, windowSeconds: 60 }] },
  /** Server-to-server conversion API. */
  api: { name: "api", rules: [{ limit: 600, windowSeconds: 60 }, { limit: 10_000, windowSeconds: 3600 }] },
} as const satisfies Record<string, RateLimitPolicy>;

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

function bucketStart(nowMs: number, windowSeconds: number): number {
  return Math.floor(nowMs / (windowSeconds * 1000)) * windowSeconds * 1000;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

/**
 * Increment every window for the policy. All windows are evaluated together so a
 * request is rejected if it breaches the short *or* the long window.
 */
export async function consumeRateLimit(
  subject: string,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  const firestore = db();
  const hashed = hashKey(subject);
  const nowMs = Date.now();
  const results: RateLimitResult[] = [];

  for (const rule of policy.rules) {
    const bucket = bucketStart(nowMs, rule.windowSeconds);
    const docId = `${policy.name}_${rule.windowSeconds}_${bucket}`;
    const ref = firestore.collection(COLLECTIONS.rateLimits).doc(docId);

    const count = await firestore.runTransaction(async (txn) => {
      const snapshot = await txn.get(ref);
      const current = (snapshot.data()?.count as number | undefined) ?? 0;
      const next = current + 1;
      txn.set(
        ref,
        { count: next, expiresAt: new Date(bucket + rule.windowSeconds * 2000) },
        { merge: true },
      );
      return next;
    });

    results.push({
      allowed: count <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket + rule.windowSeconds * 1000 - nowMs) / 1000)),
    });
  }

  const breached = results.find((result) => !result.allowed);
  if (breached) {
    return { allowed: false, limit: breached.limit, remaining: 0, retryAfterSeconds: breached.retryAfterSeconds };
  }
  const tightest = results.reduce((worst, result) => (result.remaining < worst.remaining ? result : worst));
  return { allowed: true, limit: tightest.limit, remaining: tightest.remaining, retryAfterSeconds: 0 };
}

export async function enforceRateLimit(subject: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  const result = await consumeRateLimit(subject, policy);
  if (!result.allowed) {
    throw ApiError.tooManyRequests(
      "Too many requests. Please wait before trying again.",
      result.retryAfterSeconds,
    );
  }
  return result;
}

export function subjectFromRequest(req: Request, scope: string): string {
  // Prefer a verified principal id, fall back to the network address.
  const authHeader = req.get("authorization") ?? "";
  const uidMatch = /Bearer\s+(.+)$/i.exec(authHeader);
  const deviceKey = req.get("x-device-key");
  const base = uidMatch?.[1] ? `user:${uidMatch[1]!.slice(0, 64)}` : deviceKey ? `device:${deviceKey.slice(0, 32)}` : `ip:${req.ip ?? "unknown"}`;
  return `${scope}:${base}`;
}

export function subjectFromEmail(email: string, scope: string): string {
  return `${scope}:${email.trim().toLowerCase()}`;
}

export function subjectFromIp(ip: string | undefined, scope: string): string {
  return `${scope}:ip:${ip ?? "unknown"}`;
}