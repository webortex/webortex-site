/**
 * Ad decision engine + frequency control.
 *
 * Pure, deterministic, allocation-light. The delivery tier calls
 * `decideNextCreative` for every slot; everything it needs is passed in as a
 * pre-fetched candidate list so no I/O happens inside this module and the same
 * function can be unit-tested and replayed against historical inventory.
 *
 * Two properties the engine guarantees:
 *  1. Fairness - no single advertiser can monopolise a screen's inventory.
 *  2. Explainability - every winner carries the breakdown of why it won.
 */

import type { FrequencyCaps } from "./settings";
import { evaluateTargeting, type TargetingContext, type TargetingRules } from "./targeting";

export interface FrequencyState {
  readonly playsLastHour: number;
  readonly playsLastDay: number;
  /** Epoch ms of the most recent play of this creative, or null if never played. */
  readonly lastPlayedAtMs: number | null;
  /** Plays of this advertiser across the whole network in the current day. */
  readonly advertiserPlaysLastDay: number;
  /** Total plays delivered by this screen today. */
  readonly screenPlaysLastDay: number;
}

export const EMPTY_FREQUENCY_STATE: FrequencyState = {
  playsLastHour: 0,
  playsLastDay: 0,
  lastPlayedAtMs: null,
  advertiserPlaysLastDay: 0,
  screenPlaysLastDay: 0,
};

export interface Candidate {
  readonly campaignId: string;
  readonly creativeId: string;
  readonly advertiserId: string;
  readonly priority: number;
  readonly targeting: TargetingRules;
  readonly caps: FrequencyCaps;
  readonly state: FrequencyState;
  /** Remaining budget in minor units; null means unlimited (package campaigns). */
  readonly remainingBudgetMinor: number | null;
  readonly dailyBudgetMinor: number | null;
  readonly spentTodayMinor: number;
  readonly creativeDurationSeconds: number;
  readonly creativeType: "IMAGE" | "VIDEO" | "GIF";
  /** 0..1 quality signal from the creative's own completion history. */
  readonly completionRate: number | null;
  readonly engagementRate: number | null;
}

export interface SlotContext extends TargetingContext {
  readonly now: Date;
  readonly screenId: string;
  readonly totalSlotsDeliveredToday: number;
}

export interface FrequencyVerdict {
  readonly allowed: boolean;
  readonly violations: readonly string[];
}

export function checkFrequency(
  candidate: Candidate,
  caps: FrequencyCaps,
  nowMs: number,
): FrequencyVerdict {
  const violations: string[] = [];

  if (candidate.state.playsLastHour >= caps.maxPlaysPerHour) {
    violations.push(`Hourly cap reached (${candidate.state.playsLastHour}/${caps.maxPlaysPerHour}).`);
  }
  if (candidate.state.playsLastDay >= caps.maxPlaysPerDay) {
    violations.push(`Daily cap reached (${candidate.state.playsLastDay}/${caps.maxPlaysPerDay}).`);
  }
  if (caps.minimumGapSeconds > 0 && candidate.state.lastPlayedAtMs !== null) {
    const elapsedSeconds = (nowMs - candidate.state.lastPlayedAtMs) / 1000;
    if (elapsedSeconds < caps.minimumGapSeconds) {
      violations.push(`Minimum gap not met (${elapsedSeconds.toFixed(0)}s of ${caps.minimumGapSeconds}s).`);
    }
  }
  return { allowed: violations.length === 0, violations };
}

/**
 * Anti-monopolisation guard.
 *
 * `maxAdvertiserInventoryShare` caps how much of one screen's daily slots any
 * single advertiser may take. When the share would be exceeded the candidate is
 * excluded rather than merely deprioritised, which is what actually stops a
 * high-budget advertiser from crowding out everyone else.
 */
export function checkInventoryShare(
  candidate: Candidate,
  context: SlotContext,
  maxAdvertiserShare: number,
): FrequencyVerdict {
  if (maxAdvertiserShare >= 1) return { allowed: true, violations: [] };
  if (context.totalSlotsDeliveredToday <= 0) return { allowed: true, violations: [] };
  const share = candidate.state.advertiserPlaysLastDay / context.totalSlotsDeliveredToday;
  // 1 slot of tolerance so the first delivery of a day can never be blocked.
  const isFirstSlot = context.totalSlotsDeliveredToday <= 1;
  if (!isFirstSlot && share >= maxAdvertiserShare) {
    return {
      allowed: false,
      violations: [
        `Advertiser already holds ${(share * 100).toFixed(1)}% of today's inventory on this screen (cap ${(maxAdvertiserShare * 100).toFixed(0)}%).`,
      ],
    };
  }
  return { allowed: true, violations: [] };
}

export interface DecisionFactor {
  readonly label: string;
  readonly points: number;
}

export interface DecisionCandidateResult {
  readonly candidate: Candidate;
  readonly eligible: boolean;
  readonly score: number;
  readonly factors: readonly DecisionFactor[];
  readonly rejections: readonly string[];
}

export interface DecisionResult {
  readonly winner: DecisionCandidateResult | null;
  readonly considered: readonly DecisionCandidateResult[];
  /** True when there were eligible candidates but none won - signals underfill. */
  readonly inventoryShortfall: boolean;
}

const WEIGHTS = {
  priority: 2.2,
  targeting: 1.0,
  completion: 12,
  engagement: 18,
  freshness: 8,
  budgetPressure: 10,
  pacing: 14,
} as const;

/**
 * Choose the creative for the next slot.
 *
 * Fair-share rotation: after scoring, the engine adds a deterministic rotation
 * bonus derived from how much of the screen's inventory the advertiser has
 * already taken. This means a lower-value campaign still gets airtime, which is
 * what keeps a small advertiser from being permanently starved by a large one.
 */
export function decideNextCreative(
  candidates: readonly Candidate[],
  context: SlotContext,
  options: { defaultCaps: FrequencyCaps; maxAdvertiserShare: number },
): DecisionResult {
  const nowMs = context.now.getTime();
  const evaluated: DecisionCandidateResult[] = [];

  for (const candidate of candidates) {
    const rejections: string[] = [];

    if (candidate.remainingBudgetMinor !== null && candidate.remainingBudgetMinor <= 0) {
      rejections.push("Campaign budget exhausted.");
    }
    if (
      candidate.dailyBudgetMinor !== null &&
      candidate.spentTodayMinor >= candidate.dailyBudgetMinor
    ) {
      rejections.push("Daily budget exhausted.");
    }

    const targetingResult = evaluateTargeting(candidate.targeting, context);
    if (!targetingResult.matched) {
      const failed = targetingResult.outcomes
        .filter((outcome) => outcome.applicable && !outcome.passed)
        .map((outcome) => outcome.label);
      if (failed.length) rejections.push(`Targeting mismatch: ${failed.join(", ")}.`);
    }

    const frequency = checkFrequency(candidate, candidate.caps, nowMs);
    rejections.push(...frequency.violations);

    const share = checkInventoryShare(candidate, context, options.maxAdvertiserShare);
    rejections.push(...share.violations);

    const factors: DecisionFactor[] = [];
    if (rejections.length === 0) {
      factors.push({ label: "Campaign priority", points: candidate.priority * WEIGHTS.priority });
      factors.push({ label: "Targeting specificity", points: targetingResult.score * WEIGHTS.targeting });
      if (candidate.completionRate !== null) {
        factors.push({ label: "Completion rate", points: candidate.completionRate * WEIGHTS.completion });
      }
      if (candidate.engagementRate !== null) {
        factors.push({ label: "Engagement rate", points: candidate.engagementRate * WEIGHTS.engagement });
      }
      factors.push({ label: "Rotation fairness", points: rotationBonus(candidate, context) });

      if (candidate.dailyBudgetMinor && candidate.dailyBudgetMinor > 0) {
        const consumed = candidate.spentTodayMinor / candidate.dailyBudgetMinor;
        // Urgency: a campaign that must spend today scores higher.
        factors.push({ label: "Delivery pacing", points: (1 - consumed) * WEIGHTS.pacing });
      }

      // Prefer shorter creative when inventory is tight so more distinct ads fit.
      factors.push({ label: "Slot efficiency", points: slotEfficiency(candidate, context) });
    }

    evaluated.push({
      candidate,
      eligible: rejections.length === 0,
      score: factors.reduce((total, factor) => total + factor.points, 0),
      factors,
      rejections,
    });
  }

  const eligible = evaluated.filter((entry) => entry.eligible);
  if (eligible.length === 0) {
    return { winner: null, considered: evaluated, inventoryShortfall: evaluated.length > 0 };
  }

  // Stable tie-break on creativeId so replays of the same slot state produce the
  // same decision. Without this, two screens in identical state could diverge.
  eligible.sort((a, b) => b.score - a.score || a.candidate.creativeId.localeCompare(b.candidate.creativeId));

  return { winner: eligible[0], considered: evaluated, inventoryShortfall: false };
}

function rotationBonus(candidate: Candidate, context: SlotContext): number {
  if (context.totalSlotsDeliveredToday <= 0) return WEIGHTS.freshness;
  const share = candidate.state.advertiserPlaysLastDay / context.totalSlotsDeliveredToday;
  // Under-represented advertisers get up to +freshness; over-represented get less.
  return Math.max(0, (1 - share) * WEIGHTS.freshness);
}

function slotEfficiency(candidate: Candidate, context: SlotContext): number {
  // Longer creative occupies more of a fixed slot; a mild efficiency term that
  // never dominates the priority/quality signals.
  const seconds = Math.max(1, candidate.creativeDurationSeconds);
  return Math.max(0, 5 - seconds / 10);
}

/**
 * Build a playlist for offline sync.
 *
 * The player downloads a window of upcoming slots so it can keep playing when the
 * network drops. The ordering is the same score the online decision engine
 * produces, with the frequency state simulated forward so the offline playlist
 * does not violate caps the online engine would have enforced.
 */
export function buildPlaylist(
  candidates: readonly Candidate[],
  context: SlotContext,
  options: { defaultCaps: FrequencyCaps; maxAdvertiserShare: number; length: number },
): readonly { creativeId: string; campaignId: string; advertiserId: string; sequence: number }[] {
  const playlist: { creativeId: string; campaignId: string; advertiserId: string; sequence: number }[] = [];
  // Deep clone the mutable slices we advance; the inputs are treated as read-only.
  const simulated: Candidate[] = candidates.map((candidate) => ({
    ...candidate,
    state: { ...candidate.state },
  }));

  for (let i = 0; i < options.length; i += 1) {
    const advancedContext: SlotContext = {
      ...context,
      now: new Date(context.now.getTime() + i * 60_000),
      totalSlotsDeliveredToday: context.totalSlotsDeliveredToday + i,
    };
    const result = decideNextCreative(simulated, advancedContext, options);
    if (!result.winner) break;
    const winner = result.winner.candidate;
    playlist.push({
      creativeId: winner.creativeId,
      campaignId: winner.campaignId,
      advertiserId: winner.advertiserId,
      sequence: i,
    });
    const slotIndexInPlan = simulated.findIndex((entry) => entry.creativeId === winner.creativeId);
    const slot = slotIndexInPlan >= 0 ? simulated[slotIndexInPlan] : undefined;
    if (slot) {
      // Replace rather than mutate: `Candidate.state` is readonly by design so a
      // caller cannot corrupt a shared inventory snapshot mid-decision.
      simulated[slotIndexInPlan] = {
        ...slot,
        state: {
          ...slot.state,
          playsLastHour: slot.state.playsLastHour + 1,
          playsLastDay: slot.state.playsLastDay + 1,
          advertiserPlaysLastDay: slot.state.advertiserPlaysLastDay + 1,
          screenPlaysLastDay: slot.state.screenPlaysLastDay + 1,
          lastPlayedAtMs: advancedContext.now.getTime(),
        },
      };
    }
  }
  return playlist;
}

export interface ScheduleConflict {
  readonly screenId: string;
  readonly date: string;
  readonly requestedSlots: number;
  readonly availableSlots: number;
  readonly reason: string;
}

/** Detect oversubscription before an admin saves a campaign schedule. */
export function detectInventoryConflicts(
  requests: readonly { screenId: string; date: string; requestedSlots: number; availableSlots: number }[],
  settings: { maxAdvertiserInventoryShare: number },
): readonly ScheduleConflict[] {
  const grouped = new Map<string, { requested: number; available: number }>();
  for (const request of requests) {
    const key = `${request.screenId}|${request.date}`;
    const existing = grouped.get(key) ?? { requested: 0, available: request.availableSlots };
    grouped.set(key, {
      requested: existing.requested + request.requestedSlots,
      available: Math.min(existing.available, request.availableSlots),
    });
  }
  const conflicts: ScheduleConflict[] = [];
  for (const [key, value] of grouped) {
    const [screenId, date] = key.split("|");
    if (value.requested > value.available) {
      conflicts.push({
        screenId,
        date,
        requestedSlots: value.requested,
        availableSlots: value.available,
        reason: `${value.requested} slots requested but only ${value.available} available on ${date}.`,
      });
    }
  }
  return conflicts;
}

/** Cap per-advertiser share of any single day's network inventory. */
export function advertiserDailyShareCeiling(
  networkSlotsPerDay: number,
  maxAdvertiserShare: number,
): number {
  return Math.floor(networkSlotsPerDay * maxAdvertiserShare);
}