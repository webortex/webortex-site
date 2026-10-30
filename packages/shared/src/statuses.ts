/**
 * Entity state machines.
 *
 * Workflow states are modelled explicitly rather than as booleans so that an
 * approval, a suspension and a rejection are distinguishable, auditable and
 * reversible. Every transition in the API tier goes through `canTransition`,
 * which is the single place the graph is defined.
 */

export type WorkflowStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_MORE_INFORMATION"
  | "SUSPENDED"
  | "DRAFT"
  | "SUBMITTED"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "VERIFIED"
  | "ACTIVE"
  | "MAINTENANCE"
  | "RETIRED"
  | "UNASSIGNED"
  | "ASSIGNED"
  | "ONLINE"
  | "OFFLINE"
  | "DEGRADED"
  | "DECOMMISSIONED"
  | "RUNNING"
  | "PENDING_REVIEW"
  | "EXPIRED";

/** Which terminal-ish family a status belongs to, used for badge tone mapping. */
export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";

const GRAPHS: Record<string, readonly WorkflowStatus[]> = {
  advertiser: [
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "NEEDS_MORE_INFORMATION",
    "SUSPENDED",
    "REJECTED",
  ],
  driver: ["PENDING", "UNDER_REVIEW", "APPROVED", "NEEDS_MORE_INFORMATION", "SUSPENDED", "REJECTED"],
  creative: [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "SCHEDULED",
    "LIVE",
    "PAUSED",
    "COMPLETED",
    "REJECTED",
  ],
  campaign: [
    "DRAFT",
    "PENDING_REVIEW",
    "APPROVED",
    "SCHEDULED",
    "RUNNING",
    "PAUSED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ],
  vehicle: ["PENDING", "VERIFIED", "ACTIVE", "MAINTENANCE", "SUSPENDED", "RETIRED"],
  device: [
    "UNASSIGNED",
    "ASSIGNED",
    "ONLINE",
    "OFFLINE",
    "DEGRADED",
    "MAINTENANCE",
    "DECOMMISSIONED",
  ],
  screen: ["UNASSIGNED", "ASSIGNED", "ONLINE", "OFFLINE", "MAINTENANCE", "DECOMMISSIONED"],
  document: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"],
};

type GraphKey = keyof typeof GRAPHS;

/**
 * Legacy aliases kept for documents written before a state was renamed. Unknown
 * values are passed through rather than coerced, so a new status added to a
 * client is never silently reported as an old one.
 */
const STATUS_ALIASES: Readonly<Record<string, WorkflowStatus>> = {
  ACTIVE_CAMPAIGN: "RUNNING",
  ARCHIVED: "COMPLETED",
  PENDING_APPROVAL: "PENDING_REVIEW",
};

export function normaliseStatus(status: string): WorkflowStatus {
  return (STATUS_ALIASES[status] ?? status) as WorkflowStatus;
}

export function statusesFor(entity: GraphKey): readonly WorkflowStatus[] {
  return GRAPHS[entity];
}

/**
 * Allowed transitions. Terminal states (COMPLETED, CANCELLED, RETIRED,
 * DECOMMISSIONED, REJECTED) have no outbound edges unless explicitly listed,
 * because reopening a closed commercial record must be a deliberate admin act.
 */
const TRANSITIONS: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION", "CANCELLED"],
  PENDING_REVIEW: ["UNDER_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION", "CANCELLED", "DRAFT"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION", "SUSPENDED", "PAUSED"],
  APPROVED: ["SUSPENDED", "ACTIVE", "SCHEDULED", "REJECTED", "COMPLETED"],
  NEEDS_MORE_INFORMATION: ["UNDER_REVIEW", "REJECTED", "SUSPENDED"],
  REJECTED: [],
  SUSPENDED: ["UNDER_REVIEW", "ACTIVE", "RETIRED", "REJECTED"],
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "DRAFT", "REJECTED"],
  SCHEDULED: ["LIVE", "RUNNING", "PAUSED", "CANCELLED", "COMPLETED"],
  LIVE: ["PAUSED", "COMPLETED", "SUSPENDED", "CANCELLED"],
  PAUSED: ["LIVE", "RUNNING", "SCHEDULED", "CANCELLED", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  VERIFIED: ["ACTIVE", "MAINTENANCE", "SUSPENDED", "RETIRED"],
  ACTIVE: ["MAINTENANCE", "SUSPENDED", "RETIRED", "PENDING"],
  MAINTENANCE: ["ACTIVE", "SUSPENDED", "RETIRED"],
  RETIRED: [],
  UNASSIGNED: ["ASSIGNED", "DECOMMISSIONED"],
  ASSIGNED: ["ONLINE", "OFFLINE", "DEGRADED", "MAINTENANCE", "UNASSIGNED", "DECOMMISSIONED"],
  ONLINE: ["OFFLINE", "DEGRADED", "MAINTENANCE", "UNASSIGNED", "DECOMMISSIONED"],
  OFFLINE: ["ONLINE", "DEGRADED", "MAINTENANCE", "UNASSIGNED", "DECOMMISSIONED"],
  DEGRADED: ["ONLINE", "OFFLINE", "MAINTENANCE", "DECOMMISSIONED"],
  DECOMMISSIONED: [],
  RUNNING: ["PAUSED", "COMPLETED", "LIVE", "CANCELLED"],
  EXPIRED: ["UNDER_REVIEW", "PENDING"],
};

/**
 * Campaign lifecycle. Campaigns have their own graph because the generic table
 * above models a different review vocabulary (SUBMITTED / UNDER_REVIEW /
 * NEEDS_MORE_INFORMATION) that is not part of `statusesFor("campaign")`. Using
 * the generic table made DRAFT -> review and REJECTED -> resubmit impossible.
 *
 *   DRAFT ──submit──> PENDING_REVIEW ──approve──> APPROVED ──(flight start)──> SCHEDULED ──> RUNNING ──> COMPLETED
 *     ^                  │  reject                                               pause/resume ⇅ PAUSED
 *     └── edit ── REJECTED <┘                                    any non-terminal ──cancel──> CANCELLED
 */
const CAMPAIGN_TRANSITIONS: Partial<Record<WorkflowStatus, readonly WorkflowStatus[]>> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED", "DRAFT", "CANCELLED"],
  REJECTED: ["PENDING_REVIEW", "CANCELLED"],
  APPROVED: ["SCHEDULED", "PAUSED", "CANCELLED", "COMPLETED"],
  SCHEDULED: ["RUNNING", "PAUSED", "CANCELLED", "COMPLETED"],
  RUNNING: ["PAUSED", "COMPLETED", "CANCELLED"],
  PAUSED: ["RUNNING", "SCHEDULED", "CANCELLED", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Creative lifecycle. A moderator may decide straight from SUBMITTED; picking
 * a creative up into UNDER_REVIEW first is optional. A rejected creative can be
 * resubmitted once its owner has fixed whatever the notes asked for.
 */
const CREATIVE_TRANSITIONS: Partial<Record<WorkflowStatus, readonly WorkflowStatus[]>> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "DRAFT"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "PAUSED"],
  APPROVED: ["SCHEDULED", "LIVE", "PAUSED", "REJECTED", "COMPLETED"],
  SCHEDULED: ["LIVE", "PAUSED", "COMPLETED"],
  LIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["APPROVED", "LIVE", "UNDER_REVIEW", "REJECTED", "COMPLETED"],
  REJECTED: ["SUBMITTED"],
  COMPLETED: [],
};

const ENTITY_TRANSITIONS: Partial<Record<string, Partial<Record<WorkflowStatus, readonly WorkflowStatus[]>>>> = {
  campaign: CAMPAIGN_TRANSITIONS,
  creative: CREATIVE_TRANSITIONS,
};

/**
 * Entity-aware transition check. Entities with their own graph use it; the
 * rest fall back to the generic table.
 */
export function canTransitionEntity(entity: "campaign" | "creative" | GraphKey, from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return false;
  const table = ENTITY_TRANSITIONS[entity];
  if (table) return (table[from] ?? []).includes(to);
  return canTransition(from, to);
}

export function allowedEntityTransitions(entity: "campaign" | "creative" | GraphKey, from: WorkflowStatus): readonly WorkflowStatus[] {
  const table = ENTITY_TRANSITIONS[entity];
  return table ? (table[from] ?? []) : allowedTransitions(from);
}

export function allowedTransitions(status: WorkflowStatus): readonly WorkflowStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}

export function isTerminal(status: WorkflowStatus): boolean {
  return allowedTransitions(status).length === 0;
}

const TONE_BY_STATUS: Record<string, StatusTone> = {
  PENDING: "warning",
  PENDING_REVIEW: "warning",
  UNDER_REVIEW: "info",
  NEEDS_MORE_INFORMATION: "warning",
  APPROVED: "success",
  VERIFIED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
  DRAFT: "neutral",
  SUBMITTED: "info",
  SCHEDULED: "info",
  RUNNING: "success",
  LIVE: "success",
  ACTIVE: "success",
  ONLINE: "success",
  PAUSED: "warning",
  COMPLETED: "neutral",
  CANCELLED: "neutral",
  OFFLINE: "danger",
  DEGRADED: "warning",
  MAINTENANCE: "warning",
  RETIRED: "neutral",
  UNASSIGNED: "neutral",
  ASSIGNED: "info",
  DECOMMISSIONED: "neutral",
  EXPIRED: "danger",
};

export function toneForStatus(status: string): StatusTone {
  return TONE_BY_STATUS[status] ?? "neutral";
}

const LABELS: Readonly<Record<string, string>> = {
  PENDING_REVIEW: "Pending review",
  NEEDS_MORE_INFORMATION: "Needs more information",
  UNDER_REVIEW: "Under review",
  UNASSIGNED: "Unassigned",
  DECOMMISSIONED: "Decommissioned",
};

export function labelForStatus(status: string): string {
  if (LABELS[status]) return LABELS[status];
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}