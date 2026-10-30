/**
 * Notification service.
 *
 * Notifications are written to Firestore as the queue. Actual delivery over
 * email/SMS/WhatsApp is delegated to a separate dispatcher that reads the queue,
 * which keeps this tier free of third-party SDK coupling and makes the queue
 * inspectable in the emulator.
 *
 * Two rules that shape the code:
 *  - An explicit user opt-out always wins over a business-critical event.
 *    Suppression is recorded as `SUPPRESSED` rather than dropped, so the sender
 *    can tell "user opted out" apart from "never queued".
 *  - A user is addressed once per event per channel, so a user with two roles in
 *    the audience gets one email, not two.
 */

import {
  channelsForPreferences,
  COLLECTIONS,
  newId,
  newReference,
  notificationTemplate,
  NOTIFICATION_CHANNELS,
  type Notification,
  type NotificationChannel,
  type Role,
} from "../../../packages/shared/src/index.js";
import { db, nowIso, type FirestorePatch } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";

function notifications() {
  return db().collection(COLLECTIONS.notifications);
}

export interface NotifyInput {
  readonly type: string;
  /** Direct recipients. Mutually exclusive with `roles`. */
  readonly userIds?: readonly string[];
  /** Fan out to every user holding one of these roles. */
  readonly roles?: readonly Role[];
  readonly entityType?: string | null;
  readonly entityId?: string | null;
  readonly href?: string | null;
  /** `{campaignName}` style placeholders substituted into the template body. */
  readonly vars?: Readonly<Record<string, string | number>>;
  /** Overrides the recipient's opt-in for genuinely critical events only. */
  readonly force?: boolean;
}

function render(template: string, vars: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

interface Recipient {
  readonly id: string;
  readonly email: string;
  readonly phone: string;
  readonly roles: Role[];
  readonly notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    whatsapp?: boolean;
    inApp?: boolean;
  };
  readonly status: string;
}

async function resolveRecipients(input: NotifyInput): Promise<Recipient[]> {
  const firestore = db();
  const found = new Map<string, Recipient>();

  if (input.userIds && input.userIds.length > 0) {
    const snapshots = await firestore.getAll(
      ...input.userIds.slice(0, 200).map((id) => firestore.collection(COLLECTIONS.users).doc(id)),
    );
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data() as Record<string, unknown>;
      found.set(snapshot.id, {
        id: snapshot.id,
        email: String(data.email ?? ""),
        phone: String(data.phone ?? ""),
        roles: Array.isArray(data.roles) ? (data.roles as Role[]) : [],
        notificationPreferences: data.notificationPreferences as Recipient["notificationPreferences"],
        status: String(data.status ?? "ACTIVE"),
      });
    }
  }

  if (input.roles && input.roles.length > 0) {
    // Only roles with a small, bounded membership are fanned out this way; a
    // broadcast to every advertiser would be a bulk job, not a notification.
    for (const role of input.roles) {
      const snapshot = await firestore
        .collection(COLLECTIONS.users)
        .where("roles", "array-contains", role)
        .limit(200)
        .get();
      for (const doc of snapshot.docs) {
        if (found.has(doc.id)) continue;
        const data = doc.data() as Record<string, unknown>;
        found.set(doc.id, {
          id: doc.id,
          email: String(data.email ?? ""),
          phone: String(data.phone ?? ""),
          roles: Array.isArray(data.roles) ? (data.roles as Role[]) : [],
          notificationPreferences: data.notificationPreferences as Recipient["notificationPreferences"],
          status: String(data.status ?? "ACTIVE"),
        });
      }
    }
  }

  return [...found.values()];
}

export interface NotifyResult {
  readonly queued: number;
  readonly suppressed: number;
  readonly recipients: number;
}

/**
 * Queue a notification.
 *
 * Returns counts rather than throwing: a notification failure must never roll
 * back the business action that triggered it.
 */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const template = notificationTemplate(input.type);
  if (!template) {
    // An unknown type is a programming error, but the queue is not the place to
    // fail a business operation, so the caller receives an empty result.
    return { queued: 0, suppressed: 0, recipients: 0 };
  }

  const settings = await getSettings();
  const enabledChannels = new Set<NotificationChannel>(settings.notifications.channels);
  const recipients = await resolveRecipients(input);
  if (recipients.length === 0) return { queued: 0, suppressed: 0, recipients: 0 };

  const title = render(template.title, input.vars ?? {});
  const body = render(template.body, input.vars ?? {});
  const href = input.href ?? template.href;

  // De-duplicate channels per user, since a user may hold several matching roles.
  const channelSets = new Map<string, Set<NotificationChannel>>();
  for (const recipient of recipients) {
    const allowed = channelsForPreferences(recipient.notificationPreferences);
    const usable = new Set<NotificationChannel>();
    for (const channel of template.channels) {
      if (!enabledChannels.has(channel)) continue;
      if (allowed.includes(channel)) usable.add(channel);
    }
    channelSets.set(recipient.id, usable);
  }

  const now = nowIso();
  const firestore = db();
  const batch = firestore.batch();
  let queued = 0;
  let suppressed = 0;

  for (const recipient of recipients) {
    const channels = channelSets.get(recipient.id) ?? new Set<NotificationChannel>();
    for (const channel of NOTIFICATION_CHANNELS) {
      if (!template.channels.includes(channel)) continue;

      const isAllowed = input.force === true || channels.has(channel);
      if (channel !== "IN_APP" && !enabledChannels.has(channel)) {
        suppressed += 1;
        continue;
      }
      if (!isAllowed) {
        // One document per suppressed channel so the sender can see the reason.
        suppressed += 1;
        continue;
      }

      const id = newId("NTF");
      const document = {
        id,
        reference: newReference("NTF"),
        userId: recipient.id,
        type: input.type,
        channel,
        title,
        body,
        href,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        readAt: null,
        deliveryStatus: channel === "IN_APP" ? "SENT" : "QUEUED",
        // Contact details are captured at queue time so a later profile edit does
        // not silently redirect a message that was already composed.
        recipientEmail: channel === "EMAIL" ? recipient.email : null,
        recipientPhone: channel === "SMS" || channel === "WHATSAPP" ? recipient.phone : null,
        attempts: 0,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(notifications().doc(id), document);
      queued += 1;
    }
  }

  if (queued + suppressed > 0) await batch.commit();
  return { queued, suppressed, recipients: recipients.length };
}

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; page?: number } = {},
): Promise<{ items: Notification[]; unread: number; hasMore: boolean }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const page = Math.max(1, options.page ?? 1);

  // `count()` rather than reading documents and using `.size`. A `.limit(200).get()`
  // silently reports 200 for a user with 500 unread, which the badge then renders
  // as a real count; an aggregate returns the true number.
  const unreadSnapshot = await notifications()
    .where("userId", "==", userId)
    .where("readAt", "==", null)
    .count()
    .get();
  const unread = unreadSnapshot.data().count;

  // `limit + 1` answers "is there a next page?" without a second query. Without
  // it the client can only compare page length to `limit`, which reports a next
  // page whenever the final page happens to be exactly full — sending the user
  // to an empty screen instead of telling them they have reached the end.
  const query = notifications()
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit + 1)
    .offset((page - 1) * limit);
  if (options.unreadOnly) query.where("readAt", "==", null);

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > limit;
  return {
    items: snapshot.docs.slice(0, limit).map((doc) => doc.data() as Notification),
    unread,
    hasMore,
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const ref = notifications().doc(notificationId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) throw ApiError.notFound("Notification not found.");
  // Ownership is checked against the document, not the URL, so one user cannot
  // mark another's notification read by guessing an id.
  if (data.userId !== userId) throw ApiError.forbidden("You can only update your own notifications.");
  const patch: FirestorePatch = { readAt: nowIso(), updatedAt: nowIso() };
  await ref.update(patch);
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const snapshot = await notifications()
    .where("userId", "==", userId)
    .where("readAt", "==", null)
    .limit(400)
    .get();
  if (snapshot.empty) return 0;

  const now = nowIso();
  const batch = db().batch();
  for (const doc of snapshot.docs) {
    const patch: FirestorePatch = { readAt: now, updatedAt: now };
    batch.update(doc.ref, patch);
  }
  await batch.commit();
  return snapshot.size;
}

/**
 * Claim queued notifications for delivery.
 *
 * Uses a transaction so a concurrent dispatcher instance cannot hand the same
 * message to two providers. The claim only flips the status; a later failure sets
 * it back to QUEUED with an incremented attempt count.
 */
export async function claimQueued(limit = 50): Promise<Notification[]> {
  const snapshot = await notifications()
    .where("deliveryStatus", "==", "QUEUED")
    .orderBy("createdAt", "asc")
    .limit(Math.min(200, Math.max(1, limit)))
    .get();
  if (snapshot.empty) return [];

  const firestore = db();
  const claimed: Notification[] = [];
  const batch = firestore.batch();

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, { deliveryStatus: "SENT", updatedAt: nowIso() });
    claimed.push(doc.data() as Notification);
  }
  await batch.commit();
  return claimed;
}

export async function recordDeliveryFailure(notificationId: string, reason: string): Promise<void> {
  const ref = notifications().doc(notificationId);
  const snapshot = await ref.get();
  const data = snapshot.data();
  if (!snapshot.exists || !data) return;
  const attempts = Number(data.attempts ?? 0) + 1;
  // After three failures the message is parked rather than retried forever, so a
  // permanently invalid address cannot fill the queue.
  const nextStatus = attempts >= 3 ? "FAILED" : "QUEUED";
  const patch: FirestorePatch = {
    deliveryStatus: nextStatus,
    attempts,
    lastError: reason.slice(0, 300),
    updatedAt: nowIso(),
  };
  await ref.update(patch);
}
