/**
 * Finance service: advertiser wallets, transactions, invoices, driver earnings,
 * payouts and platform revenue.
 *
 * The invariant that matters most: a transaction is only `SUCCESS` once a
 * server-side verification has confirmed it. There is no code path in which a
 * client-supplied status flips a transaction to SUCCESS.
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  EMPTY_REVENUE_INPUT,
  newId,
  newReference,
  settleDriverRevenue,
  splitSpend,
  type DriverEarnings,
  type Invoice,
  type Payout,
  type RevenueAnalytics,
  type RevenueBreakdown,
  type Transaction,
  type Wallet,
} from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";

function txns() {
  return db().collection(COLLECTIONS.transactions);
}

/** Local accumulators are mutated in a loop; the response type is readonly. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

export async function walletFor(advertiserId: string): Promise<Wallet> {
  const snapshot = await db().collection(COLLECTIONS.wallets).doc(advertiserId).get();
  if (snapshot.exists) return snapshot.data() as Wallet;
  return {
    advertiserId,
    currency: "INR",
    balanceMinor: 0,
    totalCreditedMinor: 0,
    totalDebitedMinor: 0,
    creditLimitMinor: 0,
    autoTopUpEnabled: false,
    autoTopUpThresholdMinor: 0,
    autoTopUpAmountMinor: 0,
    updatedAt: nowIso(),
  };
}

/**
 * Record a verified credit.
 *
 * `verifiedAt` must be supplied by the gateway verification path. There is no
 * "mark as paid" client action anywhere in this service.
 */
export async function recordVerifiedCredit(input: {
  advertiserId: string;
  amountMinor: number;
  description: string;
  gateway: Transaction["gateway"];
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
  gatewaySignature?: string | null;
  campaignId?: string | null;
  invoiceId?: string | null;
  idempotencyKey?: string | null;
  taxMinor?: number;
}): Promise<Transaction> {
  if (input.amountMinor <= 0) throw ApiError.unprocessable("Credit amount must be positive.");

  const idempotencyRef = input.idempotencyKey
    ? db().collection(COLLECTIONS.idempotency).doc(input.idempotencyKey)
    : null;

  const id = newId("TXN");
  const reference = newReference("TXN");
  const now = nowIso();
  const document = {
    id,
    reference,
    advertiserId: input.advertiserId,
    userId: null,
    campaignId: input.campaignId ?? null,
    type: "CREDIT",
    status: "SUCCESS",
    amountMinor: Math.round(input.amountMinor),
    currency: "INR",
    description: input.description.slice(0, 300),
    gateway: input.gateway,
    gatewayPaymentId: input.gatewayPaymentId ?? null,
    gatewayOrderId: input.gatewayOrderId ?? null,
    gatewaySignature: input.gatewaySignature ?? null,
    failureCode: null,
    failureReason: null,
    verifiedAt: now,
    refundedMinor: 0,
    taxMinor: input.taxMinor ?? 0,
    invoiceId: input.invoiceId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // The idempotency check and the credit commit in one transaction. Gateway
  // webhooks are retried and can arrive concurrently; a read-then-write outside a
  // transaction would let two deliveries both see "not yet credited" and credit
  // the wallet twice.
  const transactionId = await db().runTransaction(async (tx) => {
    if (idempotencyRef) {
      const existing = await tx.get(idempotencyRef);
      const existingTransactionId = existing.exists ? existing.data()?.transactionId : null;
      if (typeof existingTransactionId === "string" && existingTransactionId.length > 0) {
        return existingTransactionId;
      }
    }
    tx.set(txns().doc(id), document);
    tx.set(
      db().collection(COLLECTIONS.wallets).doc(input.advertiserId),
      {
        advertiserId: input.advertiserId,
        balanceMinor: FieldValue.increment(input.amountMinor),
        totalCreditedMinor: FieldValue.increment(input.amountMinor),
        currency: "INR",
        updatedAt: now,
      },
      { merge: true },
    );
    if (idempotencyRef) tx.set(idempotencyRef, { transactionId: id, createdAt: now });
    return id;
  });

  const created = await txns().doc(transactionId).get();
  return created.data() as Transaction;
}

export async function recordFailedTransaction(input: {
  advertiserId: string;
  amountMinor: number;
  description: string;
  gateway: Transaction["gateway"];
  gatewayOrderId?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  idempotencyKey?: string | null;
}): Promise<Transaction> {
  const id = newId("TXN");
  const now = nowIso();
  const document = {
    id,
    reference: newReference("TXN"),
    advertiserId: input.advertiserId,
    userId: null,
    campaignId: null,
    type: "CREDIT",
    status: "FAILED",
    amountMinor: Math.round(input.amountMinor),
    currency: "INR",
    description: input.description.slice(0, 300),
    gateway: input.gateway,
    gatewayPaymentId: null,
    gatewayOrderId: input.gatewayOrderId ?? null,
    gatewaySignature: null,
    failureCode: input.failureCode ?? null,
    // Surface the gateway's reason but never its raw payload.
    failureReason: (input.failureReason ?? "Payment was declined.").slice(0, 500),
    verifiedAt: now,
    refundedMinor: 0,
    taxMinor: 0,
    invoiceId: null,
    createdAt: now,
    updatedAt: now,
  };
  await txns().doc(id).set(document);
  if (input.idempotencyKey) {
    await db().collection(COLLECTIONS.idempotency).doc(input.idempotencyKey).set({ transactionId: id, createdAt: now });
  }
  const created = await txns().doc(id).get();
  return created.data() as Transaction;
}

/**
 * Read-only lookup, so a caller can authorize against the transaction's owner
 * *before* any money moves. `refundTransaction` mutates the wallet and writes a
 * REFUND row, so checking ownership from its return value means the check runs
 * after the fact and the money has already left.
 *
 * `advertiserId` on a transaction is immutable once written, so reading it here
 * and re-reading inside the refund cannot disagree about who owns it.
 */
export async function readTransaction(transactionId: string): Promise<Transaction> {
  const snapshot = await txns().doc(transactionId).get();
  if (!snapshot.exists) throw ApiError.notFound("Transaction not found.");
  return snapshot.data() as Transaction;
}

export async function refundTransaction(
  transactionId: string,
  amountMinor: number,
  options: { reason: string; actorId: string; partial: boolean },
): Promise<Transaction> {
  const snapshot = await txns().doc(transactionId).get();
  if (!snapshot.exists) throw ApiError.notFound("Transaction not found.");
  const transaction = snapshot.data() as Transaction;

  if (transaction.status !== "SUCCESS" && transaction.status !== "PARTIALLY_REFUNDED") {
    throw ApiError.conflict(`A transaction in "${transaction.status}" cannot be refunded.`);
  }
  const alreadyRefunded = transaction.refundedMinor;
  const remaining = Math.abs(transaction.amountMinor) - alreadyRefunded;
  if (amountMinor <= 0 || amountMinor > remaining) {
    throw ApiError.unprocessable(`Refund must be between 1 and ${remaining} minor units.`);
  }

  const totalRefunded = alreadyRefunded + amountMinor;
  const nextStatus: Transaction["status"] =
    totalRefunded >= Math.abs(transaction.amountMinor) ? "REFUNDED" : "PARTIALLY_REFUNDED";

  const now = nowIso();
  const batch = db().batch();
  batch.update(txns().doc(transactionId), {
    status: nextStatus,
    refundedMinor: totalRefunded,
    updatedAt: now,
    failureReason: options.reason.slice(0, 500),
  });

  if (transaction.advertiserId) {
    batch.set(
      db().collection(COLLECTIONS.wallets).doc(transaction.advertiserId),
      { balanceMinor: FieldValue.increment(-amountMinor), updatedAt: now },
      { merge: true },
    );
  }

  const refundId = newId("TXN");
  batch.set(txns().doc(refundId), {
    id: refundId,
    reference: newReference("TXN"),
    advertiserId: transaction.advertiserId,
    userId: null,
    campaignId: transaction.campaignId,
    type: "REFUND",
    status: "SUCCESS",
    amountMinor: -Math.round(amountMinor),
    currency: transaction.currency,
    description: `Refund for ${transaction.reference}: ${options.reason}`.slice(0, 300),
    gateway: transaction.gateway,
    gatewayPaymentId: null,
    gatewayOrderId: null,
    gatewaySignature: null,
    failureCode: null,
    failureReason: null,
    verifiedAt: now,
    refundedMinor: 0,
    taxMinor: 0,
    invoiceId: transaction.invoiceId,
    createdAt: now,
    updatedAt: now,
    refundsTransactionId: transactionId,
    approvedBy: options.actorId,
  });

  await batch.commit();
  const updated = await txns().doc(transactionId).get();
  return updated.data() as Transaction;
}

export async function issueInvoice(input: {
  advertiserId: string;
  periodStart: string;
  periodEnd: string;
  lineItems: Invoice["lineItems"];
}): Promise<Invoice> {
  const settings = await getSettings();
  const subtotal = input.lineItems.reduce((total, item) => total + item.amountMinor, 0);
  if (subtotal <= 0) throw ApiError.unprocessable("An invoice must have a positive subtotal.");

  const taxMinor = Math.round((subtotal * settings.revenue.taxPercent) / 100);
  const paid = await paidAmountFor(input.advertiserId);
  const total = subtotal + taxMinor;
  const outstanding = Math.max(0, total - paid);

  const id = newId("INV");
  const now = nowIso();
  const document = {
    id,
    number: newReference("INV"),
    advertiserId: input.advertiserId,
    status: outstanding === 0 ? "PAID" : "ISSUED",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    currency: settings.currency,
    subtotalMinor: subtotal,
    taxPercent: settings.revenue.taxPercent,
    taxMinor,
    totalMinor: total,
    paidMinor: paid,
    dueMinor: outstanding,
    lineItems: input.lineItems,
    issuedAt: now,
    dueOn: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
    paidAt: outstanding === 0 ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  await db().collection(COLLECTIONS.invoices).doc(id).set(document);
  const snapshot = await db().collection(COLLECTIONS.invoices).doc(id).get();
  return snapshot.data() as Invoice;
}

async function paidAmountFor(advertiserId: string): Promise<number> {
  const snapshot = await txns()
    .where("advertiserId", "==", advertiserId)
    .where("status", "in", ["SUCCESS", "PARTIALLY_REFUNDED"])
    .limit(5000)
    .get();
  return snapshot.docs.reduce((total, doc) => {
    const data = doc.data();
    if (data.type !== "CREDIT" && data.type !== "TOPUP") return total;
    return total + Math.abs(Number(data.amountMinor ?? 0)) - Number(data.refundedMinor ?? 0);
  }, 0);
}

/** Firestore `in` accepts at most 30 values. */
const IN_LIMIT = 30;

function chunk<T>(items: readonly T[]): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += IN_LIMIT) output.push(items.slice(i, i + IN_LIMIT));
  return output;
}

const EARNING_VEHICLE_STATUSES: ReadonlySet<string> = new Set(["ACTIVE", "VERIFIED", "MAINTENANCE"]);

/**
 * Driver earnings for a period.
 *
 * Three entitlement sources, all scoped to the vehicles this driver actually ran:
 *  - the monthly availability guarantee, pro-rated by the share of a month the
 *    period covers, so a three-day period is not paid a full month;
 *  - the driver's pool share of the spend those vehicles' screens attracted;
 *  - engagement and conversion shares from verified conversions attributed to
 *    the zones and cities those vehicles serve.
 *
 * Conversions from other zones or cities are excluded deliberately: paying a
 * driver for inventory they did not carry is not a rounding error, it is a
 * misstatement of what the network sold.
 */
export async function driverEarnings(
  driverId: string,
  vehicleIds: readonly string[],
  period: { start: string; end: string },
): Promise<DriverEarnings> {
  const settings = await getSettings();
  const firestore = db();

  const periodStart = Date.parse(`${period.start}T00:00:00.000Z`);
  const periodEnd = Date.parse(`${period.end}T00:00:00.000Z`);
  const periodDays = Math.max(1, Math.round((periodEnd - periodStart) / 86_400_000) + 1);
  // The guarantee is documented as monthly, so a partial period earns a share of it.
  const monthShare = Math.min(1, periodDays / 30);

  let baseMinor = 0;
  let activeDays = 0;
  let plays = 0;
  let engagements = 0;
  let attributedSpendMinor = 0;
  const zoneIds = new Set<string>();
  const cityIds = new Set<string>();
  const earningVehicleIds: string[] = [];

  if (vehicleIds.length > 0) {
    const vehicleSnapshots = await firestore.getAll(
      ...vehicleIds.slice(0, IN_LIMIT).map((id) => firestore.collection(COLLECTIONS.vehicles).doc(id)),
    );
    for (const snapshot of vehicleSnapshots) {
      if (!snapshot.exists) continue;
      const vehicle = snapshot.data() as {
        status: string;
        homeZoneId?: string | null;
        cityId?: string | null;
      };
      if (vehicle.homeZoneId) zoneIds.add(vehicle.homeZoneId);
      if (vehicle.cityId) cityIds.add(vehicle.cityId);
      if (EARNING_VEHICLE_STATUSES.has(vehicle.status)) {
        earningVehicleIds.push(snapshot.id);
        baseMinor += Math.round(settings.revenue.baseVehiclePayoutMinor * monthShare);
      }
    }

    for (const group of chunk(earningVehicleIds)) {
      const dailySnapshot = await firestore
        .collection(COLLECTIONS.playbackDaily)
        .where("vehicleId", "in", group)
        .where("date", ">=", period.start)
        .where("date", "<=", period.end)
        .limit(3_000)
        .get();

      const days = new Set<string>();
      for (const doc of dailySnapshot.docs) {
        const data = doc.data();
        // Every row counts toward spend and volume; only the day set is
        // de-duplicated, because one vehicle has many campaign rows per day.
        attributedSpendMinor += Number(data.spendMinor ?? 0);
        plays += Number(data.plays ?? 0);
        engagements += Number(data.engagements ?? 0);
        days.add(String(data.date));
      }
      activeDays = Math.max(activeDays, days.size);
    }
  }
  // The driver earns the pool remainder of the spend their own screens attracted.
  const playbackMinor = Math.round(
    attributedSpendMinor * Math.max(0, 1 - settings.revenue.platformShare - settings.revenue.operationsReserve),
  );

  let engagementMinor = 0;
  let conversionMinor = 0;
  if (zoneIds.size > 0 || cityIds.size > 0) {
    const scoped = await db()
      .collection(COLLECTIONS.conversions)
      .where("verified", "==", true)
      .where("occurredAt", ">=", `${period.start}T00:00:00.000Z`)
      .where("occurredAt", "<=", `${period.end}T23:59:59.999Z`)
      .limit(5_000)
      .get();

    for (const doc of scoped.docs) {
      const data = doc.data();
      const zoneId = (data.attributionZoneId as string | null) ?? null;
      const cityId = (data.attributionCityId as string | null) ?? null;
      const inScope = (zoneId !== null && zoneIds.has(zoneId)) || (cityId !== null && cityIds.has(cityId));
      if (!inScope) continue;
      const value = Number(data.valueMinor ?? 0);
      if (value <= 0) continue;
      if (data.type === "PURCHASE") conversionMinor += Math.round(value * settings.revenue.conversionShare);
      else engagementMinor += Math.round(value * settings.revenue.engagementShare);
    }
  }

  const settlement = settleDriverRevenue(
    {
      ...EMPTY_REVENUE_INPUT,
      basePayoutMinor: baseMinor,
      playbackEarningsMinor: playbackMinor,
      engagementEarningsMinor: engagementMinor,
      conversionEarningsMinor: conversionMinor,
      attributedSpendMinor,
    },
    settings.revenue,
  );

  return {
    driverId,
    vehicleId: vehicleIds[0] ?? null,
    periodStart: period.start,
    periodEnd: period.end,
    currency: settings.currency,
    baseMinor,
    playbackMinor,
    engagementMinor,
    conversionMinor,
    bonusMinor: 0,
    penaltyMinor: 0,
    grossMinor: settlement.driverGrossMinor,
    attributedSpendMinor,
    taxWithheldMinor: Math.abs(settlement.taxWithheldMinor),
    netMinor: settlement.driverNetMinor,
    activeDays,
    plays,
    engagements,
  };
}

export async function createPayout(input: {
  driverId: string | null;
  vehicleId: string | null;
  ownerUserId: string | null;
  periodStart: string;
  periodEnd: string;
  earnings: DriverEarnings;
  method: Payout["method"];
}): Promise<Payout> {
  const settings = await getSettings();
  const settlement = settleDriverRevenue(
    {
      ...EMPTY_REVENUE_INPUT,
      basePayoutMinor: input.earnings.baseMinor,
      playbackEarningsMinor: input.earnings.playbackMinor,
      engagementEarningsMinor: input.earnings.engagementMinor,
      conversionEarningsMinor: input.earnings.conversionMinor,
      bonusMinor: input.earnings.bonusMinor,
      penaltyMinor: input.earnings.penaltyMinor,
      attributedSpendMinor: input.earnings.attributedSpendMinor,
    },
    settings.revenue,
  );

  const id = newId("PAY");
  const reference = newReference("PAY");
  const now = nowIso();
  const payableOn = new Date(Date.parse(input.periodEnd) + settings.revenue.payoutDelayDays * 86_400_000).toISOString().slice(0, 10);

  const document = {
    id,
    reference,
    driverId: input.driverId,
    vehicleId: input.vehicleId,
    ownerUserId: input.ownerUserId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    currency: settings.currency,
    grossMinor: settlement.driverGrossMinor,
    taxWithheldMinor: Math.abs(settlement.taxWithheldMinor),
    netMinor: settlement.driverNetMinor,
    status: "SCHEDULED",
    ledger: settlement.entries.map((entry) => ({ kind: entry.kind, amountMinor: entry.amountMinor, note: entry.note })),
    method: input.method,
    gatewayReference: null,
    failureReason: null,
    scheduledFor: payableOn,
    processedAt: null,
    approvedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = db().batch();
  batch.set(db().collection(COLLECTIONS.payouts).doc(id), document);
  batch.set(
    db().collection(COLLECTIONS.payoutLedger).doc(`${id}_ledger`),
    {
      id: `${id}_ledger`,
      payoutId: id,
      driverId: input.driverId,
      entries: settlement.entries,
      createdAt: now,
    },
    { merge: true },
  );
  await batch.commit();

  const snapshot = await db().collection(COLLECTIONS.payouts).doc(id).get();
  return snapshot.data() as Payout;
}

/**
 * Mark a payout processed. Only a finance role may call this, and the gateway
 * reference is mandatory so an untraceable payout is impossible to record.
 */
export async function markPayoutProcessed(
  payoutId: string,
  gatewayReference: string,
  actorId: string,
): Promise<Payout> {
  if (!gatewayReference || gatewayReference.length < 4) {
    throw ApiError.badRequest("A gateway payout reference is required.");
  }
  const snapshot = await db().collection(COLLECTIONS.payouts).doc(payoutId).get();
  if (!snapshot.exists) throw ApiError.notFound("Payout not found.");
  const payout = snapshot.data() as Payout;
  if (payout.status === "PAID") throw ApiError.conflict("This payout has already been processed.");
  if (payout.status === "ON_HOLD") throw ApiError.conflict("This payout is on hold and cannot be processed.");

  const now = nowIso();
  await db()
    .collection(COLLECTIONS.payouts)
    .doc(payoutId)
    .update({ status: "PAID", gatewayReference, processedAt: now, approvedBy: actorId, updatedAt: now });

  const updated = await db().collection(COLLECTIONS.payouts).doc(payoutId).get();
  return updated.data() as Payout;
}

export async function revenueAnalytics(range: { from: string; to: string }): Promise<RevenueAnalytics> {
  const settings = await getSettings();

  const [transactions, payouts] = await Promise.all([
    db().collection(COLLECTIONS.transactions).where("createdAt", ">=", `${range.from}T00:00:00.000Z`).where("createdAt", "<=", `${range.to}T23:59:59.999Z`).limit(5000).get(),
    db().collection(COLLECTIONS.payouts).where("createdAt", ">=", `${range.from}T00:00:00.000Z`).where("createdAt", "<=", `${range.to}T23:59:59.999Z`).limit(5000).get(),
  ]);

  // Accumulated locally, then frozen into the response type at the end.
  const totals: Mutable<RevenueBreakdown> = {
    grossSpendMinor: 0,
    platformRevenueMinor: 0,
    operationsReserveMinor: 0,
    driverPayoutMinor: 0,
    advertisingSpendMinor: 0,
    outstandingMinor: 0,
    pendingPaymentsMinor: 0,
    refundsMinor: 0,
    taxCollectedMinor: 0,
    netRevenueMinor: 0,
  };
  const byDay = new Map<string, { grossMinor: number; platformMinor: number; driverMinor: number }>();

  for (const doc of transactions.docs) {
    const data = doc.data();
    const amount = Number(data.amountMinor ?? 0);
    const day = String(data.createdAt ?? "").slice(0, 10);
    const bucket = byDay.get(day) ?? { grossMinor: 0, platformMinor: 0, driverMinor: 0 };

    if (data.type === "CREDIT" || data.type === "TOPUP") {
      if (data.status === "SUCCESS") {
        totals.grossSpendMinor += Math.abs(amount);
        bucket.grossMinor += Math.abs(amount);
        const split = splitSpend(Math.abs(amount), settings.revenue);
        totals.platformRevenueMinor += split.platformMinor;
        totals.operationsReserveMinor += split.operationsReserveMinor;
        totals.driverPayoutMinor += split.driverPoolMinor;
        bucket.platformMinor += split.platformMinor;
        bucket.driverMinor += split.driverPoolMinor;
        totals.advertisingSpendMinor += Math.abs(amount);
      } else if (data.status === "PENDING") {
        totals.pendingPaymentsMinor += Math.abs(amount);
      }
      totals.taxCollectedMinor += Number(data.taxMinor ?? 0);
    } else if (data.type === "REFUND") {
      totals.refundsMinor += Math.abs(amount);
    } else if (data.type === "CHARGE" || data.type === "DEBIT") {
      if (data.status === "SUCCESS") totals.outstandingMinor += Math.abs(amount);
      if (data.status === "PENDING") totals.pendingPaymentsMinor += Math.abs(amount);
    }

    byDay.set(day, bucket);
  }

  for (const doc of payouts.docs) {
    const data = doc.data();
    if (data.status === "PAID") totals.driverPayoutMinor += Number(data.netMinor ?? 0);
  }

  totals.netRevenueMinor = totals.platformRevenueMinor + totals.operationsReserveMinor;

  const series = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, value]) => ({ bucket, ...value }));

  return {
    range,
    totals,
    series,
    byAdvertiser: [],
    byCampaign: [],
    byVehicle: [],
    byZone: [],
    isDemoData: false,
  };
}
/* ----------------------------------------------------------- list views -- */

/**
 * Newest-first page of a finance collection, optionally scoped to one owner.
 *
 * Scoped reads use an `(owner ASC, createdAt DESC)` composite index declared in
 * `firestore.indexes.json`; the unscoped staff view orders on the single-field
 * index Firestore maintains automatically.
 */
async function newestFirst<T>(
  collection: string,
  scope: { field: string; value: string } | null,
  limit: number,
): Promise<T[]> {
  let query: FirebaseFirestore.Query = db().collection(collection);
  if (scope) query = query.where(scope.field, "==", scope.value);
  const snapshot = await query.orderBy("createdAt", "desc").limit(Math.min(200, Math.max(1, limit))).get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

export function listTransactions(advertiserId: string | null, limit = 50): Promise<Transaction[]> {
  return newestFirst<Transaction>(COLLECTIONS.transactions, advertiserId ? { field: "advertiserId", value: advertiserId } : null, limit);
}

export function listInvoices(advertiserId: string | null, limit = 50): Promise<Invoice[]> {
  return newestFirst<Invoice>(COLLECTIONS.invoices, advertiserId ? { field: "advertiserId", value: advertiserId } : null, limit);
}

export function listPayouts(driverId: string | null, limit = 50): Promise<Payout[]> {
  return newestFirst<Payout>(COLLECTIONS.payouts, driverId ? { field: "driverId", value: driverId } : null, limit);
}

/**
 * The vehicles a driver's earnings are computed over, for a payout raised by
 * finance staff on the driver's behalf.
 */
export async function driverEarningsScope(driverId: string): Promise<{ driverId: string; vehicleIds: string[] }> {
  const driver = await db().collection(COLLECTIONS.drivers).doc(driverId).get();
  if (!driver.exists) throw ApiError.notFound("Driver not found.");
  const vehicles = await db().collection(COLLECTIONS.vehicles).where("driverId", "==", driverId).limit(50).get();
  return { driverId, vehicleIds: vehicles.docs.map((doc) => doc.id) };
}

/**
 * Refuse a second payout for the same driver and period.
 *
 * Earnings are recomputed from the ledger on every request, so without this a
 * double-click — or two operators — would schedule the same money twice. A
 * FAILED payout does not count, so a failed transfer can be re-raised.
 */
export async function assertNoPayoutForPeriod(driverId: string, periodStart: string, periodEnd: string): Promise<void> {
  const existing = await db()
    .collection(COLLECTIONS.payouts)
    .where("driverId", "==", driverId)
    .where("periodStart", "==", periodStart)
    .limit(10)
    .get();
  const clash = existing.docs.find((doc) => doc.get("periodEnd") === periodEnd && doc.get("status") !== "FAILED");
  if (clash) {
    throw ApiError.conflict(`A payout for this period already exists (${String(clash.get("reference") ?? clash.id)}).`);
  }
}
