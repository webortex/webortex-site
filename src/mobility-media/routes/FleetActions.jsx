/**
 * Fleet write actions: onboarding vehicles and screens, enrolling a screen's
 * player device, rotating its credential, and moving vehicles and drivers
 * through their lifecycle.
 *
 * Device credentials are returned by the API exactly once. The reveal dialog
 * also builds the player link (`/player#id=…&key=…`): the credential travels in
 * the URL fragment, which browsers never send to a server, and the player
 * strips it from the address bar as soon as it has stored it.
 */

import { useState } from "react";
import { MenuItem, Stack, TextField, Typography } from "@mui/material";
import { FormDialog, SecretRevealDialog } from "@/mobility-media/components/Dialogs";
import { api } from "@/mobility-media/lib/api";
import { useApiMutation } from "@/mobility-media/lib/mutations";
import { SCREEN_TYPES, VEHICLE_TYPES, playerLink } from "@/mobility-media/routes/fleetOptions";

const invalidateFleet = [["fleet"]];

function optionalInt(text) {
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function AddVehicleDialog({ open, onClose }) {
  const [form, setForm] = useState({ type: "AUTO", registrationNumber: "", make: "", model: "", year: "", colour: "", notes: "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const create = useApiMutation((body) => api.post("/fleet/vehicles", body), { invalidate: invalidateFleet, onSuccess: onClose });

  const registration = form.registrationNumber.replace(/\s+/g, "").toUpperCase();
  const registrationOk = /^[A-Z0-9]{5,15}$/.test(registration);

  return (
    <FormDialog
      open={open}
      title="Register a vehicle"
      description="New vehicles start as PENDING until their documents are verified."
      submitLabel="Register vehicle"
      onClose={onClose}
      pending={create.isPending}
      error={create.error}
      canSubmit={registrationOk}
      onSubmit={() =>
        create.mutate({
          type: form.type,
          registrationNumber: registration,
          ...(form.make.trim() ? { make: form.make.trim() } : {}),
          ...(form.model.trim() ? { model: form.model.trim() } : {}),
          ...(optionalInt(form.year) ? { year: optionalInt(form.year) } : {}),
          ...(form.colour.trim() ? { colour: form.colour.trim() } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        })
      }
    >
      <TextField select label="Type" value={form.type} onChange={set("type")}>
        {VEHICLE_TYPES.map((type) => (
          <MenuItem key={type} value={type}>{type}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Registration number"
        value={form.registrationNumber}
        onChange={set("registrationNumber")}
        required
        error={form.registrationNumber.length > 0 && !registrationOk}
        helperText="Letters and digits only, e.g. KA01AB1234."
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Make" value={form.make} onChange={set("make")} fullWidth />
        <TextField label="Model" value={form.model} onChange={set("model")} fullWidth />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Year" value={form.year} onChange={set("year")} inputMode="numeric" fullWidth />
        <TextField label="Colour" value={form.colour} onChange={set("colour")} fullWidth />
      </Stack>
      <TextField label="Notes" value={form.notes} onChange={set("notes")} multiline minRows={2} />
    </FormDialog>
  );
}

export function AddScreenDialog({ open, onClose, vehicles }) {
  const [form, setForm] = useState({ vehicleId: "", screenType: "LCD", orientation: "LANDSCAPE", width: "1920", height: "1080" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const create = useApiMutation((body) => api.post("/fleet/screens", body), { invalidate: invalidateFleet, onSuccess: onClose });

  return (
    <FormDialog
      open={open}
      title="Register a screen"
      submitLabel="Register screen"
      onClose={onClose}
      pending={create.isPending}
      error={create.error}
      onSubmit={() =>
        create.mutate({
          vehicleId: form.vehicleId || null,
          screenType: form.screenType,
          orientation: form.orientation,
          ...(optionalInt(form.width) ? { resolutionWidthPx: optionalInt(form.width) } : {}),
          ...(optionalInt(form.height) ? { resolutionHeightPx: optionalInt(form.height) } : {}),
        })
      }
    >
      <TextField select label="Fitted to vehicle" value={form.vehicleId} onChange={set("vehicleId")} helperText="Leave unassigned for stock that is not fitted yet.">
        <MenuItem value="">Unassigned</MenuItem>
        {(vehicles ?? []).map((vehicle) => (
          <MenuItem key={vehicle.id} value={vehicle.id}>
            {vehicle.registrationNumber} · {vehicle.type}
          </MenuItem>
        ))}
      </TextField>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField select label="Panel" value={form.screenType} onChange={set("screenType")} fullWidth>
          {SCREEN_TYPES.map((type) => (
            <MenuItem key={type} value={type}>{type.replace("_", " ")}</MenuItem>
          ))}
        </TextField>
        <TextField select label="Orientation" value={form.orientation} onChange={set("orientation")} fullWidth>
          <MenuItem value="LANDSCAPE">Landscape</MenuItem>
          <MenuItem value="PORTRAIT">Portrait</MenuItem>
        </TextField>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Width (px)" value={form.width} onChange={set("width")} inputMode="numeric" fullWidth />
        <TextField label="Height (px)" value={form.height} onChange={set("height")} inputMode="numeric" fullWidth />
      </Stack>
    </FormDialog>
  );
}

/** Reveal for a freshly issued device credential, enrol or rotate alike. */
export function DeviceCredentialDialog({ credential, onClose }) {
  if (!credential) return null;
  return (
    <SecretRevealDialog
      open
      title="Device credential"
      intro="Open the player link on the screen's browser, or copy the id and key into its setup form. The key is shown once."
      fields={[
        { label: "Player link", value: playerLink(credential.deviceId, credential.secret) },
        { label: "Device id", value: credential.deviceId },
        { label: "Device key", value: credential.secret },
      ]}
      onClose={onClose}
    >
      <Typography variant="caption" color="text.secondary">
        Anyone with this key can post plays for this screen. If it leaks, rotate it from the Screens tab.
      </Typography>
    </SecretRevealDialog>
  );
}

export function EnrolDeviceDialog({ open, onClose, screen, onEnrolled }) {
  const [form, setForm] = useState({ model: "", manufacturer: "" });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const enrol = useApiMutation((body) => api.post("/fleet/devices/enrol", body), {
    invalidate: invalidateFleet,
    onSuccess: (result) => onEnrolled({ deviceId: result.device.id, secret: result.secret }),
  });

  return (
    <FormDialog
      open={open}
      title={`Enrol a player for ${screen?.code ?? "this screen"}`}
      description="Creates the device record and its credential. The device inherits the screen's vehicle."
      submitLabel="Enrol device"
      onClose={onClose}
      pending={enrol.isPending}
      error={enrol.error}
      onSubmit={() =>
        enrol.mutate({
          screenId: screen.id,
          ...(form.model.trim() ? { model: form.model.trim() } : {}),
          ...(form.manufacturer.trim() ? { manufacturer: form.manufacturer.trim() } : {}),
          appVersion: "web-player",
        })
      }
    >
      <TextField label="Hardware model (optional)" value={form.model} onChange={set("model")} />
      <TextField label="Manufacturer (optional)" value={form.manufacturer} onChange={set("manufacturer")} />
    </FormDialog>
  );
}

export function RotateSecretDialog({ open, onClose, screen, onRotated }) {
  const rotate = useApiMutation(
    () => api.post(`/devices/${encodeURIComponent(screen.deviceId)}/rotate-secret`, {}),
    { invalidate: invalidateFleet, onSuccess: (result) => onRotated({ deviceId: result.deviceId, secret: result.secret }) },
  );
  return (
    <FormDialog
      open={open}
      title={`Rotate the key for ${screen?.code ?? "this screen"}?`}
      description="The current key stops working immediately. The screen stops reporting until the new key is installed on it."
      submitLabel="Rotate key"
      destructive
      onClose={onClose}
      pending={rotate.isPending}
      error={rotate.error}
      onSubmit={() => rotate.mutate()}
    />
  );
}

/** Lifecycle change for a vehicle or a driver. A reason is required when suspending or retiring. */
export function StatusChangeDialog({ open, onClose, entity, record, options }) {
  const [status, setStatus] = useState(record?.status ?? options[0]);
  const [reason, setReason] = useState("");
  const path =
    entity === "vehicle"
      ? `/fleet/vehicles/${encodeURIComponent(record?.id ?? "")}/status`
      : `/fleet/drivers/${encodeURIComponent(record?.id ?? "")}/status`;
  const change = useApiMutation((body) => api.post(path, body), { invalidate: invalidateFleet, onSuccess: onClose });
  const needsReason = ["SUSPENDED", "RETIRED", "REJECTED"].includes(status);

  return (
    <FormDialog
      open={open}
      title={`Change ${entity} status`}
      description={entity === "vehicle" ? record?.registrationNumber : record?.fullName}
      submitLabel="Update status"
      onClose={onClose}
      pending={change.isPending}
      error={change.error}
      canSubmit={status !== record?.status && (!needsReason || reason.trim().length > 0)}
      onSubmit={() => change.mutate({ status, ...(reason.trim() ? { reason: reason.trim() } : {}) })}
    >
      <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>{option.replace(/_/g, " ")}</MenuItem>
        ))}
      </TextField>
      <TextField
        label={needsReason ? "Reason (required)" : "Reason (optional)"}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        multiline
        minRows={2}
      />
    </FormDialog>
  );
}
