// Character Art's two sources: master data through the app's shared content client (/api/master), and uma-quest's
// adult key pack, read only, through this sub-app's own route (/api/art/content/traveler-keys/…), each file hash-checked
// and kept on the device. The key sets stay loaded a minute after they leave the screen (copied from uma-quest's
// keySets.ts and loader.ts at 6c572e6).
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient } from '@luismlorenzana/uma-kit/content'
import { FIREBASE } from '../../app/firebase-config'
import { SetCache } from './cache'
import { loadKeySet, type LoadedKeys } from './keys'

export const KEYS = createContentClient({ base: '/api/art', token: () => idToken(FIREBASE), cacheName: 'platform-art-keys' })

export async function decodeImage(bytes: Uint8Array, type: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const KEY_SETS = new SetCache<LoadedKeys<HTMLImageElement> | null>((id) => loadKeySet(KEYS, id, decodeImage), () => undefined)
