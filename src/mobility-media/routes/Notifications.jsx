/**
 * Notification feed.
 *
 * Reads are mutations on the API — marking read is a `POST`, not a GET that
 * clears state — so the list is only refetched after the call succeeds, and the
 * unread badge in the shell updates off the same invalidation.
 */

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Card, Checkbox, Stack, Typography } from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { PageHeader } from "@/mobility-media/components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/mobility-media/components/States";
import { api } from "@/mobility-media/lib/api";
import { formatRelative } from "@/mobility-media/lib/format";
import { useNotifications, items } from "@/mobility-media/routes/queries";
import { humaniseStatus } from "@/mobility-media/theme";
import NotificationsIcon from "@mui/icons-material/NotificationsNone";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  /**
 * `/notifications` is server-paged by offset and returns
 * `{ items, unread, hasMore }`. `hasMore` comes from the server reading one row
 * past `limit`, so it is exact even when the last page is exactly full — which a
 * client-side "did the page come back full?" check cannot tell apart from a
 * further page existing.
 */
  const PAGE_SIZE = 25;
  const params = { unreadOnly: unreadOnly ? "true" : undefined, limit: PAGE_SIZE, page };
  const { data, isLoading, error, refetch } = useNotifications(params);
  const list = useMemo(() => items(data), [data]);
  const hasNextPage = data?.hasMore === true;

  const markRead = useMutation({
    mutationFn: (notificationId) => api.post(`/notifications/${encodeURIComponent(notificationId)}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading && !data) return <LoadingState label="Loading notifications…" />;

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle={data?.unread ? `${data.unread} unread` : "All caught up"}
        actions={
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setUnreadOnly((value) => !value)}>
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DoneAllIcon />}
              disabled={!data?.unread || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          </Stack>
        }
      />

      <Card>
        {error ? <ErrorState error={error} onRetry={refetch} /> : null}

        {!isLoading && list.length === 0 ? (
          <EmptyState
            icon={<NotificationsIcon sx={{ fontSize: 40 }} />}
            title={unreadOnly ? "No unread notifications" : "No notifications yet"}
            description="Campaign approvals, payout settlements and support updates appear here."
          />
        ) : null}

        {list.map((notification) => {
          // `notificationSchema` has `readAt` and no `isRead` boolean; the read
          // flag is the presence of a timestamp.
          const read = Boolean(notification.readAt);
          return (
            <Stack
              key={notification.id}
              direction="row"
              spacing={1}
              alignItems="flex-start"
              sx={{ p: 2, borderBottom: 1, borderColor: "divider", bgcolor: read ? "transparent" : "action.hover" }}
            >
              <Checkbox
                size="small"
                checked={read}
                disabled={read || markRead.isPending}
                onChange={() => markRead.mutate(notification.id)}
                inputProps={{ "aria-label": "Mark as read" }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="body2" fontWeight={read ? 400 : 600}>
                    {notification.title ?? humaniseStatus(notification.type)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelative(notification.createdAt)}
                  </Typography>
                </Stack>
                {notification.body ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {notification.body}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          );
        })}

        {page > 1 || hasNextPage ? (
          <Stack direction="row" justifyContent="center" sx={{ p: 2, alignItems: "center" }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Previous
            </Button>
            <Typography variant="body2" sx={{ px: 2, alignSelf: "center" }}>
              Page {page}
            </Typography>
            <Button size="small" disabled={!hasNextPage} onClick={() => setPage((value) => value + 1)}>
              Next
            </Button>
          </Stack>
        ) : null}
      </Card>
    </Box>
  );
}