/**
 * Write actions for a single campaign: edit, run-state changes and staff review.
 *
 * Which buttons appear is derived from the shared campaign state machine
 * (`allowedEntityTransitions`), the same table the API enforces, so the UI never
 * offers a transition the server would refuse with a 409.
 */

import { useMemo, useState } from "react";
import { Button, MenuItem, Stack, TextField } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import CancelIcon from "@mui/icons-material/Cancel";
import GavelIcon from "@mui/icons-material/Gavel";
import { allowedEntityTransitions } from "../../../packages/shared/src/statuses";
import { ConfirmDialog, FormDialog } from "@/mobility-media/components/Dialogs";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { useApiMutation } from "@/mobility-media/lib/mutations";
import { invalidateCampaigns } from "@/mobility-media/routes/campaignMutations";
import {
  budgetError,
  buildCampaignPatch,
  editFormFromCampaign,
  flightWindowError,
} from "@/mobility-media/routes/campaignForm";

/** Statuses `updateCampaign` accepts edits in. */
const EDITABLE = new Set(["DRAFT", "PENDING_REVIEW", "REJECTED"]);

/** Run-state targets the `/state` route accepts, with how each is presented. */
const RUN_ACTIONS = {
  PAUSED: { label: "Pause", icon: <PauseIcon />, confirm: "Delivery stops on every screen at the next slot." },
  RUNNING: { label: "Resume", icon: <PlayArrowIcon />, confirm: "Delivery resumes (or waits for the flight start if it has not begun)." },
  COMPLETED: { label: "End now", icon: <StopIcon />, confirm: "The campaign ends permanently. This cannot be undone." },
  CANCELLED: { label: "Cancel", icon: <CancelIcon />, confirm: "The campaign is cancelled permanently. This cannot be undone.", destructive: true },
};


function encode(id) {
  return encodeURIComponent(id);
}

export function CampaignActions({ campaign }) {
  const { user } = useAuth();
  const { can } = usePermission();
  const [editing, setEditing] = useState(false);
  const [pendingState, setPendingState] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const status = campaign?.status;
  const allowed = useMemo(() => new Set(status ? allowedEntityTransitions("campaign", status) : []), [status]);
  // PATCH resolves the advertiser from the session, so only the owning account can edit.
  const isOwner = Boolean(user?.advertiserId && user.advertiserId === campaign?.advertiserId);
  const isStaffUser = user?.portal === "admin";

  const changeState = useApiMutation(
    (state) => api.post(`/campaigns/${encode(campaign.id)}/state`, { state }),
    { invalidate: invalidateCampaigns, onSuccess: () => setPendingState(null) },
  );

  if (!campaign) return null;

  const runTargets = Object.keys(RUN_ACTIONS).filter(
    // RUNNING is reached from PAUSED only; APPROVED -> SCHEDULED -> RUNNING is the scheduler's job.
    (target) => allowed.has(target) && (target !== "RUNNING" || status === "PAUSED"),
  );
  const canChangeState = can("campaigns:write") && (isOwner || isStaffUser);

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {can("campaigns:write") && isOwner && EDITABLE.has(status) ? (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
        {can("campaigns:review") && status === "PENDING_REVIEW" ? (
          <Button variant="contained" color="secondary" startIcon={<GavelIcon />} onClick={() => setReviewing(true)}>
            Review
          </Button>
        ) : null}
        {canChangeState
          ? runTargets.map((target) => (
              <Button
                key={target}
                variant="outlined"
                color={RUN_ACTIONS[target].destructive ? "error" : "inherit"}
                startIcon={RUN_ACTIONS[target].icon}
                onClick={() => setPendingState(target)}
              >
                {RUN_ACTIONS[target].label}
              </Button>
            ))
          : null}
      </Stack>

      <ConfirmDialog
        open={Boolean(pendingState)}
        title={pendingState ? `${RUN_ACTIONS[pendingState].label} “${campaign.name}”?` : ""}
        body={pendingState ? RUN_ACTIONS[pendingState].confirm : ""}
        confirmLabel={pendingState ? RUN_ACTIONS[pendingState].label : "Confirm"}
        destructive={pendingState === "CANCELLED" || pendingState === "COMPLETED"}
        pending={changeState.isPending}
        error={changeState.error}
        onConfirm={() => changeState.mutate(pendingState)}
        onClose={() => {
          setPendingState(null);
          changeState.reset();
        }}
      />

      {editing ? <EditCampaignDialog campaign={campaign} onClose={() => setEditing(false)} /> : null}
      {reviewing ? <ReviewCampaignDialog campaign={campaign} onClose={() => setReviewing(false)} /> : null}
    </>
  );
}

function EditCampaignDialog({ campaign, onClose }) {
  const [form, setForm] = useState(() => editFormFromCampaign(campaign));
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = useApiMutation((body) => api.patch(`/campaigns/${encode(campaign.id)}`, body), {
    invalidate: invalidateCampaigns,
    onSuccess: onClose,
  });

  const patch = buildCampaignPatch(campaign, form);
  const windowProblem = flightWindowError(form.startsAt, form.endsAt);
  const budgetProblem =
    patch.budget.totalMinor === null ? "Enter a total budget." : budgetError(patch.budget.totalMinor, patch.budget.dailyMinor);
  const nameProblem = form.name.trim().length < 3 ? "At least 3 characters." : null;
  const canSubmit = !windowProblem && !budgetProblem && !nameProblem && form.category.trim().length >= 2;

  return (
    <FormDialog
      open
      title="Edit campaign"
      description={
        campaign.status === "PENDING_REVIEW"
          ? "Editing a campaign that is awaiting review changes what the reviewer sees."
          : undefined
      }
      submitLabel="Save changes"
      onClose={onClose}
      onSubmit={() => save.mutate(patch)}
      pending={save.isPending}
      error={save.error}
      canSubmit={canSubmit}
    >
      <TextField label="Name" value={form.name} onChange={set("name")} required error={Boolean(nameProblem) && form.name.length > 0} helperText={nameProblem ?? " "} />
      <TextField label="Category" value={form.category} onChange={set("category")} required />
      <TextField label="Description" value={form.description} onChange={set("description")} multiline minRows={2} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label={`Total budget (${campaign.budget?.currency ?? "INR"})`}
          value={form.total}
          onChange={set("total")}
          inputMode="decimal"
          fullWidth
          error={Boolean(budgetProblem)}
          helperText={budgetProblem ?? " "}
        />
        <TextField label="Daily budget (optional)" value={form.daily} onChange={set("daily")} inputMode="decimal" fullWidth helperText=" " />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField label="Starts" type="datetime-local" value={form.startsAt} onChange={set("startsAt")} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        <TextField
          label="Ends"
          type="datetime-local"
          value={form.endsAt}
          onChange={set("endsAt")}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          error={Boolean(windowProblem)}
          helperText={windowProblem ?? " "}
        />
      </Stack>
    </FormDialog>
  );
}

const REVIEW_DECISIONS = [
  { value: "APPROVE", label: "Approve" },
  { value: "REQUEST_CHANGES", label: "Request changes" },
  { value: "REJECT", label: "Reject" },
];

function ReviewCampaignDialog({ campaign, onClose }) {
  const [decision, setDecision] = useState("APPROVE");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const needsReason = decision !== "APPROVE";

  const review = useApiMutation(
    (body) => api.post(`/campaigns/${encode(campaign.id)}/review`, body),
    { invalidate: invalidateCampaigns, onSuccess: onClose },
  );

  const canSubmit = !needsReason || (reasonCode.trim().length >= 2 && notes.trim().length > 0);

  return (
    <FormDialog
      open
      title={`Review “${campaign.name}”`}
      description="Approved campaigns are scheduled automatically when their flight starts."
      submitLabel={REVIEW_DECISIONS.find((item) => item.value === decision)?.label}
      destructive={decision === "REJECT"}
      onClose={onClose}
      onSubmit={() =>
        review.mutate({
          decision,
          ...(needsReason ? { reasonCode: reasonCode.trim().toUpperCase(), notes: notes.trim() } : {}),
        })
      }
      pending={review.isPending}
      error={review.error}
      canSubmit={canSubmit}
    >
      <TextField select label="Decision" value={decision} onChange={(event) => setDecision(event.target.value)}>
        {REVIEW_DECISIONS.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </TextField>
      {needsReason ? (
        <>
          <TextField
            label="Reason code"
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value)}
            required
            helperText="Short and machine-readable, e.g. BUDGET_TOO_LOW, MISSING_CREATIVE."
          />
          <TextField
            label="Notes for the advertiser"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={3}
            required
            helperText="Shown on the campaign. Say exactly what needs to change."
          />
        </>
      ) : null}
    </FormDialog>
  );
}

