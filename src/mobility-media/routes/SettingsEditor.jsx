/**
 * Staff editor for the platform settings document.
 *
 * `PATCH /settings` replaces the whole document and re-checks cross-field rules
 * (revenue pool + reserve + tax must reconcile), so editing is done on the whole
 * document too. It is validated in the browser against the same
 * `platformSettingsSchema` the API uses before anything is sent, which turns a
 * typo into a precise path-and-message error instead of a round trip.
 */

import { useMemo, useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { FormDialog } from "@/mobility-media/components/Dialogs";
import { api } from "@/mobility-media/lib/api";
import { useApiMutation } from "@/mobility-media/lib/mutations";
import { editableSettingsText, validateSettingsText } from "@/mobility-media/routes/settingsValidation";

export function SettingsEditorButton({ settings }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="contained" startIcon={<EditIcon />} onClick={() => setOpen(true)} disabled={!settings}>
        Edit platform settings
      </Button>
      {open ? <SettingsEditorDialog settings={settings} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function SettingsEditorDialog({ settings, onClose }) {
  const [text, setText] = useState(() => editableSettingsText(settings));
  const check = useMemo(() => validateSettingsText(text, settings), [text, settings]);
  const save = useApiMutation((body) => api.patch("/settings", body), { invalidate: [["settings"]], onSuccess: onClose });

  return (
    <FormDialog
      open
      maxWidth="md"
      title="Platform settings"
      description="Changes apply to every portal and every screen as soon as they are saved, and are recorded in the audit log."
      submitLabel="Save settings"
      onClose={onClose}
      pending={save.isPending}
      error={save.error}
      canSubmit={Boolean(check.value)}
      onSubmit={() => save.mutate(check.value)}
    >
      {check.errors ? (
        <Alert severity="warning">
          {check.errors.map((message) => (
            <Typography key={message} variant="body2" component="div" sx={{ fontFamily: "monospace" }}>
              {message}
            </Typography>
          ))}
        </Alert>
      ) : (
        <Alert severity="success">Valid. Review the changes, then save.</Alert>
      )}
      <Box>
        <TextField
          value={text}
          onChange={(event) => setText(event.target.value)}
          multiline
          minRows={18}
          maxRows={28}
          fullWidth
          spellCheck={false}
          slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 13 } } }}
          aria-label="Settings JSON"
        />
      </Box>
    </FormDialog>
  );
}
