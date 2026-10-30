/**
 * The portal's Firebase app.
 *
 * Mobility Media lives in its own Firebase project, separate from the one the
 * legacy site's `Firebaseconfig.jsx` points at. An ID token is only accepted by
 * the project that minted it, so signing in through the legacy app would produce
 * tokens the API rejects. This is a second, *named* app: initialising another
 * default app would collide with the legacy one when both bundles are loaded.
 *
 * In emulator mode no real config is needed. The `demo-` project id tells the
 * SDK and the emulators that nothing here may reach a live backend.
 */

import { getApp, getApps, initializeApp } from "firebase/app";
import { FIREBASE_PROJECT_ID, USE_EMULATORS } from "@/mobility-media/config";

const APP_NAME = "mobility";

const env = import.meta.env ?? {};

function firebaseOptions() {
  if (USE_EMULATORS) {
    return { apiKey: "demo-api-key", projectId: FIREBASE_PROJECT_ID, authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com` };
  }
  return {
    apiKey: env.VITE_MM_FIREBASE_API_KEY,
    authDomain: env.VITE_MM_FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
    appId: env.VITE_MM_FIREBASE_APP_ID,
  };
}

export const mobilityApp = getApps().some((app) => app.name === APP_NAME)
  ? getApp(APP_NAME)
  : initializeApp(firebaseOptions(), APP_NAME);
