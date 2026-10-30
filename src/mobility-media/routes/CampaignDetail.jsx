/**
 * Campaign detail.
 *
 * Combines the campaign document with its analytics envelope. They are fetched
 * separately because they are separately authorised and separately cached — an
 * operator checking flight dates should not re-download a year of series data.
 */

import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import { PageHeader, StatCard, StatusChip } from "@/mobility-media/components/PageHeader";
import { MoneyChart, TimeSeriesChart } from "@/mobility-media/components/charts";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/mobility-media/lib/format";
import { useCampaign, useCampaignDetail } from "@/mobility-media/routes/queries";
import { CampaignActions } from "@/mobility-media/routes/CampaignActions";

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();

  const campaign = useCampaign(campaignId);
  const analytics = useCampaignDetail(campaignId, { granularity: "DAILY" });

  const submit = useMutation({
    mutationFn: () => api.post(`/campaigns/${encodeURIComponent(campaignId)}/submit`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  if (campaign.isLoading && !campaign.data) return <LoadingState label="Loading campaign…" />;
  if (campaign.error) return <ErrorState error={campaign.error} onRetry={campaign.refetch} />;

  const data = campaign.data;
  const totals = analytics.data?.totals;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/mobility/campaigns")} sx={{ mb: 2 }}>
        Campaigns
      </Button>

      <PageHeader
        title={data?.name ?? campaignId}
        subtitle={
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={data?.status} />
            <Typography variant="body2" color="text.secondary">{campaignId}</Typography>
          </Stack>
        }
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {can("campaigns:write") && (data?.status === "DRAFT" || data?.status === "REJECTED") ? (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={submit.isPending}
                onClick={() => submit.mutate()}
              >
                Submit for review
              </Button>
            ) : null}
            <CampaignActions campaign={data} />
          </Stack>
        }
      />

      {submit.isError ? <Alert severity="error" sx={{ mb: 2 }}>{submit.error?.message}</Alert> : null}
      {submit.isSuccess ? <Alert severity="success" sx={{ mb: 2 }}>Submitted for review.</Alert> : null}

      {data?.status === "REJECTED" && data?.rejectionNotes ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600}>
            Rejected{data.rejectionReasonCode ? ` · ${data.rejectionReasonCode}` : ""}
          </Typography>
          <Typography variant="body2">{data.rejectionNotes}</Typography>
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          {/* `budget` is a nested object of minor-unit amounts, not flat fields. */}
          <StatCard label="Budget" valueMinor={data?.budget?.totalMinor} hint={data?.budget?.currency ?? "INR"} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Attributed revenue"
            valueMinor={totals?.attributedRevenueMinor}
            hint={data?.budget?.currency ?? "INR"}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Impressions" value={formatNumber(totals?.impressions)} hint={`${formatNumber(totals?.plays)} plays`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Conversions"
            value={formatNumber(totals?.conversions)}
            hint={`${formatPercent(totals?.conversionRate)} rate`}
          />
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Flight</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
            <Field label="Starts" value={formatDate(data?.startsAt)} />
            <Field label="Ends" value={formatDate(data?.endsAt)} />
            <Field label="Daily budget" value={formatMoney(data?.budget?.dailyMinor, data?.budget?.currency)} />
            <Field label="Objective" value={data?.objective} />
            <Field label="Created" value={formatDate(data?.createdAt)} />
          </Stack>
        </CardContent>
      </Card>

      {analytics.data?.isDemoData ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Demo data — these figures are generated, not measured.
        </Alert>
      ) : null}

      {analytics.error ? <ErrorState error={analytics.error} onRetry={analytics.refetch} /> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Delivery</Typography>
              {analytics.isLoading && !analytics.data ? (
                <LoadingState minHeight={200} />
              ) : (
                <TimeSeriesChart
                  series={analytics.data?.series ?? []}
                  granularity={analytics.data?.range?.granularity}
                  seriesDefs={[
                    { key: "impressions", label: "Impressions", color: "#62abff" },
                    { key: "engagements", label: "Engagements", color: "#4ade80" },
                    { key: "conversions", label: "Conversions", color: "#fbbf24" },
                  ]}
                  height={260}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Attributed revenue</Typography>
              <MoneyChart
                series={analytics.data?.series ?? []}
                granularity={analytics.data?.range?.granularity}
                height={260}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value ?? "—"}</Typography>
    </Box>
  );
}