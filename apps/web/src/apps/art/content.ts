// Character Art's sources: master data through the app's shared content client (/api/master), and, through this sub-app's
// own pack route, uma-quest's adult key pack, read only (/api/art/content/traveler-keys/…) and the published universe
// looks (/api/art/content/universes/…, CA4), each file hash-checked and kept on the device. The key sets stay loaded a minute after they leave the screen (copied from uma-quest's
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

const lookUrls = new Map<string, Promise<string>>()
/** A universe look's PNG (CA4) from the art pack route, checked against its hash, as an object URL kept for the visit. */
export function lookUrl(look: { path: string; bytes: number; sha256: string }): Promise<string> {
  let url = lookUrls.get(look.path)
  if (!url) {
    url = KEYS.pack(look.path, { path: look.path, bytes: look.bytes, sha256: look.sha256 }).then((b) => URL.createObjectURL(new Blob([b as BlobPart], { type: 'image/png' })))
    url.catch(() => lookUrls.delete(look.path))
    lookUrls.set(look.path, url)
  }
  return url
}

export const KEY_SETS = new SetCache<LoadedKeys<HTMLImageElement> | null>((id) => loadKeySet(KEYS, id, decodeImage), () => undefined)
