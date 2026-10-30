/**
 * Creative service: upload intents, private storage, moderation and versioning.
 *
 * Media is never public. The client asks for an upload intent, gets a short-lived
 * signed PUT URL into the private bucket, and then asks for a signed GET URL only
 * when it is authorised to view that creative. The screen player receives the same
 * short-lived URLs for exactly the creatives it is scheduled to play.
 */

import { getDownloadURL } from "firebase-admin/storage";
import { FieldValue, Filter } from "firebase-admin/firestore";
import { bucket, type FirestorePatch } from "../lib/admin.js";
import {
  canTransitionEntity,
  COLLECTIONS,
  newId,
  newReference,
  type Creative,
  type CreativeFormat,
  type CreativeRegistrationInput,
  type CreativeUploadIntentInput,
  type ModerationDecision,
  type WorkflowStatus,
} from "../../../packages/shared/src/index.js";
import { db, nowIso } from "../lib/admin.js";
import { config } from "../lib/config.js";
import { ApiError } from "../lib/http.js";
import { getSettings } from "./settingsService.js";

function creatives() {
  return db().collection(COLLECTIONS.creatives);
}

/**
 * Magic-byte prefixes per MIME type. A declared Content-Type is not trusted: the
 * first bytes of the uploaded object are checked against this table before the
 * file is accepted, so a `.png` that is really an HTML document never becomes a
 * creative. MP4/WebM share a container family and are checked structurally.
 */
const MIME_SIGNATURES: Readonly<Record<string, readonly string[]>> = {
  "image/jpeg": ["ffd8ff"],
  "image/png": ["89504e47"],
  "image/gif": ["47494638"],
  "image/webp": ["52494646"],
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

export function formatForMime(mimeType: string): CreativeFormat {
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType === "image/gif") return "GIF";
  return "IMAGE";
}

/** Structural, config-driven validation of an upload intent. */
export async function validateUploadIntent(input: CreativeUploadIntentInput): Promise<void> {
  const settings = await getSettings();
  const constraints = settings.creative;

  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw ApiError.unprocessable(
      `Unsupported file type "${input.mimeType}". Accepted: ${[...ALLOWED_MIME].join(", ")}.`,
    );
  }
  const format = formatForMime(input.mimeType);
  if (!constraints.allowedFormats.includes(format)) {
    throw ApiError.unprocessable(`${format} creatives are not enabled on this platform.`);
  }
  if (input.sizeBytes > constraints.maxFileSizeBytes) {
    throw ApiError.unprocessable(
      `File is larger than the ${Math.round(constraints.maxFileSizeBytes / (1024 * 1024))} MB limit.`,
    );
  }
  const widthPx = input.widthPx ?? null;
  const heightPx = input.heightPx ?? null;
  if (widthPx !== null && heightPx !== null) {
    if (widthPx < constraints.minWidthPx || heightPx < constraints.minHeightPx) {
      throw ApiError.unprocessable(
        `Creative must be at least ${constraints.minWidthPx}x${constraints.minHeightPx}px (received ${widthPx}x${heightPx}).`,
      );
    }
    const ratio = widthPx / heightPx;
    const accepted = constraints.acceptedAspectRatios.map(parseAspectRatio).filter(Boolean) as number[];
    const tolerance = 0.02;
    if (accepted.length > 0 && !accepted.some((target) => Math.abs(ratio - target) <= tolerance)) {
      throw ApiError.unprocessable(
        `Aspect ratio ${ratio.toFixed(2)} is not accepted. Use one of: ${constraints.acceptedAspectRatios.join(", ")}.`,
      );
    }
  }
  if (format !== "IMAGE") {
    const duration = input.durationSeconds ?? null;
    if (duration === null) {
      throw ApiError.unprocessable("Video creatives must declare a duration.");
    }
    if (duration < constraints.minDurationSeconds || duration > constraints.maxDurationSeconds) {
      throw ApiError.unprocessable(
        `Video duration must be between ${constraints.minDurationSeconds}s and ${constraints.maxDurationSeconds}s.`,
      );
    }
  }
}

/**
 * Verify the uploaded object's leading bytes against its declared MIME type.
 *
 * Called after the signed PUT lands but before the creative is registered, so an
 * unverified object is never referenced by a campaign.
 */
export function assertMimeMatchesBytes(mimeType: string, firstBytes: Uint8Array): void {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw ApiError.unprocessable(`Unsupported file type "${mimeType}".`);
  }
  const prefix = Buffer.from(firstBytes.subarray(0, 12)).toString("hex").toLowerCase();

  if (mimeType.startsWith("video/")) {
    // ISO-BMFF ("ftyp") or Matroska/WebM ("1a45dfa3").
    const isIsoBmff = prefix.startsWith("0000001") && prefix.slice(8, 12) === "66747970";
    const isWebm = prefix.startsWith("1a45dfa3");
    const wantsWebm = mimeType === "video/webm";
    if (wantsWebm ? !isWebm : !isIsoBmff) {
      throw ApiError.unprocessable("The uploaded file does not match the declared video type.");
    }
    return;
  }

  const signatures = MIME_SIGNATURES[mimeType];
  if (!signatures) throw ApiError.unprocessable(`Unsupported file type "${mimeType}".`);
  if (!signatures.some((signature) => prefix.startsWith(signature))) {
    throw ApiError.unprocessable("The uploaded file does not match the declared image type.");
  }
}

function parseAspectRatio(value: string): number | null {
  const [w, h] = value.split(":");
  const width = Number(w);
  const height = Number(h);
  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) return null;
  return width / height;
}

/**
 * Create an upload intent. Returns a signed PUT URL scoped to exactly one object
 * path. `contentType` is pinned in the signed metadata so a caller cannot upload
 * a different type under an approved extension.
 */
export async function createUploadIntent(
  ownerType: "creative" | "document",
  ownerId: string,
  input: { fileName: string; mimeType: string; sizeBytes: number },
  uploadedBy: string,
): Promise<{
  uploadUrl: string;
  storagePath: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
  requiredHeaders: string[];
}> {
  if (!ALLOWED_MIME.has(input.mimeType) && !/^application\/(pdf|image\/(jpeg|png))$/.test(input.mimeType)) {
    throw ApiError.unprocessable(`Unsupported content type "${input.mimeType}".`);
  }
  const safeName = input.fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
  const storagePath = `mobility/${ownerType}s/${ownerId}/${newId("DOC")}-${safeName}`;
  const expiresAt = new Date(Date.now() + config.storageSignedUrlTtlMs).toISOString();

  const [uploadUrl] = await bucket().file(storagePath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType: input.mimeType,
  });

  void uploadedBy;
  return {
    uploadUrl,
    storagePath,
    method: "PUT",
    headers: { "Content-Type": input.mimeType },
    expiresAt,
    requiredHeaders: ["Content-Type"],
  };
}

/** Short-lived signed GET URL. Callers must have already passed authorisation. */
export async function signedReadUrl(
  storagePath: string,
  ttlMs = config.storageSignedUrlTtlMs,
): Promise<{ url: string; expiresAt: string }> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const [url] = await bucket().file(storagePath).getSignedUrl({ version: "v4", action: "read", expires: expiresAt });
    return { url, expiresAt };
  } catch {
    // Never surface the storage error; the object may simply not exist yet.
    throw ApiError.notFound("The requested file is not available.");
  }
}

export async function registerCreative(
  input: CreativeRegistrationInput,
  advertiserId: string,
  uploadedBy: string,
): Promise<Creative> {
  await validateUploadIntent(input);

  const settings = await getSettings();
  const existingCount = await creatives()
    .where("campaignId", "==", input.campaignId)
    .where("isArchived", "==", false)
    .count()
    .get();
  if (existingCount.data().count >= settings.creative.maxCreativesPerCampaign) {
    throw ApiError.unprocessable(
      `A campaign may hold at most ${settings.creative.maxCreativesPerCampaign} active creatives.`,
    );
  }

  const campaignSnapshot = await db().collection(COLLECTIONS.campaigns).doc(input.campaignId).get();
  if (!campaignSnapshot.exists) throw ApiError.notFound("Campaign not found.");
  const campaign = campaignSnapshot.data();
  if (campaign?.advertiserId !== advertiserId) {
    throw ApiError.forbidden("You can only add creatives to your own campaigns.");
  }
  if (!["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION"].includes(String(campaign?.status))) {
    throw ApiError.conflict(
      `Creatives cannot be added while the campaign is "${campaign?.status}". Pause the campaign to make changes.`,
    );
  }

  const format = formatForMime(input.mimeType);
  const aspectRatio =
    input.widthPx && input.heightPx ? simplifyRatio(input.widthPx, input.heightPx) : settings.creative.preferredAspectRatio;

  const id = newId("CRT");
  const now = nowIso();
  const document = {
    id,
    code: newReference("CRT"),
    campaignId: input.campaignId,
    advertiserId,
    name: input.name,
    format,
    storagePath: "",
    thumbnailPath: null as string | null,
    signedUrl: null as string | null,
    signedUrlExpiresAt: null as string | null,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    durationSeconds: input.durationSeconds,
    aspectRatio,
    landingUrl: "",
    headline: "",
    bodyText: "",
    callToAction: "",
    status: "DRAFT" as WorkflowStatus,
    version: 1,
    parentCreativeId: null as string | null,
    isArchived: false,
    reviewedBy: null as string | null,
    reviewedAt: null as string | null,
    rejectionReasonCode: null as string | null,
    rejectionNotes: null as string | null,
    scheduledFrom: null as string | null,
    scheduledTo: null as string | null,
    uploadedBy,
    createdAt: now,
    updatedAt: now,
  };

  await creatives().doc(id).set(document);

  // The declared storage path from the upload intent determines the final object
  // key, so a caller cannot register a creative pointing at another campaign's
  // folder. A path that is absent means the upload intent was not completed and
  // the creative is rejected.
  const intentPath = input.storagePath;
  const expectedPrefix = `mobility/creatives/${input.campaignId}/`;
  if (!intentPath || !intentPath.startsWith(expectedPrefix)) {
    await creatives().doc(id).delete();
    throw ApiError.badRequest("Complete the file upload before registering the creative.");
  }

  await creatives().doc(id).update({ storagePath: intentPath });

  const created = await creatives().doc(id).get();
  return created.data() as Creative;
}

function simplifyRatio(width: number, height: number): string {
  const divisor = greatestCommonDivisor(width, height);
  const w = width / divisor;
  const h = height / divisor;
  // Collapse common ratios onto their canonical form for readable display.
  const known: Record<string, string> = {
    "16/9": "16:9",
    "9/16": "9:16",
    "4/3": "4:3",
    "3/4": "3:4",
    "1/1": "1:1",
  };
  return known[`${w}/${h}`] ?? `${w}:${h}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export async function duplicateCreative(creativeId: string, advertiserId: string, actorId: string): Promise<Creative> {
  const snapshot = await creatives().doc(creativeId).get();
  if (!snapshot.exists) throw ApiError.notFound("Creative not found.");
  const source = snapshot.data() as Creative;
  if (source.advertiserId !== advertiserId) throw ApiError.forbidden("You can only duplicate your own creatives.");

  const id = newId("CRT");
  const now = nowIso();
  const copy: Record<string, unknown> = {
    ...source,
    id,
    code: newReference("CRT"),
    name: `${source.name} (copy)`.slice(0, 120),
    status: "DRAFT",
    version: 1,
    parentCreativeId: creativeId,
    storagePath: source.storagePath ? source.storagePath.replace(/\/[^/]+$/, "") + "/" + id : source.storagePath,
    thumbnailPath: null,
    signedUrl: null,
    signedUrlExpiresAt: null,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReasonCode: null,
    rejectionNotes: null,
    scheduledFrom: null,
    scheduledTo: null,
    uploadedBy: actorId,
    createdAt: now,
    updatedAt: now,
  };
  await creatives().doc(id).set(copy);
  const created = await creatives().doc(id).get();
  return created.data() as Creative;
}

export async function archiveCreative(creativeId: string, advertiserId: string): Promise<void> {
  const snapshot = await creatives().doc(creativeId).get();
  if (!snapshot.exists) throw ApiError.notFound("Creative not found.");
  const creative = snapshot.data() as Creative;
  if (creative.advertiserId !== advertiserId) throw ApiError.forbidden("You can only archive your own creatives.");
  if (creative.status === "LIVE" || creative.status === "SCHEDULED") {
    throw ApiError.conflict("A live or scheduled creative cannot be archived. Pause the campaign first.");
  }
  await creatives().doc(creativeId).update({ isArchived: true, updatedAt: nowIso() });
}

/** Submit creatives for review. Only DRAFT/REJECTED creatives can be submitted. */
export async function submitCreatives(creativeIds: readonly string[], advertiserId: string): Promise<number> {
  if (creativeIds.length === 0) throw ApiError.badRequest("Select at least one creative.");
  if (creativeIds.length > 100) throw ApiError.badRequest("Submit at most 100 creatives at a time.");

  const snapshots = await db().getAll(...creativeIds.map((id) => creatives().doc(id)));
  const batch = db().batch();
  let count = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue;
    const creative = snapshot.data() as Creative;
    if (creative.advertiserId !== advertiserId) {
      throw ApiError.forbidden("One or more creatives do not belong to you.");
    }
    const from = creative.status as WorkflowStatus;
    // DRAFT (or a fixed REJECTED creative) enters the queue as SUBMITTED; a
    // moderator may pick it up into UNDER_REVIEW or decide on it directly.
    if (!canTransitionEntity("creative", from, "SUBMITTED")) {
      throw ApiError.conflict(
        `Creative ${creative.code} is "${creative.status}" and cannot be submitted for review.`,
      );
    }
    batch.update(snapshot.ref, {
      status: "SUBMITTED",
      rejectionReasonCode: null,
      rejectionNotes: null,
      updatedAt: nowIso(),
    });
    count += 1;
  }
  if (count === 0) throw ApiError.notFound("No matching creatives were found.");
  await batch.commit();
  return count;
}

/**
 * Moderation decision.
 *
 * Approving moves the creative to APPROVED and promotes its campaign to APPROVED
 * if the campaign is still awaiting review, because a campaign cannot deliver
 * without approved creative.
 */
export async function moderateCreative(
  creativeId: string,
  reviewerId: string,
  decision: ModerationDecision,
): Promise<Creative> {
  const settings = await getSettings();
  const snapshot = await creatives().doc(creativeId).get();
  if (!snapshot.exists) throw ApiError.notFound("Creative not found.");
  const creative = snapshot.data() as Creative;
  const from = creative.status as WorkflowStatus;

  // "Request changes" is a rejection with a reason the owner is expected to act
  // on; mapping it to UNDER_REVIEW left the creative in the queue with no way
  // for its owner to see that anything was asked of them.
  const target: WorkflowStatus =
    decision.decision === "APPROVE"
      ? "APPROVED"
      : decision.decision === "SUSPEND"
        ? "PAUSED"
        : "REJECTED";

  if (!canTransitionEntity("creative", from, target)) {
    throw ApiError.conflict(`A creative in "${creative.status}" cannot be moved to "${target}".`);
  }

  if (decision.decision !== "APPROVE") {
    const validCodes = new Set(settings.moderation.rejectionReasons.map((reason) => reason.code));
    if (!decision.reasonCode || !validCodes.has(decision.reasonCode)) {
      throw ApiError.badRequest(
        "Choose a reason from the configured list. Free-text notes go in the notes field.",
      );
    }
  }

  const now = nowIso();
  const patch: FirestorePatch = {
    status: target,
    reviewedBy: reviewerId,
    reviewedAt: now,
    updatedAt: now,
    rejectionReasonCode: decision.decision === "APPROVE" ? null : decision.reasonCode ?? null,
    rejectionNotes: decision.decision === "APPROVE" ? null : decision.notes ?? null,
  };

  const batch = db().batch();
  batch.update(snapshot.ref, patch);

  if (decision.decision === "APPROVE") {
    const campaignRef = db().collection(COLLECTIONS.campaigns).doc(creative.campaignId);
    const campaignSnapshot = await campaignRef.get();
    const campaignStatus = campaignSnapshot.data()?.status as WorkflowStatus | undefined;
    if (campaignStatus === "UNDER_REVIEW") {
      batch.update(campaignRef, {
        status: "APPROVED",
        approvedAt: now,
        approvedBy: reviewerId,
        updatedAt: now,
      });
    }
  }

  await batch.commit();
  const updated = await creatives().doc(creativeId).get();
  return updated.data() as Creative;
}

export async function listCreativesForReview(
  options: { status?: string; limit: number; cursor?: string | null },
): Promise<{ items: Creative[]; nextCursor: string | null }> {
  let query = creatives().orderBy("createdAt").limit(options.limit + 1);
  if (options.status && options.status !== "ALL") {
    query = creatives().where("status", "==", options.status).orderBy("createdAt").limit(options.limit + 1);
  } else {
    query = creatives().where("status", "in", ["SUBMITTED", "UNDER_REVIEW"]).orderBy("createdAt").limit(options.limit + 1);
  }
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, options.limit);
  const items = docs.map((doc) => doc.data() as Creative);
  const nextCursor = snapshot.docs.length > options.limit ? docs[docs.length - 1]?.id ?? null : null;
  return { items, nextCursor };
}

/**
 * One advertiser's own creatives, offset-paged.
 *
 * Paged rather than returned whole so an advertiser with thousands of assets
 * cannot pull them all in one request. Over-reads by one to decide whether a
 * further page exists — without that, a page that happens to land exactly on the
 * limit is indistinguishable from the end of the list.
 */
export async function listCreativesForAdvertiser(
  advertiserId: string,
  options: { limit: number; page: number; status?: string | undefined; campaignId?: string | undefined },
): Promise<{ items: Creative[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  // Built once and used for both the count and the page, because a count built
  // from a narrower filter than the page reports totals the list never shows:
  // page 1 could render 3 rows while claiming 40 exist, and the pager would offer
  // pages that come back empty.
  const filters: Filter[] = [
    Filter.where("advertiserId", "==", advertiserId),
    Filter.where("isArchived", "==", false),
  ];
  if (options.status) filters.push(Filter.where("status", "==", options.status));
  if (options.campaignId) filters.push(Filter.where("campaignId", "==", options.campaignId));
  const where = filters.length === 1 ? filters[0]! : Filter.and(...filters);

  const countSnapshot = await creatives().where(where).count().get();
  const total = countSnapshot.data().count;

  const snapshot = await creatives()
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(options.limit + 1)
    .offset((options.page - 1) * options.limit)
    .get();

  // `limit + 1` is the only way Firestore can answer "is there a next page"
  // without a second query: the extra row is proof and is then dropped, so a
  // caller never sees more than `pageSize` items alongside a `hasMore` of true.
  const hasMore = snapshot.docs.length > options.limit;
  return {
    items: snapshot.docs.slice(0, options.limit).map((doc) => doc.data() as Creative),
    total,
    page: options.page,
    pageSize: options.limit,
    hasMore,
  };
}

/** Attach a short-lived signed read URL to a creative the caller may view. */
export async function withSignedUrl(creative: Creative): Promise<Creative> {
  if (!creative.storagePath) return creative;
  try {
    const { url, expiresAt } = await signedReadUrl(creative.storagePath);
    return { ...creative, signedUrl: url, signedUrlExpiresAt: expiresAt };
  } catch {
    return { ...creative, signedUrl: null, signedUrlExpiresAt: null };
  }
}

export { getDownloadURL, FieldValue };