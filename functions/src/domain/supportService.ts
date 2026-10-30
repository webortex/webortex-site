/**
 * Support ticket service.
 *
 * A ticket is visible to exactly two parties: the user who raised it and staff
 * with the support permission. That check happens in this service rather than in
 * the route so there is a single place to audit, and so a future channel (email
 * intake, in-app chat) inherits the same rule.
 */

import {
  COLLECTIONS,
  newId,
  newReference,
  type SupportTicket,
} from "../../../packages/shared/src/index.js";
import { db, nowIso, type FirestorePatch } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";

function tickets() {
  return db().collection(COLLECTIONS.supportTickets);
}

const OPEN_STATUSES: readonly SupportTicket["status"][] = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER"];

export interface CreateTicketInput {
  readonly raisedBy: string;
  readonly raisedByRole: string;
  readonly category: SupportTicket["category"];
  readonly subject: string;
  readonly description: string;
  readonly priority?: SupportTicket["priority"];
  readonly relatedEntityType?: string | null;
  readonly relatedEntityId?: string | null;
}

export async function createTicket(input: CreateTicketInput): Promise<SupportTicket> {
  const id = newId("TKT");
  const now = nowIso();
  const document = {
    id,
    code: newReference("TKT"),
    raisedBy: input.raisedBy,
    raisedByRole: input.raisedByRole,
    category: input.category,
    subject: input.subject.trim().slice(0, 160),
    description: input.description.trim().slice(0, 4000),
    priority: input.priority ?? "MEDIUM",
    status: "OPEN" as SupportTicket["status"],
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    messages: [
      {
        id: newId("TKT"),
        authorId: input.raisedBy,
        body: input.description.trim().slice(0, 4000),
        isStaff: false,
        createdAt: now,
      },
    ],
    assignedTo: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await tickets().doc(id).set(document);
  const snapshot = await tickets().doc(id).get();
  return snapshot.data() as SupportTicket;
}

export async function getTicket(ticketId: string): Promise<SupportTicket> {
  const snapshot = await tickets().doc(ticketId).get();
  if (!snapshot.exists) throw ApiError.notFound("Ticket not found.");
  return snapshot.data() as SupportTicket;
}

/** Throws unless the principal owns the ticket or is staff. */
export function assertCanView(ticket: SupportTicket, principal: { userId: string; isStaff: boolean }): void {
  if (principal.isStaff) return;
  if (ticket.raisedBy !== principal.userId) {
    throw ApiError.forbidden("You can only view your own tickets.");
  }
}

export interface ListTicketsOptions {
  readonly status?: SupportTicket["status"] | "ALL";
  readonly category?: SupportTicket["category"] | "ALL";
  readonly raisedBy?: string;
  readonly assignedTo?: string;
  readonly limit?: number;
  readonly page?: number;
}

export async function listTickets(options: ListTicketsOptions): Promise<{
  items: SupportTicket[];
  total: number;
}> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);
  const firestore = db();

  // Firestore needs an equality clause before ordering, so the query is anchored
  // on whichever single filter is present; the rest are applied in memory.
  let query = tickets().orderBy("createdAt", "desc").limit(250);
  if (options.raisedBy) query = query.where("raisedBy", "==", options.raisedBy);
  else if (options.assignedTo) query = query.where("assignedTo", "==", options.assignedTo);
  else if (options.status && options.status !== "ALL") query = query.where("status", "==", options.status);

  const snapshot = await query.get();
  let items = snapshot.docs.map((doc) => doc.data() as SupportTicket);
  if (!options.raisedBy && options.status && options.status !== "ALL") {
    items = items.filter((ticket) => ticket.status === options.status);
  }
  if (!options.raisedBy && !options.assignedTo && options.category && options.category !== "ALL") {
    items = items.filter((ticket) => ticket.category === options.category);
  }

  return {
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
  };
}

export async function addMessage(
  ticketId: string,
  input: { authorId: string; body: string; isStaff: boolean },
): Promise<SupportTicket> {
  const ref = tickets().doc(ticketId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw ApiError.notFound("Ticket not found.");
  const ticket = snapshot.data() as SupportTicket;

  if (ticket.status === "CLOSED") {
    throw ApiError.conflict("This ticket is closed. Raise a new ticket to continue.");
  }

  const now = nowIso();
  const message = {
    id: newId("TKT"),
    authorId: input.authorId,
    body: input.body.trim().slice(0, 4000),
    isStaff: input.isStaff,
    createdAt: now,
  };

  const patch: FirestorePatch = {
    messages: [...(ticket.messages ?? []), message],
    updatedAt: now,
    // A user replying to a staff-handled ticket puts it back in their court, and
    // a staff reply reopens it. The status change is derived, never client-set.
    status: input.isStaff ? (ticket.status === "WAITING_FOR_USER" ? "IN_PROGRESS" : ticket.status) : "OPEN",
  };
  await ref.update(patch);

  const updated = await ref.get();
  return updated.data() as SupportTicket;
}

export async function setTicketStatus(
  ticketId: string,
  target: SupportTicket["status"],
  actorId: string,
): Promise<SupportTicket> {
  const ref = tickets().doc(ticketId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw ApiError.notFound("Ticket not found.");
  const ticket = snapshot.data() as SupportTicket;

  if (target === "CLOSED" && !OPEN_STATUSES.includes(ticket.status)) {
    throw ApiError.conflict(`A ticket in "${ticket.status}" cannot be closed.`);
  }
  if (ticket.status === "CLOSED") {
    throw ApiError.conflict("This ticket is closed and can no longer change state.");
  }

  const now = nowIso();
  const patch: FirestorePatch = {
    status: target,
    updatedAt: now,
    resolvedAt: target === "RESOLVED" || target === "CLOSED" ? now : ticket.resolvedAt ?? null,
  };
  await ref.update(patch);
  void actorId;

  const updated = await ref.get();
  return updated.data() as SupportTicket;
}

export async function assignTicket(ticketId: string, assigneeId: string | null): Promise<SupportTicket> {
  const ref = tickets().doc(ticketId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) throw ApiError.notFound("Ticket not found.");
  const patch: FirestorePatch = {
    assignedTo: assigneeId,
    // Unassigning must not silently reopen a resolved thread, so the status is
    // only promoted when a human actually takes ownership.
    status: assigneeId ? "IN_PROGRESS" : data.status,
    updatedAt: nowIso(),
  };
  await ref.update(patch);
  const updated = await ref.get();
  return updated.data() as SupportTicket;
}
