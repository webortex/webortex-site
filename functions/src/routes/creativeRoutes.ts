/**
 * Creative and media endpoints.
 *
 * Uploads are two-phase: a signed upload intent, then a registration call that
 * declares the metadata. The storage bucket is private, so every read URL handed
 * to a client is short-lived and signed. Magic-byte sniffing happens server-side
 * so a renamed `.exe` cannot be registered as a video.
 */

import { z } from "zod";
import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { HANDLED } from "../lib/router.js";
import { first, parseJsonBody } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { assertOwnsAdvertiser, isStaff, requirePermission, type AuthContext } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  creativeRegistrationSchema,
  creativeUploadIntentSchema,
  idListSchema,
  moderationDecisionSchema,
} from "../../../packages/shared/src/index.js";
import { COLLECTIONS } from "../../../packages/shared/src/index.js";
import { db } from "../lib/admin.js";
import { getCampaign } from "../domain/campaignService.js";
import {
  archiveCreative,
  createUploadIntent,
  duplicateCreative,
  listCreativesForAdvertiser,
  listCreativesForReview,
  moderateCreative,
  registerCreative,
  signedReadUrl,
  submitCreatives,
  withSignedUrl,
} from "../domain/creativeService.js";

function advertiserFor(user: AuthContext): string {
  if (!user.advertiserId) throw ApiError.forbidden("Your account is not linked to an advertiser.");
  return user.advertiserId;
}

export function registerCreativeRoutes(router: ApiRouter): void {
  router.get(
    "/creatives",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:read");
      const limit = clampInt(first(context.query.limit), 1, 100, 25);
      const page = clampInt(first(context.query.page), 1, 10_000, 1);
      const status = first(context.query.status) ?? undefined;
      const campaignId = first(context.query.campaignId) ?? undefined;
      // Scoped to the caller's own advertiser, so this can never leak another
      // tenant's assets regardless of the filters supplied.
      const result = await listCreativesForAdvertiser(advertiserFor(user), { limit, page, status, campaignId });
      return { ...result, items: await Promise.all(result.items.map(withSignedUrl)) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/creatives/upload-intent",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:write");
      const input = parseJsonBody(creativeUploadIntentSchema, context.body);
      // The campaign must belong to the caller's advertiser, otherwise an
      // advertiser could attach media to a competitor's campaign id.
      if (!isStaff(user)) {
        const campaign = await getCampaign(input.campaignId);
        assertOwnsAdvertiser(user, campaign.advertiserId);
      }
      return createUploadIntent("creative", input.campaignId, input, user.userId);
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/creatives",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:write");
      // `creativeRegistrationSchema`, not the intent schema: registration carries
      // the `storagePath` the upload intent handed back, and the intent schema
      // strips unknown keys — which made every registration fail with "Complete
      // the file upload" no matter what the client sent.
      const input = parseJsonBody(creativeRegistrationSchema, context.body);
      const advertiserId = advertiserFor(user);
      const creative = await registerCreative(input, advertiserId, user.userId);
      await recordAudit({
        action: "CREATIVE_UPLOADED",
        entityType: "CREATIVE",
        entityId: creative.id,
        summary: `Creative "${creative.name}" registered`,
        metadata: { campaignId: input.campaignId, mimeType: input.mimeType, sizeBytes: input.sizeBytes },
        principal: user,
      });
      return creative;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/creatives/:creativeId/duplicate",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:write");
      const creative = await duplicateCreative(context.params.creativeId!, advertiserFor(user), user.userId);
      await recordAudit({
        action: "CREATIVE_DUPLICATED",
        entityType: "CREATIVE",
        entityId: creative.id,
        summary: `Creative duplicated as "${creative.name}"`,
        principal: user,
      });
      return creative;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.delete(
    "/creatives/:creativeId",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:write");
      await archiveCreative(context.params.creativeId!, advertiserFor(user));
      await recordAudit({
        action: "CREATIVE_ARCHIVED",
        entityType: "CREATIVE",
        entityId: context.params.creativeId!,
        summary: "Creative archived",
        principal: user,
      });
      // 204: the resource is gone, so there is no body to return.
      context.response.status(204).end();
      return HANDLED;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/creatives/submit",
    "user",
    async (context) => {
      const user = context.user();
      // Submitting for review is a write. Without this, a role that can merely
      // read creatives could push another advertiser's work into the queue.
      requirePermission(user, "creatives:write");
      const { creativeIds } = parseJsonBody(z.object({ creativeIds: idListSchema }), context.body);
      const count = await submitCreatives(creativeIds, advertiserFor(user));
      await recordAudit({
        action: "CREATIVE_SUBMITTED",
        entityType: "CREATIVE",
        entityId: creativeIds[0] ?? null,
        summary: `${count} creative(s) submitted for review`,
        metadata: { count },
        principal: user,
      });
      return { submitted: count };
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.get(
    "/creatives/review",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:review");
      const limit = clampInt(first(context.query.limit), 1, 100, 25);
      const status = first(context.query.status);
      const cursor = first(context.query.cursor) ?? null;
      const page = await listCreativesForReview({ status, limit, cursor });
      // Signed URLs are generated here rather than stored, so they cannot leak
      // through an aggregate document or a stale cache.
      return { ...page, items: await Promise.all(page.items.map(withSignedUrl)) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/creatives/:creativeId/moderate",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:review");
      const decision = parseJsonBody(moderationDecisionSchema, context.body);
      const creative = await moderateCreative(context.params.creativeId!, user.userId, decision);
      await recordAudit({
        action: moderationAuditAction(decision.decision),
        entityType: "CREATIVE",
        entityId: creative.id,
        summary: `Creative "${creative.name}" ${decision.decision.toLowerCase()}`,
        metadata: { reasonCode: decision.reasonCode, notes: decision.notes },
        principal: user,
      });
      return creative;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  /** Short-lived signed read URL for a known storage path. */
  router.get(
    "/creatives/signed-url",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "creatives:read");
      // Addressed by creative, never by raw storage path. Accepting a path let
      // any advertiser sign a URL for another advertiser's unreviewed upload,
      // since ownership of a bare path cannot be checked. The creative document
      // says who owns it and where its bytes live.
      const creativeId = first(context.query.creativeId);
      if (!creativeId || !/^[A-Za-z0-9_-]{3,64}$/.test(creativeId)) {
        throw ApiError.badRequest("Query parameter \"creativeId\" is required.");
      }
      const snapshot = await db().collection(COLLECTIONS.creatives).doc(creativeId).get();
      if (!snapshot.exists) throw ApiError.notFound("Creative not found.");
      const creative = snapshot.data() as { advertiserId?: string; storagePath?: string };
      assertOwnsAdvertiser(user, creative.advertiserId);
      if (!creative.storagePath) throw ApiError.notFound("This creative has no uploaded media yet.");
      return signedReadUrl(creative.storagePath);
    },
    { rateLimit: RATE_LIMITS.read },
  );
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function moderationAuditAction(decision: string): string {
  switch (decision) {
    case "APPROVE":
      return "CREATIVE_APPROVED";
    case "REJECT":
      return "CREATIVE_REJECTED";
    case "REQUEST_CHANGES":
      return "CREATIVE_CHANGES_REQUESTED";
    case "SUSPEND":
      return "CREATIVE_SUSPENDED";
    default:
      return "CREATIVE_UPDATED";
  }
}
