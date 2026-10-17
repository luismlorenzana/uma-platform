// What a game's API passes to `AuthModule`: its own env, read where the API reads it. The package never reads
// `process.env`.

/** What a verified Firebase ID token says about its user. */
export interface VerifiedToken {
  readonly uid: string
  readonly email?: string
}

/** Verifies a Firebase ID token, or rejects when it isn't valid. */
export type VerifyIdToken = (token: string) => Promise<VerifiedToken>

export interface AuthOptions {
  /** `disabled` lets every request in as `local-dev` without calling Firebase: local development only. */
  readonly mode: 'enabled' | 'disabled'
  /** The one email allowed in (the owner's), compared without case. Empty lets nobody in. */
  readonly allowedEmail: string
  /** The Firebase project, where the runtime doesn't name it (Cloud Run does). */
  readonly projectId?: string
  /** Replaces the Firebase check, for tests. */
  readonly verifyIdToken?: VerifyIdToken
}

/** `AUTH_MODE` as both APIs set it: `disabled` turns the guard off; anything else keeps it on. */
export const authMode = (value: string | undefined): AuthOptions['mode'] => (value === 'disabled' ? 'disabled' : 'enabled')

export const AUTH_OPTIONS = Symbol('uma-server:auth-options')
export const TOKEN_VERIFIER = Symbol('uma-server:token-verifier')
