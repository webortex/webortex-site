import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  base: "/",

  build: {
    outDir: "dist", // Ensure the correct output directory
    assetsDir: "assets", // Optional: To organize assets
  },

  server: {
    host: true, // This allows access from external URLs

    port: 5173, // or your preferred port
    strictPort: true,
    /**
     * Proxies the API prefix to the Functions emulator.
     *
     * Without this, the portal's `API_BASE` of `/api/mobility` is a same-origin
     * path that the dev server has no handler for, so every screen fails with a
     * 404 while Firebase Auth (which talks to its own emulator directly) works
     * fine — the auth emulator passing is misleading, not reassuring.
     *
     * The Functions emulator nests functions under `{projectId}/{region}`, so the
     * rewrite has to reproduce that. Both are env-overridable to match
     * `config.js` rather than being duplicated by hand.
     */
    proxy: {
      "/api/mobility": {
        target: `http://${process.env.VITE_EMULATOR_HOST ?? "127.0.0.1:5001"}`,
        changeOrigin: true,
        rewrite: (requestPath) =>
          requestPath.replace(
            /^\/api\/mobility/,
            `/${process.env.VITE_MM_FIREBASE_PROJECT_ID ?? "demo-webortex-mobility"}/${process.env.VITE_MM_FUNCTIONS_REGION ?? "asia-south1"}/api/mobility`,
          ),
      },
    },
    allowedHosts: [
      "localhost",
      "bb9b-2406-7400-3d-50db-197a-35a0-11ed-caf1.ngrok-free.app", // Allow any ngrok URL
    ],
    cors: {
      origin: ["http://localhost:5173/"], // Replace with the exact URL you'll provide
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  },
});
