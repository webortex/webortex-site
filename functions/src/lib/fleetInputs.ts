/**
 * Request schemas for the fleet write endpoints.
 *
 * These live in the Functions tier rather than the shared package because they
 * describe *what the API accepts*, not the shape of a stored document. The
 * document shapes are owned by `packages/shared/src/schemas/entities.ts`.
 */

import { z } from "zod";
import { entityId, vehicleTypeSchema, type WorkflowStatus } from "../../../packages/shared/src/index.js";

const registrationNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{5,15}$/, { message: "Enter a valid vehicle registration number" });

export const vehicleCreateSchema = z.object({
  type: vehicleTypeSchema,
  registrationNumber,
  make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  year: z.number().int().min(1980).max(2100).nullable().optional(),
  colour: z.string().trim().max(30).optional(),
  cityId: entityId.nullable().optional(),
  homeZoneId: entityId.nullable().optional(),
  driverId: entityId.nullable().optional(),
  /** Ignored for non-staff callers: ownership is always the caller's own account. */
  ownerUserId: entityId.nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const screenCreateSchema = z.object({
  vehicleId: entityId.nullable().optional(),
  screenType: z.enum(["LCD", "LED", "OLED", "E_INK", "PROJECTOR"]).optional(),
  resolutionWidthPx: z.number().int().positive().max(16_000).optional(),
  resolutionHeightPx: z.number().int().positive().max(16_000).optional(),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).optional(),
});

export const deviceEnrolSchema = z.object({
  screenId: entityId.nullable().optional(),
  vehicleId: entityId.nullable().optional(),
  model: z.string().trim().max(80).optional(),
  manufacturer: z.string().trim().max(80).optional(),
  firmwareVersion: z.string().trim().max(40).optional(),
  appVersion: z.string().trim().max(40).optional(),
});

export const VEHICLE_STATUSES = [
  "PENDING",
  "VERIFIED",
  "ACTIVE",
  "MAINTENANCE",
  "SUSPENDED",
  "RETIRED",
] as const satisfies readonly WorkflowStatus[];

export const DRIVER_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_MORE_INFORMATION",
  "SUSPENDED",
] as const;

export const vehicleStatusSchema = z.object({
  status: z.enum(VEHICLE_STATUSES),
  /** Required by the service when suspending or retiring. */
  reason: z.string().trim().max(500).optional(),
});

export const driverStatusSchema = z.object({
  status: z.enum(DRIVER_STATUSES),
  reason: z.string().trim().max(500).optional(),
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type ScreenCreateInput = z.infer<typeof screenCreateSchema>;
export type DeviceEnrolInput = z.infer<typeof deviceEnrolSchema>;
