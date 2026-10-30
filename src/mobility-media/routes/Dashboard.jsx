/**
 * Dashboard.
 *
 * One route, three very different screens, chosen by `session.portal`.
 *
 * `/me` returns the portal the server computed from the user's roles
 * (`portalForRoles`), so the branch here reads one server-owned field rather
 * than re-deriving staff from a local copy of the role table — which is exactly
 * the second source of truth `sessionRoutes.ts` exists to avoid.
 *
 *  - **Operations** (`admin`) → `AnalyticsEnvelope<PlatformMetrics>` from
 *    `/analytics/platform`. Network-wide revenue, delivery and fleet health.
 *  - **Advertiser** → `AnalyticsEnvelope<CampaignMetrics>` from
 *    `/analytics/campaigns`, already narrowed to that advertiser's campaigns by
 *    `filterFromQuery`, plus their campaign status counts from
 *    `/analytics/summary`.
 *  - **Driver** (drivers and vehicle owners) → `AnalyticsEnvelope<VehicleMetrics>`
 *    from `/analytics/vehicles`, narrowed to their vehicles by `vehicleScope`,
 *    plus their earnings from `/finance/earnings`.
 *
 * The split is not cosmetic: `/analytics/platform` throws 403 for anyone who is
 * not staff, so an advertiser landing on the operations view would get an error
 * page instead of a dashboard.
 *
 * Three things every variant is careful about:
 *
 *  - **`isDemoData`.** The API flags figures produced by the seed provider and
 *    says explicitly they must never be shown as real. Presenting generated
 *    numbers next to live ones is the exact failure this project treats as
 *    serious, so the banner is not dismissible and every figure is labelled.
 *  - **Null rates.** `engagementRate`, `conversionRate`, `roiPercent` and
 *    `uptimeRate` are `null` when there is no denominator, which is not the same
 *    as zero. Rendering them as `0.0%` would claim a campaign converted nothing
 *    when it simply never ran.
 *  - **Optional panels.** Wallet, earnings and finance links are rendered only
 *    when the role holds the matching permission, so a driver's dashboard shows
 *    earnings without a finance section they cannot open.
 */

import { useMemo, useState } from "react";
import { Alert, AlertTitle, Box, Button, Card, CardContent, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CampaignIcon from "@mui/icons-material/Campaign";
import VisibilityIcon from "@mui/icons-material/Visibility";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import ScienceIcon from "@mui/icons-material/Science";
import PaymentsIcon from "@mui/icons-material/Payments";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatCard } from "@/mobility-media/components/PageHeader";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { TimeSeriesChart } from "@/mobility-media/components/charts";
import { useCampaignAnalytics, useEarnings, usePlatformAnalytics, useSummary, useVehicleAnalytics } from "@/mobility-media/routes/queries";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/mobility-media/lib/format";

const RANGES = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
];

/**
 * Derives the `from`/`to` the analytics API expects from a range key.
 *
 * The API validates both as ISO calendar days (`YYYY-MM-DD`) and rejects
 * anything else with a 400, so these must be machine dates — not the
 * human-readable strings the formatter produces.
 *
 * `granularity` is left to the server (`granularityFor` picks `HOURLY` only for
 * ranges of three days or less); sending it here would duplicate that rule.
 */
function rangeToDates(value) {
  const spec = RANGES.find((range) => range.value === value) ?? RANGES[1];
  const to = new Date();
  const from = new Date(to.getTime() - spec.days * 86_400_000);
  const iso = (date) => date.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

/**
 * The period `/finance/earnings` takes, as `{ start, end }` ISO days.
 *
 * The guarantee that backs a payout is documented as monthly, so this is the
 * current calendar month rather than the last N days — a rolling window would
 * report a figure that differs from the one a payout is actually settled on.
 *
 * Built from local calendar fields rather than a UTC slice: near midnight, or in
 * any timezone behind UTC, `toISOString().slice(0, 10)` would return the
 * *previous* day and quietly under-report the period.
 */
function currentMonthPeriod() {
  const now = new Date();
  const iso = (year, month, day) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    start: iso(now.getFullYear(), now.getMonth() + 1, 1),
    end: iso(now.getFullYear(), now.getMonth() + 1, now.getDate()),
  };
}

export default function Dashboard() {
  const [rangeValue, setRangeValue] = useState("30d");
  const { portal } = useAuth();
  const { can } = usePermission();

  const range = useMemo(() => rangeToDates(rangeValue), [rangeValue]);
  const month = useMemo(currentMonthPeriod, []);

  // Switched on `portal`, not on which query is enabled: only the selected
  // branch's query is mounted, so a driver never requests the staff-only
  // endpoint and never sees its 403.
  if (portal === "advertiser") {
    return (
      <DashboardFrame
        rangeValue={rangeValue}
        onRangeChange={setRangeValue}
        title="Advertiser dashboard"
        range={range}
      >
        <AdvertiserBody range={range} can={can} />
      </DashboardFrame>
    );
  }

  if (portal === "driver") {
    return (
      <DashboardFrame
        rangeValue={rangeValue}
        onRangeChange={setRangeValue}
        title="My dashboard"
        range={range}
      >
        <DriverBody range={range} month={month} can={can} />
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame rangeValue={rangeValue} onRangeChange={setRangeValue} title="Dashboard" range={range}>
      <OperationsBody range={range} can={can} />
    </DashboardFrame>
  );
}

/**
 * Shared chrome: heading, range picker and the demo-data banner.
 *
 * The range control lives here rather than in each body because all three
 * variants read the same analytics range; the *period* the finance panel uses is
 * separate and is passed down as `month`.
 */
function DashboardFrame({ rangeValue, onRangeChange, title, range, children }) {
  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={`${formatDate(range.from)} – ${formatDate(range.to)}`}
        actions={
          <ToggleButtonGroup
            exclusive
            size="small"
            value={rangeValue}
            onChange={(_, value) => value && onRangeChange(value)}
            aria-label="Date range"
          >
            {RANGES.map((option) => (
              <ToggleButton key={option.value} value={option.value} size="small">
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        }
      />
      {children}
    </Box>
  );
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                 */
/* -------------------------------------------------------------------------- */

function OperationsBody({ range, can }) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = usePlatformAnalytics(range);

  if (isLoading && !data) return <LoadingState label="Loading platform metrics…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const totals = data?.totals;

  return (
    <>
      {data?.isDemoData ? <DemoBanner /> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Platform revenue"
            valueMinor={totals?.platformRevenueMinor}
            hint={`of ${formatMoney(totals?.grossRevenueMinor, "INR", { compact: true })} gross`}
            icon={<TrendingUpIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Impressions"
            value={formatNumber(totals?.totalImpressions)}
            hint={`${formatNumber(totals?.totalPlays)} plays`}
            icon={<VisibilityIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Engagements"
            value={formatNumber(totals?.totalEngagements)}
            hint={`${formatPercent(totals?.engagementRate)} rate`}
            icon={<TouchAppIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Active campaigns"
            value={formatNumber(totals?.activeCampaigns)}
            hint={`${formatNumber(totals?.totalCampaigns)} total`}
            icon={<CampaignIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery over time
              </Typography>
              <TimeSeriesChart
                series={data?.series ?? []}
                seriesDefs={[
                  { key: "impressions", label: "Impressions", color: "#62abff" },
                  { key: "engagements", label: "Engagements", color: "#4ade80" },
                ]}
                granularity={data?.range?.granularity}
                height={280}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conversion funnel
              </Typography>
              <Funnel
                stages={[
                  { label: "Impressions", value: totals?.totalImpressions },
                  { label: "Engagements", value: totals?.totalEngagements },
                  { label: "Leads", value: totals?.totalLeads },
                  { label: "Conversions", value: totals?.totalConversions },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network
              </Typography>
              <KeyValueRows
                rows={[
                  ["Screens online", `${formatNumber(totals?.onlineScreens)} / ${formatNumber(totals?.totalScreens)}`],
                  ["Degraded", formatNumber(totals?.degradedScreens)],
                  ["Unassigned", formatNumber(totals?.unassignedScreens)],
                  ["Vehicles", `${formatNumber(totals?.activeVehicles)} active / ${formatNumber(totals?.totalVehicles)}`],
                  ["Drivers", formatNumber(totals?.totalDrivers)],
                  ["Advertisers", `${formatNumber(totals?.activeAdvertisers)} active / ${formatNumber(totals?.totalAdvertisers)}`],
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Money
              </Typography>
              <KeyValueRows
                rows={[
                  ["Gross revenue", formatMoney(totals?.grossRevenueMinor)],
                  ["Platform revenue", formatMoney(totals?.platformRevenueMinor)],
                  ["Outstanding", formatMoney(totals?.outstandingMinor)],
                  ["Pending payouts", formatMoney(totals?.pendingPayoutsMinor)],
                  ["Conversions", formatNumber(totals?.totalConversions)],
                  ["Conversion rate", formatPercent(totals?.conversionRate)],
                ]}
              />
              {can("finance:read") ? (
                <Button size="small" sx={{ mt: 2 }} onClick={() => navigate("/mobility/finance")}>
                  Open finance
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Advertiser                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Advertiser figures.
 *
 * `/analytics/campaigns` totals are the sum over that advertiser's own
 * campaigns — `filterFromQuery` forces `advertiserId` from the session, so no
 * filter is sent and none can be forged from the client.
 *
 * Status counts come from `/analytics/summary`, which returns them only for
 * non-staff. They are a separate call because that endpoint is already
 * role-aware; asking it would be cheaper than deriving counts client-side from a
 * paginated campaign list, which would silently under-count.
 */
function AdvertiserBody({ range, can }) {
  const navigate = useNavigate();
  const analytics = useCampaignAnalytics(range);
  const summary = useSummary(range);

  if (analytics.isLoading && !analytics.data) return <LoadingState label="Loading your performance…" />;
  if (analytics.error) return <ErrorState error={analytics.error} onRetry={analytics.refetch} />;

  const totals = analytics.data?.totals;
  const counts = summary.data?.campaignStatusCounts;

  return (
    <>
      {analytics.data?.isDemoData ? <DemoBanner /> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Attributed revenue"
            valueMinor={totals?.attributedRevenueMinor}
            hint={`${formatPercent(totals?.roiPercent)} ROI`}
            icon={<TrendingUpIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Impressions"
            value={formatNumber(totals?.impressions)}
            hint={`${formatNumber(totals?.plays)} plays`}
            icon={<VisibilityIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Engagements"
            value={formatNumber(totals?.engagements)}
            hint={`${formatPercent(totals?.engagementRate)} rate`}
            icon={<TouchAppIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Conversions"
            value={formatNumber(totals?.conversions)}
            hint={`${formatNumber(totals?.leads)} leads`}
            icon={<CampaignIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery over time
              </Typography>
              <TimeSeriesChart
                series={analytics.data?.series ?? []}
                seriesDefs={[
                  { key: "impressions", label: "Impressions", color: "#62abff" },
                  { key: "engagements", label: "Engagements", color: "#4ade80" },
                ]}
                granularity={analytics.data?.range?.granularity}
                height={280}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your campaigns
              </Typography>
              {counts ? (
                <KeyValueRows rows={Object.entries(counts).map(([status, count]) => [statusLabel(status), formatNumber(count)])} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading campaign status…
                </Typography>
              )}
              <Button size="small" sx={{ mt: 2 }} onClick={() => navigate("/mobility/campaigns")}>
                Manage campaigns
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Delivery quality
              </Typography>
              <KeyValueRows
                rows={[
                  ["Completed plays", formatNumber(totals?.completedPlays)],
                  ["Completion rate", formatPercent(totals?.completionRate)],
                  ["Engagement rate", formatPercent(totals?.engagementRate)],
                  ["Conversion rate", formatPercent(totals?.conversionRate)],
                  ["Lead conversion rate", formatPercent(totals?.leadConversionRate)],
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spend
              </Typography>
              <KeyValueRows
                rows={[
                  ["Spend", formatMoney(totals?.spendMinor)],
                  ["Attributed revenue", formatMoney(totals?.attributedRevenueMinor)],
                  ["ROI", formatPercent(totals?.roiPercent)],
                  ["Cost per lead", formatMoney(totals?.costPerLeadMinor)],
                  ["Cost per conversion", formatMoney(totals?.costPerConversionMinor)],
                ]}
              />
              {can("finance:read") ? (
                <Button size="small" sx={{ mt: 2 }} onClick={() => navigate("/mobility/finance")}>
                  View wallet
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* The analytics envelope carries amounts in minor units with no currency
          field, so these use the formatter's default. The wallet is where the
          advertiser's own settlement currency is shown exactly. */}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Spend figures are shown in the platform&apos;s settlement currency; your invoice currency is on the finance screen.
      </Typography>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Driver                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Driver figures: delivery on their own vehicles, plus this month's earnings.
 *
 * Earnings fail independently of analytics (a driver without vehicles still has
 * a payout history, and an analytics failure should not hide the money), so the
 * earnings panel carries its own loading/error state rather than gating the
 * whole screen on the analytics query.
 */
function DriverBody({ range, month, can }) {
  const analytics = useVehicleAnalytics(range);

  if (analytics.isLoading && !analytics.data) return <LoadingState label="Loading your vehicle activity…" />;
  if (analytics.error) return <ErrorState error={analytics.error} onRetry={analytics.refetch} />;

  const rows = analytics.data ?? [];
  // `/analytics/vehicles` returns one `VehicleMetrics` row per vehicle, not an
  // envelope, so these totals are summed here rather than read off the response.
  // `reduce` over an empty array gives 0, which is the correct "no activity" case.
  const totals = rows.reduce(
    (sum, row) => ({
      plays: sum.plays + (row?.plays ?? 0),
      impressions: sum.impressions + (row?.impressions ?? 0),
      engagements: sum.engagements + (row?.engagements ?? 0),
      leads: sum.leads + (row?.leads ?? 0),
      conversions: sum.conversions + (row?.conversions ?? 0),
      onlineSeconds: sum.onlineSeconds + (row?.onlineSeconds ?? 0),
    }),
    { plays: 0, impressions: 0, engagements: 0, leads: 0, conversions: 0, onlineSeconds: 0 },
  );

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Impressions served"
            value={formatNumber(totals.impressions)}
            hint={`${formatNumber(totals.plays)} plays`}
            icon={<VisibilityIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Engagements"
            value={formatNumber(totals.engagements)}
            hint={`${formatNumber(totals.leads)} leads`}
            icon={<TouchAppIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Time online"
            value={formatDuration(totals.onlineSeconds)}
            hint={`${rows.length} ${rows.length === 1 ? "vehicle" : "vehicles"}`}
            icon={<DirectionsCarIcon fontSize="small" />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Conversions carried"
            value={formatNumber(totals.conversions)}
            hint="from campaigns on your vehicles"
            icon={<CampaignIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advertising carried
              </Typography>
              <Funnel
                stages={[
                  { label: "Plays", value: totals.plays },
                  { label: "Impressions", value: totals.impressions },
                  { label: "Engagements", value: totals.engagements },
                  { label: "Conversions", value: totals.conversions },
                ]}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Per vehicle
              </Typography>
              {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No vehicles are assigned to you yet, so there is no delivery to report.
                </Typography>
              ) : (
                <KeyValueRows
                  rows={rows.map((row) => [
                    row?.label || row?.key || row?.vehicleId,
                    `${formatNumber(row?.impressions)} impressions · ${formatPercent(row?.uptimeRate)} uptime`,
                  ])}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {can("payouts:read") ? <EarningsPanel period={month} /> : null}
    </>
  );
}

/**
 * This month's earnings, shown on the dashboard as well as the finance screen.
 *
 * `DriverEarnings` is a breakdown of one payout, so the components are listed
 * rather than collapsed: a driver seeing a gross figure with no components has
 * no way to check it, and the components are what they query about.
 */
function EarningsPanel({ period }) {
  const { data, isLoading, error, refetch } = useEarnings(period);
  const navigate = useNavigate();

  if (isLoading && !data) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <LoadingState label="Loading this month's earnings…" />
        </CardContent>
      </Card>
    );
  }

  // Not an error state: the panel is optional, so a failure is reported in place
  // and the rest of the dashboard stays usable.
  if (error) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            }
          >
            <AlertTitle>Earnings unavailable</AlertTitle>
            Your delivery figures above are unaffected.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const currency = data.currency ?? "INR";

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">
            <PaymentsIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
            This month
          </Typography>
          <Button size="small" onClick={() => navigate("/mobility/finance")}>
            Full breakdown
          </Button>
        </Stack>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Gross earnings" valueMinor={data.grossMinor} currency={currency} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard label="Base" valueMinor={data.baseMinor} currency={currency} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Bonuses & penalties"
              valueMinor={(data.bonusMinor ?? 0) - (data.penaltyMinor ?? 0)}
              currency={currency}
            />
          </Grid>
        </Grid>

        <KeyValueRows
          rows={[
            ["Playback", formatMoney(data.playbackMinor, currency)],
            ["Engagement", formatMoney(data.engagementMinor, currency)],
            ["Conversions", formatMoney(data.conversionMinor, currency)],
            ["Bonus", formatMoney(data.bonusMinor, currency)],
            ["Penalties", formatMoney(data.penaltyMinor, currency)],
            ["Advertiser spend carried", formatMoney(data.attributedSpendMinor, currency)],
            ["Period", `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`],
          ]}
        />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Non-dismissible. A dismissed banner means the next person to open the screen
 * sees demo figures with no indication they are not real.
 */
function DemoBanner() {
  return (
    <Alert severity="warning" icon={<ScienceIcon />} sx={{ mb: 3 }}>
      <AlertTitle>Demo data</AlertTitle>
      These figures come from the seed provider, not from live playback or billing. Treat them as
      sample output, not as revenue.
    </Alert>
  );
}

/** Server statuses are SCREAMING_SNAKE; shown as words. */
function statusLabel(status) {
  return String(status)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Whole hours and minutes from a seconds total; `—` when there is nothing to show. */
function formatDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function Funnel({ stages }) {
  const top = stages[0]?.value ?? 0;

  return (
    <Stack spacing={1.5}>
      {stages.map((stage) => {
        const value = stage.value ?? 0;
        // Width is relative to the first stage. A zero-value range renders all
        // bars at zero width rather than dividing by zero.
        const ratio = top > 0 ? value / top : 0;
        return (
          <Box key={stage.label}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {stage.label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatNumber(value)}
              </Typography>
            </Stack>
            <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
              <Box sx={{ height: "100%", width: `${Math.max(ratio * 100, value > 0 ? 2 : 0)}%`, bgcolor: "primary.main" }} />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function KeyValueRows({ rows }) {
  return (
    <Stack spacing={1}>
      {rows.map(([label, value]) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}