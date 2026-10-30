/**
 * Dialog building blocks for portal write actions.
 *
 * Every mutation in the portal goes through one of these, so error display,
 * pending state and "do not close while saving" behave the same everywhere.
 */

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

/** Shows an API error with its correlation id, which is what support asks for. */
export function MutationError({ error }) {
  if (!error) return null;
  const reference = error?.correlationId ?? error?.details?.correlationId;
  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      {error.message ?? "Something went wrong."}
      {reference ? (
        <Typography variant="caption" component="div" sx={{ mt: 0.5, opacity: 0.8 }}>
          Reference: {reference}
        </Typography>
      ) : null}
    </Alert>
  );
}

/**
 * A form in a dialog.
 *
 * Submitting is a real `<form>` submit, so Enter works in single-line fields.
 * The dialog refuses to close while a request is in flight: closing it would
 * hide the outcome of a write the user cannot see finishing.
 */
export function FormDialog({
  open,
  title,
  description,
  submitLabel = "Save",
  onClose,
  onSubmit,
  pending = false,
  error = null,
  canSubmit = true,
  destructive = false,
  maxWidth = "sm",
  children,
}) {
  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} fullWidth maxWidth={maxWidth}>
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit && !pending) onSubmit();
        }}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {description ? <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText> : null}
          <MutationError error={error} />
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color={destructive ? "error" : "primary"} disabled={!canSubmit || pending}>
            {pending ? "Working…" : submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/** A yes/no confirmation for an action with consequences. */
export function ConfirmDialog({ open, title, body, confirmLabel = "Confirm", onConfirm, onClose, pending, error, destructive }) {
  return (
    <FormDialog
      open={open}
      title={title}
      submitLabel={confirmLabel}
      onSubmit={onConfirm}
      onClose={onClose}
      pending={pending}
      error={error}
      destructive={destructive}
    >
      <Typography variant="body2">{body}</Typography>
    </FormDialog>
  );
}

/** A read-only field with a copy button. */
export function CopyField({ label, value, monospace = true }) {
  const [copied, setCopied] = useState(false);
  return (
    <TextField
      label={label}
      value={value ?? ""}
      fullWidth
      slotProps={{
        input: {
          readOnly: true,
          sx: monospace ? { fontFamily: "monospace", fontSize: 13 } : undefined,
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={copied ? "Copied" : "Copy"}>
                <IconButton
                  edge="end"
                  aria-label={`Copy ${label}`}
                  onClick={() => {
                    void navigator.clipboard?.writeText(String(value ?? "")).then(() => setCopied(true));
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

/**
 * Shows a credential that the server returns exactly once.
 *
 * The close button is labelled as an acknowledgement on purpose: once this
 * dialog is gone the secret cannot be recovered, only rotated.
 */
export function SecretRevealDialog({ open, title, intro, fields, onClose, children }) {
  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {intro ?? "Copy this now. It is shown once and cannot be retrieved again."}
        </Alert>
        <Stack spacing={2}>
          {fields.map((field) => (
            <CopyField key={field.label} label={field.label} value={field.value} />
          ))}
          {children}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          I have saved it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
