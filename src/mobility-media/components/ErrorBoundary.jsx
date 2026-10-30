/**
 * Error boundary.
 *
 * Without one, a render throw anywhere in a portal screen unmounts the whole
 * React tree — including the legacy marketing site that shares the bundle. The
 * boundary is scoped around the portal subtree so a portal bug cannot take the
 * public site down with it.
 *
 * Resetting on navigation means moving away from a broken screen clears the
 * error instead of leaving the user stuck reloading the same page.
 */

import { Component } from "react";
import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import BugReportIcon from "@mui/icons-material/BugReport";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // Left to the host's error reporting in production; logging here keeps the
    // stack available in development without assuming a reporting service.
    if (import.meta.env?.DEV) {
      console.error("Portal render error:", error, info?.componentStack);
    }
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previousProps) {
    // Navigating away from the screen that threw clears it.
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset() {
    this.setState({ error: null, info: null });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" icon={<BugReportIcon />}>
          <AlertTitle>This screen failed to render</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The rest of the portal is still usable. Reloading this screen usually clears it.
          </Typography>

          {import.meta.env?.DEV && info?.componentStack ? (
            <Box
              component="pre"
              sx={{
                mt: 1,
                p: 1.5,
                overflowX: "auto",
                fontSize: "0.75rem",
                bgcolor: "action.hover",
                borderRadius: 1,
                maxHeight: 320,
              }}
            >
              {info.componentStack}
            </Box>
          ) : null}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="contained" onClick={this.reset}>
              Try again
            </Button>
            <Button size="small" variant="outlined" onClick={() => window.location.assign("/mobility")}>
              Go to dashboard
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }
}