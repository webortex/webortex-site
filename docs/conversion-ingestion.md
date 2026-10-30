# Conversion ingestion

The public endpoint `POST /public/v1/conversions` is how an advertiser's own system
reports outcomes — leads, coupon redemptions, purchases. It is unauthenticated in the
usual sense: there is no session and no Firebase user. Authentication is a per-advertiser
API key.

## Authentication

The key travels in the `X-Conversion-Api-Key` request header, never in the JSON body. A
secret inside a body is the first thing captured by request logs and error reporters, so
`conversionApiIngestSchema` deliberately has no `apiKey` field — sending one there does
nothing.

Only the SHA-256 digest is stored. A leaked database cannot be replayed against the
endpoint, and a lost key must be rotated rather than recovered. Lookup is by digest
across the `apiKeys` collection group, so an attacker cannot use response timing to probe
for valid keys, and the comparison is constant-time.

## Attribution is never taken from the payload

The key identifies the advertiser, so the server derives everything that follows from it:

- `advertiserId` comes from the key, overriding any body field.
- The campaign must belong to that advertiser, checked against the campaign document.
- A `creativeId`, if supplied, must belong to that campaign.

Without these, a feed could post against someone else's `campaignId` and inflate another
advertiser's campaign analytics and its drivers' payouts.

## `verified` is a platform decision

`verified` controls whether a conversion counts toward driver payouts and toward
conversion rates. It is therefore **not** something the reporting party asserts about
itself: an API key proves who is posting, never that the claim is true.

Each key carries a `trustLevel`:

| Value | Meaning |
| --- | --- |
| `UNTRUSTED` | Default, and the only value a new key can be given. Rows may not be marked verified. |
| `VERIFIED_FEED` | Granted only where the key is issued to an integration the platform has checked — a payment gateway relay, say. Allows rows to count toward payouts. |

A key issued without an explicit trust level is `UNTRUSTED`, and a stored key whose
`trustLevel` is missing or unrecognised is read as `UNTRUSTED` too — so keys written
before this field existed are never accidentally promoted.

### What happens to a refused claim

The row is **still ingested**. It is attributed, stored and visible; it is simply stored
as unverified, so it does not pay out until something confirms it.

This is deliberate. Rejecting the row would lose the signal entirely, and silently
dropping the flag would leave an integrator debugging missing payouts with no
indication of why. Instead the response reports a `verificationDowngraded` count, and the
stored row keeps `verificationSource` as `REFUSED_UNTRUSTED_KEY:<claimed source>` so an
operator can see that a feed asked for this and was denied.

`resolveConversions` returns the count; the audit entry records it alongside the key id
and trust level.

## Idempotency

`externalReference` is the advertiser's own idempotency key. The document id is derived
from `advertiserId` + `externalReference`, so a replayed feed produces a no-op rather
than a second document — which is what keeps revenue splits and payouts stable.

The write uses `create`, not `set`. The pre-check for an existing reference is a
read-before-write and cannot see a concurrent feed posting the same reference, so the
write itself has to be the arbiter.

A batch commit is atomic, so one already-existing document fails the whole commit and
writes nothing. On that failure `writeConversions` re-reads to find which documents
actually landed and retries only the rest, bounded at three attempts. Treating the whole
group as duplicates instead would discard up to 399 valid conversions that were never
written.

Duplicate `externalReference` values within a single request are collapsed before
writing.

## Issuing a key

Keys are managed in the portal under **API keys** (`/mobility/api-keys`), backed by:

| Endpoint | Who |
| --- | --- |
| `GET /advertisers/{advertiserId}/api-keys` | The advertiser itself, or staff with `apikeys:manage` |
| `POST /advertisers/{advertiserId}/api-keys` `{ label, trustLevel? }` | Same |
| `POST /advertisers/{advertiserId}/api-keys/{keyId}/revoke` | Same |

`trustLevel` defaults to `UNTRUSTED`. Issuing a `VERIFIED_FEED` key additionally needs
`advertisers:review`, so an advertiser can never grant its own feed the right to mark
conversions verified. Every issue and revoke is audited (`API_KEY_ISSUED`,
`API_KEY_REVOKED`); the audit entry never contains the key.

The plaintext is returned exactly once, in the issue response, and is not recoverable
afterwards. Revocation takes effect on the next request: lookups filter on
`revokedAt == null`.
