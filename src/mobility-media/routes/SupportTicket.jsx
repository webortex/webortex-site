/**
 * One support ticket: its thread, a reply box, and staff controls.
 *
 * The thread is stored on the ticket document, so a reply refetches the ticket
 * rather than appending locally — the server stamps the author and the
 * staff flag, and the screen should show exactly what was stored.
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { PageHeader, StatusChip } from "@/mobility-media/components/PageHeader";
import { ErrorState, LoadingState } from "@/mobility-media/components/States";
import { MutationError } from "@/mobility-media/components/Dialogs";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { formatDateTime } from "@/mobility-media/lib/format";
import { useApiMutation } from "@/mobility-media/lib/mutations";
import { useTicket } from "@/mobility-media/routes/queries";

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"];

export default function SupportTicket() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermission();
  const ticket = useTicket(ticketId);
  const [reply, setReply] = useState("");

  const path = `/support/tickets/${encodeURIComponent(ticketId ?? "")}`;
  const invalidate = [["support"]];
  const send = useApiMutation((body) => api.post(`${path}/messages`, body), { invalidate, onSuccess: () => setReply("") });
  const setStatus = useApiMutation((status) => api.post(`${path}/status`, { status }), { invalidate });
  const assign = useApiMutation((assigneeId) => api.post(`${path}/assign`, { assigneeId }), { invalidate });

  if (ticket.isLoading && !ticket.data) return <LoadingState label="Loading ticket…" />;
  if (ticket.error) return <ErrorState error={ticket.error} onRetry={ticket.refetch} />;

  const data = ticket.data;
  const isStaffUser = user?.portal === "admin";
  const closed = data?.status === "CLOSED";
  const messages = data?.messages ?? [];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/mobility/support")} sx={{ mb: 2 }}>
        Support
      </Button>

      <PageHeader
        title={data?.subject ?? "Ticket"}
        subtitle={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <StatusChip status={data?.status} />
            <Chip size="small" label={data?.priority} variant="outlined" />
            <Chip size="small" label={data?.category} variant="outlined" />
            <Typography variant="body2" color="text.secondary">{data?.code}</Typography>
          </Stack>
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {isStaffUser ? (
              <TextField
                select
                size="small"
                label="Status"
                value={data?.status ?? "OPEN"}
                disabled={setStatus.isPending}
                onChange={(event) => setStatus.mutate(event.target.value)}
                sx={{ minWidth: 190 }}
              >
                {STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>{status.replace(/_/g, " ")}</MenuItem>
                ))}
              </TextField>
            ) : !closed ? (
              <Button variant="outlined" disabled={setStatus.isPending} onClick={() => setStatus.mutate("CLOSED")}>
                Close ticket
              </Button>
            ) : null}
            {isStaffUser && can("users:write") ? (
              data?.assignedTo === user?.userId ? (
                <Button disabled={assign.isPending} onClick={() => assign.mutate(null)}>Unassign me</Button>
              ) : (
                <Button variant="outlined" disabled={assign.isPending} onClick={() => assign.mutate(user.userId)}>Assign to me</Button>
              )
            ) : null}
          </Stack>
        }
      />

      <MutationError error={setStatus.error ?? assign.error} />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            Raised {formatDateTime(data?.createdAt)}
            {data?.relatedEntityId ? ` · about ${data.relatedEntityType ?? ""} ${data.relatedEntityId}` : ""}
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>{data?.description}</Typography>
        </CardContent>
      </Card>

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {messages.map((message) => (
          <Card
            key={message.id}
            variant="outlined"
            sx={{
              alignSelf: message.authorId === user?.userId ? "flex-end" : "flex-start",
              maxWidth: { xs: "100%", md: "75%" },
              borderColor: message.isStaff ? "primary.main" : "divider",
            }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                {message.isStaff ? "Webortex support" : message.authorId === user?.userId ? "You" : "Customer"} · {formatDateTime(message.createdAt)}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>{message.body}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {closed ? (
        <Alert severity="info">This ticket is closed. Raise a new ticket if the problem comes back.</Alert>
      ) : (
        <Card>
          <CardContent>
            <MutationError error={send.error} />
            <TextField
              label="Reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
              <Button
                variant="contained"
                disabled={!reply.trim() || send.isPending}
                onClick={() => send.mutate({ body: reply.trim() })}
              >
                {send.isPending ? "Sending…" : "Send reply"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
