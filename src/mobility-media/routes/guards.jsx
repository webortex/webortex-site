/**
 * Route guards.
 *
 * These decide what to render; they never authorise anything. A user who edits
 * the client to bypass a guard reaches a screen whose every request is refused by
 * the API, which is the intended behaviour — the guard is a convenience, the
 * server is the control.
 *
 * Each guard waits for the session to resolve before deciding. Rendering
 * "redirecting" while `/me` is still in flight would bounce a signed-in user to
 * the sign-in form on every refresh, which is the classic bug where a guard and
 * the session bootstrap race each other.
 */

import { Navigate, useLocation } from "react-router-dom";
import { Alert, AlertTitle, Box, Button, Container, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { areaDeniedReason } from "@/mobility-media/auth/permissions";
import { LoadingState } from "@/mobility-media/components/States";

/** Requires a signed-in user with a resolved session. */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading" || status === "pending") {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <LoadingState label="Checking your session…" />
      </Box>
    );
  }

  // `state.from` so the user lands back where they were after signing in, rather
  // than always on the dashboard.
  if (status === "anonymous") {
    return <Navigate to="/mobility/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  // Authenticated but the API refused to describe the account. This is not a
  // signed-out state, so bouncing to sign-in would loop: signing in again
  // produces the same error.
  if (status === "error") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error">
          <AlertTitle>Your account could not be loaded</AlertTitle>
          The API did not accept this session. If you have just been given a role, it may not have
          applied yet — reload in a moment. Otherwise contact support.
        </Alert>
      </Container>
    );
  }

  return children;
}

/**
 * Requires permissions granted by the server and reported in `/me`.
 *
 * `permission` may be a single permission or an array, in which case any one of
 * them is enough — for screens built from independently-failing panels, where
 * requiring the strictest one would hide the parts a user is allowed to see.
 */
export function RequirePermission({ permission, children, area }) {
  const { can, canAny, isLoading, isAuthenticated } = usePermission();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <LoadingState />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/mobility/sign-in" replace state={{ from: location.pathname + location.search }} />;
  }

  const allowed = Array.isArray(permission) ? canAny(permission) : can(permission);

  if (!allowed) {
    const required = Array.isArray(permission) ? permission.join(" or ") : permission;
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info" icon={<LockIcon />}>
          <AlertTitle>Not available for your role</AlertTitle>
          {area ? areaDeniedReason(area) : `Your role does not include "${required}".`}
          <Box sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" onClick={() => window.history.back()}>
              Go back
            </Button>
          </Box>
        </Alert>
      </Container>
    );
  }

  return children;
}

/**
 * Restricts a route to one portal scope.
 *
 * `portalForRoles` on the server picks the highest-privilege scope, so a user who
 * is both an advertiser and a driver lands in the advertiser portal. This guard
 * enforces the same rule the server does rather than inventing its own.
 */
export function RequirePortal({ scope, children }) {
  const { portal, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "50vh" }}>
        <LoadingState />
      </Box>
    );
  }

  if (portal !== scope) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info" icon={<LockIcon />}>
          <AlertTitle>Wrong portal</AlertTitle>
          Your account is set up for the {portal ?? "unknown"} portal. Open the{" "}
          <Typography component="span" fontWeight={600}>
            {portal ?? "correct"}
          </Typography>{" "}
          portal instead.
        </Alert>
      </Container>
    );
  }

  return children;
}