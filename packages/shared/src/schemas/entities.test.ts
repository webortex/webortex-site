/**
 * Creative upload contract.
 *
 * The upload is two calls with a gap the client fills: ask for an intent, PUT the
 * bytes to the presigned URL, then register the creative with the `storagePath`
 * the intent returned. The only way that middle step works is if registration
 * actually accepts `storagePath`.
 *
 * It previously did not. `POST /creatives` parsed the body with
 * `creativeUploadIntentSchema`, which does not declare `storagePath`, and Zod
 * strips undeclared keys rather than passing them through. Every registration
 * therefore arrived at `registerCreative` with no path, was deleted again, and
 * returned "Complete the file upload before registering the creative" — an
 * endpoint that could only ever fail. These assertions exist to keep the two
 * schemas from being merged back together.
 */

import { describe, expect, it } from "vitest";
import {
  creativeRegistrationSchema,
  creativeUploadIntentSchema,
  type CreativeRegistrationInput,
} from "../index.js";

const INTENT = {
  campaignId: "CMP_1A2B3C4D5E",
  name: "Monsoon offer",
  fileName: "monsoon.mp4",
  mimeType: "video/mp4",
  sizeBytes: 4_200_000,
  widthPx: 1080,
  heightPx: 1920,
  durationSeconds: 15,
};

const STORAGE_PATH = `mobility/creatives/${INTENT.campaignId}/monsoon.mp4`;

describe("creativeUploadIntentSchema", () => {
  it("accepts the metadata an upload intent is requested with", () => {
    expect(creativeUploadIntentSchema.safeParse(INTENT).success).toBe(true);
  });

  it("defaults the optional dimensions to null", () => {
    const parsed = creativeUploadIntentSchema.parse({ ...INTENT, widthPx: undefined, heightPx: undefined, durationSeconds: undefined });
    expect(parsed.widthPx).toBeNull();
    expect(parsed.heightPx).toBeNull();
    expect(parsed.durationSeconds).toBeNull();
  });

  it("does not accept a caller-chosen storage path", () => {
    // The server picks the object key. A schema that accepted one here would let
    // a client aim its upload at another campaign's folder.
    const parsed = creativeUploadIntentSchema.parse({ ...INTENT, storagePath: "someone-elses/path.mp4" });
    expect("storagePath" in parsed).toBe(false);
  });

  it("rejects a non-positive size", () => {
    expect(creativeUploadIntentSchema.safeParse({ ...INTENT, sizeBytes: 0 }).success).toBe(false);
  });
});

describe("creativeRegistrationSchema", () => {
  it("requires the storage path the intent returned", () => {
    const missing = creativeRegistrationSchema.safeParse(INTENT);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues.some((issue) => issue.path[0] === "storagePath")).toBe(true);
    }
  });

  it("keeps the storage path through validation", () => {
    // The regression this file exists for: parsing must preserve `storagePath`,
    // or `registerCreative` rejects the upload it just completed.
    const parsed = creativeRegistrationSchema.parse({ ...INTENT, storagePath: STORAGE_PATH });
    expect(parsed.storagePath).toBe(STORAGE_PATH);
    expect(parsed.campaignId).toBe(INTENT.campaignId);
    expect(parsed.mimeType).toBe(INTENT.mimeType);
  });

  it("applies the same rules as the intent schema plus the path", () => {
    const input: CreativeRegistrationInput = { ...INTENT, storagePath: STORAGE_PATH };
    expect(creativeRegistrationSchema.safeParse(input).success).toBe(true);
    expect(creativeRegistrationSchema.safeParse({ ...input, campaignId: "" }).success).toBe(false);
    expect(creativeRegistrationSchema.safeParse({ ...input, mimeType: "x" }).success).toBe(false);
    expect(creativeRegistrationSchema.safeParse({ ...input, storagePath: "" }).success).toBe(false);
  });

  it("does not weaken the campaign id rule the intent schema enforces", () => {
    // `extend` must not have been used to replace the field with something looser.
    expect(creativeUploadIntentSchema.safeParse({ ...INTENT, campaignId: "" }).success).toBe(false);
    expect(creativeRegistrationSchema.safeParse({ ...INTENT, storagePath: STORAGE_PATH, campaignId: "" }).success).toBe(false);
  });
});