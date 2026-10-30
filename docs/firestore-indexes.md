# Firestore indexes

`firestore.indexes.json` holds the composite indexes the Functions API needs. Single-field
indexes are created by Firestore automatically and are not listed.

Every index in the file exists because a specific query in the codebase requires it. The
query is named so that an index can be traced back to the code that needs it, and so a
future change to that query knows what to update.

## Why this is not optional

Firestore refuses a query that has no matching index, failing the request with
`FAILED_PRECONDITION`. A dashboard that silently returned nothing would be far worse than
one that errors, so the indexes are deployed alongside the code.

## Query → index map

| Query in code | Required index |
| --- | --- |
| `analyticsService.summaries` / `breakdowns` / `aggregateForCampaign`, `mm_agg_playback_daily` + `mm_agg_playback_hourly` | `<id dimension>, <date \| hourKey>` |
| `analyticsService.vehicleMetrics` — `vehicleId in` + date range | `vehicleId, date` |
| `analyticsService.screenMetrics` — `screenId in` + date range | `screenId, date` |
| `deliveryService` per-device daily rows — `deviceId ==` + date | `deviceId, date` |
| `aggregationService.rollUp` — one day of raw events, paged by document id | `dayKey, __name__` |
| `aggregationService.deleteStaleRows` — walk one bucket's aggregate rows by id | `date, __name__` and `hourKey, __name__` |
| `deliveryService` frequency cap — `deviceId` + `recordedAt` order | `deviceId, recordedAt` |
| `deliveryService` creative dedup — `deviceId` + `creativeId` + newest | `deviceId, creativeId, recordedAt DESC` |
| `financeService` settlements — only verified conversions in a window | `verified, occurredAt` |
| `conversionService` idempotency by external reference | `advertiserId, externalReference` |
| `conversionService.authenticateApiKey` — collection group lookup | `keyHash, revokedAt` (COLLECTION_GROUP) |
| `fleetService` list filters | `status, createdAt` and `cityId, createdAt` |
| `creativeService` review queue | `status, createdAt` and `campaignId, isArchived` |
| `campaignService` lifecycle sweeps | `status, startsAt` and `status, endsAt` |
| `campaignService.advertiserList` | `advertiserId, createdAt DESC` |
| `deliveryService` ad selection | `campaignId, status, isArchived` |
| `financeService` refundable transactions | `advertiserId, status` |
| `financeService.listTransactions` / `listInvoices` — one advertiser, newest first | `advertiserId, createdAt DESC` |
| `financeService.listPayouts` — one driver, newest first | `driverId, createdAt DESC` |
| `notificationService` feed and unread counts | `userId, readAt` and `userId, createdAt DESC` |
| `notificationService` delivery retry | `deliveryStatus, createdAt` |
| `supportService` scoped ticket list | `raisedBy` / `assignedTo` / `status`, `createdAt DESC` |

## Two notes on index shape

**An `in` clause is an equality for indexing purposes.** The three-field indexes exist
because the dashboard summary path filters on an advertiser or campaign *and* a chunked id
dimension over the same rows. Firestore requires those equality fields in the index ahead
of the range field, so they appear as separate leading columns.

**The aggregate collections are indexed on both `date` and `hourKey`.** `analyticsService`
picks `keyField` based on the requested granularity and runs the same code against
`mm_agg_playback_daily` or `mm_agg_playback_hourly`, so the two collections need matching
sets of indexes rather than one shared shape.

## After changing a query

If a query changes shape, deploy the index before the code that uses it. An index build on
a large collection is not instant, so the deploy can succeed while the index is still
`CREATING` and requests fail until it finishes:

```bash
npm run firebase:indexes:deploy
```

Then confirm the build completed:

```bash
npx firebase firestore:indexes --database "(default)" --json
```
