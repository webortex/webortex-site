/**
 * Request authentication and server-side authorisation.
 *
 * Two credential kinds:
 *  - `user`   - a Firebase ID token. Permissions come from the roles stored in
 *               Firestore, looked up on every request. Client-supplied roles are
 *               never read.
 *  - `device` - a device key for the screen player. Devices authenticate against
 *               a hashed secret and may only write to their own event stream.
 */

import type { DocumentData } from "firebase-admin/firestore";
import type { Request } from "firebase-functions/v1/https";
import {
  COLLECTIONS,
  hashIp,
  isRole,
  permissionsForRoles,
  scopeForRoles,
  type Permission,
  type Role,
} from "../../../packages/shared/src/index.js";
import { auth, db } from "../lib/admin.js";
import { config } from "../lib/config.js";
import { ApiError, newCorrelationId } from "../lib/http.js";

export interface AuthContext {
  readonly kind: "user";
  readonly uid: string;
  readonly userId: string;
  readonly email: string;
  readonly fullName: string;
  readonly phone: string;
  readonly avatarUrl: string | null;
  readonly roles: readonly Role[];
  readonly status: "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED" | "DEACTIVATED";
  readonly permissions: ReadonlySet<Permission>;
  readonly advertiserId: string | null;
  readonly driverId: string | null;
  readonly vehicleIds: readonly string[];
  readonly theme: "dark" | "light";
  readonly lastLoginAt: string | null;
  readonly correlationId: string;
  readonly ipHash: string | null;
}

export interface DeviceContext {
  readonly kind: "device";
  readonly deviceId: string;
  readonly screenId: string | null;
  readonly vehicleId: string | null;
  readonly correlationId: string;
}

export type Principal = AuthContext | DeviceContext;

export interface PlatformUserRecord {
  id: string;
  uid: string;
  roles: Role[];
  status: AuthContext["status"];
}

function bearerToken(req: Request): string | null {
  const header = req.get("authorization") ?? req.get("Authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer") return null;
  const token = value?.trim();
  return token && token.length > 0 ? token : null;
}

export async function requireUser(req: Request, correlationId: string): Promise<AuthContext> {
  const token = bearerToken(req);
  if (!token) throw ApiError.unauthorised("Missing bearer token.");

  let uid: string;
  try {
    const decoded = await auth().verifyIdToken(token, true);
    uid = decoded.uid;
  } catch {
    // Do not echo the verifier's message: it can describe internal token state.
    throw ApiError.unauthorised("Your session has expired. Please sign in again.");
  }

  const snapshot = await db().collection(COLLECTIONS.users).doc(uid).get();
  if (!snapshot.exists) {
    // A verified Firebase user whose profile write has not landed yet. This is a
    // real state, so it returns a retryable 403 rather than a 500.
    throw new ApiError(
      403,
      "PROFILE_MISSING",
      "Your platform profile is still being created. Please retry in a moment.",
    );
  }

  const data = snapshot.data() as DocumentData;
  const roles = Array.isArray(data.roles) ? data.roles.filter(isRole) : [];
  if (roles.length === 0) {
    throw ApiError.forbidden("Your account has no platform role assigned yet.");
  }

  const status = (data.status ?? "PENDING_VERIFICATION") as AuthContext["status"];
  if (status === "SUSPENDED" || status === "DEACTIVATED") {
    throw ApiError.forbidden(
      status === "SUSPENDED"
        ? "Your account is suspended. Contact support to restore access."
        : "Your account has been deactivated.",
    );
  }

  const vehicleIds = Array.isArray(data.vehicleIds) ? (data.vehicleIds as string[]) : [];

  return {
    kind: "user",
    uid,
    userId: (data.id as string) ?? uid,
    email: (data.email as string) ?? "",
    fullName: (data.fullName as string) ?? "",
    phone: (data.phone as string) ?? "",
    avatarUrl: (data.avatarUrl as string | null) ?? null,
    roles,
    status,
    permissions: permissionsForRoles(roles),
    advertiserId: (data.advertiserId as string | null) ?? null,
    driverId: (data.driverId as string | null) ?? null,
    vehicleIds,
    theme: data.theme === "light" ? "light" : "dark",
    lastLoginAt: (data.lastLoginAt as string | null) ?? null,
    correlationId,
    ipHash: await hashIp(req.ip ?? undefined, config.auditSalt),
  };
}

export function requirePermission(principal: Principal, permission: Permission): void {
  if (principal.kind !== "user") {
    throw ApiError.forbidden("This endpoint requires a signed-in user.");
  }
  if (!principal.permissions.has(permission)) {
    throw ApiError.forbidden(`Your role does not allow "${permission}".`);
  }
}

export function requireAnyPermission(principal: Principal, permissions: readonly Permission[]): void {
  if (principal.kind !== "user") {
    throw ApiError.forbidden("This endpoint requires a signed-in user.");
  }
  if (!permissions.some((permission) => principal.permissions.has(permission))) {
    throw ApiError.forbidden("Your role does not allow any of the required permissions.");
  }
}

const STAFF_ROLES: readonly Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "FINANCE_MANAGER",
  "SALES_MANAGER",
  "ANALYST",
  "MODERATOR",
];

/**
 * Staff-only view. Takes the roles directly so route modules can scope a
 * request without having to reconstruct a full `Principal`.
 */
export function isStaff(principal: { readonly roles: readonly Role[] } | Principal): boolean {
  const roles = "roles" in principal ? principal.roles : [];
  return roles.some((role) => STAFF_ROLES.includes(role));
}

const FLEET_STAFF_ROLES: readonly Role[] = ["SUPER_ADMIN", "ADMIN", "FINANCE_MANAGER", "ANALYST"];

/** The identity facts a tenancy check depends on. `AuthContext` satisfies these. */
interface ScopedPrincipal {
  readonly roles: readonly Role[];
  readonly advertiserId: string | null;
}

interface VehicleScopedPrincipal {
  readonly roles: readonly Role[];
  readonly vehicleIds: readonly string[];
}

interface DriverScopedPrincipal {
  readonly roles: readonly Role[];
  readonly driverId: string | null;
}

/**
 * Tenancy guard.
 *
 * An advertiser may only ever address their own records. Enforced here,
 * server-side, rather than only by query scoping, so a guessed ID returns 403
 * instead of leaking whether the record exists elsewhere.
 */
export function assertOwnsAdvertiser(principal: ScopedPrincipal, advertiserId: string | undefined | null): void {
  if (principal.roles.some((role) => STAFF_ROLES.includes(role))) return;
  if (!principal.advertiserId || principal.advertiserId !== advertiserId) {
    throw ApiError.forbidden("You can only access your own records.");
  }
}

export function assertOwnsVehicle(principal: VehicleScopedPrincipal, vehicleId: string): void {
  if (principal.roles.some((role) => FLEET_STAFF_ROLES.includes(role))) return;
  if (!principal.vehicleIds.includes(vehicleId)) {
    throw ApiError.forbidden("You can only access vehicles assigned to you.");
  }
}

export function assertOwnsDriver(principal: DriverScopedPrincipal, driverId: string): void {
  if (principal.roles.some((role) => FLEET_STAFF_ROLES.includes(role) || role === "SALES_MANAGER")) return;
  if (principal.driverId !== driverId) {
    throw ApiError.forbidden("You can only access your own driver record.");
  }
}

export function portalForRoles(roles: readonly Role[]): "admin" | "advertiser" | "driver" {
  return scopeForRoles(roles);
}

export async function touchLastLogin(userDocId: string): Promise<void> {
  await db()
    .collection(COLLECTIONS.users)
    .doc(userDocId)
    .set({ lastLoginAt: new Date().toISOString() }, { merge: true });
}

export function newRequestCorrelationId(): string {
  return newCorrelationId();
}