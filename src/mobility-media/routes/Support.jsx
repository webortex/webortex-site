/**
 * Support tickets.
 *
 * Support is available to every signed-in user (`support:write` is in the
 * self-service set), so the create form is not gated — an advertiser locked out
 * of filing a ticket would have no way to report a problem.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { PageHeader, StatusChip } from "@/mobility-media/components/PageHeader";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { EmptyState } from "@/mobility-media/components/States";
import { api } from "@/mobility-media/lib/api";
import { formatRelative } from "@/mobility-media/lib/format";
import { useTickets, isServerPaged, items, totalOf } from "@/mobility-media/routes/queries";

/** Must match `createTicketSchema` in `functions/src/routes/supportRoutes.ts` exactly. */
const CATEGORIES = [
  "TECHNICAL",
  "CAMPAIGN",
  "VEHICLE",
  "DEVICE",
  "PAYOUT",
  "PAYMENT",
  "ADVERTISEMENT",
  "ACCOUNT",
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
/** `description` has a 10-character minimum server-side. */
const MIN_DESCRIPTION = 10;

export default function Support() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const params = { page, limit: 25 };
  const { data, isLoading, error, refetch } = useTickets(params);

  const rows = useMemo(() => items(data), [data]);
  const total = totalOf(data);
  const serverPaged = isServerPaged(data);

  const create = useMutation({
    mutationFn: (body) => api.post("/support/tickets", body),
    onSuccess: (ticket) => {
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["support"] });
      if (ticket?.id) navigate(`/mobility/support/${encodeURIComponent(ticket.id)}`);
    },
  });

  const columns = [
    { id: "subject", header: "Subject", render: (row) => <CellText primary={row.subject} secondary={row.ticketId ?? row.id} /> },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    { id: "priority", header: "Priority", render: (row) => row.priority ?? "—" },
    { id: "updatedAt", header: "Updated", render: (row) => <Typography variant="body2" color="text.secondary">{formatRelative(row.updatedAt)}</Typography> },
  ];

  return (
    <Box>
      <PageHeader
        title="Support"
        subtitle={total ? `${total} ticket${total === 1 ? "" : "s"}` : undefined}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
            New ticket
          </Button>
        }
      />

      <Card>
        {rows.length === 0 && !isLoading ? (
          <EmptyState
            title="No support tickets"
            description="Raise a ticket for billing, creative approval or anything blocking a campaign."
            action={
              <Button variant="outlined" onClick={() => setCreating(true)}>
                Raise a ticket
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.ticketId ?? row.id}
            loading={isLoading}
            error={error}
            onRetry={refetch}
            page={page}
            pageCount={serverPaged ? Math.max(1, Math.ceil(total / 25)) : 1}
            pageSize={25}
            totalCount={serverPaged ? total : undefined}
            onPageChange={setPage}
            onRowClick={(row) => navigate(`/mobility/support/${encodeURIComponent(row.id ?? row.ticketId)}`)}
          />
        )}
      </Card>

      <NewTicketDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(body) => create.mutate(body)}
        submitting={create.isPending}
        error={create.error}
      />
    </Box>
  );
}

function NewTicketDialog({ open, onClose, onSubmit, submitting, error }) {
  const [category, setCategory] = useState("TECHNICAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  const descriptionOk = description.trim().length >= MIN_DESCRIPTION;
  const subjectOk = subject.trim().length >= 4;
  const canSubmit = descriptionOk && subjectOk && !submitting;

  function submit() {
    if (!canSubmit) return;
    onSubmit({
      category,
      subject: subject.trim(),
      description: description.trim(),
      priority,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Raise a support ticket</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {error ? <Box sx={{ color: "error.main" }}>{error.message}</Box> : null}

          <TextField select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((value) => (
              <MenuItem key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITIES.map((value) => (
              <MenuItem key={value} value={value}>
                {value.charAt(0) + value.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            error={subject.length > 0 && !subjectOk}
            helperText={
              subject.length > 0 && !subjectOk
                ? "At least 4 characters."
                : "One line that summarises the problem."
            }
          />

          <TextField
            label="What's happening?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={5}
            required
            error={description.length > 0 && !descriptionOk}
            helperText={
              description.length > 0 && !descriptionOk
                ? `At least ${MIN_DESCRIPTION} characters.`
                : "Include campaign or invoice ids where relevant — they make this much faster to resolve."
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit}>
          {submitting ? "Submitting…" : "Submit ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}