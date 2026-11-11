// One authenticated content client for the master data release, through platform-api's /api/master proxy (uma-kit's
// content loader, as uma-quest wires it at 47ca16d).
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient } from '@luismlorenzana/uma-kit/content'
import { FIREBASE } from '../app/firebase-config'

export const CONTENT = createContentClient({ token: () => idToken(FIREBASE), cacheName: 'platform-master' })
