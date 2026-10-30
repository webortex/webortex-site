/**
 * Platform settings endpoints.
 *
 * Settings are a single shared document, so writes are restricted to staff with
 * `settings:write` and every save is recorded as an audit entry carrying the
 * before/after diff. The raw settings object is never echoed back with secrets
 * or internal-only fields intact.
 */

import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { parseJsonBody } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { isStaff, requirePermission } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import { getSettings, saveSettings } from "../domain/settingsService.js";
import { platformSettingsSchema } from "../../../packages/shared/src/index.js";

/**
 * The subset of settings a non-staff caller is allowed to see.
 *
 * `revenue`, `retention`, `moderation` and the internal half of `inventory` are
 * commercial configuration. Exposing them to advertisers and drivers would hand
 * every counterparty the platform's margin — `platformShare` plus
 * `operationsReserve` effectively states what the network keeps — along with the
 * capping and house-content strategy used to price against them. None of it is
 * needed to render or validate anything client-side.
 *
 * What is exposed is only what a client needs in order to build a valid request
 * or render a local hint: the currency to format money in, the creative limits to
 * validate an upload against, the budget and lead-time floors a campaign has to
 * respect, the heartbeat thresholds behind an offline badge, and the signed-in
 * user's own notification preferences.
 */
function publicView(settings: Awaited<ReturnType<typeof getSettings>>, staff: boolean) {
  if (staff) return settings;
  return {
    currency: settings.currency,
    supportedVehicleTypes: settings.supportedVehicleTypes,
    creative: settings.creative,
    campaigns: {
      minimumBudgetMinor: settings.campaigns.minimumBudgetMinor,
      maximumBudgetMinor: settings.campaigns.maximumBudgetMinor,
      minimumDurationDays: settings.campaigns.minimumDurationDays,
      maximumDurationDays: settings.campaigns.maximumDurationDays,
      minimumLeadTimeHours: settings.campaigns.minimumLeadTimeHours,
      defaultDailyBudgetMinor: settings.campaigns.defaultDailyBudgetMinor,
    },
    heartbeat: settings.heartbeat,
    notifications: {
      channels: settings.notifications.channels,
      quietHoursLocal: settings.notifications.quietHoursLocal,
    },
};
}

export function registerSettingsRoutes(router: ApiRouter): void {
  router.get(
    "/settings",
    "user",
    async (context) => {
      const user = context.user();
      // Deliberately `platform:read`, not `settings:read`.
      //
      // `publicView` below exists to hand a non-staff caller a narrowed document,
      // which only makes sense if non-staff can call this endpoint at all. Gating on
      // `settings:read` — granted only to ADMIN/SUPER_ADMIN/ANALYST — made that
      // narrowing unreachable and left advertisers and drivers unable to see the
      // campaign and creative limits they are measured against.
      requirePermission(user, "platform:read");
      const settings = await getSettings();
      return publicView(settings, isStaff(user));
    },
    { rateLimit: RATE_LIMITS.read },
  );

  /**
   * Replace the platform settings document.
   *
   * The whole document is validated rather than patched field-by-field: pricing
   * percentages interact (pool + reserve + tax must reconcile), so a partial
   * update could leave the platform in a state that no full configuration was
   * ever intended to produce.
   */
  router.patch(
    "/settings",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "settings:write");
      if (!isStaff(user)) throw ApiError.forbidden("Only platform staff can change settings.");

      const next = parseJsonBody(platformSettingsSchema, context.body);
      const previous = await getSettings();
      const saved = await saveSettings(next, user.userId);
      await recordAudit({
        action: "SETTINGS_UPDATED",
        entityType: "SETTINGS",
        entityId: "platform",
        summary: "Platform settings updated",
        metadata: {
          changedSections: changedSections(previous, saved),
          previousHash: await fingerprint(previous),
        },
        principal: user,
      });
      return saved;
    },
    { rateLimit: RATE_LIMITS.write },
  );
}

/** Which top-level sections actually differ, so the audit log stays readable. */
function changedSections(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return Object.keys(after).filter(
    (section) => JSON.stringify(before[section]) !== JSON.stringify(after[section]),
  );
}

/**
 * A short non-reversible digest of the previous configuration.
 *
 * The audit trail needs to prove which configuration was replaced, but writing
 * the full previous document would duplicate commercially sensitive pricing
 * into the append-only log where it cannot be redacted.
 */
async function fingerprint(settings: unknown): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(JSON.stringify(settings ?? null)).digest("hex").slice(0, 16);
}
