/**
 * Portal shell: persistent navigation, header and content area.
 *
 * Navigation entries are filtered by permission rather than by role. A role
 * table in the client would be a second source of truth that drifts the moment a
 * role changes; the server's `/me` response already says what may be rendered.
 */

import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CampaignIcon from "@mui/icons-material/Campaign";
import ImageIcon from "@mui/icons-material/Image";
import InsightsIcon from "@mui/icons-material/Insights";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import GavelIcon from "@mui/icons-material/Gavel";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { useQuery } from "@tanstack/react-query";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { canAccessArea } from "@/mobility-media/auth/permissions";
import { ErrorBoundary } from "@/mobility-media/components/ErrorBoundary";
import { api, qk } from "@/mobility-media/lib/api";

const DRAWER_WIDTH = 248;

/**
 * Navigation definition.
 *
 * `area` maps to a required permission in `permissions.js`. `portals` limits an
 * entry to specific scopes, so an advertiser does not see a fleet section that
 * would only ever return their own vehicles.
 */
const NAV_SECTIONS = [
  {
    label: null,
    items: [{ area: "dashboard", label: "Dashboard", to: "/mobility", icon: <DashboardIcon />, end: true }],
  },
  {
    label: "Advertising",
    items: [
      { area: "campaigns", label: "Campaigns", to: "/mobility/campaigns", icon: <CampaignIcon /> },
      { area: "creatives", label: "Creatives", to: "/mobility/creatives", icon: <ImageIcon /> },
      { area: "moderation", label: "Review queue", to: "/mobility/creatives/review", icon: <GavelIcon />, staffOnly: true },
    ],
  },
  {
    label: "Insight",
    items: [
      { area: "analytics", label: "Analytics", to: "/mobility/analytics", icon: <InsightsIcon /> },
      { area: "apiKeys", label: "API keys", to: "/mobility/api-keys", icon: <VpnKeyIcon /> },
    ],
  },
  {
    label: "Operations",
    items: [
      { area: "fleet", label: "Fleet", to: "/mobility/fleet", icon: <DirectionsBusIcon /> },
      { area: "finance", label: "Finance", to: "/mobility/finance", icon: <AccountBalanceWalletIcon /> },
    ],
  },
  {
    label: "Account",
    items: [
      { area: "support", label: "Support", to: "/mobility/support", icon: <SupportAgentIcon /> },
      { area: "notifications", label: "Notifications", to: "/mobility/notifications", icon: <NotificationsIcon />, badge: true },
      { area: "settings", label: "Settings", to: "/mobility/settings", icon: <SettingsIcon /> },
    ],
  },
];

const PORTAL_LABEL = { admin: "Operations", advertiser: "Advertiser", driver: "Driver" };

export function PortalShell() {
  const { session, permissions, signOut } = useAuth();
  const { can } = usePermission();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Unread badge count. Failures are ignored: a missing notification badge must
  // not stop the navigation from rendering.
  const { data: notifications } = useQuery({
    queryKey: qk.notifications({ unreadOnly: true, limit: 1 }),
    queryFn: ({ signal }) => api.get("/notifications", { query: { unreadOnly: true, limit: 1 }, signal }),
    refetchInterval: 60_000,
    retry: false,
    enabled: can("notifications:read"),
  });
  // `/notifications` returns `{ items, unread }`, not a `total`.
  const unread = notifications?.unread ?? 0;

  const sections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!canAccessArea(permissions, item.area)) return false;
          // Staff-only items are hidden from advertisers and drivers entirely,
          // rather than shown disabled — a review queue they can never open is
          // just clutter.
          if (item.staffOnly && session?.portal !== "admin") return false;
          return true;
        }),
      })).filter((section) => section.items.length > 0),
    [permissions, session?.portal],
  );

  async function handleSignOut() {
    setAccountAnchor(null);
    await signOut();
    navigate("/mobility/sign-in", { replace: true });
  }

  const initials = (session?.fullName || session?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1.5, px: 2.5 }}>
        <Box sx={{ width: 26, height: 26, borderRadius: 1, bgcolor: "primary.main", flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            Mobility Media
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {PORTAL_LABEL[session?.portal] ?? "Portal"}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />

      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        {sections.map((section) => (
          <List key={section.label ?? "root"} dense disablePadding>
            {section.label ? (
              <ListSubheader
                disableSticky
                sx={{ bgcolor: "transparent", lineHeight: 2, fontSize: "0.6875rem", letterSpacing: "0.06em" }}
              >
                {section.label.toUpperCase()}
              </ListSubheader>
            ) : null}

            {section.items.map((item) => (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                sx={{
                  mx: 1.5,
                  borderRadius: 1.5,
                  mb: 0.25,
                  "&.active": { bgcolor: "action.selected", color: "primary.main" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { fontSize: "0.875rem" } }}
                />
                {item.badge && unread > 0 ? (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20,
                      height: 20,
                      px: 0.75,
                      borderRadius: 10,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </Box>
                ) : null}
              </ListItemButton>
            ))}
          </List>
        ))}
      </Box>

      <Divider />
      <List dense disablePadding sx={{ py: 1 }}>
        <ListItemButton component="a" href="/" sx={{ mx: 1.5, borderRadius: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Public website" slotProps={{ primary: { fontSize: "0.875rem" } }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: "divider",
          backdropFilter: "blur(8px)",
          bgcolor: "background.default",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop ? (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <MenuIcon />
            </IconButton>
          ) : null}

          <Box sx={{ flex: 1 }} />

          <Tooltip title={session?.email ?? ""}>
            <IconButton onClick={(event) => setAccountAnchor(event.currentTarget)} aria-label="Account menu">
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", color: "primary.contrastText", fontSize: "0.8125rem" }}>
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={accountAnchor}
            open={Boolean(accountAnchor)}
            onClose={() => setAccountAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {session?.fullName || "Signed in"}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {session?.email}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
                {(session?.roles ?? []).map((role) => (
                  <Typography key={role.name} variant="caption" color="text.secondary">
                    {role.label}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}>
        <Drawer
          variant={isDesktop ? "permanent" : "temporary"}
          open={isDesktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", borderColor: "divider" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        key={location.pathname}
        sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3 }, pb: 6, width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` } }}
      >
        <Toolbar />
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </Box>
    </Box>
  );
}