# Webortex — Mobility Media

Ad-forecasting and monetisation for transit media networks: taxis, cabs, auto-rickshaws
and buses carrying screen inventory, sold to advertisers and settled back to drivers.

The repository holds three things:

- **The legacy marketing site** in `src/` — React + Vite, plain JSX, deployed to Netlify.
- **The Mobility Media platform** — a TypeScript API on Cloud Functions (`functions/`),
  shared schemas (`packages/shared/`), the operations/advertiser/driver portal at
  `/mobility` (`src/mobility-media/`) and the in-vehicle screen player at `/player`
  (`src/mobility-player/`).
- **Firebase config** for the platform's own Firebase project: rules, indexes, emulators.

## Layout

| Path | What it is |
| --- | --- |
| `src/` | Legacy web app. The portal and player are lazy routes inside it. |
| `src/mobility-media/` | Portal: campaigns, creatives, review, analytics, fleet, finance, API keys, support, settings. |
| `src/mobility-player/` | Screen player: playlist rotation, offline media cache, durable playback outbox, heartbeat. |
| `functions/src/lib/` | Infrastructure: `admin`, `config`, `http`, `params`, `router`, `razorpay`. |
| `functions/src/middleware/` | `auth`, `deviceAuth`, `rateLimit`, `audit`. |
| `functions/src/domain/` | Business logic, one service per bounded area. |
| `functions/src/routes/` | HTTP surface. Thin: validate, authorise, delegate. |
| `packages/shared/` | Schemas, roles, state machines. The single source of truth for both halves. |

`functions/src/index.ts` registers every route on one `api` function and wires two
scheduled jobs: the hourly analytics rollup and the 15-minute campaign lifecycle
(APPROVED → SCHEDULED → RUNNING → COMPLETED).

## Local development

Requires Node 22 and Java 11+ (for the Firestore emulator).

```bash
npm install && npm --prefix functions install
cp functions/.secret.local.example functions/.secret.local   # emulator secrets
npm --prefix functions run build
npm run emulators      # terminal 1: auth, firestore, functions, storage on demo-webortex-mobility
npm run seed           # terminal 2: demo users, fleet, campaigns, 90 days of analytics
npm run dev            # terminal 3: http://localhost:5173/mobility
```

`.firebaserc` defaults to `demo-webortex-mobility`. A `demo-` project id can never reach
a real backend, so local work cannot touch production data. The seed prints three
sign-ins (admin, advertiser, driver; password `DemoPass!2024`) and a `/player#…` link for
a demo screen.

```bash
npm test               # vitest: web (jsdom) + functions (node)
npm run typecheck      # tsc over functions/
npm run lint
npm run build
```

## Deploying to the Mobility Media project

Mobility Media runs in **its own Firebase project**, separate from the legacy site's.

1. Create the project (Blaze plan — Functions, Scheduler and Secret Manager need it), enable
   Email/Password sign-in, Firestore (`asia-south1`) and Storage.
2. `npm run firebase:use -- <project-id>` and give it the alias **`prod`**. The deploy
   scripts all pass `--project prod`.
3. Set the secrets, one at a time (`npm run firebase:secrets -- NAME`):
   `MOBILITY_AUDIT_SALT`, `MOBILITY_DEVICE_SECRET_PEPPER`, `RAZORPAY_KEY_ID`,
   `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. All five must exist for the deploy to
   bind them. Use long random values for the first two and **never change the pepper**
   afterwards, because every device key is hashed with it.
4. Function environment (`functions/.env.prod`): `MOBILITY_ALLOWED_ORIGINS` (the site's
   origins, comma-separated) and `MOBILITY_PUBLIC_BASE_URL`.
5. Deploy:

   ```bash
   npm run firebase:rules:deploy     # firestore + storage rules
   npm run firebase:indexes:deploy   # wait for indexes to finish building
   npm run firebase:functions:deploy # typechecks and builds first (predeploy)
   ```

6. Front end: put the web-app config into `.env.local` / the Netlify build environment
   (see `.env.example`), including
   `VITE_API_BASE_URL=https://asia-south1-<project-id>.cloudfunctions.net/api/mobility`,
   then deploy the site as usual.
7. Razorpay dashboard → Webhooks: URL
   `https://asia-south1-<project-id>.cloudfunctions.net/api/mobility/webhooks/razorpay`,
   event `payment.captured`, secret = `RAZORPAY_WEBHOOK_SECRET`.
8. Storage bucket CORS: allow `GET` from the site origin, so screens can cache media
   for offline play (`gsutil cors set`).
9. Create the first `SUPER_ADMIN`: create the user in Firebase Auth, then add an
   `mm_users/{uid}` document with `roles: ["SUPER_ADMIN"]` and `status: "ACTIVE"` (shape as
   in `functions/scripts/seed-emulator.mjs`).

## Architecture

**All access goes through the API.** The browser never reads or writes `mm_*` collections;
tenancy, permission and field-level checks live in one audited place in the Functions
tier. Rules deny client access by default, so a mistake in a route is a bug, not a leak.
The legacy forms in `src/Components/` are the one exception, allowed narrowly and with no
read access.

**State machines are shared.** Campaign and creative transitions live in
`packages/shared/src/statuses.ts`; the API enforces them and the portal only offers
buttons the table allows.

**Money only moves on an authorised path.** Amounts are integer minor units; every
money-moving write is idempotent and transactional. Razorpay top-ups credit the wallet
only from a signature-verified `payment.captured` webhook, attributed from the order the
server created — never from the browser's checkout callback. `POST /finance/credits` is for
reconciled bank/UPI transfers only and refuses gateway payments. Conversions count toward
payouts only from a verified feed — see [docs/conversion-ingestion.md](docs/conversion-ingestion.md).

**Devices are bound.** A player authenticates with a per-device key (HMAC-hashed at rest)
and may only act for the screen and vehicle it was enrolled against. Its plays are queued
locally and uploaded with client event ids, so an outage costs nothing and a retry
counts once.

**Aggregates are derived, never accumulated in place.** The rollup recomputes a rolling
window from raw events and deletes rows it did not produce, so late or corrected events
cannot leave a wrong total behind.

## Documentation

- [Conversion ingestion](docs/conversion-ingestion.md) — API keys, trust levels,
  attribution, idempotency.
- [Firestore indexes](docs/firestore-indexes.md) — which query needs which index.

## Known limitations

- Media is signed by the Admin SDK, which needs real service-account credentials. Under
  the emulator, signing fails, so the player shows each creative's headline as a text
  card instead of the image or video.
- `src/App.jsx` shows the legacy 3-second loader before any route, including `/player`.
