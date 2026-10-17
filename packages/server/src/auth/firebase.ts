// The Firebase check, loaded on the first token and kept: an API that runs with `AUTH_MODE=disabled`, or never sees a
// token, never loads firebase-admin. Reuses the app the API already initialized, if any.
import type { VerifiedToken, VerifyIdToken } from './options.js'

/** Firebase Admin couldn't start: a server problem (500), never a bad token (401). */
export class AuthSetupError extends Error {
  constructor(cause: unknown) {
    super(`Firebase Admin could not start: ${cause instanceof Error ? cause.message : String(cause)}`)
    this.name = 'AuthSetupError'
  }
}

interface FirebaseAuth {
  verifyIdToken(token: string): Promise<{ readonly uid: string; readonly email?: string }>
}

export function firebaseVerifier(projectId?: string): VerifyIdToken {
  let auth: Promise<FirebaseAuth> | undefined
  const load = async (): Promise<FirebaseAuth> => {
    try {
      const { getApps, initializeApp } = await import('firebase-admin/app')
      const { getAuth } = await import('firebase-admin/auth')
      return getAuth(getApps()[0] ?? initializeApp(projectId ? { projectId } : undefined))
    } catch (err) {
      auth = undefined
      throw new AuthSetupError(err)
    }
  }
  return async (token: string): Promise<VerifiedToken> => {
    auth ??= load()
    const decoded = await (await auth).verifyIdToken(token)
    return decoded.email === undefined ? { uid: decoded.uid } : { uid: decoded.uid, email: decoded.email }
  }
}
