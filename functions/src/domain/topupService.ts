/**
 * Advertiser wallet top-ups through Razorpay.
 *
 * Two steps, and only the second moves money:
 *
 *  1. `createTopupOrder` — an advertiser asks to add funds. The server creates a
 *     Razorpay order and stores `{orderId → advertiserId, amount}` in
 *     `mm_topup_orders`. The browser then opens Checkout for that order.
 *  2. `handleRazorpayWebhook` — Razorpay reports `payment.captured`. After the
 *     signature verifies, the advertiser and the expected amount are read from
 *     the stored order, never from the payload, and the wallet is credited
 *     through `recordVerifiedCredit` with an idempotency key derived from the
 *     payment id, so webhook retries cannot double-credit.
 *
 * The Checkout success callback in the browser is deliberately ignored for
 * crediting: the payer controls it.
 */

import { logger } from "firebase-functions";
import { COLLECTIONS, newReference, type Transaction } from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { config } from "../lib/config.js";
import { ApiError } from "../lib/http.js";
import {
  createOrder,
  parseCapturedPayment,
  publicKeyId,
  verifyWebhookSignature,
  type CapturedPayment,
} from "../lib/razorpay.js";
import { recordVerifiedCredit } from "./financeService.js";

/** ₹100 to ₹10,00,000, in paise. Matches the manual credit ceiling. */
export const TOPUP_MIN_MINOR = 10_000;
export const TOPUP_MAX_MINOR = 100_000_000;

export interface TopupOrderRecord {
  readonly orderId: string;
  readonly advertiserId: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly receipt: string;
  readonly status: "CREATED" | "PAID" | "AMOUNT_MISMATCH";
  readonly createdBy: string;
  readonly createdAt: string;
  readonly transactionId: string | null;
  readonly paymentId: string | null;
}

function orders() {
  return db().collection(COLLECTIONS.topupOrders);
}

export async function createTopupOrder(input: {
  advertiserId: string;
  amountMinor: number;
  userId: string;
}): Promise<{ orderId: string; keyId: string; amountMinor: number; currency: string; receipt: string }> {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor < TOPUP_MIN_MINOR || input.amountMinor > TOPUP_MAX_MINOR) {
    throw ApiError.unprocessable("Top-up amount is outside the allowed range.");
  }
  const keyId = publicKeyId();
  const receipt = newReference("TXN");
  const order = await createOrder({
    amountMinor: input.amountMinor,
    currency: "INR",
    receipt,
    // Informational for anyone reading the Razorpay dashboard. Attribution
    // uses the stored record below, not these notes.
    notes: { advertiserId: input.advertiserId, purpose: "wallet_topup" },
  });
  const record: TopupOrderRecord = {
    orderId: order.id,
    advertiserId: input.advertiserId,
    amountMinor: input.amountMinor,
    currency: "INR",
    receipt,
    status: "CREATED",
    createdBy: input.userId,
    createdAt: nowIso(),
    transactionId: null,
    paymentId: null,
  };
  await orders().doc(order.id).set(record);
  return { orderId: order.id, keyId, amountMinor: input.amountMinor, currency: "INR", receipt };
}

/** Collaborators of the webhook handler, injectable so the decision logic is unit-testable. */
export interface WebhookDeps {
  readonly secret: string | undefined;
  getOrder(orderId: string): Promise<TopupOrderRecord | null>;
  updateOrder(orderId: string, patch: Partial<TopupOrderRecord>): Promise<void>;
  credit(input: Parameters<typeof recordVerifiedCredit>[0]): Promise<Pick<Transaction, "id">>;
}

const defaultDeps: WebhookDeps = {
  get secret() {
    return config.razorpayWebhookSecret;
  },
  async getOrder(orderId) {
    const snapshot = await orders().doc(orderId).get();
    return snapshot.exists ? (snapshot.data() as TopupOrderRecord) : null;
  },
  async updateOrder(orderId, patch) {
    await orders().doc(orderId).set(patch, { merge: true });
  },
  credit: (input) => recordVerifiedCredit(input),
};

export type WebhookOutcome =
  | { readonly status: "rejected"; readonly reason: "bad_signature" | "bad_payload" }
  | { readonly status: "ignored"; readonly reason: string }
  | { readonly status: "credited"; readonly transactionId: string; readonly advertiserId: string; readonly payment: CapturedPayment };

/**
 * Decide and apply a webhook delivery.
 *
 * Every outcome except a bad signature is acknowledged with 200 by the route:
 * Razorpay retries non-2xx responses for a day, and retrying an event we have
 * decided not to act on only adds noise.
 */
export async function handleRazorpayWebhook(
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  deps: WebhookDeps = defaultDeps,
): Promise<WebhookOutcome> {
  if (!verifyWebhookSignature(rawBody, signature, deps.secret)) {
    return { status: "rejected", reason: "bad_signature" };
  }

  let event: unknown;
  try {
    event = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody));
  } catch {
    return { status: "rejected", reason: "bad_payload" };
  }

  const payment = parseCapturedPayment(event);
  if (!payment) return { status: "ignored", reason: "not a payment.captured event" };
  if (!payment.orderId) return { status: "ignored", reason: "payment has no order" };

  const order = await deps.getOrder(payment.orderId);
  if (!order) {
    // A payment for an order this platform did not create — e.g. another
    // integration on the same Razorpay account. Not ours to credit.
    return { status: "ignored", reason: "unknown order" };
  }

  if (payment.amountMinor !== order.amountMinor || payment.currency !== order.currency) {
    logger.error("Razorpay payment amount does not match its order; not crediting", {
      orderId: order.orderId,
      paymentId: payment.paymentId,
      expected: order.amountMinor,
      received: payment.amountMinor,
    });
    await deps.updateOrder(order.orderId, { status: "AMOUNT_MISMATCH", paymentId: payment.paymentId });
    return { status: "ignored", reason: "amount mismatch" };
  }

  const transaction = await deps.credit({
    advertiserId: order.advertiserId,
    amountMinor: order.amountMinor,
    description: `Wallet top-up ${order.receipt}`,
    gateway: "RAZORPAY",
    gatewayPaymentId: payment.paymentId,
    gatewayOrderId: order.orderId,
    // The payment id is unique per captured payment, so every redelivery of
    // the same event lands on the same idempotency record.
    idempotencyKey: `razorpay_${payment.paymentId}`,
  });
  await deps.updateOrder(order.orderId, {
    status: "PAID",
    paymentId: payment.paymentId,
    transactionId: transaction.id,
  });
  return { status: "credited", transactionId: transaction.id, advertiserId: order.advertiserId, payment };
}
