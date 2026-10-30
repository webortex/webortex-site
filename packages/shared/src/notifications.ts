import type { Role } from "./roles";

/**
 * Notification catalogue.
 *
 * One entry per business event. `channels` marks which channels each event may
 * use; `inAppOnly` events never reach an external provider. The actual delivery
 * worker is Cloud Functions, but the templates live here so the wording is
 * reviewable, testable and identical across tiers.
 */

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS", "WHATSAPP", "IN_APP"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationTemplate {
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly channels: readonly NotificationChannel[];
  /** Which roles this event is delivered to. */
  readonly audience: readonly Role[];
  readonly href: string | null;
}

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  REGISTRATION_SUBMITTED: {
    type: "REGISTRATION_SUBMITTED",
    title: "Registration received",
    body: "We have received your registration. Our team will review it and get back to you shortly.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER", "DRIVER"],
    href: null,
  },
  REGISTRATION_APPROVED: {
    type: "REGISTRATION_APPROVED",
    title: "Your account is approved",
    body: "Your account has been approved. You can now create campaigns and submit creatives for review.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["ADVERTISER", "DRIVER", "VEHICLE_OWNER"],
    href: null,
  },
  REGISTRATION_REJECTED: {
    type: "REGISTRATION_REJECTED",
    title: "Registration could not be approved",
    body: "Your registration was not approved. Check the reason in your profile and resubmit the required details.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER", "DRIVER", "VEHICLE_OWNER"],
    href: null,
  },
  REGISTRATION_NEEDS_INFO: {
    type: "REGISTRATION_NEEDS_INFO",
    title: "More information required",
    body: "Our review team needs additional information before your account can be approved.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER", "DRIVER"],
    href: null,
  },
  CAMPAIGN_SUBMITTED: {
    type: "CAMPAIGN_SUBMITTED",
    title: "Campaign submitted for review",
    body: "Your campaign has been submitted. Moderators usually respond within one business day.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER"],
    href: null,
  },
  CAMPAIGN_APPROVED: {
    type: "CAMPAIGN_APPROVED",
    title: "Campaign approved",
    body: "Your campaign has been approved and will start delivering on its scheduled date.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["ADVERTISER"],
    href: null,
  },
  CAMPAIGN_REJECTED: {
    type: "CAMPAIGN_REJECTED",
    title: "Campaign rejected",
    body: "Your campaign was not approved. The reviewer has left a reason you can review and act on.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER"],
    href: null,
  },
  CAMPAIGN_LIVE: {
    type: "CAMPAIGN_LIVE",
    title: "Campaign is live",
    body: "Your campaign is now delivering on the network.",
    channels: ["IN_APP"],
    audience: ["ADVERTISER"],
    href: null,
  },
  CAMPAIGN_COMPLETED: {
    type: "CAMPAIGN_COMPLETED",
    title: "Campaign completed",
    body: "Your campaign has finished its flight window. Final performance figures are available in analytics.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER"],
    href: null,
  },
  CREATIVE_REJECTED: {
    type: "CREATIVE_REJECTED",
    title: "Creative needs changes",
    body: "A creative was not approved. Review the reason and upload a corrected version.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER"],
    href: null,
  },
  PAYMENT_SUCCESSFUL: {
    type: "PAYMENT_SUCCESSFUL",
    title: "Payment received",
    body: "We received your payment. Your campaign balance has been updated.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["ADVERTISER"],
    href: null,
  },
  PAYMENT_FAILED: {
    type: "PAYMENT_FAILED",
    title: "Payment failed",
    body: "A payment could not be completed. Please retry to avoid your campaign being paused.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["ADVERTISER"],
    href: null,
  },
  DEVICE_OFFLINE: {
    type: "DEVICE_OFFLINE",
    title: "Screen offline",
    body: "A screen stopped sending heartbeats and has been marked offline.",
    channels: ["IN_APP"],
    audience: ["ADMIN"],
    href: null,
  },
  DOCUMENT_EXPIRING: {
    type: "DOCUMENT_EXPIRING",
    title: "Document expiring",
    body: "One of your uploaded documents is approaching its expiry date. Upload a renewed copy to stay active.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["DRIVER", "VEHICLE_OWNER", "ADVERTISER"],
    href: null,
  },
  PAYOUT_PROCESSED: {
    type: "PAYOUT_PROCESSED",
    title: "Payout processed",
    body: "Your earnings payout has been processed for the period.",
    channels: ["IN_APP", "EMAIL", "SMS"],
    audience: ["DRIVER", "VEHICLE_OWNER"],
    href: null,
  },
  SUPPORT_TICKET_UPDATED: {
    type: "SUPPORT_TICKET_UPDATED",
    title: "Support ticket updated",
    body: "There is a new update on your support ticket.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER", "DRIVER", "VEHICLE_OWNER", "ADMIN"],
    href: null,
  },
  BUDGET_LOW: {
    type: "BUDGET_LOW",
    title: "Campaign budget running low",
    body: "A campaign is close to exhausting its budget. Top up to avoid a delivery pause.",
    channels: ["IN_APP", "EMAIL"],
    audience: ["ADVERTISER"],
    href: null,
  },
};

export function notificationTemplate(type: string): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES[type] ?? null;
}

/** Channels a given user has opted into. */
export function channelsForPreferences(
  preferences: { email?: boolean; sms?: boolean; whatsapp?: boolean; inApp?: boolean } | undefined,
): readonly NotificationChannel[] {
  return NOTIFICATION_CHANNELS.filter((channel) => {
    switch (channel) {
      case "EMAIL":
        return preferences?.email !== false;
      case "SMS":
        return preferences?.sms === true;
      case "WHATSAPP":
        return preferences?.whatsapp === true;
      case "IN_APP":
        return preferences?.inApp !== false;
      default:
        return false;
    }
  });
}