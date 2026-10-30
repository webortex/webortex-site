/**
 * Portal router.
 *
 * Mounted inside the legacy app's router at `/mobility`, ahead of its catch-all
 * `NotFound` route. The legacy routes are untouched — this only adds a prefix, so
 * the public marketing site behaves exactly as before.
 *
 * Lazy imports per area. The portal pulls in MUI, charts and Firebase auth; the
 * public site should not pay for any of it on first paint, so none of this is in
 * the legacy entry chunk.
 */

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PortalShell } from "@/mobility-media/components/PortalShell";
import { ErrorBoundary } from "@/mobility-media/components/ErrorBoundary";
import { LoadingState } from "@/mobility-media/components/States";
import { RequireAuth, RequirePermission } from "@/mobility-media/routes/guards";
import SignIn, { PendingApproval } from "@/mobility-media/routes/SignIn";

const Dashboard = lazy(() => import("@/mobility-media/routes/Dashboard"));
const Campaigns = lazy(() => import("@/mobility-media/routes/Campaigns"));
const CampaignDetail = lazy(() => import("@/mobility-media/routes/CampaignDetail"));
const CampaignCreate = lazy(() => import("@/mobility-media/routes/CampaignCreate"));
const Analytics = lazy(() => import("@/mobility-media/routes/Analytics"));
const Fleet = lazy(() => import("@/mobility-media/routes/Fleet"));
const Finance = lazy(() => import("@/mobility-media/routes/Finance"));
const Notifications = lazy(() => import("@/mobility-media/routes/Notifications"));
const Support = lazy(() => import("@/mobility-media/routes/Support"));
const SupportTicket = lazy(() => import("@/mobility-media/routes/SupportTicket"));
const ApiKeys = lazy(() => import("@/mobility-media/routes/ApiKeys"));
const Settings = lazy(() => import("@/mobility-media/routes/Settings"));
const Creatives = lazy(() => import("@/mobility-media/routes/Creatives"));

// The review queue is a second export of the same module. Re-exporting it under
// `default` here keeps each screen its own chunk without duplicating the file.
const ReviewQueue = lazy(() =>
  import("@/mobility-media/routes/Creatives").then((module) => ({ default: module.ReviewQueue })),
);

/** Suspense boundary for lazily-loaded screens. */
function Screen({ children }) {
  return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}

export default function MobilityApp() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Unauthenticated */}
        <Route path="sign-in" element={<SignIn />} />
        <Route
          path="pending"
          element={
            <RequireAuth>
              <PendingApproval />
            </RequireAuth>
          }
        />

        {/* Everything below needs a resolved session */}
        <Route
          element={
            <RequireAuth>
              <PortalShell />
            </RequireAuth>
          }
        >
          <Route
            index
            element={
              <Screen>
                <Dashboard />
              </Screen>
            }
          />

          <Route
            path="campaigns"
            element={
              <Screen>
                <RequirePermission permission="campaigns:read" area="campaigns">
                  <Campaigns />
                </RequirePermission>
              </Screen>
            }
          />
          {/*
           * `new` is a static segment and `campaigns/:campaignId` is dynamic, so
           * React Router ranks this higher regardless of declaration order. It is
           * declared first anyway: without this route, "New campaign" opened the
           * detail screen with id "new" and rendered a not-found inside the shell.
           */}
          <Route
            path="campaigns/new"
            element={
              <Screen>
                <RequirePermission permission="campaigns:write" area="campaigns">
                  <CampaignCreate />
                </RequirePermission>
              </Screen>
            }
          />
          <Route
            path="campaigns/:campaignId"
            element={
              <Screen>
                <RequirePermission permission="campaigns:read" area="campaigns">
                  <CampaignDetail />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="creatives"
            element={
              <Screen>
                <RequirePermission permission="creatives:read" area="creatives">
                  <Creatives />
                </RequirePermission>
              </Screen>
            }
          />
          <Route
            path="creatives/review"
            element={
              <Screen>
                <RequirePermission permission="creatives:review" area="moderation">
                  <ReviewQueue />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="analytics"
            element={
              <Screen>
                <RequirePermission permission="analytics:read" area="analytics">
                  <Analytics />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="fleet"
            element={
              <Screen>
                <RequirePermission permission="vehicles:read" area="fleet">
                  <Fleet />
                </RequirePermission>
              </Screen>
            }
          />

          {/*
           * Finance shows two independently-authorised panels: the advertiser wallet
           * (`finance:read`) and per-driver earnings (`payouts:read`). A driver holds
           * only the second, so gating on `finance:read` would deny the screen
           * entirely and hide the one number they are entitled to.
           */}
          <Route
            path="finance"
            element={
              <Screen>
                <RequirePermission permission={["finance:read", "payouts:read"]} area="finance">
                  <Finance />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="notifications"
            element={
              <Screen>
                <RequirePermission permission="notifications:read" area="notifications">
                  <Notifications />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="support"
            element={
              <Screen>
                <RequirePermission permission="support:read" area="support">
                  <Support />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="support/:ticketId"
            element={
              <Screen>
                <RequirePermission permission="support:read" area="support">
                  <SupportTicket />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="api-keys"
            element={
              <Screen>
                <RequirePermission permission="apikeys:manage" area="apiKeys">
                  <ApiKeys />
                </RequirePermission>
              </Screen>
            }
          />

          <Route
            path="settings"
            element={
              <Screen>
                {/* `platform:read`: held by every signed-in role, and the API narrows
                    the response for non-staff. */}
                <RequirePermission permission="platform:read" area="settings">
                  <Settings />
                </RequirePermission>
              </Screen>
            }
          />

          {/* A `/mobility/new`-style path must not fall through to the legacy 404 */}
          <Route path="*" element={<Navigate to="/mobility" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}