/**
 * Settings.
 *
 * Read-only, and the narrowing happens server-side: `publicView` hands a non-staff
 * caller only `currency`, `supportedVehicleTypes`, `creative`, `campaigns`,
 * `heartbeat` and `notifications.channels`. Everything else — revenue shares,
 * retention, moderation — is not in the response at all, so this screen renders
 * whatever arrives and lets absent keys fall out rather than inventing defaults that
 * would read as platform policy.
 *
 * There are deliberately no write controls. `PATCH /settings` replaces the entire
 * document and re-validates cross-field constraints (pool + reserve + tax must
 * reconcile), so a partial form would either fail on save or produce a state no
 * operator intended. Staff editing belongs in the admin console.
 *
 * Key names are taken from `platformSettingsSchema`: sections are plural
 * (`campaigns`, `creative`), there is no `general` or `device` section, and every
 * heartbeat threshold is milliseconds rather than seconds or minutes.
 */

import { Alert, Box, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { PageHeader } from "@/mobility-media/components/PageHeader";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { useSettings } from "@/mobility-media/routes/queries";
import { formatBytes, formatMoney } from "@/mobility-media/lib/format";
import { usePermission } from "@/mobility-media/auth/context";
import { SettingsEditorButton } from "@/mobility-media/routes/SettingsEditor";

/** Thresholds are stored in ms; operators think in minutes. */
function minutes(ms) {
  return typeof ms === "number" ? Math.round(ms / 60_000) : undefined;
}

export default function Settings() {
  const { data, isLoading, error, refetch } = useSettings();
  const { can } = usePermission();
  const canEdit = can("settings:write");

  if (isLoading && !data) return <LoadingState label="Loading settings…" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const creative = data?.creative ?? {};
  const campaigns = data?.campaigns ?? {};
  const heartbeat = data?.heartbeat ?? {};
  const currency = data?.currency ?? "INR";

  return (
    <Box>
      <PageHeader
        title="Settings"
        subtitle={canEdit ? "Platform-wide configuration" : "The limits your account is measured against"}
        actions={canEdit ? <SettingsEditorButton settings={data} /> : null}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {canEdit
          ? "You can edit the platform configuration. Every save is validated as a whole document and audited."
          : "These are the settings your role needs in order to submit valid campaigns and creatives. Platform-wide configuration is read-only here."}
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Panel title="Platform" fields={[
            ["Currency", data?.currency],
            ["Locale", data?.locale],
            ["Timezone", data?.timezone],
            ["Supported vehicle types", (data?.supportedVehicleTypes ?? []).join(", ")],
          ]} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel
            title="Campaign limits"
            fields={[
              ["Minimum budget", campaigns.minimumBudgetMinor, "money"],
              ["Maximum budget", campaigns.maximumBudgetMinor, "money"],
              ["Default daily budget", campaigns.defaultDailyBudgetMinor, "money"],
              ["Minimum flight (days)", campaigns.minimumDurationDays],
              ["Maximum flight (days)", campaigns.maximumDurationDays],
              ["Minimum lead time (hours)", campaigns.minimumLeadTimeHours],
            ]}
            currency={currency}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel
            title="Creative requirements"
            fields={[
              ["Allowed formats", (creative.allowedFormats ?? []).join(", ")],
              ["Max file size", creative.maxFileSizeBytes, "bytes"],
              ["Accepted aspect ratios", (creative.acceptedAspectRatios ?? []).join(", ")],
              ["Preferred aspect ratio", creative.preferredAspectRatio],
              ["Minimum dimensions", creative.minWidthPx && creative.minHeightPx ? `${creative.minWidthPx} x ${creative.minHeightPx}px` : undefined],
              ["Video duration", creative.minDurationSeconds !== undefined && creative.maxDurationSeconds !== undefined ? `${creative.minDurationSeconds}-${creative.maxDurationSeconds}s` : undefined],
              ["Max creatives per campaign", creative.maxCreativesPerCampaign],
            ]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel title="Device heartbeat" fields={[
            ["Expected interval", heartbeat.expectedIntervalMs, "ms"],
            ["Warn after", minutes(heartbeat.warningAfterMs) === undefined ? undefined : minutes(heartbeat.warningAfterMs), "minutes"],
            ["Offline after", minutes(heartbeat.offlineAfterMs), "minutes"],
            ["Never seen after", minutes(heartbeat.neverSeenAfterMs), "minutes"],
          ]} />
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * Renders label/value rows.
 *
 * `kind` is how a value should be formatted; anything unknown falls through to
 * `String`, so a future numeric setting does not need a case added here to appear.
 */
function Panel({ title, fields, currency = "INR" }) {
  const rows = fields.filter(([, value]) => value !== undefined && value !== null && value !== "");

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Not available to your role.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {rows.map(([label, value, kind]) => (
              <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatValue(value, kind, currency)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value, kind, currency) {
  switch (kind) {
    // Money is in minor units, and the currency comes from settings rather than
    // being hardcoded — a platform configured in USD must not display rupees.
    case "money":
      return formatMoney(value, currency);
    case "bytes":
      return formatBytes(value);
    case "ms":
      return `${value.toLocaleString("en-IN")} ms`;
    case "minutes":
      return `${value.toLocaleString("en-IN")} min`;
    default:
      return String(value);
  }
}