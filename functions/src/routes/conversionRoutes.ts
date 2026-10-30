/**
 * Public, unauthenticated conversion ingestion.
 *
 * The API key travels in a header rather than the request body. A secret in the
 * body is captured by request logging, crash reporters and any proxy in between,
 * and it is not something a caller can accidentally echo back in an error.
 *
 * There is no user session on this route, so every trust decision is made from
 * the key: it identifies the advertiser, and nothing in the payload can
 * override that.
 */

import { z } from "zod";
import type { ApiRouter } from "../lib/router.js";
import { parseJsonBody } from "../lib/params.js";
import { headerValue } from "../lib/http.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { recordAudit } from "../middleware/audit.js";
import {
  authenticateApiKey,
  resolveConversions,
  unauthorizedApiKey,
  writeConversions,
} from "../domain/conversionService.js";

const conversionItemSchema = z.object({
  campaignId: z.string().min(3).max(64),
  creativeId: z.string().min(3).max(64).optional(),
  source: z.enum(["LANDING_PAGE", "WHATSAPP", "PHONE", "COUPON", "POS", "CRM", "MANUAL", "API"]),
  type: z.enum(["LEAD", "COUPON_REDEMPTION", "PURCHASE", "STORE_VISIT"]),
  valueMinor: z.number().int().nonnegative().max(100_000_000).default(0),
  currency: z.string().length(3).default("INR"),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  /**
   * The advertiser's own idempotency key. Re-posting the same reference is a
   * no-op rather than a second conversion, which is what keeps revenue splits
   * and driver payouts stable across feed retries.
   */
  externalReference: z.string().trim().min(4).max(120).optional(),
  verified: z.boolean().default(false),
  verificationSource: z.string().trim().max(60).optional(),
});

const ingestSchema = z.object({
  conversions: z.array(conversionItemSchema).min(1).max(200),
});

export function registerConversionRoutes(router: ApiRouter): void {
  router.post(
    "/public/v1/conversions",
    "public",
    async (context) => {
      const presented = headerValue(context.request, "X-Conversion-Api-Key");
      if (!presented) throw unauthorizedApiKey();

      const principal = await authenticateApiKey(presented);
      if (!principal) throw unauthorizedApiKey();
      const advertiserId = principal.advertiserId;

      const body = parseJsonBody(ingestSchema, context.body);
      const { resolved, rejected, verificationDowngraded } = await resolveConversions(
        principal,
        // `advertiserId` is stamped from the key here, deliberately overriding
        // anything the payload might have claimed.
        body.conversions.map((row) => ({ ...row, advertiserId })),
      );
      const written = await writeConversions(resolved);

      // A feed partially failing is a normal, expected condition rather than an
      // incident, so the audit entry records the per-row reasons without
      // alerting: the caller gets them in the response and can fix their feed.
      await recordAudit({
        action: "CONVERSIONS_INGESTED",
        entityType: "CONVERSION",
        entityId: advertiserId,
        summary: `${written} conversions accepted, ${rejected.length} rejected`,
        metadata: {
          advertiserId,
          keyId: principal.keyId,
          keyTrustLevel: principal.trustLevel,
          received: body.conversions.length,
          accepted: written,
          rejected: rejected.length,
          // Recorded because a downgrade is a real event: someone asked for a row
          // to be payable and was refused, which an operator may want to see.
          verificationDowngraded,
          rejectionReasons: rejected.slice(0, 20).map((row) => row.reason),
        },
      });

      return {
        accepted: written,
        rejected,
        verificationDowngraded,
        serverTime: new Date().toISOString(),
      };
    },
    { rateLimit: RATE_LIMITS.api },
  );
}
