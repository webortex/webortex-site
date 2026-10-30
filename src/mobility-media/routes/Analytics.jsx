/**
 * Analytics.
 *
 * One range control drives every panel. Charts read from the same
 * `AnalyticsEnvelope`, so the totals and the series cannot disagree — a screen
 * that fetched totals and series separately could show a chart that does not add
 * up to the figure above it, which is exactly the class of error this project
 * treats as a defect.
 */

import { useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { usePermission } from "@/mobility-media/auth/context";
import { PageHeader, StatCard } from "@/mobility-media/components/PageHeader";
import { MoneyChart, RankedBars, TimeSeriesChart } from "@/mobility-media/components/charts";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { downloadCampaignCsv, useCampaignAnalytics, useVehicleAnalytics, useScreenAnalytics } from "@/mobility-media/routes/queries";
import { formatDate, formatNumber, formatPercent } from "@/mobility-media/lib/format";

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

/**
 * Derives the `from`/`to` the API expects from a day count.
 *
 * Granularity is deliberately omitted: the server owns that decision
 * (`granularityFor` picks `HOURLY` only for ranges of three days or less), so
 * sending it here would be a second, silently divergent copy of the rule.
 */
function rangeParams(days) {
  const to = new Date();
  const from = new Date(to.getTime() - Number(days) * 86_400_000);
  const iso = (date) => date.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function Analytics() {
  const [days, setDays] = useState("30");
  const params = useMemo(() => rangeParams(days), [days]);
  const { can } = usePermission();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadCampaignCsv(params);
    } catch (error) {
      setExportError(error);
    } finally {
      setExporting(false);
    }
  }

  const campaigns = useCampaignAnalytics(params);
  const vehicles = useVehicleAnalytics(params);
  const screens = useScreenAnalytics(params);

  const totals = campaigns.data?.totals;
  const granularity = campaigns.data?.range?.granularity;

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle={campaigns.data ? `${formatDate(campaigns.data.range.from)} – ${formatDate(campaigns.data.range.to)}` : undefined}
        actions={
          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              {RANGES.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </TextField>
            {can("analytics:export") ? (
              <Button variant="outlined" startIcon={<DownloadIcon />} disabled={exporting} onClick={exportCsv}>
                {exporting ? "Exporting…" : "Export CSV"}
              </Button>
            ) : null}
          </Stack>
        }
      />
      {exportError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError.message}
        </Alert>
      ) : null}

      {campaigns.data?.isDemoData ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Demo data — these figures come from the seed provider, not live playback or billing.
        </Alert>
      ) : null}

      {campaigns.isError ? <ErrorState error={campaigns.error} onRetry={campaigns.refetch} /> : null}
      {campaigns.isLoading && !campaigns.data ? <LoadingState label="Loading analytics…" /> : null}

      {campaigns.data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard label="Attributed revenue" valueMinor={totals?.attributedRevenueMinor} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard label="Spend" valueMinor={totals?.spendMinor} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard label="Conversions" value={formatNumber(totals?.conversions)} hint={`${formatPercent(totals?.conversionRate)} rate`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard label="Leads" value={formatNumber(totals?.leads)} hint={`${formatPercent(totals?.leadConversionRate)} to conversion`} />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Delivery
                  </Typography>
                  <TimeSeriesChart
                    series={campaigns.data.series}
                    granularity={granularity}
                    seriesDefs={[
                      { key: "plays", label: "Plays", color: "#62abff" },
                      { key: "impressions", label: "Impressions", color: "#a78bfa" },
                      { key: "completedPlays", label: "Completed", color: "#4ade80" },
                    ]}
                    height={300}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attributed revenue
                  </Typography>
                  <MoneyChart series={campaigns.data.series} granularity={granularity} height={300} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <BreakdownPanel
                title="Top vehicles"
                rows={vehicles.data?.breakdowns?.byVehicle}
                loading={vehicles.isLoading}
                error={vehicles.error}
                onRetry={vehicles.refetch}
                valueKey="impressions"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <BreakdownPanel
                title="Top screens"
                rows={screens.data?.breakdowns?.byLocation}
                loading={screens.isLoading}
                error={screens.error}
                onRetry={screens.refetch}
                valueKey="impressions"
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <BreakdownPanel title="By time of day" rows={campaigns.data.breakdowns?.byTimeOfDay} valueKey="impressions" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <BreakdownPanel title="By day of week" rows={campaigns.data.breakdowns?.byDayOfWeek} valueKey="impressions" />
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}

/** One breakdown panel, with its own loading and error handling. */
function BreakdownPanel({ title, rows, loading, error, onRetry, valueKey = "impressions" }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        {error ? <ErrorState error={error} onRetry={onRetry} /> : null}
        {loading && !rows ? <LoadingState minHeight={200} /> : <RankedBars rows={rows} valueKey={valueKey} />}
      </CardContent>
    </Card>
  );
}