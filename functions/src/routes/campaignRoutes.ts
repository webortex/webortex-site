/**
 * Campaign endpoints.
 *
 * Every mutation is audited, and the advertiser is taken from the caller's own
 * profile rather than the request body so a campaign can never be created
 * against someone else's advertiser.
 */

import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { parseJsonBody, first } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { assertOwnsAdvertiser, isStaff, requirePermission, type AuthContext } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  idListSchema,
  type Campaign,
} from "../../../packages/shared/src/index.js";
import {
  campaignsForAdvertiser,
  createCampaign,
  getCampaign,
  reviewCampaign,
  setCampaignRunState,
  statusCounts,
  submitCampaign,
  updateCampaign,
} from "../domain/campaignService.js";

/**
 * Advertiser the caller is acting for.
 *
 * Staff may target any advertiser by id; everyone else is pinned to the
 * advertiser on their own profile. The campaign create schema has no
 * `advertiserId` field at all, so a body can never redirect a write to another
 * tenant.
 */
function advertiserFor(user: AuthContext, requested: unknown): string {
  if (isStaff(user)) {
    const explicit = first(requested);
    if (explicit) return explicit;
  }
  if (!user.advertiserId) throw ApiError.forbidden("Your account is not linked to an advertiser.");
  return user.advertiserId;
}

async function loadOwnedCampaign(campaignId: string, user: AuthContext): Promise<Campaign> {
  const campaign = await getCampaign(campaignId);
  assertOwnsAdvertiser(user, campaign.advertiserId);
  return campaign;
}

export function registerCampaignRoutes(router: ApiRouter): void {
  router.get(
    "/campaigns",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:read");
      const advertiserId = advertiserFor(user, context.query.advertiserId);
      const campaigns = await campaignsForAdvertiser(advertiserId);
      return { items: campaigns, statusCounts: statusCounts(campaigns) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/campaigns/:campaignId",
    "user",
    async (context) => loadOwnedCampaign(context.params.campaignId!, context.user()),
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/campaigns",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:write");
      const body = context.body as { asDraft?: boolean } | undefined;
      const input = parseJsonBody(campaignCreateSchema, context.body);
      const advertiserId = advertiserFor(user, undefined);
      const campaign = await createCampaign(advertiserId, user.userId, input, { asDraft: body?.asDraft === true });
      await recordAudit({
        action: "CAMPAIGN_CREATED",
        entityType: "CAMPAIGN",
        entityId: campaign.id,
        summary: `Campaign "${campaign.name}" created`,
        metadata: { advertiserId, status: campaign.status },
        principal: user,
      });
      return campaign;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.patch(
    "/campaigns/:campaignId",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:write");
      const campaignId = context.params.campaignId!;
      const advertiserId = advertiserFor(user, undefined);
      const patch = parseJsonBody(campaignUpdateSchema, context.body);
      const campaign = await updateCampaign(campaignId, advertiserId, patch);
      await recordAudit({
        action: "CAMPAIGN_UPDATED",
        entityType: "CAMPAIGN",
        entityId: campaign.id,
        summary: `Campaign "${campaign.name}" updated`,
        metadata: { fields: Object.keys(patch) },
        principal: user,
      });
      return campaign;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/campaigns/:campaignId/submit",
    "user",
    async (context) => {
      const user = context.user();
      // Owning the campaign is not sufficient. Without this check any signed-in
      // role that can read analytics could also submit a campaign for review.
      requirePermission(user, "campaigns:write");
      const campaignId = context.params.campaignId!;
      const advertiserId = advertiserFor(user, undefined);
      const campaign = await submitCampaign(campaignId, advertiserId);
      await recordAudit({
        action: "CAMPAIGN_SUBMITTED",
        entityType: "CAMPAIGN",
        entityId: campaign.id,
        summary: `Campaign "${campaign.name}" submitted for review`,
        principal: user,
      });
      return campaign;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/campaigns/:campaignId/review",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:review");
      const campaignId = context.params.campaignId!;
      const body = parseJsonBody(reviewDecisionSchema, context.body);
      const campaign = await reviewCampaign(campaignId, user.userId, body.decision, {
        reasonCode: body.reasonCode,
        notes: body.notes,
      });
      await recordAudit({
        action: reviewAuditAction(body.decision),
        entityType: "CAMPAIGN",
        entityId: campaign.id,
        summary: `Campaign "${campaign.name}" ${body.decision.toLowerCase()}`,
        metadata: { reasonCode: body.reasonCode, notes: body.notes },
        principal: user,
      });
      return campaign;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/campaigns/:campaignId/state",
    "user",
    async (context) => {
      const user = context.user();
      // Pausing and resuming live inventory is a write, not a read, even though
      // it is driven from a control in the campaign list.
      requirePermission(user, "campaigns:write");
      const campaignId = context.params.campaignId!;
      const body = parseJsonBody(runStateSchema, context.body);
      const campaign = await setCampaignRunState(campaignId, body.state, user.userId, {
        requireOwner: !isStaff(user),
        ownerAdvertiserId: user.advertiserId,
      });
      await recordAudit({
        action: "CAMPAIGN_STATUS_CHANGED",
        entityType: "CAMPAIGN",
        entityId: campaign.id,
        summary: `Campaign "${campaign.name}" is now ${body.state}`,
        metadata: { to: body.state },
        principal: user,
      });
      return campaign;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/campaigns/bulk-state",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:write");
      const body = parseJsonBody(bulkStateSchema, context.body);
      const advertiserId = advertiserFor(user, undefined);
      const results: { campaignId: string; status: string; error?: string }[] = [];
      // Deliberately sequential: each transition is independently audited and a
      // partial failure must be reported per campaign, not rolled back silently.
      for (const campaignId of body.campaignIds) {
        try {
          await setCampaignRunState(campaignId, body.state, user.userId, {
            requireOwner: !isStaff(user),
            ownerAdvertiserId: advertiserId,
          });
          results.push({ campaignId, status: "OK" });
          await recordAudit({
            action: "CAMPAIGN_STATUS_CHANGED",
            entityType: "CAMPAIGN",
            entityId: campaignId,
            summary: `Campaign moved to ${body.state} in a bulk action`,
            principal: user,
          });
        } catch (error) {
          results.push({
            campaignId,
            status: "FAILED",
            error: error instanceof ApiError ? error.message : "Unexpected error",
          });
        }
      }
      return { results };
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/campaigns/bulk-submit",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "campaigns:write");
      const advertiserId = advertiserFor(user, undefined);
      // An object, not a bare array: `parseJsonBody` only accepts objects, so a
      // top-level array was rejected before it was ever validated.
      const { campaignIds: ids } = parseJsonBody(z.object({ campaignIds: idListSchema }), context.body);
      if (ids.length === 0) throw ApiError.badRequest("Select at least one campaign.");
      if (ids.length > 50) throw ApiError.badRequest("Submit at most 50 campaigns at a time.");
      const submitted: string[] = [];
      const failed: { campaignId: string; error: string }[] = [];
      for (const campaignId of ids) {
        try {
          await submitCampaign(campaignId, advertiserId);
          submitted.push(campaignId);
        } catch (error) {
          failed.push({ campaignId, error: error instanceof ApiError ? error.message : "Unexpected error" });
        }
      }
      return { submitted, failed };
    },
    { rateLimit: RATE_LIMITS.write },
  );
}

// Declared here to keep the review contract next to the route that uses it.
import { z } from "zod";

const reviewDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES", "SUSPEND"]),
    reasonCode: z.string().min(2).max(60).optional(),
    notes: z.string().max(1_000).optional(),
  })
  .refine((value) => value.decision !== "REJECT" || Boolean(value.reasonCode), {
    message: "A rejection reason is required.",
    path: ["reasonCode"],
  });

const runStateSchema = z.object({
  state: z.enum(["RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]),
});

const bulkStateSchema = z.object({
  campaignIds: idListSchema,
  state: z.enum(["RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]),
});

function reviewAuditAction(decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "SUSPEND"): string {
  switch (decision) {
    case "APPROVE":
      return "CAMPAIGN_APPROVED";
    case "REJECT":
      return "CAMPAIGN_REJECTED";
    case "REQUEST_CHANGES":
      return "CAMPAIGN_CHANGES_REQUESTED";
    case "SUSPEND":
      return "CAMPAIGN_SUSPENDED";
    default:
      return "CAMPAIGN_UPDATED";
  }
}
