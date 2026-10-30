/**
 * Audit trail writer.
 *
 * Audit documents are append-only: the writer never updates or deletes, and the
 * Firestore rules deny both. Every administrative mutation in the API tier goes
 * through `recordAudit`, which is what makes the trail complete.
 *
 * Only hashed IPs and truncated user agents are stored. Metadata is sanitised so
 * a secret can never be written into the log by accident.
 */

import { logger } from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  isAuditAction,
  isEntityType,
  newId,
  type AuditAction,
  type EntityType,
} from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import type { Principal } from "./auth.js";

const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|apikey|api_key|authorization|cookie|credential|otp|pin|cvv|cardnumber|card_number|secret_hash|private_key)/i;

const MAX_STRING = 400;

function sanitiseMetadata(input: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (input === null || input === undefined) return input;
  if (typeof input === "string") return input.length > MAX_STRING ? `${input.slice(0, MAX_STRING)}…` : input;
  if (typeof input === "number" || typeof input === "boolean") return input;
  if (Array.isArray(input)) return input.slice(0, 50).map((item) => sanitiseMetadata(item, depth + 1));
  if (typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 60)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        result[key] = "[redacted]";
        continue;
      }
      result[key] = sanitiseMetadata(value, depth + 1);
    }
    return result;
  }
  return "[unsupported]";
}

export interface AuditInput {
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly summary?: string;
  readonly metadata?: Record<string, unknown>;
  readonly principal?: Principal | null;
  readonly ipHash?: string | null;
  readonly userAgent?: string | null;
}

/**
 * Fire-and-forget by design: an audit write must never fail the business
 * operation it describes. A genuine write failure is logged loudly instead.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    if (!isAuditAction(input.action)) {
      logger.error("Refusing to write an unrecognised audit action", { action: input.action });
      return;
    }
    if (!isEntityType(input.entityType)) {
      logger.error("Refusing to write an unrecognised audit entity type", { entityType: input.entityType });
      return;
    }

    const principal = input.principal ?? null;
    const id = newId("AUD");
    const doc = {
      id,
      actorId: principal?.kind === "user" ? principal.userId : (principal?.kind === "device" ? principal.deviceId : null),
      actorRole: principal?.kind === "user" ? principal.roles.join(",") : (principal?.kind === "device" ? "DEVICE" : null),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: (input.summary ?? "").slice(0, 500),
      ipHash: input.ipHash ?? (principal?.kind === "user" ? principal.ipHash : null),
      userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
      metadata: sanitiseMetadata(input.metadata ?? {}),
      createdAt: FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
    };

    await db().collection(COLLECTIONS.auditLogs).doc(id).set(doc);
  } catch (error) {
    logger.error("Audit write failed", { action: input.action, entityType: input.entityType }, error);
  }
}

export type { AuditAction, EntityType };