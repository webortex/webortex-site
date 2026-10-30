/**
 * Notification endpoints.
 *
 * Notifications are the only "feed" a user has, so every read that changes
 * state (mark read, mark all read) is a mutation, audited and rate-limited
 * like any other write rather than being folded into a GET.
 */

import { z } from "zod";
import type { ApiRouter } from "../lib/router.js";
import { clampInt, first } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { requirePermission } from "../middleware/auth.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../domain/notificationService.js";

export function registerNotificationRoutes(router: ApiRouter): void {
  router.get(
    "/notifications",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "notifications:read");
      // `listNotifications` already returns the unread total alongside the page,
      // so the client does not need a second round trip for the badge count.
      return listNotifications(user.userId, {
        unreadOnly: first(context.query.unreadOnly) === "true",
        limit: clampInt(first(context.query.limit), 1, 100, 25),
        page: clampInt(first(context.query.page), 1, 10_000, 1),
      });
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/notifications/:notificationId/read",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "notifications:read");
      await markNotificationRead(user.userId, context.params.notificationId!);
      return { ok: true };
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/notifications/read-all",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "notifications:read");
      return { updated: await markAllNotificationsRead(user.userId) };
    },
    { rateLimit: RATE_LIMITS.write },
  );
}
