// Published universe pictures from this sub-app's authenticated pack route, hash-checked and held for the visit.
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient } from '@luismlorenzana/uma-kit/content'
import { FIREBASE } from '../../app/firebase-config'

// Keep the existing cache so already-downloaded universe pictures remain available.
const PICTURES = createContentClient({ base: '/api/art', token: () => idToken(FIREBASE), cacheName: 'platform-art-keys' })

const lookUrls = new Map<string, Promise<string>>()
/** A universe look's PNG (CA4), or a profile picture's WebP (P180), from the art pack route, checked against its hash, as an object URL kept for the visit. */
export function lookUrl(look: { path: string; bytes: number; sha256: string }): Promise<string> {
  let url = lookUrls.get(look.path)
  if (!url) {
    const type = look.path.endsWith('.webp') ? 'image/webp' : 'image/png'
    url = PICTURES.pack(look.path, { path: look.path, bytes: look.bytes, sha256: look.sha256 }).then((b) => URL.createObjectURL(new Blob([b as BlobPart], { type })))
    url.catch(() => lookUrls.delete(look.path))
    lookUrls.set(look.path, url)
  }
  return url
}
