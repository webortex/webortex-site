/**
 * Creatives.
 *
 * Two views sharing one route: the advertiser's own creatives, and the staff
 * review queue. They are different jobs — one is checking your own work, the
 * other is approving other people's — so the review queue gets its own route and
 * its own navigation entry rather than being a tab hidden in a list.
 *
 * Upload goes through `CreativeUpload`, which holds the three-step
 * intent → PUT → register protocol. The bytes are deliberately kept out of the
 * API request: a 200 MB video through a Cloud Function is a timeout and a
 * memory spike, not an upload.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Card, IconButton, Stack, TextField, MenuItem, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SendIcon from "@mui/icons-material/Send";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { PageHeader, StatusChip } from "@/mobility-media/components/PageHeader";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { formatBytes, formatDateTime } from "@/mobility-media/lib/format";
import { useCreatives, useReviewQueue, useSettings, items, paginate, totalOf } from "@/mobility-media/routes/queries";
import { ConfirmDialog, FormDialog } from "@/mobility-media/components/Dialogs";
import { useApiMutation } from "@/mobility-media/lib/mutations";

/** Statuses an owner may (re)submit for review — the shared creative graph allows DRAFT and REJECTED. */
const SUBMITTABLE = new Set(["DRAFT", "REJECTED"]);

/**
 * Inline preview of a creative. Uses the signed URL the list endpoints already
 * attach, so opening a preview costs no extra request.
 */
function CreativePreview({ creative, onClose }) {
  const url = creative?.signedUrl;
  const isVideo = creative?.format === "VIDEO" || creative?.mimeType?.startsWith("video/");
  return (
    <FormDialog open={Boolean(creative)} title={creative?.name ?? "Preview"} submitLabel="Close" onSubmit={onClose} onClose={onClose} maxWidth="md">
      {url ? (
        isVideo ? (
          <Box component="video" src={url} controls sx={{ width: "100%", maxHeight: "60vh", bgcolor: "black" }} />
        ) : (
          <Box component="img" src={url} alt={creative?.name} sx={{ width: "100%", maxHeight: "60vh", objectFit: "contain" }} />
        )
      ) : (
        <Alert severity="info">No preview is available for this creative yet.</Alert>
      )}
      {creative?.headline ? <Typography variant="body2">{creative.headline}</Typography> : null}
      {creative?.rejectionNotes ? (
        <Alert severity="error">
          {creative.rejectionReasonCode ? <strong>{creative.rejectionReasonCode}: </strong> : null}
          {creative.rejectionNotes}
        </Alert>
      ) : null}
    </FormDialog>
  );
}
import CreativeUpload from "@/mobility-media/routes/CreativeUpload";

const PAGE_SIZE = 25;

export function Creatives() {
  const { can } = usePermission();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewing, setPreviewing] = useState(null);
  const [archiving, setArchiving] = useState(null);
  const canWrite = can("creatives:write");

  const invalidate = [["creatives"]];
  const duplicate = useApiMutation((id) => api.post(`/creatives/${encodeURIComponent(id)}/duplicate`, {}), { invalidate });
  const archive = useApiMutation((id) => api.delete(`/creatives/${encodeURIComponent(id)}`), {
    invalidate,
    onSuccess: () => setArchiving(null),
  });
  const submit = useApiMutation((creativeIds) => api.post("/creatives/submit", { creativeIds }), {
    invalidate,
    onSuccess: () => setSelectedIds([]),
  });

  // Server-paged: the endpoint caps `limit` at 100, so asking for the whole
  // library and slicing it here would silently truncate long lists at row 100.
  const creatives = useCreatives({ status: status || undefined, limit: PAGE_SIZE, page });
  const list = useMemo(() => items(creatives.data), [creatives.data]);
  const total = totalOf(creatives.data);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns = [
    { id: "name", header: "Creative", render: (row) => <CellText primary={row.name} secondary={row.code} /> },
    // `creativeSchema` names this `format`, not `type`.
    { id: "format", header: "Type", render: (row) => row.format },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "sizeBytes", header: "Size", render: (row) => formatBytes(row.sizeBytes) },
    { id: "durationSeconds", header: "Duration", render: (row) => (row.durationSeconds ? `${row.durationSeconds}s` : "—") },
    { id: "updatedAt", header: "Updated", render: (row) => <Typography variant="body2" color="text.secondary">{formatDateTime(row.updatedAt)}</Typography> },
    {
      id: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Preview">
            <IconButton size="small" aria-label="Preview" onClick={() => setPreviewing(row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {canWrite ? (
            <>
              <Tooltip title="Duplicate as a new draft">
                <IconButton size="small" aria-label="Duplicate" disabled={duplicate.isPending} onClick={() => duplicate.mutate(row.id)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Archive">
                <IconButton size="small" aria-label="Archive" onClick={() => setArchiving(row)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : null}
        </Stack>
      ),
    },
  ];

  const submittable = list.filter((creative) => selectedIds.includes(creative.id) && SUBMITTABLE.has(creative.status));

  return (
    <Box>
      <PageHeader
        title="Creatives"
        subtitle="Creative assets and their approval status"
        actions={
          can("creatives:write") ? (
            <Button variant="contained" size="small" startIcon={<CloudUploadIcon />} onClick={() => setUploading((value) => !value)}>
              {uploading ? "Close upload" : "Upload creative"}
            </Button>
          ) : null
        }
      />

      {uploaded ? (
        <Alert severity="success" onClose={() => setUploaded("")} sx={{ mb: 2 }}>
          “{uploaded}” was uploaded as a draft. Submit it for review when it is ready.
        </Alert>
      ) : null}

      {uploading ? (
        <Box sx={{ mb: 2 }}>
          <CreativeUpload
            onClose={() => setUploading(false)}
            onUploaded={(creative) => {
              setUploading(false);
              setUploaded(creative?.name ?? "Creative");
              // Back to the first page: the new creative is the newest document,
              // so it is on page 1, and the user may be several pages deep.
              setPage(1);
              queryClient.invalidateQueries({ queryKey: ["creatives"] });
            }}
          />
        </Box>
      ) : null}

      <Card>
        {duplicate.isError || submit.isError ? (
          <Alert severity="error" sx={{ m: 2 }}>{(duplicate.error ?? submit.error)?.message}</Alert>
        ) : null}
        {submit.isSuccess ? (
          <Alert severity="success" sx={{ m: 2 }} onClose={() => submit.reset()}>
            Submitted {submit.data?.submitted ?? 0} creative(s) for review.
          </Alert>
        ) : null}
        <Stack direction="row" sx={{ p: 2, alignItems: "center" }} spacing={2}>
          {canWrite && submittable.length > 0 ? (
            <Button size="small" variant="contained" startIcon={<SendIcon />} disabled={submit.isPending} onClick={() => submit.mutate(submittable.map((c) => c.id))}>
              Submit {submittable.length} for review
            </Button>
          ) : null}
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 170 }}>
            <MenuItem value="">All</MenuItem>
            {["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "LIVE", "REJECTED"].map((value) => (
              <MenuItem key={value} value={value}>{value.replace(/_/g, " ")}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <DataTable
          columns={columns}
          rows={list}
          rowKey={(row) => row.id}
          loading={creatives.isLoading}
          error={creatives.error}
          onRetry={creatives.refetch}
          page={page}
          pageCount={pageCount}
          totalCount={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          emptyTitle="No creatives"
          emptyDescription="Upload a creative to attach it to a campaign."
          onRowClick={(row) => setPreviewing(row)}
          selectable={canWrite}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </Card>

      <CreativePreview creative={previewing} onClose={() => setPreviewing(null)} />
      <ConfirmDialog
        open={Boolean(archiving)}
        title={`Archive “${archiving?.name ?? ""}”?`}
        body="It is removed from your library and from any playlist it is in. Play history is kept."
        confirmLabel="Archive"
        destructive
        pending={archive.isPending}
        error={archive.error}
        onConfirm={() => archive.mutate(archiving.id)}
        onClose={() => {
          setArchiving(null);
          archive.reset();
        }}
      />
    </Box>
  );
}

// Default export is the advertiser's own creative list. The review queue is
// imported separately by the router so each screen becomes its own lazy chunk.
export default Creatives;

/**
 * Staff review queue.
 *
 * Approving and rejecting are mutations with an explicit reason on rejection: a
 * rejected creative needs to tell its owner what to change, and a silent
 * rejection just generates a support ticket.
 */
/** Statuses a moderator may act on. */
const REVIEWABLE = new Set(["SUBMITTED", "UNDER_REVIEW"]);

export function ReviewQueue() {
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [status, setStatus] = useState("SUBMITTED");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState(null);
  const [rejectDecision, setRejectDecision] = useState("REJECT");
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [previewing, setPreviewing] = useState(null);

  // The API only accepts reason codes from the configured list. Moderators are
  // staff, so they receive the full settings document including that list.
  const settings = useSettings();
  const reasons = settings.data?.moderation?.rejectionReasons ?? [];

  const queue = useReviewQueue({ status, limit: 100 });
  const list = useMemo(() => items(queue.data), [queue.data]);
  const paged = useMemo(() => paginate(list, page, 25), [list, page]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["creatives"] });
  }

  // `moderationDecisionSchema` accepts `decision`, `reasonCode` and `notes` — a
  // `reason` key would be silently dropped, so a rejection would reach the owner
  // with no explanation at all.
  const moderate = useMutation({
    mutationFn: ({ creativeId, decision, code, note }) =>
      api.post(`/creatives/${encodeURIComponent(creativeId)}/moderate`, {
        decision,
        ...(code ? { reasonCode: code } : {}),
        ...(note ? { notes: note } : {}),
      }),
    onSuccess: () => {
      invalidate();
      setRejecting(null);
      setReasonCode("");
      setNotes("");
    },
  });

  const columns = [
    { id: "name", header: "Creative", render: (row) => <CellText primary={row.name} secondary={row.code} maxWidth={260} /> },
    { id: "advertiserId", header: "Advertiser", render: (row) => row.advertiserId },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "createdAt", header: "Submitted", render: (row) => <Typography variant="body2" color="text.secondary">{formatDateTime(row.createdAt)}</Typography> },
    {
      id: "actions",
      header: "",
      align: "right",
      // Creatives have no "PENDING_REVIEW" status; the queue holds SUBMITTED and
      // UNDER_REVIEW, so gating on the old name hid the buttons on every row.
      render: (row) =>
        can("creatives:review") && REVIEWABLE.has(row.status) ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end" onClick={(event) => event.stopPropagation()}>
            <IconButton size="small" aria-label="Preview" onClick={() => setPreviewing(row)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
            <Button
              size="small"
              color="success"
              variant="outlined"
              startIcon={<ThumbUpIcon />}
              disabled={moderate.isPending}
              onClick={() => moderate.mutate({ creativeId: row.id, decision: "APPROVE" })}
            >
              Approve
            </Button>
            <Button size="small" color="error" variant="outlined" startIcon={<ThumbDownIcon />} onClick={() => setRejecting(row)}>
              Reject
            </Button>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">No action</Typography>
        ),
    },
  ];

  return (
    <Box>
      <PageHeader title="Review queue" subtitle={`${list.length} awaiting decision`} />

      {moderate.isError ? <Alert severity="error" sx={{ mb: 2 }}>{moderate.error?.message}</Alert> : null}

      <Card>
        <Stack direction="row" sx={{ p: 2 }} spacing={2}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
            {["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((value) => (
              <MenuItem key={value} value={value}>{value.replace(/_/g, " ")}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <DataTable
          columns={columns}
          rows={paged.rows}
          rowKey={(row) => row.id}
          loading={queue.isLoading}
          error={queue.error}
          onRetry={queue.refetch}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={25}
          onPageChange={setPage}
          emptyTitle="Queue is clear"
          emptyDescription="Nothing is waiting for review in this status."
        />
      </Card>

      <CreativePreview creative={previewing} onClose={() => setPreviewing(null)} />

      {rejecting ? (
        <Card sx={{ mt: 2, p: 2, borderColor: "error.main" }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Reject “{rejecting.name}”
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Decision" value={rejectDecision} onChange={(event) => setRejectDecision(event.target.value)}>
              <MenuItem value="REJECT">Reject</MenuItem>
              <MenuItem value="REQUEST_CHANGES">Request changes</MenuItem>
            </TextField>
            <TextField
              select
              label="Reason"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
              required
              helperText={settings.error ? "Could not load the reason list." : "From the platform's moderation policy."}
            >
              {reasons.map((reason) => (
                <MenuItem key={reason.code} value={reason.code}>
                  {reason.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes for the owner"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={3}
              required
              helperText="Shown to the creative's owner. Be specific about what to change."
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button onClick={() => { setRejecting(null); setReasonCode(""); setNotes(""); }}>Cancel</Button>
              <Button
                color="error"
                variant="contained"
                disabled={!notes.trim() || !reasonCode || moderate.isPending}
                onClick={() =>
                  moderate.mutate({
                    creativeId: rejecting.id,
                    decision: rejectDecision,
                    code: reasonCode.trim(),
                    note: notes.trim(),
                  })
                }
              >
                {rejectDecision === "REJECT" ? "Reject creative" : "Request changes"}
              </Button>
            </Stack>
          </Stack>
        </Card>
      ) : null}
    </Box>
  );
}