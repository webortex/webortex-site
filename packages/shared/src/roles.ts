/**
 * Role-based access control.
 *
 * Roles are grouped into scopes so new roles can be introduced without editing
 * every call site. Permissions are checked server-side by the API tier
 * (`functions/src/middleware/auth.ts`) and mirrored in Firestore security rules
 * (`firestore.rules`) so authorisation is enforced at two independent layers.
 *
 * This table is the only definition. The web client holds no copy of it: it
 * renders what `GET /me` reports, so adding a role here cannot leave a stale
 * client-side table silently hiding a button or showing one the API rejects.
 * The client's helpers (`src/mobility-media/auth/permissions.js`) read that
 * response instead of recomputing it.
 */

export const ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MODERATOR",
  "SALES_MANAGER",
  "FINANCE_MANAGER",
  "ADVERTISER",
  "DRIVER",
  "VEHICLE_OWNER",
  "ANALYST",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Operations Admin",
  MODERATOR: "Content Moderator",
  SALES_MANAGER: "Sales Manager",
  FINANCE_MANAGER: "Finance Manager",
  ADVERTISER: "Advertiser",
  DRIVER: "Driver",
  VEHICLE_OWNER: "Vehicle Owner",
  ANALYST: "Analyst (read-only)",
};

/** Coarse grouping used for route guards and navigation. */
export type PortalScope = "admin" | "advertiser" | "driver";

export const ROLE_SCOPES: Record<Role, PortalScope> = {
  SUPER_ADMIN: "admin",
  ADMIN: "admin",
  MODERATOR: "admin",
  SALES_MANAGER: "admin",
  FINANCE_MANAGER: "admin",
  ADVERTISER: "advertiser",
  DRIVER: "driver",
  VEHICLE_OWNER: "driver",
  ANALYST: "admin",
};

export const PERMISSIONS = [
  // Platform configuration
  "platform:read",
  "platform:write",
  "settings:read",
  "settings:write",
  "users:read",
  "users:write",

  // Advertisers
  "advertisers:read",
  "advertisers:review",
  "advertisers:write",
  /** Issue and revoke the advertiser's conversion-feed API keys. */
  "apikeys:manage",

  // Campaigns
  "campaigns:read",
  "campaigns:review",
  "campaigns:write",

  // Creatives / moderation
  "creatives:read",
  "creatives:review",
  "creatives:write",

  // Fleet
  "vehicles:read",
  "vehicles:write",
  "drivers:read",
  "drivers:write",
  "screens:read",
  "screens:write",
  "devices:read",
  "devices:write",

  // Network
  "locations:read",
  "locations:write",
  "inventory:read",
  "inventory:write",

  // Analytics
  "analytics:read",
  "analytics:export",

  // Finance
  "finance:read",
  "finance:write",
  /** Start a gateway top-up of one's own wallet. Money only lands via the verified webhook. */
  "wallet:topup",
  "revenue:read",
  "payouts:read",
  "payouts:write",

  // Operations
  "notifications:read",
  "notifications:write",
  "support:read",
  "support:write",
  "audit:read",

  // Ingestion (device endpoints authenticate with a device key, not a user role)
  "events:ingest",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Permissions granted to every signed-in user regardless of role. */
export const SELF_SERVICE_PERMISSIONS: readonly Permission[] = [
  "platform:read",
  "notifications:read",
  "notifications:write",
  "support:read",
  "support:write",
];

const ADMIN_OPERATIONS: readonly Permission[] = [
  "platform:read",
  "settings:read",
  "users:read",
  "advertisers:read",
  "campaigns:read",
  "creatives:read",
  "vehicles:read",
  "drivers:read",
  "screens:read",
  "devices:read",
  "locations:read",
  "inventory:read",
  "analytics:read",
  "analytics:export",
  "notifications:read",
  "support:read",
  "support:write",
  "audit:read",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    ...new Set<Permission>([...SELF_SERVICE_PERMISSIONS, ...ADMIN_OPERATIONS, ...PERMISSIONS]),
  ],
  ADMIN: [
    ...new Set<Permission>([
      ...SELF_SERVICE_PERMISSIONS,
      ...ADMIN_OPERATIONS,
      "platform:write",
      "users:write",
      "advertisers:review",
      "advertisers:write",
      "apikeys:manage",
      "campaigns:review",
      "campaigns:write",
      "creatives:review",
      "creatives:write",
      "vehicles:write",
      "drivers:write",
      "screens:write",
      "devices:write",
      "locations:write",
      "inventory:write",
      "finance:read",
      "revenue:read",
      "payouts:read",
      "payouts:write",
      "notifications:write",
    ]),
  ],
  MODERATOR: [
    ...SELF_SERVICE_PERMISSIONS,
    "platform:read",
    "advertisers:read",
    "campaigns:read",
    "creatives:read",
    "creatives:review",
    "creatives:write",
    "vehicles:read",
    "screens:read",
    "devices:read",
    "analytics:read",
    "support:read",
  ],
  SALES_MANAGER: [
    ...SELF_SERVICE_PERMISSIONS,
    "platform:read",
    "users:read",
    "advertisers:read",
    "advertisers:review",
    "advertisers:write",
    "campaigns:read",
    "campaigns:review",
    "campaigns:write",
    "creatives:read",
    "analytics:read",
    "analytics:export",
    "finance:read",
    "support:read",
    "support:write",
  ],
  FINANCE_MANAGER: [
    ...SELF_SERVICE_PERMISSIONS,
    "platform:read",
    "advertisers:read",
    "campaigns:read",
    "analytics:read",
    "analytics:export",
    "finance:read",
    "finance:write",
    "revenue:read",
    "payouts:read",
    "payouts:write",
  ],
  ANALYST: [...SELF_SERVICE_PERMISSIONS, ...ADMIN_OPERATIONS],
  ADVERTISER: [
    ...SELF_SERVICE_PERMISSIONS,
    "advertisers:read",
    "advertisers:write",
    "campaigns:read",
    "campaigns:write",
    "creatives:read",
    "creatives:write",
    "analytics:read",
    "analytics:export",
    "finance:read",
    "apikeys:manage",
    "wallet:topup",
  ],
  DRIVER: [
    ...SELF_SERVICE_PERMISSIONS,
    "vehicles:read",
    "screens:read",
    "devices:read",
    "campaigns:read",
    "analytics:read",
    "payouts:read",
  ],
  VEHICLE_OWNER: [
    ...SELF_SERVICE_PERMISSIONS,
    "vehicles:read",
    "vehicles:write",
    "drivers:read",
    "screens:read",
    "devices:read",
    "campaigns:read",
    "analytics:read",
    "payouts:read",
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function permissionsForRoles(roles: readonly Role[]): ReadonlySet<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) set.add(permission);
  }
  return set;
}

export function roleHasPermission(roles: readonly Role[], permission: Permission): boolean {
  return roles.some((role) => (ROLE_PERMISSIONS[role] ?? []).includes(permission));
}

export function scopeForRoles(roles: readonly Role[]): PortalScope {
  // Highest-privilege scope wins so a user with two roles lands in the correct portal.
  if (roles.some((role) => ROLE_SCOPES[role] === "admin")) return "admin";
  if (roles.some((role) => ROLE_SCOPES[role] === "advertiser")) return "advertiser";
  return "driver";
}

/** Roles that may be granted to a newly created user. Registration never self-assigns these. */
export const ASSIGNABLE_ROLES: readonly Role[] = [
  "ADVERTISER",
  "DRIVER",
  "VEHICLE_OWNER",
  "ADMIN",
  "MODERATOR",
  "SALES_MANAGER",
  "FINANCE_MANAGER",
  "ANALYST",
];