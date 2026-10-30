import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Two projects, because the two halves of this repository need different
 * environments and the legacy app must not be forced into the Functions one.
 *
 *  - `web` runs the React UI and the shared domain package in jsdom.
 *  - `functions` runs the Cloud Functions logic in plain Node. The emulator is
 *    deliberately not started: these are unit tests over pure functions and
 *    request/response plumbing, and a test that needs a Firestore process to be
 *    running is a test that silently gets skipped.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        // Mirrors the `@` alias in `vite.config.js`. Without it, importing
        // anything through the alias fails to resolve under test only — the
        // build succeeds and the tests cannot run.
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "web",
          environment: "jsdom",
          globals: true,
          // The legacy app and the portal are plain JSX, so `.js`/`.jsx` tests
          // are included alongside `.ts`. Restricting to TypeScript would have
          // silently excluded every test written against the UI.
          include: ["src/**/*.test.{ts,tsx,js,jsx}", "packages/shared/src/**/*.test.ts"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        test: {
          name: "functions",
          environment: "node",
          globals: true,
          include: ["functions/src/**/*.test.ts"],
        },
      },
    ],
  },
});
