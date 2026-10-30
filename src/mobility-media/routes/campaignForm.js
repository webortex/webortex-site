/**
 * Campaign form value coercion.
 *
 * Kept out of the component so it can be unit tested against the real
 * `campaignCreateSchema` rather than being exercised through a rendered form. The
 * contract this encodes is the one that silently breaks: amounts are major units in
 * the browser and minor units on the wire, timestamps are wall-clock inputs locally
 * and ISO instants on the wire, and the days of week are three-letter codes.
 */

/**
 * Mirrors `campaignSettingsSchema` defaults in `packages/shared/src/settings.ts`.
 *
 * Duplicated rather than fetched: `/settings` needs `settings:read`, which an
 * advertiser does not have. The server re-checks both bounds and returns a clear
 * 422, so this is a fast local hint, not an enforcement point.
 */
export const MINIMUM_DURATION_DAYS = 1;
export const MAXIMUM_DURATION_DAYS = 365;

/** `datetime-local` gives a wall-clock time with no zone; the schema wants an instant. */
export function toIso(localValue) {
  if (!localValue) return null;
  const parsed = new Date(localValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Major units in, minor units out. Rounded so paise cannot truncate. */
export function toMinor(major) {
  const value = Number.parseFloat(major);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/**
 * The flight-window rules `validateCampaignWindow` applies server-side.
 *
 * Returns `null` when the window is acceptable, or a message when it is not.
 */
export function flightWindowError(startsAtLocal, endsAtLocal) {
  const startsAt = toIso(startsAtLocal);
  const endsAt = toIso(endsAtLocal);
  if (!startsAt || !endsAt) return "Start and end must both be valid timestamps.";

  const days = (Date.parse(endsAt) - Date.parse(startsAt)) / 86_400_000;
  if (days <= 0) return "The end must be after the start.";
  if (days < MINIMUM_DURATION_DAYS) {
    return `Campaigns must run for at least ${MINIMUM_DURATION_DAYS} day.`;
  }
  if (days > MAXIMUM_DURATION_DAYS) {
    return `Campaigns may not run longer than ${MAXIMUM_DURATION_DAYS} days.`;
  }
  return null;
}

/** The `dailyMinor` budget ceiling, or `null` when there is nothing wrong. */
export function budgetError(totalMinor, dailyMinor) {
  if (totalMinor === null || totalMinor <= 0) return null;
  if (dailyMinor !== null && dailyMinor > totalMinor) {
    return "The daily budget cannot exceed the total campaign budget.";
  }
  return null;
}

/** Share must be within `frequencyCapsSchema`, which allows 0.01..1 inclusive. */
export function inventoryShareError(share) {
  const value = Number(share);
  if (!Number.isFinite(value)) return "Enter a number between 0.01 and 1.";
  if (value < 0.01 || value > 1) return "Between 0.01 and 1.";
  return null;
}

/**
 * Build the `POST /campaigns` body from raw form state.
 *
 * Fields the platform defaults (`priority`, and every targeting/engagement field
 * other than the two collected here) are omitted so an operator's settings change
 * takes effect without a frontend release.
 */
/** ISO instant to a `datetime-local` value in the browser's zone. */
export function toLocalInput(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Minor units to an editable major-unit string. */
export function toMajorInput(minor) {
  return typeof minor === "number" && Number.isFinite(minor) ? (minor / 100).toFixed(2).replace(/\.00$/, "") : "";
}

/** Edit-form values from a stored campaign. */
export function editFormFromCampaign(campaign) {
  return {
    name: campaign?.name ?? "",
    category: campaign?.category ?? "",
    description: campaign?.description ?? "",
    total: toMajorInput(campaign?.budget?.totalMinor),
    daily: toMajorInput(campaign?.budget?.dailyMinor),
    startsAt: toLocalInput(campaign?.startsAt),
    endsAt: toLocalInput(campaign?.endsAt),
  };
}

/**
 * PATCH body for `campaignUpdateSchema`.
 *
 * The update schema is a partial of the create schema at the top level only, so
 * `budget` must be sent whole: the stored pricing model, rate and currency are
 * carried over and only the amounts change.
 */
export function buildCampaignPatch(campaign, form) {
  const totalMinor = toMinor(form.total);
  const dailyMinor = toMinor(form.daily);
  return {
    name: form.name.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    budget: {
      totalMinor,
      dailyMinor: dailyMinor !== null && dailyMinor > 0 ? dailyMinor : null,
      pricingModel: campaign?.budget?.pricingModel ?? "CPM",
      rateMinor: campaign?.budget?.rateMinor ?? null,
      currency: campaign?.budget?.currency ?? "INR",
    },
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
  };
}

export function buildCampaignPayload(form, { asDraft = false } = {}) {
  const totalMinor = toMinor(form.total);
  const dailyMinor = toMinor(form.daily);
  const rateMinor = toMinor(form.rate);

  return {
    asDraft,
    name: form.name.trim(),
    objective: form.objective,
    category: form.category.trim(),
    description: form.description.trim(),
    budget: {
      totalMinor,
      // `dailyMinor` is nullable, not optional, and must be positive when set — so
      // a cleared or zeroed field becomes an explicit null rather than a 422.
      dailyMinor: dailyMinor !== null && dailyMinor > 0 ? dailyMinor : null,
      pricingModel: form.pricingModel,
      // Per mille for CPM, otherwise per click/lead/conversion. null means "use the
      // inventory default".
      rateMinor: rateMinor ?? null,
      currency: form.currency.trim().toUpperCase(),
    },
    frequencyCaps: {
      maxPlaysPerHour: Number.parseInt(form.maxPerHour, 10) || 0,
      maxPlaysPerDay: Number.parseInt(form.maxPerDay, 10) || 0,
      minimumGapSeconds: Number.parseInt(form.minGapSeconds, 10) || 0,
      maxInventoryShare: Number(form.maxInventoryShare),
    },
    // Empty arrays mean "no restriction". Omitting the keys would produce the same
    // result; sending them makes the operator's intent legible in the audit log.
    targeting: {
      vehicleTypes: form.vehicleTypes,
      dayOfWeek: form.dayOfWeek,
    },
    engagement: {
      qrEnabled: form.qrEnabled,
      nfcEnabled: form.nfcEnabled,
      ...(form.destinationUrl.trim() ? { destinationUrl: form.destinationUrl.trim() } : {}),
    },
    startsAt: toIso(form.startsAt),
    endsAt: toIso(form.endsAt),
  };
}