/**
 * Finance.
 *
 * Every figure here comes from the API in minor units and is converted to a
 * decimal once, at render. Nothing is recomputed client-side: a wallet balance
 * that the browser adds up differently from the server is a support ticket that
 * cannot be closed.
 *
 * Two distinct permissions are in play. The wallet needs `finance:read`; the
 * earnings breakdown is per-driver and needs `payouts:read`. Someone can hold
 * the first and not the second, so the two sections fail independently rather
 * than the whole screen.
 */

import { useMemo } from "react";
import { Alert, Box, Card, CardContent, Divider, Grid, Stack, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { PageHeader, StatCard } from "@/mobility-media/components/PageHeader";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { useEarnings, useWallet } from "@/mobility-media/routes/queries";
import { formatDate, formatMoney, formatNumber } from "@/mobility-media/lib/format";
import { AddFundsButton, InvoicesPanel, PayoutsPanel, TransactionsPanel } from "@/mobility-media/routes/FinancePanels";

export default function Finance() {
  const { can, permissions } = usePermission();
  const canSeeWallet = can("finance:read");
  // Staff hold finance:read but have no wallet of their own; the wallet card is
  // for an advertiser account. Drivers hold neither and see earnings only.
  const { user } = useAuth();
  const hasWallet = canSeeWallet && Boolean(user?.advertiserId);
  const wallet = useWallet({ enabled: hasWallet });

  // `periodSchema` requires both `start` and `end`, so the current calendar
  // month is sent explicitly. Omitting them would 400 rather than default.
  const period = useMemo(() => {
    const now = new Date();
    const iso = (date) => date.toISOString().slice(0, 10);
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: iso(start), end: iso(now) };
  }, []);

  // Earnings are per driver record; anyone without one would only get a 403.
  const earnings = useEarnings(period, { enabled: can("payouts:read") && Boolean(user?.driverId) });

  if (hasWallet && wallet.isLoading && !wallet.data) return <LoadingState label="Loading wallet…" />;

  // `walletSchema` has `balanceMinor` — not `availableBalanceMinor`, and there is
// no separate pending or lifetime-earnings figure. Guessing at fields that do
// not exist would render three of these cards as a permanent dash.
const balance = wallet.data?.balanceMinor ?? null;

  /**
   * `/finance/earnings` returns one `driverEarningsSchema` breakdown, not a list
   * of transactions. It also needs `payouts:read`, not `finance:read`, so an
   * advertiser with wallet access legitimately gets a 403 here — that is shown
   * as an explanation rather than an error card.
   */
  const earning = earnings.data ?? null;
  const canSeeEarnings = can("payouts:read") && Boolean(user?.driverId);
  const earningComponents = earning
    ? [
        ["Playback", earning.playbackMinor],
        ["Engagement", earning.engagementMinor],
        ["Conversion", earning.conversionMinor],
        ["Bonus", earning.bonusMinor],
        ["Penalty", -earning.penaltyMinor],
      ].filter(([, amount]) => amount !== 0)
    : [];

  return (
    <Box>
      <PageHeader title="Finance" subtitle="Wallet, ledgers and earnings" actions={<AddFundsButton />} />

      {hasWallet && wallet.error ? <ErrorState error={wallet.error} onRetry={wallet.refetch} /> : null}

      {hasWallet ? (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Balance" valueMinor={balance} hint={wallet.data?.currency ?? "INR"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Total credited" valueMinor={wallet.data?.totalCreditedMinor} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Total debited" valueMinor={wallet.data?.totalDebitedMinor} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Credit limit" valueMinor={wallet.data?.creditLimitMinor} />
        </Grid>
      </Grid>
      ) : null}

      {can("finance:write") ? (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
          You can record financial operations. Every write is audited and settles against the
          wallet atomically — a partial write leaves the balance untouched rather than wrong.
        </Alert>
      ) : can("wallet:topup") ? null : (
        <Alert severity="info" sx={{ mb: 3 }}>
          Finance is read-only for your role.
        </Alert>
      )}

      {canSeeWallet ? <TransactionsPanel /> : null}
      {canSeeWallet ? <InvoicesPanel /> : null}
      {can("payouts:read") ? <PayoutsPanel /> : null}

      {canSeeEarnings || !can("payouts:read") ? (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Your earnings this month
          </Typography>

          {!canSeeEarnings ? (
            <Typography variant="body2" color="text.secondary">
              Earnings are per-driver and need the payouts:read permission. Ask an administrator if
              you need them.
            </Typography>
          ) : null}

          {canSeeEarnings && earnings.isLoading && !earning ? <LoadingState minHeight={160} /> : null}

          {canSeeEarnings && earning ? (
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(earning.periodStart)} – {formatDate(earning.periodEnd)}
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {formatMoney(earning.netMinor, earning.currency ?? "INR")}
                </Typography>
              </Stack>

              {earningComponents.map(([label, amount]) => (
                <Stack key={label} direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2">{formatMoney(amount, earning.currency ?? "INR")}</Typography>
                </Stack>
              ))}

              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Base guarantee
                </Typography>
                <Typography variant="body2">{formatMoney(earning.baseMinor, earning.currency ?? "INR")}</Typography>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Attributed ad spend
                </Typography>
                <Typography variant="body2">
                  {formatMoney(earning.attributedSpendMinor, earning.currency ?? "INR")}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Active days
                </Typography>
                <Typography variant="body2">{formatNumber(earning.activeDays)}</Typography>
              </Stack>
            </Stack>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      {!can("finance:write") && permissions.includes("finance:read") ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
          Recording credits, refunds and payouts needs the finance:write permission.
        </Typography>
      ) : null}
    </Box>
  );
}