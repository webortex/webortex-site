/**
 * Provider stack for the portal.
 *
 * Order matters:
 *
 *   QueryClientProvider → AuthProvider → ThemeProvider → CssBaseline
 *
 * `AuthProvider` calls `useQueryClient` to clear cached queries on sign-out, so
 * it must sit inside the query client. `ThemeProvider` sits outside the screens
 * but inside auth so the theme can follow the user's stored preference without
 * an extra round trip on first paint.
 *
 * The whole stack is scoped to the portal subtree. None of this wraps the legacy
 * marketing site, so nothing here can change its behaviour.
 */

import { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "@/mobility-media/auth/AuthProvider";
import { useAuth } from "@/mobility-media/auth/context";
import { queryClient } from "@/mobility-media/lib/queryClient";
import { buildTheme } from "@/mobility-media/theme";

/**
 * Applies the per-user theme preference.
 *
 * Defaults to dark, matching the legacy brand. The preference is only read once
 * `/me` resolves, so the first paint is always the default rather than a flash
 * of the wrong mode.
 */
function ThemedShell({ children }) {
  const { session } = useAuth();
  const theme = useMemo(() => buildTheme(session?.theme === "light" ? "light" : "dark"), [session?.theme]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemedShell>{children}</ThemedShell>
      </AuthProvider>
    </QueryClientProvider>
  );
}