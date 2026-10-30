/**
 * Support ticket endpoints.
 *
 * A ticket is visible to the user who raised it and to staff. Non-staff callers
 * can only ever reach their own tickets: the `raisedBy` filter is derived from
 * the authenticated profile, never from the query string.
 */

import { z } from "zod";
import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { clampInt, first, parseJsonBody } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { isStaff, requirePermission, type AuthContext } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import {
  addMessage,
  assertCanView,
  assignTicket,
  createTicket,
  getTicket,
  listTickets,
  setTicketStatus,
} from "../domain/supportService.js";

const createTicketSchema = z.object({
  category: z.enum(["TECHNICAL", "CAMPAIGN", "VEHICLE", "DEVICE", "PAYOUT", "PAYMENT", "ADVERTISEMENT", "ACCOUNT"]),
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(5_000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  relatedEntityType: z
    .enum(["CAMPAIGN", "CREATIVE", "VEHICLE", "SCREEN", "DEVICE", "INVOICE", "PAYOUT", "PLAYBACK_EVENT", "CONVERSION"])
    .nullable()
    .default(null),
  relatedEntityId: z.string().trim().min(3).max(80).nullable().default(null),
});

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5_000),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]),
});

const assignSchema = z.object({
  assigneeId: z.string().trim().min(3).max(80).nullable(),
});

/**
 * Staff can triage the whole queue; everyone else sees only what they raised.
 * Returning `undefined` for `raisedBy` would leak the queue size, so the
 * non-staff branch always pins it.
 */
function visibilityFilter(user: AuthContext): { raisedBy?: string } {
  return isStaff(user) ? {} : { raisedBy: user.userId };
}

export function registerSupportRoutes(router: ApiRouter): void {
  router.get(
    "/support/tickets",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "support:read");
      const result = await listTickets({
        ...visibilityFilter(user),
        status: first(context.query.status) as never,
        category: first(context.query.category) as never,
        assignedTo: first(context.query.assignedTo),
        limit: clampInt(first(context.query.limit), 1, 100, 25),
        page: clampInt(first(context.query.page), 1, 10_000, 1),
      });
      return result;
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/support/tickets/:ticketId",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "support:read");
      const ticket = await getTicket(context.params.ticketId!);
      assertCanView(ticket, { userId: user.userId, isStaff: isStaff(user) });
      return ticket;
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/support/tickets",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "support:write");
      const input = parseJsonBody(createTicketSchema, context.body);
      const ticket = await createTicket({
        raisedBy: user.userId,
        raisedByRole: user.roles[0] ?? "ADVERTISER",
        category: input.category,
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
      });
      await recordAudit({
        action: "SUPPORT_TICKET_CREATED",
        entityType: "SUPPORT_TICKET",
        entityId: ticket.id,
        summary: `Support ticket raised: ${ticket.subject}`,
        metadata: { category: ticket.category, priority: ticket.priority },
        principal: user,
      });
      return ticket;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/support/tickets/:ticketId/messages",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "support:write");
      const input = parseJsonBody(messageSchema, context.body);
      const ticketId = context.params.ticketId!;
      // Checked before the write, not after: a reply must never be appended to
      // a ticket the caller cannot see.
      assertCanView(await getTicket(ticketId), { userId: user.userId, isStaff: isStaff(user) });
      return addMessage(ticketId, {
        authorId: user.userId,
        body: input.body,
        isStaff: isStaff(user),
      });
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/support/tickets/:ticketId/status",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "support:write");
      const input = parseJsonBody(statusSchema, context.body);
      const ticketId = context.params.ticketId!;
      const existing = await getTicket(ticketId);
      assertCanView(existing, { userId: user.userId, isStaff: isStaff(user) });

      // Only staff can move a ticket through the triage workflow. A customer
      // asking for a "CLOSED" ticket must not be able to close its own case
      // and remove it from the agent queue.
      if (!isStaff(user) && input.status !== "CLOSED") {
        throw ApiError.forbidden("Only support staff can change a ticket's status.");
      }
      const ticket = await setTicketStatus(ticketId, input.status, user.userId);
      await recordAudit({
        action: "SUPPORT_TICKET_STATUS_CHANGED",
        entityType: "SUPPORT_TICKET",
        entityId: ticket.id,
        summary: `Ticket moved to ${ticket.status}`,
        metadata: { from: existing.status, to: ticket.status },
        principal: user,
      });
      return ticket;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/support/tickets/:ticketId/assign",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "users:write");
      if (!isStaff(user)) throw ApiError.forbidden("Only support staff can assign tickets.");
      const input = parseJsonBody(assignSchema, context.body);
      const ticket = await assignTicket(context.params.ticketId!, input.assigneeId);
      await recordAudit({
        action: "SUPPORT_TICKET_ASSIGNED",
        entityType: "SUPPORT_TICKET",
        entityId: ticket.id,
        summary: input.assigneeId ? "Ticket assigned" : "Ticket unassigned",
        metadata: { assigneeId: input.assigneeId },
        principal: user,
      });
      return ticket;
    },
    { rateLimit: RATE_LIMITS.write },
  );
}
