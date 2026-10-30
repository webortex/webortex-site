/**
 * Portal theme.
 *
 * Colours come from the legacy brand — near-black `#060606`, muted `#a0a0a0`,
 * blue `#62abff` — so the portal reads as the same product rather than a bolted
 * on admin panel. Both modes are defined because the API carries a per-user
 * `theme` preference.
 *
 * A single theme instance is created here. The legacy `Navbar` builds one inline
 * on every render, which is not copied: allocating a theme invalidates MUI's
 * style cache each time.
 */

import { createTheme } from "@mui/material/styles";

const BRAND = {
  black: "#060606",
  muted: "#a0a0a0",
  blue: "#62abff",
};

/** Status colours for campaign and payment states. */
export const STATUS_COLOURS = {
  DRAFT: "default",
  PENDING_REVIEW: "warning",
  UNDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "error",
  ACTIVE: "success",
  PAUSED: "warning",
  SCHEDULED: "info",
  COMPLETED: "success",
  EXPIRED: "default",
  CANCELLED: "default",
  FAILED: "error",
  PENDING: "warning",
  PROCESSING: "info",
  PAID: "success",
  OVERDUE: "error",
  SUSPENDED: "error",
  OFFLINE: "default",
  DEGRADED: "warning",
  ONLINE: "success",
};

/** Turns `PENDING_REVIEW` into `Pending review` for display. */
export function humaniseStatus(status) {
  if (!status) return "—";
  return String(status)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const shared = {
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Outfit Variable", "Outfit", system-ui, sans-serif',
    h1: { fontWeight: 600, fontSize: "2rem", letterSpacing: "-0.02em" },
    h2: { fontWeight: 600, fontSize: "1.5rem", letterSpacing: "-0.01em" },
    h3: { fontWeight: 600, fontSize: "1.25rem" },
    h4: { fontWeight: 600, fontSize: "1.125rem" },
    h5: { fontWeight: 600, fontSize: "1rem" },
    h6: { fontWeight: 600, fontSize: "0.9375rem" },
    button: { textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiCard: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
};

export function buildTheme(mode = "dark") {
  const dark = mode === "dark";

  return createTheme({
    ...shared,
    palette: dark
      ? {
          mode: "dark",
          primary: { main: BRAND.blue, contrastText: BRAND.black },
          secondary: { main: BRAND.muted },
          background: { default: BRAND.black, paper: "#101012" },
          divider: "rgba(255,255,255,0.10)",
          success: { main: "#4ade80" },
          warning: { main: "#fbbf24" },
          error: { main: "#f87171" },
          info: { main: BRAND.blue },
        }
      : {
          mode: "light",
          primary: { main: "#1f6fd0", contrastText: "#ffffff" },
          secondary: { main: "#5c5c5c" },
          background: { default: "#f6f7f9", paper: "#ffffff" },
          divider: "rgba(0,0,0,0.10)",
          success: { main: "#16a34a" },
          warning: { main: "#b45309" },
          error: { main: "#dc2626" },
          info: { main: "#1f6fd0" },
        },
    // Tabular figures keep money columns from shifting as digits change.
    typography: { ...shared.typography, fontVariantNumeric: "tabular-nums" },
  });
}

export const darkTheme = buildTheme("dark");
export const lightTheme = buildTheme("light");