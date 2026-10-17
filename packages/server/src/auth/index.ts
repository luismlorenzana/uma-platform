// `@luismlorenzana/uma-server/auth`: the Firebase token and owner allowlist guard both game APIs run (SD1).
export { AuthModule, type AuthModuleAsyncOptions, type AuthModuleExtras } from './auth.module.js'
export { AuthGuard, bearerToken, LOCAL_DEV_UID, type AuthedRequest } from './auth.guard.js'
export { CurrentUid } from './current-uid.js'
export { IS_PUBLIC, Public } from './public.js'
export { AuthSetupError, firebaseVerifier } from './firebase.js'
export { AUTH_OPTIONS, authMode, TOKEN_VERIFIER, type AuthOptions, type VerifiedToken, type VerifyIdToken } from './options.js'
