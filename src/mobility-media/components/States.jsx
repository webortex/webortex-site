/**
 * Loading, empty and error presentation.
 *
 * These three states are handled explicitly rather than left implicit, because
 * an analytics screen that silently shows nothing during a failed fetch is
 * indistinguishable from one showing zero revenue.
 *
 * `ErrorState` surfaces the API's `correlationId`. That id is what support needs
 * to find the request in the logs, so showing it turns "it didn't load" into a
 * reportable event instead of a dead end.
 */

import { Alert, AlertTitle, Box, Button, CircularProgress, Skeleton, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InboxIcon from "@mui/icons-material/Inbox";
import { ApiError, isAbortError } from "@/mobility-media/lib/api";

export function LoadingState({ label = "Loading…", minHeight = 240 }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight, gap: 2 }}>
      <CircularProgress size={28} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** Placeholder rows. Used where a table shape keeps the layout from jumping. */
export function TableSkeleton({ rows = 6, columns = 4 }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <Stack direction="row" spacing={2} key={rowIndex}>
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Skeleton variant="rounded" height={34} sx={{ flex: 1 }} key={columnIndex} />
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * An error the user can act on.
 *
 * Cancelled requests are not errors: React Query aborts in-flight queries when
 * parameters change, so surfacing them would flash an error on every filter
 * change. `QueryErrorState` filters them out.
 */
export function ErrorState({ error, onRetry, title = "Could not load this" }) {
  if (!error) return null;

  const apiError = error instanceof ApiError ? error : null;
  // A 403 on a section the user has no permission for is expected, not a fault.
  // It gets its own wording so it does not read like something is broken.
  if (apiError?.isForbidden) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <AlertTitle>Not available for your role</AlertTitle>
        {apiError.message}
      </Alert>
    );
  }

  const isRetryable = apiError ? apiError.isRetryable : true;

  return (
    <Alert
      severity={isRetryable ? "warning" : "error"}
      icon={<ErrorOutlineIcon />}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
      sx={{ m: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      {apiError?.message ?? error?.message ?? "Something went wrong."}
      {apiError?.correlationId ? (
        <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
          Reference: {apiError.correlationId}
        </Typography>
      ) : null}
    </Alert>
  );
}

/** `ErrorState` for a React Query result, ignoring aborts. */
export function QueryErrorState({ error, onRetry }) {
  if (isAbortError(error)) return null;
  return <ErrorState error={error} onRetry={onRetry} />;
}

export function EmptyState({ title = "Nothing here yet", description, action, icon = <InboxIcon />, minHeight = 200 }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight,
        gap: 1.5,
        px: 3,
      }}
    >
      <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      ) : null}
      {action}
    </Box>
  );
}