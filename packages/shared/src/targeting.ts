/**
 * Targeting engine.
 *
 * A campaign's targeting is a declarative document; this module is a pure
 * predicate over (context) -> (match + score). Adding a new rule means adding one
 * entry to `RULES` rather than editing branching logic scattered through the
 * delivery pipeline.
 *
 * Evaluated for every playback decision, so it is written to be cheap and
 * allocation-free on the hot path.
 */

import type { CampaignObjective } from "./settings";

export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const DAY_OF_WEEK_ORDER: readonly DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export interface TimeWindow {
  /** Minutes from midnight, local to the campaign timezone. 0..1439 */
  readonly startMinute: number;
  readonly endMinute: number;
}

export interface GeoTarget {
  readonly cityIds: readonly string[];
  readonly zoneIds: readonly string[];
  readonly routeIds: readonly string[];
  /** Circular geofences; empty means "no radius restriction". */
  readonly geofences: readonly { readonly lat: number; readonly lng: number; readonly radiusMetres: number }[];
}

export interface TargetingRules {
  readonly cityIds: readonly string[];
  readonly zoneIds: readonly string[];
  readonly routeIds: readonly string[];
  readonly vehicleTypes: readonly string[];
  readonly vehicleGroupIds: readonly string[];
  readonly screenIds: readonly string[];
  readonly screenTypes: readonly string[];
  readonly dayOfWeek: readonly DayOfWeek[];
  readonly timeWindows: readonly TimeWindow[];
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly geofences: readonly { readonly lat: number; readonly lng: number; readonly radiusMetres: number }[];
  /** Audience segments derived from aggregate, non-identifying behaviour. */
  readonly audienceCategories: readonly string[];
  /** Minutes before a destination hotspot to begin targeting. */
  readonly proximityHotspotMinutes: number | null;
}

export const EMPTY_TARGETING: TargetingRules = {
  cityIds: [],
  zoneIds: [],
  routeIds: [],
  vehicleTypes: [],
  vehicleGroupIds: [],
  screenIds: [],
  screenTypes: [],
  dayOfWeek: [],
  timeWindows: [],
  startDate: null,
  endDate: null,
  geofences: [],
  audienceCategories: [],
  proximityHotspotMinutes: null,
};

export interface TargetingContext {
  readonly now: Date;
  readonly timezoneOffsetMinutes: number;
  readonly cityId: string | null;
  readonly zoneId: string | null;
  readonly routeId: string | null;
  readonly vehicleType: string | null;
  readonly vehicleGroupId: string | null;
  readonly screenId: string | null;
  readonly screenType: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly audienceCategory: string | null;
  /** Minutes until the vehicle reaches a targeted hotspot; null when unknown. */
  readonly minutesToHotspot: number | null;
}

export interface RuleOutcome {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
  /** Rules that did not apply (empty selection) are treated as a pass. */
  readonly applicable: boolean;
}

export interface TargetingEvaluation {
  readonly matched: boolean;
  readonly score: number;
  readonly outcomes: readonly RuleOutcome[];
}

const EARTH_RADIUS_METRES = 6_371_000;

/** Haversine distance in metres. */
export function distanceMetres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Local wall-clock minutes from a UTC instant using the campaign offset. */
export function localMinutesOfDay(now: Date, timezoneOffsetMinutes: number): number {
  const shifted = new Date(now.getTime() + timezoneOffsetMinutes * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function dayOfWeekOf(now: Date, timezoneOffsetMinutes: number): DayOfWeek {
  const shifted = new Date(now.getTime() + timezoneOffsetMinutes * 60_000);
  return DAY_OF_WEEK_ORDER[(shifted.getUTCDay() + 6) % 7];
}

function insideWindow(minute: number, window: TimeWindow): boolean {
  if (window.startMinute === window.endMinute) return true;
  // A window that wraps past midnight (22:00 -> 06:00) is two ranges.
  if (window.startMinute < window.endMinute) {
    return minute >= window.startMinute && minute < window.endMinute;
  }
  return minute >= window.startMinute || minute < window.endMinute;
}

interface Rule {
  readonly id: string;
  readonly label: string;
  readonly weight: number;
  /** Lower is better: a rule that is strictly satisfied outranks one merely satisfied. */
  readonly specificity: number;
}

const RULES = {
  city: { id: "city", label: "City", weight: 10, specificity: 1 },
  zone: { id: "zone", label: "Zone", weight: 20, specificity: 2 },
  route: { id: "route", label: "Route", weight: 25, specificity: 3 },
  vehicleType: { id: "vehicleType", label: "Vehicle type", weight: 15, specificity: 1 },
  vehicleGroup: { id: "vehicleGroup", label: "Vehicle group", weight: 18, specificity: 2 },
  screen: { id: "screen", label: "Screen", weight: 40, specificity: 5 },
  screenType: { id: "screenType", label: "Screen type", weight: 12, specificity: 1 },
  day: { id: "dayOfWeek", label: "Day of week", weight: 14, specificity: 1 },
  time: { id: "timeWindow", label: "Time of day", weight: 22, specificity: 2 },
  dateRange: { id: "dateRange", label: "Flight dates", weight: 100, specificity: 0 },
  geofence: { id: "geofence", label: "Geofence", weight: 30, specificity: 4 },
  audience: { id: "audienceCategory", label: "Audience category", weight: 24, specificity: 3 },
  hotspot: { id: "hotspotProximity", label: "Approaching hotspot", weight: 28, specificity: 4 },
} as const satisfies Record<string, Rule>;

/**
 * Score is used by the ad decision engine to break ties. It is intentionally a
 * sum of small weights rather than a probability: operators need to be able to
 * explain why a creative won a slot, and "zone match (20) + time window (22)" is
 * explainable in a way "0.37" is not.
 */
export function evaluateTargeting(
  rules: TargetingRules,
  context: TargetingContext,
): TargetingEvaluation {
  const outcomes: RuleOutcome[] = [];
  let score = 0;
  let matched = true;
  let specificitySum = 0;

  const record = (rule: Rule, applicable: boolean, passed: boolean): void => {
    outcomes.push({ id: rule.id, label: rule.label, passed, applicable });
    if (!applicable) return;
    if (!passed) {
      matched = false;
      return;
    }
    score += rule.weight;
    specificitySum += rule.specificity;
  };

  record(
    RULES.dateRange,
    Boolean(rules.startDate || rules.endDate),
    inDateRange(rules, context.now),
  );

  record(
    RULES.city,
    rules.cityIds.length > 0,
    rules.cityIds.length === 0 || (context.cityId !== null && rules.cityIds.includes(context.cityId)),
  );

  record(
    RULES.zone,
    rules.zoneIds.length > 0,
    rules.zoneIds.length === 0 || (context.zoneId !== null && rules.zoneIds.includes(context.zoneId)),
  );

  record(
    RULES.route,
    rules.routeIds.length > 0,
    rules.routeIds.length === 0 || (context.routeId !== null && rules.routeIds.includes(context.routeId)),
  );

  record(
    RULES.vehicleType,
    rules.vehicleTypes.length > 0,
    rules.vehicleTypes.length === 0 ||
      (context.vehicleType !== null && rules.vehicleTypes.includes(context.vehicleType)),
  );

  record(
    RULES.vehicleGroup,
    rules.vehicleGroupIds.length > 0,
    rules.vehicleGroupIds.length === 0 ||
      (context.vehicleGroupId !== null && rules.vehicleGroupIds.includes(context.vehicleGroupId)),
  );

  record(
    RULES.screen,
    rules.screenIds.length > 0,
    rules.screenIds.length === 0 || (context.screenId !== null && rules.screenIds.includes(context.screenId)),
  );

  record(
    RULES.screenType,
    rules.screenTypes.length > 0,
    rules.screenTypes.length === 0 ||
      (context.screenType !== null && rules.screenTypes.includes(context.screenType)),
  );

  record(
    RULES.day,
    rules.dayOfWeek.length > 0,
    rules.dayOfWeek.length === 0 ||
      rules.dayOfWeek.includes(dayOfWeekOf(context.now, context.timezoneOffsetMinutes)),
  );

  record(
    RULES.time,
    rules.timeWindows.length > 0,
    rules.timeWindows.length === 0 ||
      rules.timeWindows.some((window) => insideWindow(localMinutesOfDay(context.now, context.timezoneOffsetMinutes), window)),
  );

  record(RULES.audience, rules.audienceCategories.length > 0,
    rules.audienceCategories.length === 0 ||
      (context.audienceCategory !== null && rules.audienceCategories.includes(context.audienceCategory)));

  record(
    RULES.hotspot,
    rules.proximityHotspotMinutes !== null,
    rules.proximityHotspotMinutes === null ||
      (context.minutesToHotspot !== null && context.minutesToHotspot <= rules.proximityHotspotMinutes),
  );

  const geofenceOutcome = evaluateGeofence(rules, context);
  record(RULES.geofence, rules.geofences.length > 0, geofenceOutcome);
  if (geofenceOutcome && rules.geofences.length > 0) {
    // Closer to the fence centre is a better match; up to half the rule weight.
    score += geofenceDistanceBonus(rules, context);
    specificitySum += RULES.geofence.specificity;
  }

  // A campaign with no targeting at all is a valid "run everywhere" campaign and
  // gets the baseline score rather than zero, so it is outranked by any
  // targeted campaign but still beats ineligible inventory.
  if (!matched) score = 0;

  return { matched, score: score + Math.min(specificitySum, 10) * 0.1, outcomes };
}

function inDateRange(rules: TargetingRules, now: Date): boolean {
  const nowMs = now.getTime();
  if (rules.startDate && nowMs < Date.parse(rules.startDate)) return false;
  if (rules.endDate && nowMs > Date.parse(rules.endDate)) return false;
  return true;
}

function evaluateGeofence(rules: TargetingRules, context: TargetingContext): boolean {
  if (rules.geofences.length === 0) return true;
  if (context.lat === null || context.lng === null) return false;
  return rules.geofences.some(
    (fence) => distanceMetres(context.lat as number, context.lng as number, fence.lat, fence.lng) <= fence.radiusMetres,
  );
}

function geofenceDistanceBonus(rules: TargetingRules, context: TargetingContext): number {
  if (context.lat === null || context.lng === null || rules.geofences.length === 0) return 0;
  let closest = Number.POSITIVE_INFINITY;
  for (const fence of rules.geofences) {
    const distance = distanceMetres(context.lat, context.lng, fence.lat, fence.lng);
    if (distance < closest) closest = distance;
  }
  const largestRadius = Math.max(...rules.geofences.map((fence) => fence.radiusMetres));
  if (!Number.isFinite(closest) || largestRadius <= 0) return 0;
  const proximity = Math.max(0, 1 - closest / largestRadius);
  return proximity * (RULES.geofence.weight / 2);
}

export function describeTargeting(rules: TargetingRules): string[] {
  const parts: string[] = [];
  if (rules.cityIds.length) parts.push(`${rules.cityIds.length} city/cities`);
  if (rules.zoneIds.length) parts.push(`${rules.zoneIds.length} zone(s)`);
  if (rules.routeIds.length) parts.push(`${rules.routeIds.length} route(s)`);
  if (rules.vehicleTypes.length) parts.push(rules.vehicleTypes.join(", "));
  if (rules.screenIds.length) parts.push(`${rules.screenIds.length} specific screen(s)`);
  if (rules.geofences.length) parts.push(`${rules.geofences.length} radius zone(s)`);
  if (rules.dayOfWeek.length) parts.push(rules.dayOfWeek.join(", "));
  if (rules.timeWindows.length) parts.push(`${rules.timeWindows.length} time window(s)`);
  if (rules.audienceCategories.length) parts.push(rules.audienceCategories.join(", "));
  return parts.length ? parts : ["Whole network (no restrictions)"];
}

/** Human-readable campaign objective, used in listings and summaries. */
export function objectiveLabel(objective: CampaignObjective): string {
  const labels: Record<CampaignObjective, string> = {
    AWARENESS: "Awareness",
    REACH: "Reach",
    ENGAGEMENT: "Engagement",
    LEAD_GENERATION: "Lead generation",
    STORE_VISIT: "Store visit",
    CONVERSION: "Conversion",
    PROMOTION: "Promotion",
  };
  return labels[objective];
}