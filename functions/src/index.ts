/**
 * Firebase Cloud Functions entry point.
 *
 * Deployment shape:
 *  - `api` — one HTTPS function serving the whole `/api/mobility` surface. A
 *    single function keeps auth, CORS, rate limiting and error envelopes in one
 *    place, and avoids the per-endpoint cold-start tax of a function per route.
 *  - `runAggregation` — a scheduled job. Rollups must run on a schedule rather
 *    than on request, because a dashboard that computed its own numbers from raw
 *    events would be both slow and expensive.
 *
 * The router is assembled once at module load. `add()` now rejects duplicate
 * method+path registrations, so an accidental double-registration fails the
 * deploy instead of shadowing a route at runtime.
 */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import { withApiErrorHandling } from "./lib/http.js";
import { ApiRouter } from "./lib/router.js";
import { API_BASE } from "./lib/config.js";

import { registerApiKeyRoutes } from "./routes/apiKeyRoutes.js";
import { registerAnalyticsRoutes } from "./routes/analyticsRoutes.js";
import { registerCampaignRoutes } from "./routes/campaignRoutes.js";
import { registerConversionRoutes } from "./routes/conversionRoutes.js";
import { registerCreativeRoutes } from "./routes/creativeRoutes.js";
import { registerDeviceRoutes } from "./routes/deviceRoutes.js";
import { registerFinanceRoutes } from "./routes/financeRoutes.js";
import { registerFleetRoutes } from "./routes/fleetRoutes.js";
import { registerNotificationRoutes } from "./routes/notificationRoutes.js";
import { registerSessionRoutes } from "./routes/sessionRoutes.js";
import { registerSettingsRoutes } from "./routes/settingsRoutes.js";
import { registerSupportRoutes } from "./routes/supportRoutes.js";
import { registerWebhookRoutes } from "./routes/webhookRoutes.js";
import { runAggregation } from "./domain/aggregationService.js";
import { reconcileCampaignLifecycle } from "./domain/campaignService.js";

/**
 * Declared here rather than only in the environment so `firebase deploy`
 * wires them into the function's secret store. Both are read lazily by
 * `config.auditSalt` / `config.deviceSecretPepper`, which is why they are only
 * an error at first use and not at module load.
 */
const auditSalt = defineSecret("MOBILITY_AUDIT_SALT");
const deviceSecretPepper = defineSecret("MOBILITY_DEVICE_SECRET_PEPPER");
// Razorpay. Read lazily through `config`; when unset, top-ups answer 503 and
// every webhook is rejected, rather than the function failing to start.
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");
const razorpayWebhookSecret = defineSecret("RAZORPAY_WEBHOOK_SECRET");

setGlobalOptions({
  region: process.env.MOBILITY_REGION ?? process.env.FUNCTION_REGION ?? "asia-south1",
  // A dashboard read should be fast even on a cold start; the aggregation job
  // is the only caller that benefits from a long timeout.
  maxInstances: 20,
});

function buildRouter(): ApiRouter {
  const router = new ApiRouter();

  // First: the client calls this on every load to learn who it is, so it should
  // not sit behind anything that could reject before identity is established.
  registerSessionRoutes(router);
  registerSettingsRoutes(router);
  registerAnalyticsRoutes(router);
  registerCampaignRoutes(router);
  registerCreativeRoutes(router);
  registerFleetRoutes(router);
  registerDeviceRoutes(router);
  registerConversionRoutes(router);
  registerApiKeyRoutes(router);
  registerFinanceRoutes(router);
  registerNotificationRoutes(router);
  registerSupportRoutes(router);
  registerWebhookRoutes(router);

  return router;
}

export const api = onRequest(
  {
    // Secrets are only bound for the HTTP surface; the scheduled job reads the
    // settings document and writes aggregates, and needs no signing material.
    secrets: [auditSalt, deviceSecretPepper, razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret],
    timeoutSeconds: 120,
    memory: "512MiB",
    // The public conversion feed and the dashboard share this function, so it
    // has to accept unauthenticated traffic.
    invoker: "public",
  },
  withApiErrorHandling(buildRouter().handler()),
);

/**
 * Rebuild aggregates and apply retention.
 *
 * Runs hourly. The first run of a day also repairs the trailing window, which is
 * what makes late-arriving offline playback correct instead of permanently
 * missing: a play that syncs six hours after it happened is picked up by the
 * recompute rather than only ever existing in the raw collection.
 *
 * `retryCount` is deliberately not raised: the job is idempotent by
 * construction (deterministic document keys, recomputed values), so a retry only
 * costs writes, and a permanently failing job is a monitoring problem rather
 * than something a longer backoff would solve.
 */
export const runAggregationJob = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540,
    memory: "1GiB",
    retryCount: 0,
  },
  async () => {
    const report = await runAggregation();
    logger.info("Aggregation run finished", {
      daysProcessed: report.daysProcessed.length,
      playbackDailyWritten: report.playbackDailyWritten,
      playbackHourlyWritten: report.playbackHourlyWritten,
      engagementRowsWritten: report.engagementRowsWritten,
      conversionRowsWritten: report.conversionRowsWritten,
      rawEventsScanned: report.rawEventsScanned,
      staleRowsDeleted: report.staleRowsDeleted,
      pruned: report.prunedPlayback + report.prunedEngagement + report.prunedConversions,
      errors: report.errors.length,
    });
    if (report.errors.length > 0) {
      // Surfaced as a failure so the scheduler and any alerting see it. The run
      // is still reported, because a partially-completed repair is useful
      // information rather than something to discard.
      throw new Error(`Aggregation completed with ${report.errors.length} error(s): ${report.errors[0]}`);
    }
  },
);

/**
 * Advance campaigns through their flight window: APPROVED -> SCHEDULED once
 * inside it, SCHEDULED -> RUNNING at the start, RUNNING -> COMPLETED at the end.
 *
 * Without this job nothing ever reaches RUNNING, and ad selection only serves
 * running campaigns — an approved campaign would sit idle forever. Each step is
 * a guarded status transition, so the job is idempotent and a campaign that is
 * both approved and already started simply takes two runs to go live.
 */
export const runCampaignLifecycleJob = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 120,
    retryCount: 0,
  },
  async () => {
    const result = await reconcileCampaignLifecycle();
    if (result.scheduled + result.started + result.completed > 0) {
      logger.info("Campaign lifecycle reconciled", result);
    }
  },
);

/** The path this function is served under, exported so clients cannot drift. */
export { API_BASE };
