/**
 * Finance ledgers and the actions on them.
 *
 * Every amount typed here is major units in the input and integer minor units on
 * the wire (`parseAmountMinor`). Every money-moving form carries an idempotency
 * key minted when the dialog opens, so a double-submit or a retried request
 * settles once.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AddCardIcon from "@mui/icons-material/AddCard";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { StatusChip } from "@/mobility-media/components/PageHeader";
import { FormDialog } from "@/mobility-media/components/Dialogs";
import { usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { formatDate, formatDateTime, formatMoney } from "@/mobility-media/lib/format";
import { newIdempotencyKey, parseAmountMinor, useApiMutation } from "@/mobility-media/lib/mutations";
import { openCheckout } from "@/mobility-media/lib/razorpay";
import { items, useDrivers } from "@/mobility-media/routes/queries";

const invalidateFinance = [["finance"]];

function useFinanceList(kind, params = {}, enabled = true) {
  return useQuery({
    queryKey: ["finance", kind, params],
    queryFn: ({ signal }) => api.get(`/finance/${kind}`, { query: params, signal }),
    enabled,
  });
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function lastMonthPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return { start: isoDay(start), end: isoDay(end) };
}

/* ------------------------------------------------------------- add funds -- */

const TOPUP_MIN = 100;

/**
 * Advertiser self-service top-up through Razorpay.
 *
 * After Checkout reports success the wallet is refetched a few times: the
 * balance moves when the webhook lands, which is usually within seconds but is
 * not synchronous with the browser callback.
 */
export function AddFundsButton() {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState(null);

  const amountMinor = parseAmountMinor(amount);
  const amountOk = amountMinor !== null && amountMinor >= TOPUP_MIN * 100;

  const pay = useApiMutation(async (minor) => {
    const order = await api.post("/finance/topup-orders", { amountMinor: minor });
    return openCheckout(order);
  }, {
    onSuccess: (result) => {
      setOpen(false);
      setAmount("");
      if (result === "paid") {
        setOutcome("paid");
        for (const delay of [2_000, 6_000, 15_000]) {
          setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["finance"] }), delay);
        }
      }
    },
  });

  if (!can("wallet:topup")) return null;

  return (
    <>
      <Button variant="contained" startIcon={<AddCardIcon />} onClick={() => { setOutcome(null); pay.reset(); setOpen(true); }}>
        Add funds
      </Button>
      {outcome === "paid" ? (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setOutcome(null)}>
          Payment received by Razorpay. Your balance updates as soon as the payment is confirmed, usually within a minute.
        </Alert>
      ) : null}
      <FormDialog
        open={open}
        title="Add funds to your wallet"
        description="You will pay in a secure Razorpay window. Funds are available for campaigns once the payment is confirmed."
        submitLabel={amountOk ? `Pay ${formatMoney(amountMinor)}` : "Pay"}
        onClose={() => setOpen(false)}
        onSubmit={() => pay.mutate(amountMinor)}
        pending={pay.isPending}
        error={pay.error}
        canSubmit={amountOk}
      >
        <TextField
          label="Amount (INR)"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          autoFocus
          error={amount.length > 0 && !amountOk}
          helperText={`Minimum ₹${TOPUP_MIN}.`}
        />
      </FormDialog>
    </>
  );
}

/* ---------------------------------------------------------- transactions -- */

export function TransactionsPanel() {
  const { can } = usePermission();
  const [refunding, setRefunding] = useState(null);
  const [crediting, setCrediting] = useState(false);
  const list = useFinanceList("transactions", { limit: 100 });
  const rows = useMemo(() => items(list.data), [list.data]);
  const canWrite = can("finance:write");

  const columns = [
    { id: "reference", header: "Reference", render: (row) => <CellText primary={row.reference} secondary={row.description} maxWidth={260} /> },
    { id: "advertiserId", header: "Advertiser", render: (row) => row.advertiserId },
    { id: "type", header: "Type", render: (row) => row.type },
    { id: "gateway", header: "Via", render: (row) => row.gateway },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "amountMinor", header: "Amount", align: "right", render: (row) => formatMoney(row.amountMinor, row.currency) },
    { id: "createdAt", header: "When", render: (row) => <Typography variant="body2" color="text.secondary">{formatDateTime(row.createdAt)}</Typography> },
    ...(canWrite
      ? [{
          id: "actions",
          header: "",
          align: "right",
          render: (row) =>
            row.type === "CREDIT" && (row.status === "SUCCESS" || row.status === "PARTIALLY_REFUNDED") ? (
              <Button size="small" color="warning" onClick={() => setRefunding(row)}>Refund</Button>
            ) : null,
        }]
      : []),
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">Transactions</Typography>
          {canWrite ? (
            <Button size="small" variant="outlined" onClick={() => setCrediting(true)}>Record bank / UPI credit</Button>
          ) : null}
        </Stack>
      </CardContent>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        page={1}
        pageCount={1}
        pageSize={100}
        onPageChange={() => undefined}
        emptyTitle="No transactions yet"
      />
      {refunding ? <RefundDialog transaction={refunding} onClose={() => setRefunding(null)} /> : null}
      {crediting ? <ManualCreditDialog onClose={() => setCrediting(false)} /> : null}
    </Card>
  );
}

function RefundDialog({ transaction, onClose }) {
  const refundable = (transaction.amountMinor ?? 0) - (transaction.refundedMinor ?? 0);
  const [amount, setAmount] = useState(String(refundable / 100));
  const [reason, setReason] = useState("");
  const amountMinor = parseAmountMinor(amount);
  const refund = useApiMutation(
    (body) => api.post(`/finance/transactions/${encodeURIComponent(transaction.id)}/refund`, body),
    { invalidate: invalidateFinance, onSuccess: onClose },
  );
  const ok = amountMinor !== null && amountMinor <= refundable && reason.trim().length >= 5;

  return (
    <FormDialog
      open
      title={`Refund ${transaction.reference}`}
      description={`Up to ${formatMoney(refundable, transaction.currency)} can be refunded. The wallet is debited by the same amount.`}
      submitLabel="Refund"
      destructive
      onClose={onClose}
      onSubmit={() => refund.mutate({ amountMinor, reason: reason.trim(), partial: amountMinor < refundable })}
      pending={refund.isPending}
      error={refund.error}
      canSubmit={ok}
    >
      <TextField label="Amount (INR)" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
      <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={2} required helperText="At least 5 characters. Recorded in the audit log." />
    </FormDialog>
  );
}

function ManualCreditDialog({ onClose }) {
  const [idempotencyKey] = useState(() => newIdempotencyKey("credit"));
  const [form, setForm] = useState({ advertiserId: "", amount: "", gateway: "NETBANKING", reference: "", description: "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const amountMinor = parseAmountMinor(form.amount);
  const credit = useApiMutation((body) => api.post("/finance/credits", body), { invalidate: invalidateFinance, onSuccess: onClose });
  const ok =
    amountMinor !== null &&
    form.advertiserId.trim().length >= 3 &&
    form.reference.trim().length >= 4 &&
    form.description.trim().length >= 3;

  return (
    <FormDialog
      open
      title="Record a bank or UPI credit"
      description="Only for money already reconciled against a bank statement. Razorpay payments are credited automatically."
      submitLabel="Record credit"
      onClose={onClose}
      pending={credit.isPending}
      error={credit.error}
      canSubmit={ok}
      onSubmit={() =>
        credit.mutate({
          advertiserId: form.advertiserId.trim(),
          amountMinor,
          gateway: form.gateway,
          gatewayPaymentId: form.reference.trim(),
          description: form.description.trim(),
          idempotencyKey,
        })
      }
    >
      <TextField label="Advertiser id" value={form.advertiserId} onChange={set("advertiserId")} required />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Amount (INR)" value={form.amount} onChange={set("amount")} inputMode="decimal" fullWidth required />
        <TextField select label="Received via" value={form.gateway} onChange={set("gateway")} fullWidth>
          <MenuItem value="NETBANKING">Bank transfer</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="MANUAL">Other (cheque, cash)</MenuItem>
        </TextField>
      </Stack>
      <TextField label="Bank / UPI reference" value={form.reference} onChange={set("reference")} required helperText="UTR or transaction id from the statement." />
      <TextField label="Description" value={form.description} onChange={set("description")} required />
    </FormDialog>
  );
}

/* -------------------------------------------------------------- invoices -- */

export function InvoicesPanel() {
  const { can } = usePermission();
  const [creating, setCreating] = useState(false);
  const list = useFinanceList("invoices", { limit: 100 });
  const rows = useMemo(() => items(list.data), [list.data]);

  const columns = [
    { id: "number", header: "Invoice", render: (row) => <CellText primary={row.number ?? row.reference ?? row.id} secondary={row.advertiserId} /> },
    { id: "period", header: "Period", render: (row) => `${formatDate(row.periodStart)} – ${formatDate(row.periodEnd)}` },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "totalMinor", header: "Total", align: "right", render: (row) => formatMoney(row.totalMinor, row.currency) },
    { id: "dueMinor", header: "Due", align: "right", render: (row) => formatMoney(row.dueMinor, row.currency) },
    { id: "dueOn", header: "Due on", render: (row) => formatDate(row.dueOn) },
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Invoices</Typography>
          {can("finance:write") ? (
            <Button size="small" variant="outlined" onClick={() => setCreating(true)}>Issue invoice</Button>
          ) : null}
        </Stack>
      </CardContent>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        page={1}
        pageCount={1}
        pageSize={100}
        onPageChange={() => undefined}
        emptyTitle="No invoices yet"
      />
      {creating ? <InvoiceDialog onClose={() => setCreating(false)} /> : null}
    </Card>
  );
}

function InvoiceDialog({ onClose }) {
  const period = lastMonthPeriod();
  const [form, setForm] = useState({ advertiserId: "", periodStart: period.start, periodEnd: period.end, description: "Digital out-of-home advertising", amount: "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const amountMinor = parseAmountMinor(form.amount);
  const issue = useApiMutation((body) => api.post("/finance/invoices", body), { invalidate: invalidateFinance, onSuccess: onClose });
  const ok = amountMinor !== null && form.advertiserId.trim().length >= 3 && form.periodStart <= form.periodEnd && form.description.trim();

  return (
    <FormDialog
      open
      title="Issue an invoice"
      description="Payments already received in the period are applied automatically; the remainder is due in 15 days."
      submitLabel="Issue invoice"
      onClose={onClose}
      pending={issue.isPending}
      error={issue.error}
      canSubmit={Boolean(ok)}
      onSubmit={() =>
        issue.mutate({
          advertiserId: form.advertiserId.trim(),
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          lineItems: [{ description: form.description.trim(), quantity: 1, unitMinor: amountMinor, campaignId: null, amountMinor }],
        })
      }
    >
      <TextField label="Advertiser id" value={form.advertiserId} onChange={set("advertiserId")} required />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Period start" type="date" value={form.periodStart} onChange={set("periodStart")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Period end" type="date" value={form.periodEnd} onChange={set("periodEnd")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <TextField label="Line item" value={form.description} onChange={set("description")} required />
      <TextField label="Amount (INR, before tax)" value={form.amount} onChange={set("amount")} inputMode="decimal" required />
    </FormDialog>
  );
}

/* --------------------------------------------------------------- payouts -- */

export function PayoutsPanel() {
  const { can } = usePermission();
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(null);
  const list = useFinanceList("payouts", { limit: 100 });
  const rows = useMemo(() => items(list.data), [list.data]);
  const canWrite = can("payouts:write");

  const columns = [
    { id: "reference", header: "Payout", render: (row) => <CellText primary={row.reference} secondary={row.driverId} /> },
    { id: "period", header: "Period", render: (row) => `${formatDate(row.periodStart)} – ${formatDate(row.periodEnd)}` },
    { id: "method", header: "Method", render: (row) => row.method },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "netMinor", header: "Net", align: "right", render: (row) => formatMoney(row.netMinor, row.currency) },
    { id: "scheduledFor", header: "Payable on", render: (row) => formatDate(row.scheduledFor) },
    ...(canWrite
      ? [{
          id: "actions",
          header: "",
          align: "right",
          render: (row) =>
            row.status === "SCHEDULED" || row.status === "PROCESSING" ? (
              <Button size="small" onClick={() => setProcessing(row)}>Mark paid</Button>
            ) : null,
        }]
      : []),
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Driver payouts</Typography>
          {canWrite ? (
            <Button size="small" variant="outlined" onClick={() => setCreating(true)}>Raise payout</Button>
          ) : null}
        </Stack>
      </CardContent>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={list.refetch}
        page={1}
        pageCount={1}
        pageSize={100}
        onPageChange={() => undefined}
        emptyTitle="No payouts yet"
      />
      {creating ? <PayoutDialog onClose={() => setCreating(false)} /> : null}
      {processing ? <MarkPaidDialog payout={processing} onClose={() => setProcessing(null)} /> : null}
    </Card>
  );
}

function PayoutDialog({ onClose }) {
  const period = lastMonthPeriod();
  const drivers = useDrivers({ limit: 200 });
  const [form, setForm] = useState({ driverId: "", periodStart: period.start, periodEnd: period.end, method: "BANK" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const create = useApiMutation((body) => api.post("/finance/payouts", body), { invalidate: invalidateFinance, onSuccess: onClose });

  return (
    <FormDialog
      open
      title="Raise a driver payout"
      description="The amount is recomputed from the earnings ledger for the period; it cannot be typed in."
      submitLabel="Raise payout"
      onClose={onClose}
      pending={create.isPending}
      error={create.error}
      canSubmit={Boolean(form.driverId) && form.periodStart <= form.periodEnd}
      onSubmit={() => create.mutate(form)}
    >
      <TextField select label="Driver" value={form.driverId} onChange={set("driverId")} required>
        {items(drivers.data).map((driver) => (
          <MenuItem key={driver.id} value={driver.id}>
            {driver.fullName} · {driver.code}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Period start" type="date" value={form.periodStart} onChange={set("periodStart")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Period end" type="date" value={form.periodEnd} onChange={set("periodEnd")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <TextField select label="Method" value={form.method} onChange={set("method")}>
        <MenuItem value="BANK">Bank transfer</MenuItem>
        <MenuItem value="UPI">UPI</MenuItem>
        <MenuItem value="WALLET">Wallet</MenuItem>
        <MenuItem value="MANUAL">Manual</MenuItem>
      </TextField>
    </FormDialog>
  );
}

function MarkPaidDialog({ payout, onClose }) {
  const [reference, setReference] = useState("");
  const mark = useApiMutation(
    (body) => api.post(`/finance/payouts/${encodeURIComponent(payout.id)}/processed`, body),
    { invalidate: invalidateFinance, onSuccess: onClose },
  );
  return (
    <FormDialog
      open
      title={`Mark ${payout.reference} as paid`}
      description={`${formatMoney(payout.netMinor, payout.currency)} to ${payout.driverId}.`}
      submitLabel="Mark paid"
      onClose={onClose}
      pending={mark.isPending}
      error={mark.error}
      canSubmit={reference.trim().length >= 4}
      onSubmit={() => mark.mutate({ gatewayReference: reference.trim() })}
    >
      <TextField label="Bank / UPI reference" value={reference} onChange={(event) => setReference(event.target.value)} required helperText="The UTR of the transfer you made." />
    </FormDialog>
  );
}

