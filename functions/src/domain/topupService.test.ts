/**
 * Razorpay webhook handling: the only path by which a gateway payment becomes
 * wallet balance, so every way it could credit wrongly is pinned here.
 */

import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("firebase-functions", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock("../lib/admin.js", () => ({ db: () => { throw new Error("no db in unit tests"); }, nowIso: () => "2026-01-01T00:00:00.000Z" }));

const { handleRazorpayWebhook } = await import("./topupService.js");
const { verifyWebhookSignature, parseCapturedPayment } = await import("../lib/razorpay.js");

const SECRET = "whsec_test";

function sign(body: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function capturedEvent(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_ABC123",
          order_id: "order_XYZ",
          amount: 50_000,
          currency: "INR",
          // Payer-controllable; must never decide attribution.
          notes: { advertiserId: "ADV_ATTACKER" },
          ...overrides,
        },
      },
    },
  });
}

function harness(order: Record<string, unknown> | null = {
  orderId: "order_XYZ",
  advertiserId: "ADV_REAL",
  amountMinor: 50_000,
  currency: "INR",
  receipt: "TXN-AAAAAA",
  status: "CREATED",
}) {
  const credits: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const credited = new Map<string, string>();
  const deps = {
    secret: SECRET,
    getOrder: vi.fn(async () => order as never),
    updateOrder: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
      updates.push(patch);
    }),
    // Models the idempotency record: same key, same transaction.
    credit: vi.fn(async (input: Record<string, unknown>) => {
      credits.push(input);
      const key = String(input.idempotencyKey);
      if (!credited.has(key)) credited.set(key, `TXN_${credited.size + 1}`);
      return { id: credited.get(key)! };
    }),
  };
  return { deps, credits, updates, credited };
}

describe("verifyWebhookSignature", () => {
  it("accepts the HMAC of the exact raw body", () => {
    const body = capturedEvent();
    expect(verifyWebhookSignature(Buffer.from(body), sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body, a wrong secret, and missing inputs", () => {
    const body = capturedEvent();
    expect(verifyWebhookSignature(Buffer.from(body.replace("50000", "99999")), sign(body), SECRET)).toBe(false);
    expect(verifyWebhookSignature(Buffer.from(body), sign(body, "other"), SECRET)).toBe(false);
    expect(verifyWebhookSignature(Buffer.from(body), undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(Buffer.from(body), sign(body), undefined)).toBe(false);
    expect(verifyWebhookSignature(undefined, sign(body), SECRET)).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyWebhookSignature("{}", "abc", SECRET)).toBe(false);
  });
});

describe("parseCapturedPayment", () => {
  it("ignores other event types and malformed amounts", () => {
    expect(parseCapturedPayment({ event: "payment.failed" })).toBeNull();
    expect(parseCapturedPayment(JSON.parse(capturedEvent({ amount: -5 })))).toBeNull();
    expect(parseCapturedPayment(JSON.parse(capturedEvent({ amount: 10.5 })))).toBeNull();
  });
});

describe("handleRazorpayWebhook", () => {
  it("credits the advertiser from the stored order, not from payment notes", async () => {
    const { deps, credits, updates } = harness();
    const body = capturedEvent();
    const outcome = await handleRazorpayWebhook(Buffer.from(body), sign(body), deps);

    expect(outcome.status).toBe("credited");
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      advertiserId: "ADV_REAL",
      amountMinor: 50_000,
      gateway: "RAZORPAY",
      gatewayPaymentId: "pay_ABC123",
      gatewayOrderId: "order_XYZ",
      idempotencyKey: "razorpay_pay_ABC123",
    });
    expect(updates.at(-1)).toMatchObject({ status: "PAID", transactionId: "TXN_1" });
  });

  it("uses the same idempotency key on redelivery, so a retry cannot double-credit", async () => {
    const { deps, credited } = harness();
    const body = capturedEvent();
    const first = await handleRazorpayWebhook(Buffer.from(body), sign(body), deps);
    const second = await handleRazorpayWebhook(Buffer.from(body), sign(body), deps);
    expect(credited.size).toBe(1);
    expect(first).toMatchObject({ transactionId: "TXN_1" });
    expect(second).toMatchObject({ transactionId: "TXN_1" });
  });

  it("rejects an unsigned or mis-signed delivery before reading any state", async () => {
    const { deps } = harness();
    const body = capturedEvent();
    expect(await handleRazorpayWebhook(Buffer.from(body), "0".repeat(64), deps)).toEqual({
      status: "rejected",
      reason: "bad_signature",
    });
    expect(deps.getOrder).not.toHaveBeenCalled();
    expect(deps.credit).not.toHaveBeenCalled();
  });

  it("does not credit when the captured amount differs from the order", async () => {
    const { deps, updates } = harness();
    const body = capturedEvent({ amount: 5_000_000 });
    const outcome = await handleRazorpayWebhook(Buffer.from(body), sign(body), deps);
    expect(outcome).toMatchObject({ status: "ignored", reason: "amount mismatch" });
    expect(deps.credit).not.toHaveBeenCalled();
    expect(updates.at(-1)).toMatchObject({ status: "AMOUNT_MISMATCH" });
  });

  it("ignores payments for orders this platform did not create", async () => {
    const { deps } = harness(null);
    const body = capturedEvent();
    expect(await handleRazorpayWebhook(Buffer.from(body), sign(body), deps)).toMatchObject({
      status: "ignored",
      reason: "unknown order",
    });
    expect(deps.credit).not.toHaveBeenCalled();
  });

  it("acknowledges other signed events without acting", async () => {
    const { deps } = harness();
    const body = JSON.stringify({ event: "order.paid", payload: {} });
    expect(await handleRazorpayWebhook(Buffer.from(body), sign(body), deps)).toMatchObject({ status: "ignored" });
    expect(deps.credit).not.toHaveBeenCalled();
  });
});
