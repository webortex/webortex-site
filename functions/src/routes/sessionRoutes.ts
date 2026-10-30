/**
 * Session endpoint.
 *
 * The web client needs to know who it is signed in as: which portal to render,
 * which navigation entries to show, and which actions to offer. It cannot read
 * that from Firestore — client access is denied by `firestore.rules` by design,
 * and duplicating role logic in the client would create a second source of truth
 * that drifts from the server's.
 *
 * So the client asks. Roles and permissions are computed server-side by the same
 * `permissionsForRoles` the guards use, and returned as a plain array.
 *
 * There is deliberately no write here. Role assignment, status and tenancy all
 * come from the user document, and self-assigning a role would be a privilege
 * escalation. Registration and provisioning of platform accounts are an
 * administrative action, not something this surface exposes.
 */

import type { ApiRouter } from "../lib/router.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { portalForRoles, touchLastLogin } from "../middleware/auth.js";
import { ROLE_LABELS, type Role } from "../../../packages/shared/src/index.js";

/**
 * `AuthContext.permissions` is a `ReadonlySet`, which JSON-serialises to `{}`.
 * A Set has no own enumerable properties, so returning it directly would hand the
 * client an empty object and silently disable every permission check in the UI.
 * It is flattened to a sorted array here for that reason.
 */
function permissionArray(permissions: ReadonlySet<string>): string[] {
  return [...permissions].sort();
}

/**
 * The role's label alongside its raw name.
 *
 * The client renders labels, but keys off the raw value, so the mapping is sent
 * rather than reimplemented in the UI. Duplicated label tables drift.
 */
function roleSummary(roles: readonly Role[]): { name: Role; label: string }[] {
  return roles.map((role) => ({ name: role, label: ROLE_LABELS[role] }));
}

export function registerSessionRoutes(router: ApiRouter): void {
  router.get(
    "/me",
    "user",
    async (context) => {
      const user = context.user();

      // Refreshed on every portal load so the UI can show "last seen" and so an
      // admin can tell a stale session from an active one. A failure here must
      // not block the response: the login record is diagnostic, not functional.
      await touchLastLogin(user.userId).catch(() => undefined);

      return {
        userId: user.userId,
        uid: user.uid,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        roles: roleSummary(user.roles),
        permissions: permissionArray(user.permissions),
        portal: portalForRoles(user.roles),
        advertiserId: user.advertiserId,
        driverId: user.driverId,
        vehicleIds: user.vehicleIds,
        theme: user.theme,
        lastLoginAt: user.lastLoginAt,
      };
    },
    { rateLimit: RATE_LIMITS.read },
  );
}