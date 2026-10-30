/**
 * Emulator seed.
 *
 * Provisions a working sign-in and enough data that every dashboard renders.
 * Without this, `/mobility` cannot be opened at all: `requireUser` reads
 * `mm_users/{uid}` and refuses anyone with no profile or no role, so an Auth
 * account on its own is a retryable 403.
 *
 * ## Safety
 *
 * Refuses to run unless `FIRESTORE_EMULATOR_HOST` is set. The emulator is the
 * only place this may write, and that env var is set by `firebase emulators:start`
 * alone — so an accidental run with real credentials cannot reach production.
 * It exits non-zero rather than warning and continuing.
 *
 * ## Idempotence
 *
 * Every document uses a fixed id, so re-running overwrites rather than
 * duplicating. Aggregate rows are keyed by `{campaign}-{vehicle}-{date}` and the
 * numbers come from a seeded PRNG, so two runs produce byte-identical data.
 *
 * Usage, from the repository root, with the emulator already running:
 *
 * ```
 * npm run emulators        # terminal 1
 * npm run seed             # terminal 2
 * ```
 */

import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/* ------------------------------------------------------------------ guard -- */

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.VITE_MM_FIREBASE_PROJECT_ID ?? "demo-webortex-mobility";

// `npm run seed` runs in a second terminal, where `emulators:start` has not set
// these. A `demo-` project id cannot address any real backend, so for one the
// default emulator ports are filled in; any other project id still has to name
// its emulator explicitly or the script refuses.
if (PROJECT_ID.startsWith("demo-")) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error(
    [
      "",
      "  Refusing to seed: FIRESTORE_EMULATOR_HOST is not set.",
      "",
      "  This script writes platform users, campaigns and financial aggregates.",
      "  It must never run against a real project.",
      "",
      "  Start the emulator first, in another terminal:",
      "",
      "      npm run emulators",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const app = initializeApp({ projectId: PROJECT_ID });

/**
 * The Functions emulator reads secrets from `functions/.secret.local`. Device
 * credentials are an HMAC under MOBILITY_DEVICE_SECRET_PEPPER, so the seed reads
 * the same file to write a hash the running API will accept.
 */
function readLocalSecret(name) {
  if (process.env[name]) return process.env[name];
  const file = join(dirname(fileURLToPath(import.meta.url)), "..", ".secret.local");
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && match[1] === name) return match[2].replace(/^["']|["']$/g, "");
  }
  return null;
}

const DEVICE_PEPPER = readLocalSecret("MOBILITY_DEVICE_SECRET_PEPPER");
/** Fixed so the printed player link keeps working across re-seeds. Emulator only. */
const DEMO_DEVICE_SECRET = "demo-device-secret-for-the-local-emulator-only";
function demoCredentialHash() {
  return DEVICE_PEPPER
    ? createHmac("sha256", DEVICE_PEPPER).update(DEMO_DEVICE_SECRET, "utf8").digest("hex")
    : "0".repeat(64);
}
const db = getFirestore(app);
const auth = getAuth(app);

/* ------------------------------------------------------------------ utils -- */

const DAY_MS = 86_400_000;

/** Today at UTC midnight. Aggregate dates are `YYYY-MM-DD` in UTC, matching `bucketKey`. */
const today = new Date();
const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const isoAt = (ms) => new Date(ms).toISOString();

/**
 * Deterministic PRNG (mulberry32).
 *
 * A fixed seed means re-running produces identical figures, so a screenshot
 * taken today matches one taken tomorrow. `Math.random` would make every run
 * differ and make a "did that change?" question unanswerable.
 */
function rng(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const write = async (collection, id, data) => {
  await db.collection(collection).doc(id).set(data, { merge: true });
  return id;
};

/* ------------------------------------------------------------------- ids --- */

const IDS = {
  advertiser: "ADV_acme_media",
  advertiser2: "ADV_northwind",
  vehicle: "VEH_ka01ab",
  vehicle2: "VEH_ka02cd",
  screen: "SCR_ka01ab01",
  screen2: "SCR_ka02ab02",
  driver: "DRV_ravi01",
  campaign: "CMP_monsoon01",
  campaign2: "CMP_launch02",
  campaign3: "CMP_evergreen3",
};

/* ----------------------------------------------------------------- users --- */

const PASSWORD = "DemoPass!2024";

const USER_SPECS = [
  {
    key: "admin",
    email: "admin@demo.webortex.app",
    fullName: "Asha Menon",
    phone: "+919800000001",
    roles: ["SUPER_ADMIN"],
    advertiserId: null,
    driverId: null,
    vehicleIds: [],
  },
  {
    key: "advertiser",
    email: "advertiser@demo.webortex.app",
    fullName: "Kabir Rao",
    phone: "+919800000002",
    roles: ["ADVERTISER"],
    advertiserId: IDS.advertiser,
    driverId: null,
    vehicleIds: [],
  },
  {
    key: "driver",
    email: "driver@demo.webortex.app",
    fullName: "Ravi Kumar",
    phone: "+919800000003",
    roles: ["DRIVER"],
    advertiserId: null,
    driverId: IDS.driver,
    vehicleIds: [IDS.vehicle, IDS.vehicle2],
  },
];

async function seedUsers() {
  const created = {};
  for (const spec of USER_SPECS) {
    let user = null;
    try {
      user = await auth.createUser({
        email: spec.email,
        password: PASSWORD,
        emailVerified: true,
        displayName: spec.fullName,
      });
    } catch (error) {
      // `auth/email-already-exists` on a re-run. Look the existing user up
      // instead of failing, so the script is safe to repeat.
      if (!String(error?.code ?? "").includes("email-already-exists")) throw error;
      user = await auth.getUserByEmail(spec.email);
    }

    // The document id must be the Firebase uid: `requireUser` does
    // `mm_users/{uid}` with the verified token's subject, so a stable id of our
    // own choosing would never be found.
    await write("mm_users", user.uid, {
      id: `USR_${spec.key}`,
      uid: user.uid,
      email: spec.email,
      fullName: spec.fullName,
      phone: spec.phone,
      avatarUrl: null,
      roles: spec.roles,
      status: "ACTIVE",
      advertiserId: spec.advertiserId,
      driverId: spec.driverId,
      vehicleIds: spec.vehicleIds,
      theme: "dark",
      lastLoginAt: null,
      createdAt: isoAt(todayUtc - 200 * DAY_MS),
      updatedAt: isoAt(todayUtc - 200 * DAY_MS),
    });
    created[spec.key] = { ...spec, uid: user.uid };
  }
  return created;
}

/* -------------------------------------------------------------- entities --- */

async function seedAdvertiser(userId) {
  await write("mm_advertisers", IDS.advertiser, {
    id: IDS.advertiser,
    code: "ADV-ACME-001",
    organizationId: "ORG_acme",
    primaryUserId: userId,
    displayName: "Acme Media Group",
    businessCategory: "Retail",
    preferredAdCategories: ["Automotive", "Food & Beverage"],
    billingProfile: {
      billingName: "Acme Media Group Pvt Ltd",
      billingAddress: {
        line1: "14 Residency Road",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560025",
        country: "IN",
      },
      taxNumber: "29AACCA1234C1Z5",
      paymentTermsDays: 15,
      creditLimitMinor: 5_000_000,
    },
    verification: {
      status: "APPROVED",
      reviewedBy: userId,
      reviewedAt: isoAt(todayUtc - 190 * DAY_MS),
      reasonCode: null,
      notes: null,
      documents: [],
    },
    walletBalanceMinor: 4_250_000,
    createdAt: isoAt(todayUtc - 190 * DAY_MS),
    updatedAt: isoAt(todayUtc - 190 * DAY_MS),
  });

  await write("mm_wallets", IDS.advertiser, {
    advertiserId: IDS.advertiser,
    currency: "INR",
    balanceMinor: 4_250_000,
    totalCreditedMinor: 10_000_000,
    totalDebitedMinor: 5_750_000,
    creditLimitMinor: 5_000_000,
    autoTopUpEnabled: false,
    autoTopUpThresholdMinor: 0,
    autoTopUpAmountMinor: 0,
    updatedAt: isoAt(todayUtc),
  });
}

async function seedFleet(driverUserId) {
  await write("mm_drivers", IDS.driver, {
    id: IDS.driver,
    code: "DRV-0001",
    userId: driverUserId,
    fullName: "Ravi Kumar",
    phone: "+919800000003",
    email: "driver@demo.webortex.app",
    photoUrl: null,
    cityId: "CITY_blr",
    preferredZoneIds: [],
    licenceNumber: "KA0120200012345",
    status: "APPROVED",
    payoutProfile: {
      method: "UPI",
      accountHolderName: "Ravi Kumar",
      upiId: "ravi@demo",
      verified: true,
    },
    documents: [],
    agreementAcceptedAt: isoAt(todayUtc - 180 * DAY_MS),
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: isoAt(todayUtc - 180 * DAY_MS),
    updatedAt: isoAt(todayUtc - 180 * DAY_MS),
  });

  const vehicles = [
    { id: IDS.vehicle, code: "VEH-0001", plate: "KA01AB1234", lastSeen: 4 * 60_000 },
    { id: IDS.vehicle2, code: "VEH-0002", plate: "KA02CD5678", lastSeen: 26 * 60_000 },
  ];
  for (const vehicle of vehicles) {
    // `lastKnownLocation` is deliberately coarse — the platform coarsens
    // positions before they are stored, and seeding exact coordinates would
    // misrepresent how the fleet service behaves.
    await write("mm_vehicles", vehicle.id, {
      id: vehicle.id,
      code: vehicle.code,
      ownerUserId: null,
      ownerDriverId: null,
      driverId: IDS.driver,
      type: "BUS",
      groupId: null,
      registrationNumber: vehicle.plate,
      make: "Ashok Leyland",
      model: "Viking",
      year: 2022,
      colour: "WHITE",
      cityId: "CITY_blr",
      homeZoneId: null,
      status: "ACTIVE",
      lastKnownLocation: { latitude: 12.97, longitude: 77.59, accuracyM: 1_500, capturedAt: isoAt(Date.now() - vehicle.lastSeen) },
      lastActiveAt: isoAt(Date.now() - vehicle.lastSeen),
      notes: "",
      documents: [],
      createdAt: isoAt(todayUtc - 180 * DAY_MS),
      updatedAt: isoAt(todayUtc - vehicle.lastSeen),
    });
  }

  // One screen per vehicle, staggered heartbeats so the fleet panel shows a
  // realistic mix of online, degraded and offline rather than one state.
  const screens = [
    { id: IDS.screen, vehicleId: IDS.vehicle, status: "ONLINE", seenMs: 30_000 },
    { id: IDS.screen2, vehicleId: IDS.vehicle2, status: "OFFLINE", seenMs: 22 * 60_000 },
  ];
  for (const screen of screens) {
    await write("mm_devices", `${screen.id}_dev`, {
      id: `${screen.id}_dev`,
      code: `${screen.id}-DEV`,
      screenId: screen.id,
      // A device inherits its screen's vehicle, as `enrolDevice` does.
      vehicleId: screen.vehicleId,
      credentialHash: demoCredentialHash(),
      model: "Web player",
      manufacturer: "Webortex",
      firmwareVersion: "1.0.0",
      status: screen.status,
      networkStatus: "WIFI",
      lastHeartbeatAt: isoAt(Date.now() - screen.seenMs),
      appVersion: "1.0.0",
      screenOrientation: "LANDSCAPE",
      resolutionWidthPx: 1920,
      resolutionHeightPx: 1080,
      storageUsedBytes: 2_400_000,
      totalStorageBytes: 8_000_000,
      enrolledAt: isoAt(todayUtc - 180 * DAY_MS),
      createdAt: isoAt(todayUtc - 180 * DAY_MS),
      updatedAt: isoAt(Date.now() - screen.seenMs),
    });
    await write("mm_screens", screen.id, {
      id: screen.id,
      code: `SCR-${screen.id.slice(-6).toUpperCase()}`,
      vehicleId: screen.vehicleId,
      deviceId: `${screen.id}_dev`,
      screenType: "LCD",
      resolutionWidthPx: 1920,
      resolutionHeightPx: 1080,
      orientation: "LANDSCAPE",
      brightnessPercent: 80,
      status: screen.status,
      createdAt: isoAt(todayUtc - 180 * DAY_MS),
      updatedAt: isoAt(Date.now() - screen.seenMs),
    });
  }
}

const TARGETING = {
  cityIds: [],
  zoneIds: [],
  routeIds: [],
  vehicleTypes: [],
  vehicleGroupIds: [],
  screenIds: [],
  screenTypes: [],
  dayOfWeek: [],
  timeWindows: [],
  geofences: [],
  audienceCategories: [],
  proximityHotspotMinutes: null,
};

const FREQUENCY = { maxPlaysPerHour: 12, maxPlaysPerDay: 200, minimumGapSeconds: 180, maxInventoryShare: 0.4 };

function engagement(utmCampaign) {
  return {
    qrEnabled: true,
    nfcEnabled: false,
    destinationUrl: "https://example.com/offer",
    couponCode: "DEMO10",
    utmSource: "mobility-screen",
    utmMedium: "digital_ooh",
    utmCampaign,
  };
}

async function seedCampaigns(userId) {
  const specs = [
    {
      id: IDS.campaign,
      code: "CMP-7K2M4P",
      name: "Monsoon Footwear Sale",
      objective: "AWARENESS",
      category: "Retail",
      status: "RUNNING",
      budget: { totalMinor: 1_200_000, dailyMinor: 40_000, pricingModel: "CPM", rateMinor: 250, currency: "INR" },
      startsDaysAgo: 45,
      durationDays: 90,
    },
    {
      id: IDS.campaign2,
      code: "CMP-3F9T1Q",
      name: "New Store Launch",
      objective: "TRAFFIC",
      category: "Food & Beverage",
      status: "PAUSED",
      budget: { totalMinor: 800_000, dailyMinor: 25_000, pricingModel: "CPC", rateMinor: 12, currency: "INR" },
      startsDaysAgo: 20,
      durationDays: 60,
    },
    {
      id: IDS.campaign3,
      code: "CMP-8H5R2W",
      name: "Evergreen Brand Loop",
      objective: "CONVERSIONS",
      category: "Automotive",
      status: "PENDING_REVIEW",
      budget: { totalMinor: 500_000, dailyMinor: null, pricingModel: "CPA", rateMinor: 900, currency: "INR" },
      startsDaysAgo: 2,
      durationDays: 45,
    },
  ];

  const creativeIds = [];
  for (const [index, spec] of specs.entries()) {
    const startsAt = todayUtc - spec.startsDaysAgo * DAY_MS;
    await write("mm_campaigns", spec.id, {
      id: spec.id,
      code: spec.code,
      advertiserId: IDS.advertiser,
      name: spec.name,
      objective: spec.objective,
      category: spec.category,
      description: "Seeded campaign for local development.",
      status: spec.status,
      budget: spec.budget,
      targeting: { ...TARGETING },
      frequencyCaps: { ...FREQUENCY },
      engagement: engagement(spec.code),
      priority: 50,
      startsAt: isoAt(startsAt),
      endsAt: isoAt(startsAt + spec.durationDays * DAY_MS),
      submittedAt: spec.status === "DRAFT" ? null : isoAt(startsAt - 5 * DAY_MS),
      approvedAt: spec.status === "RUNNING" || spec.status === "PAUSED" ? isoAt(startsAt - 3 * DAY_MS) : null,
      approvedBy: spec.status === "RUNNING" || spec.status === "PAUSED" ? userId : null,
      rejectionReasonCode: null,
      rejectionNotes: null,
      pausedAt: spec.status === "PAUSED" ? isoAt(todayUtc - 6 * DAY_MS) : null,
      totalSpentMinor: 0,
      createdBy: userId,
      createdAt: isoAt(startsAt - 7 * DAY_MS),
      updatedAt: isoAt(todayUtc - 3 * DAY_MS),
    });

    const creativeId = `CRT_${spec.id.slice(4).toLowerCase()}01`;
    creativeIds.push(creativeId);
    await write("mm_creatives", creativeId, {
      id: creativeId,
      code: `CRT-${spec.code.slice(4)}`,
      campaignId: spec.id,
      advertiserId: IDS.advertiser,
      name: `${spec.name} — 16x9`,
      format: "IMAGE",
      storagePath: "",
      thumbnailPath: null,
      signedUrl: null,
      signedUrlExpiresAt: null,
      mimeType: "image/jpeg",
      sizeBytes: 480_000 + index * 120_000,
      widthPx: 1920,
      heightPx: 1080,
      durationSeconds: null,
      aspectRatio: "16:9",
      landingUrl: "https://example.com/offer",
      headline: spec.name,
      bodyText: "Seeded creative.",
      callToAction: "Shop now",
      status: spec.status === "PENDING_REVIEW" ? "SUBMITTED" : "APPROVED",
      version: 1,
      parentCreativeId: null,
      isArchived: false,
      reviewedBy: spec.status === "PENDING_REVIEW" ? null : userId,
      reviewedAt: spec.status === "PENDING_REVIEW" ? null : isoAt(startsAt - 3 * DAY_MS),
      rejectionReasonCode: null,
      rejectionNotes: null,
      scheduledFrom: isoAt(startsAt),
      scheduledTo: isoAt(startsAt + spec.durationDays * DAY_MS),
      uploadedBy: userId,
      createdAt: isoAt(startsAt - 5 * DAY_MS),
      updatedAt: isoAt(startsAt - 3 * DAY_MS),
    });
  }
  return creativeIds;
}

/* ------------------------------------------------------------- aggregates -- */

/**
 * Backdated daily playback rows.
 *
 * These are what every dashboard reads: `fetchAggregateRows` sums
 * `mm_agg_playback_daily` and nothing else, so a dashboard with no rows in this
 * collection renders zeros no matter how much other data exists. This is the one
 * collection the scheduled rollup would normally fill.
 *
 * Only DAILY is seeded. `granularityFor` selects HOURLY only for ranges of three
 * days or less, and the portal offers 7/30/90-day presets, so the chart ranges
 * the UI can actually request are all covered.
 */
async function seedAggregates(campaigns, creativeIds) {
  const random = rng(20240214);
  const rows = [];
  const DAYS = 90;

  for (let offset = DAYS; offset >= 0; offset -= 1) {
    const dayMs = todayUtc - offset * DAY_MS;
    const date = isoDay(dayMs);
    const weekday = new Date(dayMs).getUTCDay();
    // Busier at weekends, quieter on Mondays. Without this the demo series is
    // a flat line and the 7-day view looks broken rather than calm.
    const dayFactor = weekday === 0 || weekday === 6 ? 1.25 : weekday === 1 ? 0.85 : 1;

    for (const [campaignIndex, campaign] of campaigns.entries()) {
      // A campaign contributes nothing outside its flight dates, which is what
      // makes the "campaign not running yet" case visible on the advertiser view.
      if (date < isoDay(Date.parse(campaign.startsAt)) || date > isoDay(Date.parse(campaign.endsAt))) continue;
      if (campaign.status === "PAUSED" && date > isoDay(Date.parse(campaign.pausedAt))) continue;

      for (const vehicleId of [IDS.vehicle, IDS.vehicle2]) {
        const plays = Math.round((900 + random() * 500) * dayFactor);
        const completedPlays = Math.round(plays * (0.72 + random() * 0.2));
        const impressions = Math.round(plays * (1.4 + random() * 0.5));
        const engagements = Math.round(impressions * (0.03 + random() * 0.035));
        const leads = Math.round(engagements * (0.08 + random() * 0.09));
        const conversions = Math.round(leads * (0.05 + random() * 0.12));
        const spendMinor = Math.round((impressions / 1000) * (campaign.budget.rateMinor ?? 200));

        rows.push({
          id: `${campaign.id}-${vehicleId}-${date}`,
          date,
          campaignId: campaign.id,
          advertiserId: IDS.advertiser,
          vehicleId,
          screenId: vehicleId === IDS.vehicle ? IDS.screen : IDS.screen2,
          creativeId: creativeIds[campaignIndex],
          zoneId: null,
          cityId: "CITY_blr",
          plays,
          completedPlays,
          impressions,
          engagements,
          leads,
          conversions,
          spendMinor,
          attributedRevenueMinor: Math.round(conversions * 1_800 + engagements * 6),
          updatedAt: isoAt(dayMs + DAY_MS),
        });
      }
    }
  }

  // Batched: 90 days x 3 campaigns x 2 vehicles is ~540 documents, and one
  // `.set()` per document would be slow enough to look like a hang.
  for (let start = 0; start < rows.length; start += 400) {
    const chunk = rows.slice(start, start + 400);
    // From the Firestore instance rather than a `batch` import: the admin SDK's
    // ESM wrapper does not re-export it as a named binding.
    const writes = db.batch();
    for (const row of chunk) {
      writes.set(db.collection("mm_agg_playback_daily").doc(row.id), row);
    }
    await writes.commit();
  }
  return rows.length;
}

/* ---------------------------------------------------------- notifications -- */

async function seedNotifications(users) {
  const notifications = [
    { type: "CAMPAIGN_APPROVED", title: "Monsoon Footwear Sale approved", body: "Your campaign is live and delivering on 2 screens.", href: `/mobility/campaigns/${IDS.campaign}`, read: false, daysAgo: 1 },
    { type: "PAYOUT_SENT", title: "Payout scheduled", body: "Your monthly payout is scheduled for the next settlement run.", href: "/mobility/finance", read: false, daysAgo: 3 },
    { type: "SYSTEM", title: "New creative limits in effect", body: "Maximum file size is unchanged. Accepted durations are now 3–30s.", href: "/mobility/settings", read: true, daysAgo: 9 },
  ];

  for (const user of Object.values(users)) {
    for (const [index, spec] of notifications.entries()) {
      await write("mm_notifications", `NTF_${user.key}_${index}`, {
        id: `NTF_${user.key}_${index}`,
        userId: user.uid,
        type: spec.type,
        channel: "IN_APP",
        title: spec.title,
        body: spec.body,
        href: spec.href,
        entityType: null,
        entityId: null,
        readAt: spec.read ? isoAt(todayUtc - (spec.daysAgo - 0.5) * DAY_MS) : null,
        deliveryStatus: "SENT",
        createdAt: isoAt(todayUtc - spec.daysAgo * DAY_MS),
      });
    }
  }
}

/* ------------------------------------------------------------------- main -- */

async function main() {
  console.log(`Seeding emulator project "${PROJECT_ID}"...\n`);

  const users = await seedUsers();
  console.log(`  users      ${Object.keys(users).length} Auth users + mm_users profiles`);

  await seedAdvertiser(users.advertiser.uid);
  console.log("  advertiser Acme Media Group + wallet");

  await seedFleet(users.driver.uid);
  console.log("  fleet      1 driver, 2 vehicles, 2 screens, 2 devices");

  const creativeIds = await seedCampaigns(users.advertiser.uid);
  console.log(`  campaigns  3 campaigns, ${creativeIds.length} creatives`);

  const rowCount = await seedAggregates(
    [
      { id: IDS.campaign, startsAt: isoAt(todayUtc - 45 * DAY_MS), endsAt: isoAt(todayUtc + 45 * DAY_MS), pausedAt: null, budget: { rateMinor: 250 } },
      { id: IDS.campaign2, startsAt: isoAt(todayUtc - 20 * DAY_MS), endsAt: isoAt(todayUtc + 40 * DAY_MS), pausedAt: isoAt(todayUtc - 6 * DAY_MS), budget: { rateMinor: 12 } },
      { id: IDS.campaign3, startsAt: isoAt(todayUtc - 2 * DAY_MS), endsAt: isoAt(todayUtc + 43 * DAY_MS), pausedAt: null, budget: { rateMinor: 900 } },
    ],
    creativeIds,
  );
  console.log(`  analytics  ${rowCount} daily aggregate rows over 90 days`);

  await seedNotifications(users);
  console.log("  inbox      3 notifications per user");

  console.log(`\n  ${"done"}. Sign in at http://localhost:5173/mobility/sign-in\n`);
  console.log("    email                password        dashboard");
  console.log("    -------------------  --------------  ---------------------------");
  console.log("    admin@demo.…         DemoPass!2024   operations (platform)");
  console.log("    advertiser@demo.…    DemoPass!2024   campaign analytics");
  console.log("    driver@demo.…        DemoPass!2024   vehicle analytics + earnings\n");
  if (DEVICE_PEPPER) {
    console.log("  Screen player (the online demo screen):");
    console.log(`    http://localhost:5173/player#id=${IDS.screen}_dev&key=${DEMO_DEVICE_SECRET}\n`);
  } else {
    console.log("  Screen player: set MOBILITY_DEVICE_SECRET_PEPPER in functions/.secret.local");
    console.log("  and re-seed to get a working demo device link.\n");
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("\nSeed failed:", error?.message ?? error);
  process.exit(1);
});