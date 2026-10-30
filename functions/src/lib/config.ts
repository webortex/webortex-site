/**
 * Runtime configuration.
 *
 * Secrets come from Firebase Functions' secret manager / runtime env only. If a
 * required secret is missing the process fails loudly at first use rather than
 * falling back to an insecure default, so a misconfigured deployment can never
 * silently run with a guessable key.
 */

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "";
const REGION = process.env.MOBILITY_REGION ?? process.env.FUNCTION_REGION ?? "asia-south1";

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[mobility-media] Required secret "${name}" is not configured. ` +
        "Set it with: firebase functions:secrets:set " +
        name,
    );
  }
  return value;
}

function optionalSecret(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

let cachedSalt: string | undefined;

export const config = {
  projectId: PROJECT_ID,
  region: REGION,
  storageBucket: process.env.MOBILITY_STORAGE_BUCKET ?? `${PROJECT_ID}.firebasestorage.app`,
  /** Emulator mode relaxes external calls so local dev works without live keys. */
  isEmulator: Boolean(process.env.FUNCTIONS_EMULATOR) || process.env.NODE_ENV === "test",
  corsOrigins: (process.env.MOBILITY_ALLOWED_ORIGINS ?? "https://www.webortex.com,https://webortex.com")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  get auditSalt(): string {
    if (!cachedSalt) cachedSalt = requiredSecret("MOBILITY_AUDIT_SALT");
    return cachedSalt;
  },
  get deviceSecretPepper(): string {
    return requiredSecret("MOBILITY_DEVICE_SECRET_PEPPER");
  },
  get storageSignedUrlTtlMs(): number {
    const raw = Number(process.env.MOBILITY_SIGNED_URL_TTL_MS ?? "");
    return Number.isFinite(raw) && raw >= 60_000 ? raw : 15 * 60_000;
  },
  // Getters, not values: secrets bound with `defineSecret` are only guaranteed to
  // be in the environment once the function is serving, not at module load.
  get razorpayKeyId(): string | undefined {
    return optionalSecret("RAZORPAY_KEY_ID");
  },
  get razorpayKeySecret(): string | undefined {
    return optionalSecret("RAZORPAY_KEY_SECRET");
  },
  get razorpayWebhookSecret(): string | undefined {
    return optionalSecret("RAZORPAY_WEBHOOK_SECRET");
  },
  /** Alerts are skipped entirely when no address is configured. */
  alertEmail: optionalSecret("MOBILITY_ALERT_EMAIL"),
  /** Used to derive contact links in outbound email. */
  publicBaseUrl: (process.env.MOBILITY_PUBLIC_BASE_URL ?? "https://www.webortex.com").replace(/\/+$/, ""),
} as const;

/** Firestore server timestamp sentinel; never expose the sentinel to clients. */
export const SERVER_TIMESTAMP_FIELD = "__serverTimestamp";

export const API_BASE = "/api/mobility" as const;