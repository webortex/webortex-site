/**
 * Route guard behaviour.
 *
 * The guards have one failure mode worth testing: deciding before `/me` has
 * resolved. A guard that treats "still loading" as "not signed in" bounces a
 * signed-in user to the sign-in form on every refresh, which is invisible in
 * manual testing if the session happens to be cached.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth, RequirePermission } from "@/mobility-media/routes/guards";

const authState = {
  status: "active",
  permissions: [],
  session: { portal: "admin" },
};

vi.mock("@/mobility-media/auth/context", () => ({
  useAuth: () => authState,
  usePermission: () => ({
    permissions: authState.permissions,
    isAuthenticated: authState.status === "active",
    isLoading: authState.status === "loading" || authState.status === "pending",
    can: (permission) => authState.status === "active" && authState.permissions.includes(permission),
    canAny: (required) => authState.status === "active" && required.some((p) => authState.permissions.includes(p)),
    canEvery: (required) => authState.status === "active" && required.every((p) => authState.permissions.includes(p)),
  }),
}));

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

function reset({ status = "active", permissions = [] } = {}) {
  authState.status = status;
  authState.permissions = permissions;
}

describe("RequireAuth", () => {
  it("renders children once the session resolves", () => {
    reset({ status: "active" });
    renderAt("/mobility", (
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>
    ));
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("waits rather than redirecting while the session is loading", () => {
    // The bug this guards against: treating "loading" as "anonymous" sends a
    // signed-in user back to the sign-in form on every refresh.
    reset({ status: "loading" });
    renderAt("/mobility", (
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>
    ));
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("also waits while authenticated but unauthorised", () => {
    // `pending` means the token is good but `/me` has not answered. Redirecting
    // here would race the session bootstrap.
    reset({ status: "pending" });
    renderAt("/mobility", (
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>
    ));
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
  });

  it("shows an explanatory error instead of looping when the session failed", () => {
    // A 403 here is retryable server-side; sending the user back to sign-in
    // would just repeat it.
    reset({ status: "error" });
    renderAt("/mobility", (
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>
    ));
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });
});

describe("RequirePermission", () => {
  it("renders children when the server granted the permission", () => {
    reset({ permissions: ["finance:read"] });
    renderAt("/mobility/finance", (
      <RequirePermission permission="finance:read" area="finance">
        <div>finance content</div>
      </RequirePermission>
    ));
    expect(screen.getByText("finance content")).toBeInTheDocument();
  });

  it("explains a denial rather than rendering nothing", () => {
    // A silently absent screen reads as a broken app.
    reset({ permissions: ["campaigns:read"] });
    renderAt("/mobility/finance", (
      <RequirePermission permission="finance:read" area="finance">
        <div>finance content</div>
      </RequirePermission>
    ));
    expect(screen.getByText(/Not available for your role/i)).toBeInTheDocument();
    expect(screen.queryByText("finance content")).not.toBeInTheDocument();
  });

  it("denies when the permission list is empty", () => {
    // Fail closed: a session that lost its permissions must not unlock screens.
    reset({ permissions: [] });
    renderAt("/mobility/finance", (
      <RequirePermission permission="finance:read">
        <div>finance content</div>
      </RequirePermission>
    ));
    expect(screen.queryByText("finance content")).not.toBeInTheDocument();
  });

  it("names the permission when no area is given", () => {
    reset({ permissions: [] });
    renderAt("/mobility/x", (
      <RequirePermission permission="payouts:write">
        <div>content</div>
      </RequirePermission>
    ));
    expect(screen.getByText(/payouts:write/)).toBeInTheDocument();
  });
});