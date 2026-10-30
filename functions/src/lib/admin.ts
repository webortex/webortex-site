import { initializeApp, getApps, type App } from "firebase-admin/app";
import type { FieldValue } from "firebase-admin/firestore";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

/** Derived rather than imported: `@google-cloud/storage` is only a transitive dep. */
type Bucket = ReturnType<Storage["bucket"]>;
import { config } from "./config.js";

let adminApp: App | undefined;
let firestoreInstance: Firestore | undefined;
let authInstance: Auth | undefined;
let storageInstance: Storage | undefined;

export function adminApp_(): App {
  if (!adminApp) {
    adminApp =
      getApps()[0] ??
      initializeApp({
        projectId: config.projectId || undefined,
        storageBucket: config.storageBucket,
      });
  }
  return adminApp;
}

export const db = (): Firestore => {
  if (!firestoreInstance) firestoreInstance = getFirestore(adminApp_());
  return firestoreInstance;
};

export const auth = (): Auth => {
  if (!authInstance) authInstance = getAuth(adminApp_());
  return authInstance;
};

export const storage = (): Storage => {
  if (!storageInstance) storageInstance = getStorage(adminApp_());
  return storageInstance;
};

/** Private bucket. Never set its public access level. */
export const bucket = (): Bucket => storage().bucket();

/** ISO string used consistently for `createdAt`/`updatedAt` across all documents. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Firestore accepts a write payload typed as `UpdateData<DocumentData>`, whose
 * index signature is `{ [field: string]: FieldValue | Partial<unknown> | undefined }`.
 * Services here assemble patches as `Record<string, unknown>`; this alias is the
 * single documented bridge between the two.
 */
export type FirestorePatch = Record<
  string,
  FieldValue | Partial<unknown> | unknown[] | Uint8Array | null | undefined
>;