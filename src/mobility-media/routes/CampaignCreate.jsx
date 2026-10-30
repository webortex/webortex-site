/**
 * Campaign creation.
 *
 * This form is a thin client over `campaignCreateSchema`. Two rules drive its shape:
 *
 *  1. Money is entered in major units and sent in minor units. Doing the x100 here
 *     and nowhere else means the wire format is whatever `budgetSchema` declares.
 *  2. The schema has no defaults for `budget` or `frequencyCaps`, so every field on
 *     those two is collected. Inventing client-side defaults for required fields
 *     would just move the 422 from the server to the browser.
 *
 * Everything with a server default (`targeting`, `engagement`, `priority`) is either
 * omitted or sent as an explicit partial, so the platform's defaults stay
 * authoritative — they are settings an operator can change without a frontend
 * release.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { PageHeader } from "@/mobility-media/components/PageHeader";
import { useCreateCampaign } from "@/mobility-media/routes/queries";
import { formatMoney } from "@/mobility-media/lib/format";
import {
  budgetError,
  buildCampaignPayload,
  flightWindowError,
  inventoryShareError,
  toIso,
  toMinor,
} from "@/mobility-media/routes/campaignForm";

/** `campaignObjectiveSchema` in `packages/shared/src/settings.ts`. */
const OBJECTIVES = [
  "AWARENESS",
  "REACH",
  "ENGAGEMENT",
  "LEAD_GENERATION",
  "STORE_VISIT",
  "CONVERSION",
  "PROMOTION",
];

/** `pricingModelSchema`. */
const PRICING_MODELS = ["FIXED_PACKAGE", "CPM", "CPC", "CPL", "CPA", "CUSTOM"];

/** `vehicleTypeSchema`. */
const VEHICLE_TYPES = ["AUTO", "CAB", "TAXI", "TOURIST", "BUS", "EV", "OTHER"];

/** `budgetSchema.currency` is a 3-letter ISO code with `INR` as the default. */
const CURRENCIES = ["INR", "USD", "AED", "GBP", "EUR"];

/**
 * `DayOfWeek` from `packages/shared/src/targeting.ts`.
 *
 * Three-letter codes, not "MONDAY". The targeting schema validates this array
 * against `DAY_OF_WEEK_ORDER`, so full day names would 422 on an otherwise valid
 * campaign.
 */
const DAYS = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

/** Mirrors the server defaults so the form opens on something sensible. */
const titleCase = (value) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

function localInput(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CampaignCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useCreateCampaign();

  const defaults = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    return { startsAt: localInput(start), endsAt: localInput(end) };
  }, []);

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("AWARENESS");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(defaults.startsAt);
  const [endsAt, setEndsAt] = useState(defaults.endsAt);

  const [total, setTotal] = useState("");
  const [daily, setDaily] = useState("");
  const [pricingModel, setPricingModel] = useState("FIXED_PACKAGE");
  const [rate, setRate] = useState("");
  const [currency, setCurrency] = useState("INR");

  const [maxPerHour, setMaxPerHour] = useState("10");
  const [maxPerDay, setMaxPerDay] = useState("100");
  const [minGapSeconds, setMinGapSeconds] = useState("1800");
  const [maxInventoryShare, setMaxInventoryShare] = useState("0.40");

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState([]);
  const [qrEnabled, setQrEnabled] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState("");

  const form = {
    name,
    objective,
    category,
    description,
    startsAt,
    endsAt,
    total,
    daily,
    pricingModel,
    rate,
    currency,
    maxPerHour,
    maxPerDay,
    minGapSeconds,
    maxInventoryShare,
    vehicleTypes,
    dayOfWeek,
    qrEnabled,
    nfcEnabled,
    destinationUrl,
  };

  const totalMinor = toMinor(total);
  const dailyMinor = toMinor(daily);

  // Mirrored from the server so an impossible flight never leaves the browser.
  const windowError = useMemo(() => flightWindowError(startsAt, endsAt), [startsAt, endsAt]);
  const moneyError = useMemo(() => budgetError(totalMinor, dailyMinor), [totalMinor, dailyMinor]);
  const shareError = useMemo(() => inventoryShareError(maxInventoryShare), [maxInventoryShare]);

  const durationDays = useMemo(() => {
    const start = toIso(startsAt);
    const end = toIso(endsAt);
    if (!start || !end) return null;
    return (Date.parse(end) - Date.parse(start)) / 86_400_000;
  }, [startsAt, endsAt]);

  const canSubmit =
    name.trim().length >= 3 &&
    category.trim().length >= 2 &&
    totalMinor !== null &&
    totalMinor > 0 &&
    !windowError &&
    !moneyError &&
    !shareError &&
    !create.isPending;

function submit(asDraft) {
    if (!canSubmit) return;
    create.mutate(buildCampaignPayload(form, { asDraft }), {
      onSuccess: (campaign) => {
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        navigate(`/mobility/campaigns/${encodeURIComponent(campaign.id)}`, { replace: true });
      },
    });
  }

  return (
    <Box>
      <PageHeader
        title="New campaign"
        subtitle="Budget, flight dates and inventory caps. Everything here is validated again by the API."
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/mobility/campaigns")}>
            Back to campaigns
          </Button>
        }
      />

      {create.isError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {create.error?.message}
        </Alert>
      ) : null}

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Basics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Campaign name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  error={name.length > 0 && name.trim().length < 3}
                  helperText={
                    name.length > 0 && name.trim().length < 3 ? "At least 3 characters." : "Shown to reviewers and on reports."
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Objective"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                >
                  {OBJECTIVES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {titleCase(value)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  label="Category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  error={category.length > 0 && category.trim().length < 2}
                  helperText="For example: beverages, retail, cinema."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  helperText="Optional, but reviewers approve faster when they know what the creative is meant to do."
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Flight
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label="Starts"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  type="datetime-local"
                  label="Ends"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(windowError)}
                  helperText={
                    windowError ??
                    (durationDays !== null ? `${Math.round(durationDays)} day flight.` : undefined)
                  }
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Budget
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Total budget"
                  value={total}
                  onChange={(event) => setTotal(event.target.value)}
                  error={Boolean(moneyError)}
                  helperText={
                    moneyError ??
                    (totalMinor !== null ? formatMoney(totalMinor, currency) : "In rupees.")
                  }
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Daily budget"
                  value={daily}
                  onChange={(event) => setDaily(event.target.value)}
                  helperText="Leave blank for the platform default."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Pricing model"
                  value={pricingModel}
                  onChange={(event) => setPricingModel(event.target.value)}
                >
                  {PRICING_MODELS.map((value) => (
                    <MenuItem key={value} value={value}>
                      {titleCase(value)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Rate"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  helperText="Per mille for CPM, otherwise per click or lead."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  helperText="Three-letter ISO code."
                >
                  {CURRENCIES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Frequency caps
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Caps are per creative per screen, and stop one campaign saturating the audience
              on a single vehicle.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max plays / hour"
                  value={maxPerHour}
                  onChange={(event) => setMaxPerHour(event.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max plays / day"
                  value={maxPerDay}
                  onChange={(event) => setMaxPerDay(event.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum gap (seconds)"
                  value={minGapSeconds}
                  onChange={(event) => setMinGapSeconds(event.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max inventory share"
                  value={maxInventoryShare}
                  onChange={(event) => setMaxInventoryShare(event.target.value)}
                  error={Boolean(shareError)}
                  helperText={shareError ?? "Share of a screen's hourly slots."}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Targeting and engagement
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Leave both empty to run on all eligible inventory.
            </Typography>

            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" gutterBottom>
                  Vehicle types
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {VEHICLE_TYPES.map((value) => (
                    <Chip
                      key={value}
                      label={titleCase(value)}
                      clickable
                      color={vehicleTypes.includes(value) ? "primary" : "default"}
                      onClick={() =>
                        setVehicleTypes((current) =>
                          current.includes(value)
                            ? current.filter((item) => item !== value)
                            : [...current, value],
                        )
                      }
                    />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  Days of week
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {DAYS.map((day) => (
                    <Chip
                      key={day.value}
                      label={day.label}
                      clickable
                      color={dayOfWeek.includes(day.value) ? "primary" : "default"}
                      onClick={() =>
                        setDayOfWeek((current) =>
                          current.includes(day.value)
                            ? current.filter((item) => item !== day.value)
                            : [...current, day.value],
                        )
                      }
                    />
                  ))}
                </Stack>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch checked={qrEnabled} onChange={(event) => setQrEnabled(event.target.checked)} />
                    }
                    label="Show a QR code"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch checked={nfcEnabled} onChange={(event) => setNfcEnabled(event.target.checked)} />
                    }
                    label="Enable NFC tap"
                  />
                </Grid>
              </Grid>

              <TextField
                fullWidth
                label="Click-through destination"
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                helperText="Optional. Must be http:// or https://."
              />
            </Stack>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => navigate("/mobility/campaigns")} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="outlined" onClick={() => submit(true)} disabled={!canSubmit}>
            Save as draft
          </Button>
          <Button variant="contained" onClick={() => submit(false)} disabled={!canSubmit}>
            {create.isPending ? "Creating…" : "Create and submit for review"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}