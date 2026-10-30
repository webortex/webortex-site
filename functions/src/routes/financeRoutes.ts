/**
 * Finance endpoints: wallets, transactions, invoices, driver earnings and payouts.
 *
 * Two rules govern everything here:
 *  - money only ever moves from a *verified* gateway confirmation, never from a
 *    client-declared success;
 *  - a payout is created from stored earnings and is reconciled against the
 *    attributed spend, so an operator cannot hand-edit a figure into existence.
 */

import { z } from "zod";
import type { ApiRouter } from "../lib/router.js";
import { ApiError } from "../lib/http.js";
import { first, parseJsonBody, parseQuery, periodSchema } from "../lib/params.js";
import { RATE_LIMITS } from "../middleware/rateLimit.js";
import { assertOwnsAdvertiser, isStaff, requirePermission, type AuthContext } from "../middleware/auth.js";
import { recordAudit } from "../middleware/audit.js";
import { entityId } from "../../../packages/shared/src/index.js";
import {
  assertNoPayoutForPeriod,
  createPayout,
  driverEarnings,
  driverEarningsScope,
  issueInvoice,
  listInvoices,
  listPayouts,
  listTransactions,
  markPayoutProcessed,
  recordFailedTransaction,
  recordVerifiedCredit,
  readTransaction,
  refundTransaction,
  walletFor,
} from "../domain/financeService.js";
import { createTopupOrder, TOPUP_MAX_MINOR, TOPUP_MIN_MINOR } from "../domain/topupService.js";

function advertiserFor(user: AuthContext, requested?: unknown): string {
  if (isStaff(user)) {
    const explicit = first(requested);
    if (explicit) return explicit;
  }
  if (!user.advertiserId) throw ApiError.forbidden("Your account is not linked to an advertiser.");
  return user.advertiserId;
}

/**
 * Which driver and vehicles a payout request is allowed to touch.
 *
 * Derived entirely from the authenticated profile — a driver always gets their
 * own record and their own assigned vehicles, and staff get theirs. There is no
 * request field that can widen this, which is what stops a driver from reading
 * or paying out somebody else's earnings.
 */
async function earningsScopeFor(user: AuthContext): Promise<{ driverId: string; vehicleIds: string[] }> {
  const driverId = user.driverId;
  if (!driverId) throw ApiError.forbidden("Your account is not linked to a driver record.");
  return { driverId, vehicleIds: [...user.vehicleIds] };
}

/**
 * A manually recorded credit: a bank transfer, UPI or cheque that finance staff
 * have reconciled against a statement.
 *
 * Gateway payments are deliberately not accepted here. A Razorpay payment is
 * only credited by `POST /webhooks/razorpay` after its signature verifies;
 * allowing `RAZORPAY` on this route would let anyone holding `finance:write`
 * assert a gateway confirmation that no gateway ever sent.
 */
const creditSchema = z.object({
  amountMinor: z.number().int().positive().max(100_000_000),
  description: z.string().trim().min(3).max(300),
  gateway: z.enum(["UPI", "NETBANKING", "MANUAL"]),
  gatewayPaymentId: z.string().trim().min(4).max(120),
  gatewayOrderId: z.string().trim().min(4).max(120).nullable().optional(),
  campaignId: entityId.nullable().optional(),
  invoiceId: entityId.nullable().optional(),
  taxMinor: z.number().int().nonnegative().default(0),
  idempotencyKey: z.string().trim().min(8).max(128),
  /** Only staff may target another advertiser. */
  advertiserId: entityId.optional(),
});

const failedTransactionSchema = z.object({
  amountMinor: z.number().int().positive().max(100_000_000),
  description: z.string().trim().min(3).max(300),
  gateway: z.enum(["RAZORPAY", "UPI", "NETBANKING", "STRIPE", "MANUAL", "NONE"]),
  gatewayOrderId: z.string().trim().min(4).max(120).nullable().optional(),
  failureCode: z.string().trim().max(60).nullable().optional(),
  failureReason: z.string().trim().max(300).nullable().optional(),
  idempotencyKey: z.string().trim().min(8).max(128),
  advertiserId: entityId.optional(),
});

const refundSchema = z.object({
  amountMinor: z.number().int().positive(),
  reason: z.string().trim().min(5).max(500),
  partial: z.boolean().default(true),
});

const invoiceSchema = z.object({
  advertiserId: entityId,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        quantity: z.number().int().positive().default(1),
        unitMinor: z.number().int().nonnegative(),
        campaignId: entityId.nullable().default(null),
        amountMinor: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(500),
});

const payoutSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["BANK", "UPI", "WALLET", "MANUAL"]),
  /** Staff only: raise the payout for this driver. Everyone else pays out their own record. */
  driverId: entityId.optional(),
});

function listLimit(raw: unknown): number {
  const value = Number(first(raw));
  return Number.isFinite(value) ? Math.min(200, Math.max(1, Math.trunc(value))) : 50;
}

/** Staff with no explicit advertiser get the platform-wide view; everyone else their own. */
function listScope(user: AuthContext, requested: unknown): string | null {
  if (isStaff(user) && !first(requested)) return null;
  return advertiserFor(user, requested);
}

const topupSchema = z.object({
  amountMinor: z.number().int().min(TOPUP_MIN_MINOR).max(TOPUP_MAX_MINOR),
});

const payoutProcessedSchema = z.object({
  gatewayReference: z.string().trim().min(4).max(120),
});

export function registerFinanceRoutes(router: ApiRouter): void {
  router.get(
    "/finance/transactions",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:read");
      return { items: await listTransactions(listScope(user, context.query.advertiserId), listLimit(context.query.limit)) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/finance/invoices",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:read");
      return { items: await listInvoices(listScope(user, context.query.advertiserId), listLimit(context.query.limit)) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/finance/payouts",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "payouts:read");
      let driverId: string | null;
      if (isStaff(user)) {
        driverId = first(context.query.driverId) ?? null;
      } else {
        if (!user.driverId) throw ApiError.forbidden("Your account is not linked to a driver record.");
        driverId = user.driverId;
      }
      return { items: await listPayouts(driverId, listLimit(context.query.limit)) };
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.get(
    "/finance/wallet",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:read");
      return walletFor(advertiserFor(user, context.query.advertiserId));
    },
    { rateLimit: RATE_LIMITS.read },
  );

  /**
   * Start a Razorpay top-up of the caller's own wallet.
   *
   * The advertiser comes from the session, never the body. Nothing is credited
   * here: the wallet moves when the signed `payment.captured` webhook arrives.
   */
  router.post(
    "/finance/topup-orders",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "wallet:topup");
      if (!user.advertiserId) throw ApiError.forbidden("Your account is not linked to an advertiser.");
      const input = parseJsonBody(topupSchema, context.body);
      const order = await createTopupOrder({
        advertiserId: user.advertiserId,
        amountMinor: input.amountMinor,
        userId: user.userId,
      });
      await recordAudit({
        action: "TOPUP_ORDER_CREATED",
        entityType: "TRANSACTION",
        entityId: order.orderId,
        summary: `Top-up order for ${input.amountMinor} minor units created`,
        metadata: { advertiserId: user.advertiserId, receipt: order.receipt },
        principal: user,
      });
      return {
        ...order,
        prefill: { name: user.fullName, email: user.email, contact: user.phone },
      };
    },
    { rateLimit: RATE_LIMITS.write },
  );

  /**
   * Record a manually reconciled credit (bank transfer, UPI, cheque).
   *
   * `idempotencyKey` is mandatory so a double-submitted form cannot credit the
   * advertiser twice.
   */
  router.post(
    "/finance/credits",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:write");
      const input = parseJsonBody(creditSchema, context.body);
      const advertiserId = advertiserFor(user, input.advertiserId);
      const transaction = await recordVerifiedCredit({
        advertiserId,
        amountMinor: input.amountMinor,
        description: input.description,
        gateway: input.gateway,
        gatewayPaymentId: input.gatewayPaymentId,
        gatewayOrderId: input.gatewayOrderId ?? null,
        campaignId: input.campaignId ?? null,
        invoiceId: input.invoiceId ?? null,
        taxMinor: input.taxMinor,
        idempotencyKey: input.idempotencyKey,
      });
      await recordAudit({
        action: "PAYMENT_RECORDED",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        summary: `Credit of ${input.amountMinor} minor units recorded`,
        metadata: { advertiserId, gateway: input.gateway },
        principal: user,
      });
      return transaction;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/finance/transactions/failed",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:write");
      const input = parseJsonBody(failedTransactionSchema, context.body);
      const advertiserId = advertiserFor(user, input.advertiserId);
      const transaction = await recordFailedTransaction({
        advertiserId,
        amountMinor: input.amountMinor,
        description: input.description,
        gateway: input.gateway,
        gatewayOrderId: input.gatewayOrderId ?? null,
        failureCode: input.failureCode ?? null,
        failureReason: input.failureReason ?? null,
        idempotencyKey: input.idempotencyKey,
      });
      await recordAudit({
        action: "PAYMENT_FAILED",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        summary: `Failed payment recorded for ${advertiserId}`,
        principal: user,
      });
      return transaction;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/finance/transactions/:transactionId/refund",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:write");
      const input = parseJsonBody(refundSchema, context.body);
      const transactionId = context.params.transactionId!;
      // A refund debits a wallet and writes a REFUND row, so ownership has to be
      // established first. Authorising from the result of the refund meant any
      // caller holding `finance:write` could move another tenant's money and was
      // only rejected afterwards, once the money was already gone.
      const existing = await readTransaction(transactionId);
      assertOwnsAdvertiser(user, existing.advertiserId);
      const transaction = await refundTransaction(transactionId, input.amountMinor, {
        reason: input.reason,
        actorId: user.userId,
        partial: input.partial,
      });
      await recordAudit({
        action: "PAYMENT_REFUNDED",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        summary: `Refund of ${input.amountMinor} minor units issued`,
        metadata: { reason: input.reason },
        principal: user,
      });
      return transaction;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/finance/invoices",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "finance:write");
      const input = parseJsonBody(invoiceSchema, context.body);
      const advertiserId = advertiserFor(user, input.advertiserId);
      const invoice = await issueInvoice({
        advertiserId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        lineItems: input.lineItems,
      });
      await recordAudit({
        action: "INVOICE_ISSUED",
        entityType: "INVOICE",
        entityId: invoice.id,
        summary: `Invoice issued for ${advertiserId}`,
        metadata: { advertiserId, periodStart: input.periodStart, periodEnd: input.periodEnd },
        principal: user,
      });
      return invoice;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  /**
   * Driver earnings for a period.
   *
   * The vehicle scope is derived server-side from the caller's own driver
   * record; a driver cannot request earnings for someone else's vehicle.
   */
  router.get(
    "/finance/earnings",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "payouts:read");
      const period = parseQuery(periodSchema, context.query);
      const scope = await earningsScopeFor(user);
      return driverEarnings(scope.driverId, scope.vehicleIds, period);
    },
    { rateLimit: RATE_LIMITS.read },
  );

  router.post(
    "/finance/payouts",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "payouts:write");
      const input = parseJsonBody(payoutSchema, context.body);
      if (input.driverId && !isStaff(user)) {
        throw ApiError.forbidden("Only finance staff can raise a payout for another driver.");
      }
      const scope = input.driverId ? await driverEarningsScope(input.driverId) : await earningsScopeFor(user);
      await assertNoPayoutForPeriod(scope.driverId, input.periodStart, input.periodEnd);
      // Earnings are recomputed server-side from the raw ledger rather than
      // accepted from the client, so a payout can never be inflated by a
      // hand-crafted body.
      const earnings = await driverEarnings(scope.driverId, scope.vehicleIds, {
        start: input.periodStart,
        end: input.periodEnd,
      });
      if (earnings.netMinor <= 0) {
        throw ApiError.unprocessable("There are no payable earnings for this period.");
      }
      const payout = await createPayout({
        driverId: scope.driverId,
        vehicleId: scope.vehicleIds[0] ?? null,
        ownerUserId: user.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        earnings,
        method: input.method,
      });
      await recordAudit({
        action: "PAYOUT_CREATED",
        entityType: "PAYOUT",
        entityId: payout.id,
        summary: `Payout ${payout.reference} created for ${payout.netMinor} minor units`,
        metadata: { periodStart: input.periodStart, periodEnd: input.periodEnd, method: input.method },
        principal: user,
      });
      return payout;
    },
    { rateLimit: RATE_LIMITS.write },
  );

  router.post(
    "/finance/payouts/:payoutId/processed",
    "user",
    async (context) => {
      const user = context.user();
      requirePermission(user, "payouts:write");
      const input = parseJsonBody(payoutProcessedSchema, context.body);
      const payout = await markPayoutProcessed(context.params.payoutId!, input.gatewayReference, user.userId);
      await recordAudit({
        action: "PAYOUT_PROCESSED",
        entityType: "PAYOUT",
        entityId: payout.id,
        summary: `Payout ${payout.reference} marked processed`,
        metadata: { gatewayReference: input.gatewayReference },
        principal: user,
      });
      return payout;
    },
    { rateLimit: RATE_LIMITS.write },
  );
}
