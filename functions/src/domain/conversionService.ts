/**
 * Server-to-server conversion ingestion.
 *
 * The advertiser's API key identifies *who* is reporting, so the advertiser,
 * the campaign's ownership and the creative's membership are all resolved
 * server-side. A body field is never trusted for attribution: a conversion
 * posted with someone else's `campaignId` would otherwise inflate another
 * advertiser's campaign analytics and driver payouts.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { COLLECTIONS, newId, type ConversionKeyTrust, type IngestResult } from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";

/** 32 bytes of entropy; the plaintext is shown once and never stored. */
const API_KEY_BYTES = 32;
const KEY_PREFIX = "mmk_";

export interface IssuedApiKey {
  readonly advertiserId: string;
  readonly keyId: string;
  /** Shown to the operator exactly once. */
  readonly plaintext: string;
  readonly createdAt: string;
}

export interface ConversionInput {
  readonly campaignId: string;
  readonly creativeId?: string;
  readonly source: string;
  readonly type: string;
  readonly valueMinor: number;
  readonly currency: string;
  readonly occurredAt?: string;
  readonly externalReference?: string;
  readonly verified: boolean;
  readonly verificationSource?: string;
  /**
   * Derived from the key, never from the payload. A feed can only ever
   * attribute a conversion to the advertiser that owns the key.
   */
  readonly advertiserId: string;
}

export interface ResolvedConversion {
  readonly campaignId: string;
  readonly advertiserId: string;
  readonly creativeId: string | null;
  readonly zoneId: string | null;
  readonly type: string;
  readonly source: string;
  readonly valueMinor: number;
  readonly currency: string;
  readonly occurredAt: number;
  readonly externalReference: string | null;
  readonly verified: boolean;
  readonly verificationSource: string | null;
}

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  // `timingSafeEqual` throws on a length mismatch, which would itself leak the
  // digest length, so the comparison is guarded first.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Issue a conversion API key for an advertiser.
 *
 * Only the digest is persisted. A leaked database therefore cannot be replayed
 * against the public conversion endpoint, and a lost key has to be rotated
 * rather than recovered.
 */
export async function issueConversionApiKey(
  advertiserId: string,
  label: string,
  options: { trustLevel?: ConversionKeyTrust } = {},
): Promise<IssuedApiKey> {
  const plaintext = KEY_PREFIX + randomBytes(API_KEY_BYTES).toString("base64url");
  // Not `newId("KEY")`: the prefix is part of the document id other tooling
  // looks up, and `KEY` is not an entity prefix in the shared vocabulary.
  const keyId = "KEY_" + randomBytes(9).toString("hex").toUpperCase();
  const now = nowIso();
  await db()
    .collection(COLLECTIONS.advertisers)
    .doc(advertiserId)
    .collection("apiKeys")
    .doc(keyId)
    .set({
      keyId,
      label,
      keyHash: hashKey(plaintext),
      // Defaulting to UNTRUSTED means a key issued without a deliberate choice
      // cannot assert verification. Absence is treated as untrusted on read too,
      // so keys written before this field existed are not accidentally promoted.
      trustLevel: options.trustLevel ?? "UNTRUSTED",
      createdAt: now,
      createdAtTs: FieldValue.serverTimestamp() as never,
      revokedAt: null,
      lastUsedAt: null,
    });
  return { advertiserId, keyId, plaintext, createdAt: now };
}

/** What an operator may see about a key. The digest never leaves the server. */
export interface ApiKeySummary {
  readonly keyId: string;
  readonly label: string;
  readonly trustLevel: ConversionKeyTrust;
  readonly createdAt: string | null;
  readonly revokedAt: string | null;
  readonly lastUsedAt: string | null;
}

function apiKeys(advertiserId: string) {
  return db().collection(COLLECTIONS.advertisers).doc(advertiserId).collection("apiKeys");
}

function toSummary(data: Record<string, unknown>, id: string): ApiKeySummary {
  const str = (value: unknown): string | null => (typeof value === "string" ? value : null);
  return {
    keyId: str(data.keyId) ?? id,
    label: str(data.label) ?? "",
    trustLevel: data.trustLevel === "VERIFIED_FEED" ? "VERIFIED_FEED" : "UNTRUSTED",
    createdAt: str(data.createdAt),
    revokedAt: str(data.revokedAt),
    lastUsedAt: str(data.lastUsedAt),
  };
}

/** Every key an advertiser has ever held, newest first, revoked ones included. */
export async function listConversionApiKeys(advertiserId: string): Promise<ApiKeySummary[]> {
  // Small per-advertiser collection, sorted in memory so no extra index is needed.
  const snapshot = await apiKeys(advertiserId).get();
  return snapshot.docs
    .map((doc) => toSummary(doc.data(), doc.id))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

/**
 * Revoke a key. Idempotent: revoking a revoked key returns it unchanged rather
 * than moving `revokedAt`, so the audit trail keeps the original moment.
 *
 * `authenticateApiKey` filters on `revokedAt == null`, so a revoked key stops
 * authenticating on the very next request.
 */
export async function revokeConversionApiKey(advertiserId: string, keyId: string): Promise<ApiKeySummary> {
  const ref = apiKeys(advertiserId).doc(keyId);
  return db().runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw ApiError.notFound("No such API key for this advertiser.");
    const data = snapshot.data() as Record<string, unknown>;
    if (typeof data.revokedAt === "string") return toSummary(data, snapshot.id);
    const revokedAt = nowIso();
    tx.update(ref, { revokedAt });
    return toSummary({ ...data, revokedAt }, snapshot.id);
  });
}

/** The authenticated caller behind a conversion feed. */
export interface ConversionPrincipal {
  readonly advertiserId: string;
  readonly keyId: string;
  readonly trustLevel: ConversionKeyTrust;
}

/**
 * Resolve a presented key to its advertiser.
 *
 * Returns `null` for an unknown or revoked key rather than throwing, so the
 * caller can respond with a single generic 401 and reveal nothing about how
 * much of the key was correct.
 */
export async function authenticateApiKey(presented: string): Promise<ConversionPrincipal | null> {
  if (!presented.startsWith(KEY_PREFIX)) return null;
  const expectedHash = hashKey(presented);
  const firestore = db();

  // Looked up by digest rather than by scanning every advertiser, so an
  // attacker cannot use response timing to probe for valid keys.
  const candidates = await firestore
    .collectionGroup("apiKeys")
    .where("keyHash", "==", expectedHash)
    .where("revokedAt", "==", null)
    .limit(4)
    .get();

  for (const doc of candidates.docs) {
    if (!constantTimeEquals(String(doc.get("keyHash") ?? ""), expectedHash)) continue;
    // `…/advertisers/{advertiserId}/apiKeys/{keyId}` — the advertiser is the
    // grandparent, so ownership comes from where the key is stored.
    const advertiserId = doc.ref.parent.parent?.id;
    if (!advertiserId) continue;
    const stored = doc.get("trustLevel");
    // Recorded so an operator can tell a live integration from a dead key before
    // revoking it. Throttled to once an hour: a busy feed must not turn every
    // ingest into a write against the same document.
    const lastUsedAt = doc.get("lastUsedAt");
    if (typeof lastUsedAt !== "string" || Date.now() - Date.parse(lastUsedAt) > 3_600_000) {
      void doc.ref.update({ lastUsedAt: nowIso() }).catch(() => undefined);
    }
    return {
      advertiserId,
      keyId: String(doc.get("keyId") ?? doc.id),
      // Anything unrecognised — including a missing field on an older key — is
      // treated as the least privileged value.
      trustLevel: stored === "VERIFIED_FEED" ? "VERIFIED_FEED" : "UNTRUSTED",
    };
  }
  return null;
}

/**
 * Resolve, validate and normalise a batch of reported conversions.
 *
 * Rejections are returned per item rather than failing the batch, because a
 * single malformed row in a 200-row feed should not force the advertiser to
 * resubmit the other 199.
 */
export async function resolveConversions(
  principal: ConversionPrincipal,
  inputs: readonly ConversionInput[],
): Promise<{
  resolved: ResolvedConversion[];
  rejected: IngestResult["rejected"];
  verificationDowngraded: number;
}> {
  const firestore = db();
  const advertiserId = principal.advertiserId;
  const resolved: ResolvedConversion[] = [];
  const rejected: IngestResult["rejected"] = [];
  let verificationDowngraded = 0;

  // One pass of unique ids so the lookups are batched rather than per-row.
  const campaignIds = Array.from(new Set(inputs.map((input) => input.campaignId)));
  const campaigns = await firestore.getAll(
    ...campaignIds.map((id) => firestore.collection(COLLECTIONS.campaigns).doc(id)),
  );
  const campaignById = new Map(campaigns.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data() as Record<string, unknown>]));

  const seenExternal = new Set<string>();

  for (const input of inputs) {
    const campaign = campaignById.get(input.campaignId);
    if (!campaign) {
      rejected.push({ eventId: input.externalReference ?? input.campaignId, reason: "Unknown campaign." });
      continue;
    }
    // Attribution is keyed off the key's advertiser, not the payload.
    if (campaign.advertiserId !== advertiserId) {
      rejected.push({ eventId: input.externalReference ?? input.campaignId, reason: "Campaign does not belong to this advertiser." });
      continue;
    }

    let creativeId: string | null = null;
    if (input.creativeId) {
      const creative = await firestore.collection(COLLECTIONS.creatives).doc(input.creativeId).get();
      const data = creative.data() as Record<string, unknown> | undefined;
      if (!creative.exists || data?.campaignId !== input.campaignId) {
        rejected.push({ eventId: input.externalReference ?? input.campaignId, reason: "Creative does not belong to this campaign." });
        continue;
      }
      creativeId = input.creativeId;
    }

    // A feed that retries an `externalReference` must not double-count, so the
    // reference is de-duplicated within the request and relied upon as the
    // caller's own idempotency key across requests.
    const reference = input.externalReference ?? null;
    if (reference) {
      if (seenExternal.has(reference)) continue;
      seenExternal.add(reference);
      const existing = await firestore
        .collection(COLLECTIONS.conversions)
        .where("advertiserId", "==", advertiserId)
        .where("externalReference", "==", reference)
        .limit(1)
        .get();
      if (!existing.empty) {
        rejected.push({ eventId: reference, reason: "Duplicate externalReference." });
        continue;
      }
    }

    const occurredAt = input.occurredAt ? Date.parse(input.occurredAt) : Date.now();
    if (Number.isNaN(occurredAt)) {
      rejected.push({ eventId: reference ?? input.campaignId, reason: "Invalid occurredAt." });
      continue;
    }
    if (occurredAt > Date.now() + 60 * 60 * 1000) {
      rejected.push({ eventId: reference ?? input.campaignId, reason: "occurredAt is in the future." });
      continue;
    }

    // `verified` decides whether this row counts toward driver payouts, so it is
    // a platform decision, not something the reporter gets to assert. A key
    // proves which advertiser is posting; only a key the platform has vouched for
    // may additionally claim the event is true. Anything else is stored
    // unverified — still attributed, just not payable until it is confirmed.
    const claimedVerified = input.verified === true;
    const verified = claimedVerified && principal.trustLevel === "VERIFIED_FEED";
    if (claimedVerified && !verified) verificationDowngraded += 1;

    resolved.push({
      campaignId: input.campaignId,
      advertiserId,
      creativeId,
      zoneId: typeof campaign.zoneId === "string" ? campaign.zoneId : null,
      type: input.type,
      source: input.source,
      valueMinor: input.valueMinor,
      currency: input.currency,
      occurredAt,
      externalReference: reference,
      verified,
      // The claim is kept for audit even when it was not honoured, so an
      // operator can see that a feed asked for this and was refused.
      verificationSource: verified
        ? (input.verificationSource ?? null)
        : claimedVerified
          ? `REFUSED_UNTRUSTED_KEY:${input.verificationSource ?? "unspecified"}`
          : (input.verificationSource ?? null),
    });
  }
  return { resolved, rejected, verificationDowngraded };
}
/** Persist resolved conversions. Documents are keyed for cross-request idempotency. */
export async function writeConversions(conversions: readonly ResolvedConversion[]): Promise<number> {
  if (conversions.length === 0) return 0;
  const firestore = db();
  let written = 0;

  for (const group of chunk(conversions, 400)) {
    let pending = group.map((conversion) => ({ conversion, id: documentIdFor(conversion) }));

    for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS && pending.length > 0; attempt++) {
      const batch = firestore.batch();
      for (const { id, conversion } of pending) {
        batch.create(conversionRef(firestore, id), conversionDocument(id, conversion));
      }
      try {
        await batch.commit();
        written += pending.length;
        pending = [];
      } catch (error) {
        if (!isDuplicateRace(error) || attempt === MAX_COMMIT_ATTEMPTS - 1) throw error;
        // A batch commit is atomic: one already-existing document fails the whole
        // commit, so every other row in `pending` is still unwritten. Re-read to
        // find which documents actually landed and retry only the rest. Treating
        // the entire group as duplicates here would silently discard up to 399
        // valid conversions, because they were never written and never will be.
        pending = await excludeExisting(firestore, pending);
      }
    }
  }
  return written;
}

/** Bounded so a pathological feed cannot spin; each retry is a fresh read. */
const MAX_COMMIT_ATTEMPTS = 3;

/**
 * A deterministic id makes a replayed reference a no-op instead of a second
 * document, which is what keeps revenue and payouts stable.
 */
function documentIdFor(conversion: ResolvedConversion): string {
  return conversion.externalReference
    ? `CNV_${createHash("sha256").update(`${conversion.advertiserId}:${conversion.externalReference}`).digest("hex").slice(0, 24)}`
    : newId("CNV");
}

function conversionRef(firestore: FirebaseFirestore.Firestore, id: string): FirebaseFirestore.DocumentReference {
  return firestore.collection(COLLECTIONS.conversions).doc(id);
}

function conversionDocument(id: string, conversion: ResolvedConversion): Record<string, unknown> {
  const at = new Date(conversion.occurredAt);
  return {
    id,
    campaignId: conversion.campaignId,
    advertiserId: conversion.advertiserId,
    creativeId: conversion.creativeId,
    zoneId: conversion.zoneId,
    type: conversion.type,
    source: conversion.source,
    valueMinor: conversion.valueMinor,
    currency: conversion.currency,
    occurredAt: at.toISOString(),
    occurredAtTs: at,
    dayKey: dayKeyFor(at),
    verified: conversion.verified,
    verificationSource: conversion.verificationSource,
    externalReference: conversion.externalReference,
    createdAt: nowIso(),
    createdAtTs: FieldValue.serverTimestamp() as never,
  };
}

/** Drops the rows whose document already landed, leaving only the ones to retry. */
async function excludeExisting(
  firestore: FirebaseFirestore.Firestore,
  rows: { conversion: ResolvedConversion; id: string }[],
): Promise<{ conversion: ResolvedConversion; id: string }[]> {
  const remaining: { conversion: ResolvedConversion; id: string }[] = [];
  for (const group of chunk(rows, 400)) {
    const snapshots = await firestore.getAll(...group.map((row) => conversionRef(firestore, row.id)));
    const exists = new Set(snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id));
    for (const row of group) {
      if (!exists.has(row.id)) remaining.push(row);
    }
  }
  return remaining;
}

/**
 * True when a commit failed because a document already existed.
 *
 * A single create surfaces as ALREADY_EXISTS (6) and a batch as
 * FAILED_PRECONDITION (9), so both are accepted here.
 */
function isDuplicateRace(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code;
  if (code === 6 || code === 9 || code === "ALREADY_EXISTS" || code === "FAILED_PRECONDITION") return true;
  const message = (error as { message?: string } | null)?.message ?? "";
  return message.includes("ALREADY_EXISTS") || message.includes("already exists");
}

function dayKeyFor(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
}

export function unauthorizedApiKey(): ApiError {
  return ApiError.unauthorised("Invalid conversion API key.");
}
