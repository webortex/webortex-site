/**
 * Conversion-feed API key management.
 *
 * Keys authenticate `POST /public/v1/conversions` (see `conversionRoutes.ts` and
 * docs/conversion-ingestion.md). An advertiser manages only its own keys; staff
 * with `apikeys:manage` may act for any advertiser.
 *
 * `trustLevel: VERIFIED_FEED` lets a feed mark conversions as verified, which
 * makes them count toward driver payouts. That is a platform decision about a
 * vetted integration, never something an advertiser can grant itself, so it
 * additionally requires `advertisers:review`.
 */

import { z } from "zod";
import { COLLECTIONS, entityId } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { parseJsonBody } from "../lib/params.js";
import type { ApiRouter } from "../lib/router.js";
import { recordAudit } from "../middleware/audit.js";
import { assertOwnsAdvertiser } from "../middleware/auth.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import {
  issueConversionApiKey,
  listConversionApiKeys,
  revokeConversionApiKey,
} from "../domain/conversionService.js";

const issueSchema = z.object({
  label: z.string().trim().min(2).max(80),
  trustLevel: z.enum(["UNTRUSTED", "VERIFIED_FEED"]).default("UNTRUSTED"),
});

const keyIdSchema = z.string().regex(/^KEY_[0-9A-F]{18}$/);

function advertiserParam(raw: string | undefined): string {
  const parsed = entityId.safeParse(raw);
  if (!parsed.success) throw ApiError.badRequest("Invalid advertiser id.");
  return parsed.data;
}

async function assertAdvertiserExists(advertiserId: string): Promise<void> {
  const snapshot = await db().collection(COLLECTIONS.advertisers).doc(advertiserId).get();
  if (!snapshot.exists) throw ApiError.notFound("No such advertiser.");
}

export function registerApiKeyRoutes(router: ApiRouter): void {
  router.get(
    "/advertisers/:advertiserId/api-keys",
    "user",
    async (context) => {
      const user = context.user();
      const advertiserId = advertiserParam(context.params.advertiserId);
      assertOwnsAdvertiser(user, advertiserId);
      return { items: await listConversionApiKeys(advertiserId) };
    },
    { permissions: ["apikeys:manage"], rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/advertisers/:advertiserId/api-keys",
    "user",
    async (context) => {
      const user = context.user();
      const advertiserId = advertiserParam(context.params.advertiserId);
      assertOwnsAdvertiser(user, advertiserId);
      const input = parseJsonBody(issueSchema, context.body);
      if (input.trustLevel === "VERIFIED_FEED" && !user.permissions.has("advertisers:review")) {
        throw ApiError.forbidden("Only platform staff can issue a verified-feed key.");
      }
      await assertAdvertiserExists(advertiserId);

      const issued = await issueConversionApiKey(advertiserId, input.label, { trustLevel: input.trustLevel });
      await recordAudit({
        action: "API_KEY_ISSUED",
        entityType: "API_KEY",
        entityId: issued.keyId,
        // Never the plaintext: the audit log is readable by staff.
        summary: `Conversion API key "${input.label}" issued (${input.trustLevel})`,
        metadata: { advertiserId, trustLevel: input.trustLevel },
        principal: user,
      });
      return {
        keyId: issued.keyId,
        label: input.label,
        trustLevel: input.trustLevel,
        createdAt: issued.createdAt,
        // Returned exactly once. Only the digest is stored.
        plaintext: issued.plaintext,
      };
    },
    { permissions: ["apikeys:manage"], rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/advertisers/:advertiserId/api-keys/:keyId/revoke",
    "user",
    async (context) => {
      const user = context.user();
      const advertiserId = advertiserParam(context.params.advertiserId);
      assertOwnsAdvertiser(user, advertiserId);
      const keyId = keyIdSchema.safeParse(context.params.keyId);
      if (!keyId.success) throw ApiError.badRequest("Invalid key id.");

      const summary = await revokeConversionApiKey(advertiserId, keyId.data);
      await recordAudit({
        action: "API_KEY_REVOKED",
        entityType: "API_KEY",
        entityId: summary.keyId,
        summary: `Conversion API key "${summary.label}" revoked`,
        metadata: { advertiserId },
        principal: user,
      });
      return summary;
    },
    { permissions: ["apikeys:manage"], rateLimit: RATE_LIMITS.write },
  );
}
