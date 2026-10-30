import { z } from "zod";
import { ROLES } from "../roles";
import { emailAddress, entityId, isoDateTime, phoneNumber } from "./common";

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^A-Za-z0-9]/, "Include a symbol");

/**
 * Registration payloads.
 *
 * `accountType` only ever selects between the advertiser and driver flows. The
 * resulting role is decided server-side after verification - a caller cannot ask
 * for `ADMIN`.
 */
const baseRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailAddress,
  phone: phoneNumber,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms to continue" }) }),
  acceptPrivacy: z.literal(true, { errorMap: () => ({ message: "You must accept the privacy policy to continue" }) }),
});

export const advertiserRegistrationSchema = baseRegistrationSchema
  .extend({
    accountType: z.literal("advertiser").default("advertiser"),
    companyName: z.string().trim().min(2).max(160),
    businessCategory: z.string().trim().min(2).max(80),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: "Not a valid GSTIN (expected 15 characters)",
      })
      .optional()
      .or(z.literal("")),
    addressLine1: z.string().trim().min(4).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().min(3).max(12),
    website: z
      .string()
      .trim()
      .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), {
        message: "Website must start with http:// or https://",
      })
      .optional(),
    whatsappNumber: phoneNumber.optional().or(z.literal("")),
    businessDescription: z.string().trim().max(2000).default(""),
    preferredAdCategories: z.array(z.string().max(60)).max(20).default([]),
    billingName: z.string().trim().max(160).optional(),
    taxNumber: z.string().trim().max(40).optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AdvertiserRegistrationInput = z.infer<typeof advertiserRegistrationSchema>;

const vehicleDocumentSchema = z.object({
  kind: z.enum([
    "DRIVING_LICENCE",
    "VEHICLE_REGISTRATION",
    "INSURANCE",
    "PERMIT",
    "POLLUTION_CERTIFICATE",
    "FITNESS_CERTIFICATE",
    "OTHER",
  ]),
  /** Storage path returned by the upload-intent endpoint. */
  storagePath: z.string().min(1).max(512),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive(),
  number: z.string().trim().max(64).default(""),
  expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const driverRegistrationSchema = baseRegistrationSchema
  .extend({
    accountType: z.literal("driver").default("driver"),
    photoPath: z.string().max(512).optional(),
    licenceNumber: z.string().trim().min(4).max(40),
    licenceExpiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vehicleType: z.enum(["AUTO", "CAB", "TAXI", "TOURIST", "BUS", "EV", "OTHER"]),
    registrationNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{5,15}$/, { message: "Enter a valid vehicle registration number" }),
    vehicleMake: z.string().trim().max(60).default(""),
    vehicleModel: z.string().trim().max(60).default(""),
    vehicleYear: z.number().int().min(1980).max(2100).optional(),
    city: z.string().trim().min(2).max(80),
    preferredZoneIds: z.array(entityId).max(100).default([]),
    payoutMethod: z.enum(["BANK", "UPI", "WALLET"]).default("UPI"),
    upiId: z.string().trim().max(120).optional(),
    bankName: z.string().trim().max(120).optional(),
    bankAccountNumber: z.string().trim().max(40).optional(),
    accountHolderName: z.string().trim().max(120).optional(),
    ifsc: z.string().trim().max(20).optional(),
    documents: z.array(vehicleDocumentSchema).max(20).default([]),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.payoutMethod !== "UPI" || Boolean(value.upiId), {
    message: "A UPI ID is required for UPI payouts",
    path: ["upiId"],
  })
  .refine((value) => value.payoutMethod !== "BANK" || Boolean(value.ifsc && value.bankAccountNumber), {
    message: "Bank account number and IFSC are required for bank payouts",
    path: ["ifsc"],
  });

export type DriverRegistrationInput = z.infer<typeof driverRegistrationSchema>;

export const loginSchema = z.object({
  email: emailAddress,
  password: z.string().min(1, "Password is required").max(128),
  rememberDevice: z.boolean().default(false),
});

export const loginOtpRequestSchema = z.object({
  email: emailAddress,
});

export const loginOtpVerifySchema = z.object({
  email: emailAddress,
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const sessionUserSchema = z.object({
  uid: z.string().min(1),
  userId: entityId,
  email: emailAddress,
  fullName: z.string(),
  phone: phoneNumber,
  avatarUrl: z.string().nullable().default(null),
  roles: z.array(z.enum(ROLES)).min(1),
  status: z.enum(["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "DEACTIVATED"]),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  advertiserId: entityId.nullable().default(null),
  driverId: entityId.nullable().default(null),
  vehicleIds: z.array(entityId).default([]),
  theme: z.enum(["dark", "light"]).default("dark"),
  lastLoginAt: isoDateTime.nullable().default(null),
  /** Permissions resolved server-side. The client renders from these but never authorises with them. */
  permissions: z.array(z.string()),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export const authResponseSchema = z.object({
  user: sessionUserSchema,
  /** Opaque, short-lived. In production this is an httpOnly cookie. */
  token: z.string().min(1),
  expiresAt: isoDateTime,
  portal: z.enum(["admin", "advertiser", "driver"]),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const sendVerificationSchema = z.object({
  channel: z.enum(["EMAIL", "SMS"]),
});

export const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const resetPasswordRequestSchema = z.object({
  email: emailAddress,
});

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });