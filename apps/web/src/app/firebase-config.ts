// Copied from uma-quest at 47ca16d. The Uma Platform web app's Firebase config for the kit's sign-in (IN3: one login for
// every app in the project). Present only in production builds (apps/web/.env.production): local dev has none, so the
// app runs as the local user and the API runs with AUTH_MODE=disabled.
import { firebaseEnabled, type FirebaseConfig } from '@luismlorenzana/uma-kit/auth'

export const FIREBASE: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // The Hosting domain, so the auth handler is same-origin inside the iOS Home Screen app.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const signInEnabled = firebaseEnabled(FIREBASE)
