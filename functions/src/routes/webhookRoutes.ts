/**
 * Inbound gateway webhooks.
 *
 * Public by necessity — Razorpay has no user session — so authentication is the
 * HMAC signature over the raw body, checked in `handleRazorpayWebhook` before
 * anything is parsed or trusted.
 */

import { logger } from "firebase-functions";
import type { ApiRouter } from "../lib/router.js";
import { ApiError, headerValue } from "../lib/http.js";
import { recordAudit } from "../middleware/audit.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { handleRazorpayWebhook } from "../domain/topupService.js";

export function registerWebhookRoutes(router: ApiRouter): void {
  router.post(
    "/webhooks/razorpay",
    "public",
    async (context) => {
      const outcome = await handleRazorpayWebhook(
        context.request.rawBody,
        headerValue(context.request, "X-Razorpay-Signature"),
      );

      if (outcome.status === "rejected") {
        // Only the reason is recorded. The body of an unverified request is
        // attacker-controlled and is not worth persisting.
        await recordAudit({
          action: "WEBHOOK_REJECTED",
          entityType: "TRANSACTION",
          summary: `Razorpay webhook rejected: ${outcome.reason}`,
          metadata: { reason: outcome.reason },
        });
        throw ApiError.unauthorised("Webhook signature could not be verified.");
      }

      if (outcome.status === "ignored") {
        logger.info("Razorpay webhook acknowledged without action", { reason: outcome.reason });
        return { acknowledged: true, action: "none" };
      }

      await recordAudit({
        action: "PAYMENT_RECORDED",
        entityType: "TRANSACTION",
        entityId: outcome.transactionId,
        summary: `Razorpay top-up of ${outcome.payment.amountMinor} minor units credited`,
        metadata: {
          advertiserId: outcome.advertiserId,
          gateway: "RAZORPAY",
          paymentId: outcome.payment.paymentId,
          orderId: outcome.payment.orderId,
        },
      });
      return { acknowledged: true, action: "credited" };
    },
    // Keyed by source IP; Razorpay delivers from a small set of addresses, so
    // this uses the server-to-server allowance rather than the public one.
    { rateLimit: RATE_LIMITS.api },
  );
}
