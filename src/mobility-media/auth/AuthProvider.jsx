/**
 * Session state for the portal.
 *
 * Owns two things that must not drift apart:
 *
 *  - **The Firebase session.** The ID token is refreshed automatically by the
 *    SDK, but only while something is subscribed. This provider holds an
 *    `onIdTokenChanged` subscription for the lifetime of the app, so the token
 *    is always current when a request goes out. Without it, a tab left open for
 *    over an hour starts sending an expired token and every screen fails at once
 *    with no obvious cause.
 *
 *  - **The server's view of the user.** Roles, permissions and tenancy come from
 *    `GET /me`, never from the token and never from Firestore. The token proves
 *    the account is genuine; the API decides what that account may do.
 *
 * The token provider is pushed into the API client here rather than the API
 * client importing Firebase, which keeps the two independently testable.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  connectAuthEmulator,
  getAuth,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { EMULATOR_AUTH_HOST, USE_EMULATORS } from "@/mobility-media/config";
import { ApiError, api, configureApiClient } from "@/mobility-media/lib/api";
import { mobilityApp } from "@/mobility-media/lib/firebase";
import { AuthContext } from "@/mobility-media/auth/context";

const auth = getAuth(mobilityApp);

// `connectAuthEmulator` throws if called twice, which React's development
// double-render guarantees. Guarded so StrictMode does not break the app.
if (USE_EMULATORS && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${EMULATOR_AUTH_HOST}`, { disableWarnings: true });
}

/**
 * Normalises a Firebase error into something displayable.
 *
 * `invalid-credential`, `user-not-found` and `wrong-password` are collapsed into
 * one message on purpose: distinguishing them tells an attacker whether an email
 * address has an account.
 */
function describeAuthError(error) {
  const code = error?.code ?? "";
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "That email and password combination is not recognised.";
  }
  if (code === "auth/invalid-email") return "That does not look like a valid email address.";
  if (code === "auth/user-disabled") return "This account has been disabled. Contact support.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a minute and try again.";
  if (code === "auth/network-request-failed") return "Could not reach the sign-in service.";
  return error?.message ?? "Sign in failed. Please try again.";
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  // `firebaseUser` is the SDK's account; `session` is the API's view of it.
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [session, setSession] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | anonymous | pending | active | error

  const tokenRef = useRef(null);
  // Guards against a `/me` response arriving after sign-out and resurrecting a
  // session the user has already ended.
  const sessionRequestId = useRef(0);

  const endSession = useCallback(() => {
    sessionRequestId.current += 1;
    tokenRef.current = null;
    setFirebaseUser(null);
    setSession(null);
    setSessionError(null);
    setStatus("anonymous");
    // Cached queries belong to the signed-out user. Leaving them would show the
    // previous account's data to whoever signs in next.
    queryClient.clear();
  }, [queryClient]);

  // Wire the API client once. It reads the token through a ref, so this function
  // identity stays stable and no request is sent from a stale closure.
  useEffect(() => {
    configureApiClient({
      tokenProvider: async () => tokenRef.current,
      onSessionExpired: () => {
        // A 401 mid-session means the token was revoked or the account changed.
        // Ending the session here is what stops the UI showing cached data as
        // though still signed in.
        void signOut(auth).catch(() => undefined);
        endSession();
      },
    });
    return () => configureApiClient({ tokenProvider: async () => null, onSessionExpired: () => {} });
  }, [endSession]);

  const loadSession = useCallback(async () => {
    const requestId = ++sessionRequestId.current;
    try {
      const me = await api.get("/me");
      // Discard a response that lost the race with a sign-out or a newer load.
      if (requestId !== sessionRequestId.current) return null;
      setSession(me);
      setSessionError(null);
      setStatus("active");
      return me;
    } catch (error) {
      if (requestId !== sessionRequestId.current) return null;
      if (error instanceof ApiError && error.isUnauthorised) {
        endSession();
        return null;
      }
      setSessionError(error);
      setStatus("error");
      throw error;
    }
  }, [endSession]);

  // Subscribe to ID token changes for the life of the app.
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      if (!user) {
        endSession();
        return;
      }
      user
        .getIdToken()
        .then((token) => {
          tokenRef.current = token;
          setFirebaseUser(user);
          // `pending` means "authenticated but not yet authorised": the token is
          // good, the API has not said what this account may do. Distinguishing
          // this from `anonymous` is what lets a new signup land on a real
          // "waiting for approval" screen instead of the sign-in form.
          setStatus((current) => (current === "active" ? current : "pending"));
        })
        .catch(() => endSession());
    });
    return unsubscribe;
  }, [endSession]);

  useEffect(() => {
    if (status === "pending") void loadSession().catch(() => undefined);
  }, [status, loadSession]);

  const signIn = useCallback(async (email, password) => {
    setSessionError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (error) {
      // Status must not be left on `loading` if the token listener never fires,
      // which is what happens when sign-in fails.
      setStatus((current) => (current === "loading" ? "anonymous" : current));
      return { ok: false, error: new Error(describeAuthError(error)) };
    }
  }, []);

  /**
   * Force-refresh the token and re-read the server's view.
   *
   * Needed after anything that changes what the user may do — an admin granting
   * a role, or a password change invalidating the current token — because the
   * cached `/me` would otherwise keep the old permissions on screen until a
   * reload.
   */
  const refreshSession = useCallback(async () => {
    if (firebaseUser) {
      try {
        tokenRef.current = await firebaseUser.getIdToken(true);
      } catch {
        endSession();
        return null;
      }
    }
    return loadSession();
  }, [firebaseUser, loadSession, endSession]);

  const signOutNow = useCallback(async () => {
    await signOut(auth).catch(() => undefined);
    endSession();
  }, [endSession]);

  const value = useMemo(
    () => ({
      status,
      session,
      user: session,
      permissions: session?.permissions ?? [],
      roles: session?.roles ?? [],
      portal: session?.portal ?? null,
      sessionError,
      isAuthenticated: status === "active",
      isLoading: status === "loading" || status === "pending",
      signIn,
      signOut: signOutNow,
      reloadSession: refreshSession,
    }),
    [status, session, sessionError, signIn, signOutNow, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}