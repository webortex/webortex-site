/**
 * Razorpay integration: order creation and webhook verification.
 *
 * No SDK. Both operations are a single HTTPS call or an HMAC, and the SDK would
 * add a dependency to the trusted tier for no extra safety.
 *
 * Money discipline: creating an order moves nothing. A wallet is credited only
 * from a `payment.captured` webhook whose signature verifies against
 * `RAZORPAY_WEBHOOK_SECRET` — never from the browser's checkout callback, which
 * the payer controls.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { ApiError } from "./http.js";

const ORDERS_URL = "https://api.razorpay.com/v1/orders";

/**
 * Verify `X-Razorpay-Signature`: hex HMAC-SHA256 of the *raw* request body.
 *
 * Must be computed over the exact bytes received. Re-serialising the parsed JSON
 * changes whitespace and key order and would reject every genuine delivery.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string | undefined,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!rawBody || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(signature.trim(), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface RazorpayOrder {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly receipt: string | null;
  readonly notes: Record<string, string>;
}

/** Thrown when the gateway is not configured, so callers can return a clear 503. */
export function gatewayUnavailable(): ApiError {
  return new ApiError(503, "GATEWAY_UNAVAILABLE", "Online payments are not configured. Contact support to add funds.");
}

function basicAuth(): string {
  const keyId = config.razorpayKeyId;
  const keySecret = config.razorpayKeySecret;
  if (!keyId || !keySecret) throw gatewayUnavailable();
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

/** Public key id for Razorpay Checkout. Safe to send to the browser. */
export function publicKeyId(): string {
  const keyId = config.razorpayKeyId;
  if (!keyId) throw gatewayUnavailable();
  return keyId;
}

export async function createOrder(input: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayOrder> {
  const response = await (input.fetchImpl ?? fetch)(ORDERS_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!response.ok) {
    // The gateway's error body can echo request details; it is not forwarded.
    throw new ApiError(502, "GATEWAY_ERROR", "The payment gateway could not create an order. Try again shortly.");
  }
  const order = (await response.json()) as RazorpayOrder;
  return order;
}

/**
 * The parts of a `payment.captured` event the platform acts on.
 *
 * `notes` here are the *payment's* notes, which Checkout lets the payer set, so
 * they are informational only. Attribution comes from the order record the
 * server stored when it created the order (see `topupService.ts`).
 */
export interface CapturedPayment {
  readonly paymentId: string;
  readonly orderId: string | null;
  readonly amountMinor: number;
  readonly currency: string;
  readonly notes: Record<string, string>;
}

export function parseCapturedPayment(event: unknown): CapturedPayment | null {
  if (!event || typeof event !== "object") return null;
  const record = event as { event?: unknown; payload?: { payment?: { entity?: Record<string, unknown> } } };
  if (record.event !== "payment.captured") return null;
  const entity = record.payload?.payment?.entity;
  if (!entity) return null;
  const paymentId = typeof entity.id === "string" ? entity.id : null;
  const amount = typeof entity.amount === "number" ? entity.amount : null;
  if (!paymentId || amount === null || !Number.isInteger(amount) || amount <= 0) return null;
  const notes =
    entity.notes && typeof entity.notes === "object" && !Array.isArray(entity.notes)
      ? Object.fromEntries(
          Object.entries(entity.notes as Record<string, unknown>).filter(([, value]) => typeof value === "string"),
        ) as Record<string, string>
      : {};
  return {
    paymentId,
    orderId: typeof entity.order_id === "string" ? entity.order_id : null,
    amountMinor: amount,
    currency: typeof entity.currency === "string" ? entity.currency : "INR",
    notes,
  };
}
