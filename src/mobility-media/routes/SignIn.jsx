/**
 * Sign-in screen.
 *
 * Firebase Auth only. There is no self-service registration here on purpose:
 * roles, advertiser tenancy and vehicle assignment are assigned by an
 * administrator, and a signup form that cannot grant itself a role would
 * produce accounts that sign in successfully and then hit an empty portal.
 * Provisioning is an administrative action.
 *
 * `PROFILE_MISSING` is called out specifically. A Firebase account can exist
 * before its platform profile does, and that state is a retryable 403 rather than
 * a failure — telling someone to contact support for it would be wrong.
 */

import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import { useAuth } from "@/mobility-media/auth/context";
import { ApiError } from "@/mobility-media/lib/api";

export default function SignIn() {
  const { signIn, isAuthenticated, session, sessionError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Land the user back where they were headed, not always on the dashboard.
  const from = location.state?.from ?? "/mobility";

  useEffect(() => {
    // A session that already resolved with no roles means the account exists but
    // has not been provisioned. Sending them to the dashboard would just show an
    // empty portal with no explanation.
    if (isAuthenticated && session && (session.roles?.length ?? 0) === 0) {
      navigate("/mobility/pending", { replace: true });
    }
  }, [isAuthenticated, session, navigate]);

  if (isAuthenticated && session && (session.roles?.length ?? 0) > 0) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (!result.ok) setError(result.error);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Sign in failed."));
    } finally {
      setSubmitting(false);
    }
  }

  const profileMissing = sessionError instanceof ApiError && sessionError.code === "PROFILE_MISSING";

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", px: 2 }}>
      <Container maxWidth="xs">
        <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: "primary.main" }} />
          <Typography variant="h5">Mobility Media</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Sign in to the operations portal
          </Typography>
        </Stack>

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                {profileMissing ? (
                  <Alert severity="info">
                    <AlertTitle>Profile still being created</AlertTitle>
                    Your account exists but its platform profile has not finished setting up. Try
                    again in a moment.
                  </Alert>
                ) : null}

                {error ? (
                  <Alert severity="error" role="alert">
                    {error.message}
                  </Alert>
                ) : null}

                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  fullWidth
                  autoFocus
                />

                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || !email || !password}
                  startIcon={<LoginIcon />}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Stack spacing={1} sx={{ mt: 3, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary" align="center">
            Accounts are provisioned by an administrator. There is no self-service signup.
          </Typography>
          <MuiLink component={Link} to="/" variant="caption" underline="hover">
            Back to the public website
          </MuiLink>
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * Shown when Firebase auth succeeds but the API has no role for the account.
 *
 * A real state, not an error: the account is genuine and simply not granted
 * anything yet. It is kept as its own screen so it is visibly distinct from a
 * failed sign-in, which is the state users otherwise assume.
 */
export function PendingApproval() {
  const { signOut, session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && session && (session.roles?.length ?? 0) > 0) {
      navigate("/mobility", { replace: true });
    }
  }, [isLoading, session, navigate]);

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "background.default", px: 2 }}>
      <Container maxWidth="sm">
        <Alert severity="info">
          <AlertTitle>Waiting for access</AlertTitle>
          Your account is confirmed but no platform role has been assigned yet, so there is nothing
          to show you yet. An administrator needs to grant a role before the portal becomes usable.
          <Box sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" onClick={() => signOut().then(() => navigate("/mobility/sign-in"))}>
              Sign out
            </Button>
          </Box>
        </Alert>
      </Container>
    </Box>
  );
}