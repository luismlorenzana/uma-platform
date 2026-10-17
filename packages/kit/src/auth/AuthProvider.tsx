// Who is signed in, for the whole app (uma-platform SD2): both games' providers, merged. The SDK loads after the first
// render. With auth off (no config) the user is the fixed local one at once. After Google's redirect comes back, a
// failed sign-in is kept as `error` so the sign-in gate can say so, instead of silently showing the button again.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { firebaseEnabled, idToken, loadAuth, signIn, signOut, type FirebaseConfig } from './firebase.js'

export interface AuthUser {
  readonly uid: string
  readonly name: string | null
  readonly email: string | null
}

export interface AuthState {
  /** False until Firebase has said who is signed in. */
  readonly ready: boolean
  /** True when the build has a Firebase config, so the game needs a signed-in user. */
  readonly authRequired: boolean
  readonly user: AuthUser | null
  /** Why the last sign-in didn't finish, or null. */
  readonly error: string | null
  readonly signIn: () => Promise<void>
  readonly signOut: () => Promise<void>
  /** The ID token for API calls; null with auth off, signed out or offline. */
  readonly idToken: () => Promise<string | null>
}

/** The user with auth off: the API answers as `local-dev` too (`AUTH_MODE=disabled`). */
export const LOCAL_USER: AuthUser = Object.freeze({ uid: 'local-dev', name: 'Local Dev', email: null })

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ config, children }: { config: FirebaseConfig | null | undefined; children: ReactNode }) {
  const enabled = firebaseEnabled(config)
  const [user, setUser] = useState<AuthUser | null>(enabled ? null : LOCAL_USER)
  const [ready, setReady] = useState(!enabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseEnabled(config)) return
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    void Promise.all([loadAuth(config), import('firebase/auth')]).then(([auth, { getRedirectResult, onAuthStateChanged }]) => {
      if (cancelled) return
      getRedirectResult(auth).catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u ? { uid: u.uid, name: u.displayName, email: u.email } : null)
        if (u) setError(null)
        setReady(true)
      })
    }, (err: unknown) => {
      // The SDK couldn't load (offline on a first visit): say so, and let the gate offer sign-in again.
      if (cancelled) return
      setError(err instanceof Error ? err.message : String(err))
      setReady(true)
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [config?.apiKey, config?.authDomain, config?.projectId])

  const value = useMemo<AuthState>(() => ({
    ready,
    authRequired: enabled,
    user,
    error,
    signIn: () => signIn(config),
    signOut: () => signOut(config),
    idToken: () => idToken(config),
  }), [ready, enabled, user, error, config?.apiKey, config?.authDomain, config?.projectId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
