/**
 * Permission checks for rendering.
 *
 * There is deliberately **no copy of the role table here**. `ROLE_PERMISSIONS`
 * lives in `packages/shared/src/roles.ts` and is the only definition; the server
 * applies it in `permissionsForRoles` and returns the resulting list from
 * `GET /me`. A client-side table would be a second source of truth that drifts
 * the first time a role is added, and the failure mode is silent: a stale
 * client table hides a button the user is allowed to click, or shows one the
 * server will reject.
 *
 * So these helpers read the server's answer. Every check is advisory — it
 * decides what to render, never whether an action is permitted. Each endpoint
 * re-authorises independently, so a mistake here is a confusing button, never a
 * security hole.
 */

/** True when the server granted this permission. */
export function hasPermission(permissions, permission) {
  return Array.isArray(permissions) && permissions.includes(permission);
}

/** True when at least one of `required` is granted. Used for "either will do" screens. */
export function hasAnyPermission(permissions, required) {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  return required.some((permission) => permissions.includes(permission));
}

/** True when every one of `required` is granted. Used for read+write pairs. */
export function hasEveryPermission(permissions, required) {
  if (!Array.isArray(permissions)) return false;
  return required.every((permission) => permissions.includes(permission));
}

/**
 * Permission required to open each portal area.
 *
 * Used to filter navigation. Kept as a map of area to permission rather than a
 * role check, so a role change does not silently remove or reveal a section.
 *
 * An array means "any of these is enough" — used where a screen is composed of
 * independently-failing panels. Finance is the case that matters: a driver holds
 * `payouts:read` and can read their own earnings, but not `finance:read`, so
 * requiring `finance:read` alone would hide the one number they are allowed to see.
 */
export const AREA_PERMISSIONS = {
  dashboard: null, // every portal has a landing view
  campaigns: "campaigns:read",
  creatives: "creatives:read",
  analytics: "analytics:read",
  finance: ["finance:read", "payouts:read"],
  fleet: "vehicles:read",
  moderation: "creatives:review",
  support: "support:read",
  notifications: "notifications:read",
  apiKeys: "apikeys:manage",
  // Every signed-in role holds `platform:read`, and `GET /settings` narrows the
  // response for non-staff. Gating this on `settings:read` — which only admins and
  // analysts hold — made the screen unreachable for the audience the narrowing
  // was written for.
  settings: "platform:read",
};

export function canAccessArea(permissions, area) {
  const required = AREA_PERMISSIONS[area];
  // An area with no required permission is open to any signed-in user.
  if (required === null || required === undefined) return true;
  if (Array.isArray(required)) return hasAnyPermission(permissions, required);
  return hasPermission(permissions, required);
}

/**
 * Human-readable reason shown when a section is unavailable.
 *
 * Without this, a user with no analytics access sees a navigation item missing
 * and no explanation, which reads as a bug.
 */
export function areaDeniedReason(area) {
  switch (area) {
    case "finance":
      return "Finance needs either wallet access or payout access.";
    case "moderation":
      return "Creative review is available to moderators and admins.";
    case "fleet":
      return "Fleet is available to operations roles and vehicle owners.";
    case "settings":
      return "These settings are available to every portal account.";
    default:
      return "Your role does not include this area.";
  }
}