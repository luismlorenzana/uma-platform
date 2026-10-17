// @luismlorenzana/uma-kit/auth: Google sign-in through Firebase, loaded on demand (uma-platform SD2). Importing it never
// loads `firebase`; the game passes its config.
export { firebaseEnabled, idToken, loadAuth, signIn, signOut, type FirebaseConfig } from './firebase.js'
export { AuthProvider, LOCAL_USER, useAuth, type AuthState, type AuthUser } from './AuthProvider.js'
