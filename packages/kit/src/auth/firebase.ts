// The Firebase sign-in client both games ran (uma-platform SD2): Google sign-in by redirect, which works inside the iOS
// Home Screen app, and the signed-in owner's ID token for API calls. The SDK loads only by `import()` on first use, so
// it stays out of the startup bundle, and importing this module never loads it. The game passes its own config: the kit
// never reads `import.meta.env`. Without a complete config (local development) auth is off: nobody signs in and the
// API runs with `AUTH_MODE=disabled`.
import type { Auth } from 'firebase/auth'

export interface FirebaseConfig {
  readonly apiKey?: string | undefined
  /** The game's Hosting domain (uma-rpg.web.app), so the auth handler is same-origin inside the Home Screen app. */
  readonly authDomain?: string | undefined
  readonly projectId?: string | undefined
  readonly appId?: string | undefined
}

/** Auth is on when the config names an API key and an auth domain (production builds). */
export const firebaseEnabled = (config: FirebaseConfig | null | undefined): config is FirebaseConfig & { apiKey: string; authDomain: string } =>
  Boolean(config?.apiKey && config.authDomain)

const loaded = new Map<string, Promise<Auth>>()
const keyOf = (config: FirebaseConfig): string => `${config.apiKey ?? ''}|${config.authDomain ?? ''}|${config.projectId ?? ''}`

/** The Firebase Auth instance for `config`, loaded once per page. A failed load is forgotten, so the next call tries again. */
export function loadAuth(config: FirebaseConfig): Promise<Auth> {
  const key = keyOf(config)
  let auth = loaded.get(key)
  if (auth === undefined) {
    // The default app, as the games used: its name keys the persisted sign-in, so moving onto the kit keeps the owner
    // signed in.
    auth = Promise.all([import('firebase/app'), import('firebase/auth')]).then(([{ getApps, initializeApp }, { getAuth }]) =>
      getAuth(getApps().find((app) => app.name === '[DEFAULT]') ?? initializeApp({ ...config })))
    auth.catch(() => loaded.delete(key))
    loaded.set(key, auth)
  }
  return auth
}

/**
 * The signed-in owner's ID token, refreshed by Firebase when it has expired; null with auth off, signed out, or when it
 * can't be refreshed (offline), so a cached response still works and the save waits.
 */
export async function idToken(config: FirebaseConfig | null | undefined): Promise<string | null> {
  if (!firebaseEnabled(config)) return null
  const auth = await loadAuth(config)
  return auth.currentUser ? auth.currentUser.getIdToken().catch(() => null) : null
}

/** Google sign-in by redirect. A no-op with auth off. */
export async function signIn(config: FirebaseConfig | null | undefined): Promise<void> {
  if (!firebaseEnabled(config)) return
  const [auth, { GoogleAuthProvider, signInWithRedirect }] = await Promise.all([loadAuth(config), import('firebase/auth')])
  await signInWithRedirect(auth, new GoogleAuthProvider())
}

export async function signOut(config: FirebaseConfig | null | undefined): Promise<void> {
  if (!firebaseEnabled(config)) return
  const [auth, { signOut: firebaseSignOut }] = await Promise.all([loadAuth(config), import('firebase/auth')])
  await firebaseSignOut(auth)
}
