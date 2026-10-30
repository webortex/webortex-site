import { z } from "zod";

/** Firestore-style timestamps cross the wire as ISO strings. */
export const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Must be a valid ISO 8601 timestamp" });

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Must be an ISO date (YYYY-MM-DD)" });

export const entityId = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, { message: "May only contain letters, numbers, hyphen and underscore" });

export type EntityId = z.infer<typeof entityId>;

/** Human-facing document codes, e.g. CMP-8F3K2Q. */
export const documentCode = z.string().min(4).max(24).regex(/^[A-Z]{2,5}-[A-Z0-9]{4,12}$/);

export const emailAddress = z.string().trim().toLowerCase().email().max(254);

/**
 * Indian mobile numbers are stored in E.164 without the plus, which is what
 * Firebase Auth expects. Other markets are accepted so the platform is not
 * hard-wired to one country even though the default locale is India.
 */
export const phoneNumber = z
  .string()
  .trim()
  .regex(/^\d{7,15}$/, { message: "Use digits only, including country code (7-15 digits)" });

/**
 * GSTIN format check. Accepts the 15-character structure only; whether GSTIN is
 * required at all is an admin setting (`settings.gstinRequired`).
 */
export const gstin = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    { message: "Not a valid GSTIN (expected 15 characters, e.g. 27ABCDE1234F1Z5)" },
  )
  .optional()
  .or(z.literal(""));

/** Only http/https. Blocks javascript:, data: and other XSS vectors in creative destinations. */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "Must be an absolute http(s) URL" });

export const phoneDestination = z.string().trim().regex(/^tel:\+?\d{7,15}$/, {
  message: "Must be a tel: URI, e.g. tel:+917672024001",
});

export const whatsappDestination = z
  .string()
  .trim()
  .regex(/^https:\/\/(wa\.me|api\.whatsapp\.com)\/\S+$/i, { message: "Must be a wa.me or api.whatsapp.com link" });

export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

export const geoPointSchema = z.object({ lat: latitude, lng: longitude });

export const coordinatesSchema = z.object({
  lat: latitude,
  lng: longitude,
  accuracyMetres: z.number().nonnegative().optional(),
  /** Present when the retention setting `storePreciseGps` is disabled. */
  rounded: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasMore: boolean;
}

export function buildPage<T>(items: readonly T[], total: number, page: number, pageSize: number): Page<T> {
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page * pageSize < total,
  };
}

/** Cursor used for the high-volume event collections where offset paging is unacceptable. */
export const cursorPageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

export const dateRangeSchema = z.object({
  from: isoDate,
  to: isoDate,
});

export const idListSchema = z.array(entityId).max(500);

export const moneyMinor = z.number().int().nonnegative();

export const nonNegativeInt = z.number().int().nonnegative();

export const csvSafeText = z
  .string()
  .max(512)
  // Neutralise spreadsheet formula injection on export.
  .refine((value) => !/^[=+\-@\t\r]/.test(value), { message: "Text may not start with a formula character" });

/** Normalises free text for CSV export: strips formula prefixes and control characters. */
export function sanitiseForCsv(value: string): string {
  const stripped = value.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  return /^[=+\-@]/.test(stripped) ? `'${stripped}` : stripped;
}