/**
 * Auth context and the hooks that read it.
 *
 * These live apart from `AuthProvider.jsx` for one concrete reason: a module that
 * exports both components and plain functions cannot support React Fast Refresh,
 * so every save to the provider would full-reload the app and blow away in-progress
 * form state while editing auth code.
 */

import { createContext, useContext, useMemo } from "react";
import { hasAnyPermission, hasEveryPermission, hasPermission } from "@/mobility-media/auth/permissions";

export const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}

/**
 * Permission check bound to the signed-in user.
 *
 * Delegates to the helpers in `permissions.js` rather than reimplementing the
 * comparisons, so there is one set of rules inside the client.
 *
 * Advisory only: it decides what to render. The API re-checks every action, so a
 * bug here can only ever produce a button that fails, never an unauthorised
 * write.
 */
export function usePermission() {
  const { permissions, isAuthenticated } = useAuth();
  return useMemo(
    () => ({
      permissions,
      isAuthenticated,
      can: (permission) => isAuthenticated && hasPermission(permissions, permission),
      canAny: (required) => isAuthenticated && hasAnyPermission(permissions, required),
      canEvery: (required) => isAuthenticated && hasEveryPermission(permissions, required),
    }),
    [permissions, isAuthenticated],
  );
}