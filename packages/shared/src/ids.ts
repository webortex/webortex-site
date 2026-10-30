/**
 * Identifier generation.
 *
 * IDs are prefixed, URL-safe and sortable-by-creation (the timestamp is encoded
 * in base36 at the front), which gives natural chronological ordering for
 * `orderBy(id)` without a separate createdAt index.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O, U

export type EntityPrefix =
  | "USR"
  | "ORG"
  | "ADV"
  | "DRV"
  | "VHC"
  | "SCR"
  | "DEV"
  | "CMP"
  | "CRT"
  | "LOC"
  | "EVT"
  | "CNV"
  | "TXN"
  | "PAY"
  | "INV"
  | "NTF"
  | "AUD"
  | "TKT"
  | "DOC"
  | "SED";

function encodeTime(ms: number): string {
  let value = Math.max(0, Math.floor(ms));
  let out = "";
  while (value > 0) {
    out = ALPHABET[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out.padStart(9, "0");
}

/**
 * Minimal structural view of the WebCrypto API.
 *
 * Typed locally instead of referencing the DOM lib so the same module compiles
 * unchanged for the browser bundle, the Cloud Functions Node runtime and the
 * Vitest/Node test environment.
 */
interface WebCryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T;
  subtle: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> };
}

function webCrypto(): WebCryptoLike | null {
  const candidate = (globalThis as { crypto?: unknown }).crypto;
  return candidate && typeof candidate === "object" ? (candidate as WebCryptoLike) : null;
}

function randomSuffix(length: number): string {
  const cryptoRef = webCrypto();
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoRef.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i]! % 32];
    return out;
  }
  let fallback = "";
  for (let i = 0; i < length; i += 1) fallback += ALPHABET[Math.floor(Math.random() * 32)];
  return fallback;
}

/** Firestore document id: `${prefix}_${base32timestamp}${random}`. */
export function newId(prefix: EntityPrefix, now: number = Date.now()): string {
  return `${prefix}_${encodeTime(now)}${randomSuffix(6)}`;
}

/** Short human-facing reference shown in the UI, e.g. CMP-7K2M4P. */
export function newReference(prefix: EntityPrefix, now: number = Date.now()): string {
  return `${prefix}-${randomSuffix(6)}`;
}

/** Derive the actor token from a raw IP for audit logging. Never store the raw IP. */
export async function hashIp(rawIp: string | undefined, salt: string): Promise<string | null> {
  if (!rawIp || typeof rawIp !== "string") return null;
  try {
    const digest = await digestHex(`${salt}:${rawIp}`);
    return digest === null ? null : digest.slice(0, 32);
  } catch {
    return null;
  }
}

export function newDeviceSecret(bytes = 32): string {
  const cryptoRef = webCrypto();
  if (cryptoRef?.getRandomValues) {
    const buffer = new Uint8Array(bytes);
    cryptoRef.getRandomValues(buffer);
    return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const out: string[] = [];
  for (let i = 0; i < bytes; i += 1) out.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  return out.join("");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await digestHex(value);
  if (digest === null) throw new Error("SHA-256 is unavailable in this runtime.");
  return digest;
}

async function digestHex(value: string): Promise<string | null> {
  const cryptoRef = webCrypto();
  if (!cryptoRef?.subtle) return null;
  const data = new TextEncoder().encode(value);
  const digest = await cryptoRef.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}