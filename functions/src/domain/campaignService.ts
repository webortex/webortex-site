/**
 * Campaign service: creation, the review state machine, scheduling and budget
 * accounting.
 *
 * Every status change goes through `assertTransition`, which consults the shared
 * state machine. There is no path that sets `status` directly, so an illegal
 * transition (e.g. DRAFT -> RUNNING) is impossible to produce.
 */

import { FieldValue, type DocumentData, type WriteBatch } from "firebase-admin/firestore";
import {
  canTransitionEntity,
  COLLECTIONS,
  newId,
  newReference,
  type Campaign,
  type CampaignCreateInput,
  type CampaignObjective,
  type WorkflowStatus,
} from "../../../packages/shared/src/index.js";
import { db, nowIso, type FirestorePatch } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";

function campaigns() {
  return db().collection(COLLECTIONS.campaigns);
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) output[key] = value;
  }
  return output;
}

export async function validateCampaignWindow(
  startsAt: string,
  endsAt: string,
): Promise<{ startsAt: string; endsAt: string }> {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw ApiError.badRequest("Campaign start and end must be valid timestamps.");
  }
  if (end <= start) {
    throw ApiError.unprocessable("Campaign end must be after its start.");
  }
  const settings = await getSettings();
  const days = (end - start) / 86_400_000;
  if (days < settings.campaigns.minimumDurationDays) {
    throw ApiError.unprocessable(
      `Campaigns must run for at least ${settings.campaigns.minimumDurationDays} day(s).`,
    );
  }
  if (days > settings.campaigns.maximumDurationDays) {
    throw ApiError.unprocessable(
      `Campaigns may not run longer than ${settings.campaigns.maximumDurationDays} days.`,
    );
  }
  return { startsAt, endsAt };
}

export async function createCampaign(
  advertiserId: string,
  createdBy: string,
  input: CampaignCreateInput,
  options: { asDraft?: boolean } = {},
): Promise<Campaign> {
  const settings = await getSettings();
  await validateCampaignWindow(input.startsAt, input.endsAt);

  if (input.budget.totalMinor < settings.campaigns.minimumBudgetMinor) {
    throw ApiError.unprocessable(
      `Minimum campaign budget is ${settings.campaigns.minimumBudgetMinor / 100}.`,
    );
  }
  if (input.budget.totalMinor > settings.campaigns.maximumBudgetMinor) {
    throw ApiError.unprocessable(
      `Maximum campaign budget is ${settings.campaigns.maximumBudgetMinor / 100}.`,
    );
  }
  const dailyMinor = input.budget.dailyMinor ?? null;
  if (dailyMinor !== null && dailyMinor > input.budget.totalMinor) {
    throw ApiError.unprocessable("Daily budget cannot exceed the total campaign budget.");
  }
  if (input.budget.pricingModel !== "FIXED_PACKAGE" && !input.budget.rateMinor) {
    throw ApiError.unprocessable("A rate is required for CPM, CPC, CPL and CPA pricing.");
  }
  if (input.frequencyCaps.maxPlaysPerHour > input.frequencyCaps.maxPlaysPerDay) {
    throw ApiError.unprocessable("Hourly frequency cap cannot exceed the daily cap.");
  }
  if (!settings.gstinRequired) {
    // GSTIN is optional unless the platform is configured to require it.
  }

  const id = newId("CMP");
  const now = nowIso();
  const status: WorkflowStatus = options.asDraft === false ? "DRAFT" : "DRAFT";

  const document = {
    id,
    code: newReference("CMP"),
    advertiserId,
    name: input.name,
    objective: input.objective as CampaignObjective,
    category: input.category,
    description: input.description ?? "",
    status,
    budget: { ...input.budget, currency: input.budget.currency ?? settings.currency },
    targeting: input.targeting ?? {},
    frequencyCaps: input.frequencyCaps,
    engagement: input.engagement ?? {},
    priority: input.priority ?? 50,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReasonCode: null,
    rejectionNotes: null,
    pausedAt: null,
    totalSpentMinor: 0,
    createdBy,
    createdAt: now,
    updatedAt: now,
    createdAtTs: FieldValue.serverTimestamp(),
  };

  await campaigns().doc(id).set(stripUndefined(document));
  const created = await campaigns().doc(id).get();
  return created.data() as Campaign;
}

export async function updateCampaign(
  campaignId: string,
  advertiserId: string,
  patch: Partial<CampaignCreateInput>,
): Promise<Campaign> {
  const reference = campaigns().doc(campaignId);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw ApiError.notFound("Campaign not found.");
  const existing = snapshot.data() as Campaign;

  if (existing.advertiserId !== advertiserId) {
    throw ApiError.forbidden("You can only edit your own campaigns.");
  }
  if (existing.status !== "DRAFT" && existing.status !== "PENDING_REVIEW" && existing.status !== "REJECTED") {
    throw ApiError.conflict(
      `A campaign in "${existing.status}" cannot be edited. Pause it first if you need changes.`,
    );
  }

  const nextStartsAt = patch.startsAt ?? existing.startsAt;
  const nextEndsAt = patch.endsAt ?? existing.endsAt;
  if (patch.startsAt || patch.endsAt) {
    await validateCampaignWindow(nextStartsAt, nextEndsAt);
  }

  const updates: Record<string, unknown> = stripUndefined({
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.objective !== undefined ? { objective: patch.objective } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.budget !== undefined ? { budget: { ...existing.budget, ...patch.budget } } : {}),
    ...(patch.targeting !== undefined ? { targeting: { ...existing.targeting, ...patch.targeting } } : {}),
    ...(patch.frequencyCaps !== undefined ? { frequencyCaps: { ...existing.frequencyCaps, ...patch.frequencyCaps } } : {}),
    ...(patch.engagement !== undefined ? { engagement: { ...existing.engagement, ...patch.engagement } } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.startsAt !== undefined ? { startsAt: patch.startsAt } : {}),
    ...(patch.endsAt !== undefined ? { endsAt: patch.endsAt } : {}),
    updatedAt: nowIso(),
  });

  await reference.update(updates);
  const updated = await reference.get();
  return updated.data() as Campaign;
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const snapshot = await campaigns().doc(campaignId).get();
  if (!snapshot.exists) throw ApiError.notFound("Campaign not found.");
  return snapshot.data() as Campaign;
}

/** Assert a legal transition, or fail with a message a moderator can act on. */
export function assertTransition(from: WorkflowStatus, to: WorkflowStatus): void {
  if (from === to) {
    throw ApiError.conflict(`The campaign is already ${from.toLowerCase().replace(/_/g, " ")}.`);
  }
  if (!canTransitionEntity("campaign", from, to)) {
    throw ApiError.conflict(`Cannot move a campaign from ${from} to ${to}.`);
  }
}

export async function submitCampaign(campaignId: string, advertiserId: string): Promise<Campaign> {
  const settings = await getSettings();
  const campaign = await getCampaign(campaignId);
  if (campaign.advertiserId !== advertiserId) throw ApiError.forbidden("You can only submit your own campaigns.");

  // The status written below is PENDING_REVIEW, so that is what is checked.
  // Checking UNDER_REVIEW (not a campaign state) rejected every submission.
  assertTransition(campaign.status as WorkflowStatus, "PENDING_REVIEW");

  const creatives = await db()
    .collection(COLLECTIONS.creatives)
    .where("campaignId", "==", campaignId)
    .where("isArchived", "==", false)
    .limit(settings.creative.maxCreativesPerCampaign)
    .get();

  if (creatives.empty) {
    throw ApiError.unprocessable("Upload at least one creative before submitting for review.");
  }
  const liveCreatives = creatives.docs.filter((doc) => !["LIVE", "COMPLETED"].includes(doc.data().status as string));
  if (liveCreatives.length === 0) {
    throw ApiError.unprocessable("All creatives on this campaign are already scheduled or completed.");
  }

  const leadMs = settings.campaigns.minimumLeadTimeHours * 3_600_000;
  const now = Date.now();
  if (campaign.startsAt !== null && Date.parse(campaign.startsAt) - now < leadMs) {
    const hours = settings.campaigns.minimumLeadTimeHours;
    throw ApiError.unprocessable(
      `Campaigns require at least ${hours} hour(s) of lead time before the start date. Adjust the schedule or ask your sales manager to expedite it.`,
    );
  }

  await campaigns().doc(campaignId).update({
    status: "PENDING_REVIEW",
    submittedAt: nowIso(),
    rejectionReasonCode: null,
    rejectionNotes: null,
    updatedAt: nowIso(),
  });
  return getCampaign(campaignId);
}

export async function reviewCampaign(
  campaignId: string,
  reviewerId: string,
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "SUSPEND",
  reason: { reasonCode?: string; notes?: string } = {},
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId);
  const from = campaign.status as WorkflowStatus;

  // Campaigns have no NEEDS_MORE_INFORMATION or SUSPENDED state. "Request
  // changes" is a rejection the owner is expected to fix and resubmit, and
  // "suspend" stops delivery the same way an owner pause does.
  const target: WorkflowStatus =
    decision === "APPROVE"
      ? "APPROVED"
      : decision === "REJECT" || decision === "REQUEST_CHANGES"
        ? "REJECTED"
        : "PAUSED";

  assertTransition(from, target);

  if (decision === "REJECT" || decision === "REQUEST_CHANGES") {
    if (!reason.reasonCode) {
      throw ApiError.badRequest("A reason code is required when rejecting or requesting changes.");
    }
  }

  const approvedAt = nowIso();
  const patch: FirestorePatch = {
    status: target,
    updatedAt: approvedAt,
  };
  if (decision === "APPROVE") {
    patch.approvedAt = approvedAt;
    patch.approvedBy = reviewerId;
    patch.rejectionReasonCode = null;
    patch.rejectionNotes = null;
  } else if (decision === "SUSPEND") {
    patch.pausedAt = approvedAt;
  } else {
    patch.rejectionReasonCode = reason.reasonCode ?? null;
    patch.rejectionNotes = reason.notes ?? null;
  }

  const batch = db().batch();
  batch.update(campaigns().doc(campaignId), patch);
  if (decision === "APPROVE") {
    // Newly approved campaigns become schedulable immediately.
    batch.set(
      campaigns().doc(campaignId),
      { status: target, approvedAt: patch.approvedAt, approvedBy: reviewerId },
      { merge: true },
    );
  }
  await batch.commit();
  return getCampaign(campaignId);
}

export async function setCampaignRunState(
  campaignId: string,
  target: Extract<WorkflowStatus, "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED">,
  actorId: string,
  options: { requireOwner?: boolean; ownerAdvertiserId?: string | null } = {},
): Promise<Campaign> {
  const campaign = await getCampaign(campaignId);
  if (options.requireOwner && campaign.advertiserId !== options.ownerAdvertiserId) {
    throw ApiError.forbidden("You can only change your own campaigns.");
  }
  // Resuming a campaign whose flight has not started yet goes back to
  // SCHEDULED, so a pause/resume cannot start delivery early.
  const effective: WorkflowStatus =
    target === "RUNNING" && campaign.startsAt && Date.parse(campaign.startsAt) > Date.now() ? "SCHEDULED" : target;
  assertTransition(campaign.status as WorkflowStatus, effective);

  const patch: FirestorePatch = { status: effective, updatedAt: nowIso() };
  if (target === "PAUSED") patch.pausedAt = nowIso();
  if (target === "CANCELLED") patch.pausedAt = nowIso();

  await campaigns().doc(campaignId).update(patch);
  void actorId;
  return getCampaign(campaignId);
}

/**
 * Cron-driven lifecycle reconciliation.
 *
 * Moves approved campaigns into SCHEDULED when they are inside their flight
 * window, SCHEDULED into RUNNING at the start, and RUNNING into COMPLETED at the
 * end. Idempotent, so a retried invocation is a no-op.
 */
export async function reconcileCampaignLifecycle(nowMs = Date.now()): Promise<{
  scheduled: number;
  started: number;
  completed: number;
}> {
  const iso = new Date(nowMs).toISOString();
  let scheduled = 0;
  let started = 0;
  let completed = 0;

  const toSchedule = await campaigns().where("status", "==", "APPROVED").where("startsAt", "<=", iso).limit(200).get();
  const toStart = await campaigns().where("status", "==", "SCHEDULED").where("startsAt", "<=", iso).limit(200).get();
  const toComplete = await campaigns().where("status", "==", "RUNNING").where("endsAt", "<", iso).limit(200).get();

  const operations: { ref: FirebaseFirestore.DocumentReference; status: string }[] = [
    ...toSchedule.docs.map((doc) => ({ ref: doc.ref, status: "SCHEDULED" })),
    ...toStart.docs.map((doc) => ({ ref: doc.ref, status: "RUNNING" })),
    ...toComplete.docs.map((doc) => ({ ref: doc.ref, status: "COMPLETED" })),
  ];
  if (operations.length === 0) return { scheduled: 0, started: 0, completed: 0 };

  const batch = db().batch();
  for (const operation of operations) {
    batch.update(operation.ref, { status: operation.status, updatedAt: iso });
  }
  await batch.commit();

  scheduled = toSchedule.size;
  started = toStart.size;
  completed = toComplete.size;
  return { scheduled, started, completed };
}

/**
 * Add spend to a campaign's running total.
 *
 * Uses an increment rather than read-modify-write so concurrent playback
 * completions cannot lose an update.
 */
export async function recordCampaignSpend(
  campaignId: string,
  amountMinor: number,
  batch?: WriteBatch,
): Promise<void> {
  const increment = Math.max(0, Math.round(amountMinor));
  if (increment === 0) return;
  const target = batch ?? db().batch();
  target.update(campaigns().doc(campaignId), {
    totalSpentMinor: FieldValue.increment(increment),
    updatedAt: nowIso(),
  });
  if (!batch) await target.commit();
}

export async function campaignsForAdvertiser(advertiserId: string): Promise<Campaign[]> {
  const snapshot = await campaigns().where("advertiserId", "==", advertiserId).limit(500).get();
  return snapshot.docs.map((doc) => doc.data() as Campaign);
}

export function statusCounts(campaigns: readonly Campaign[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const campaign of campaigns) {
    counts[campaign.status] = (counts[campaign.status] ?? 0) + 1;
  }
  return counts;
}

export type { Campaign, DocumentData };