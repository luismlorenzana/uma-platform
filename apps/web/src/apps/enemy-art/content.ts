// Uma Enemy Art's pictures (EA1): each published PNG through this sub-app's own pack route
// (`/api/enemy-art/content/<game>/images/…`), checked against its hash and kept on the device, as Character Art reads its
// universe looks.
import { idToken } from '@luismlorenzana/uma-kit/auth'
import { createContentClient } from '@luismlorenzana/uma-kit/content'
import { FIREBASE } from '../../app/firebase-config'

export const ENEMIES = createContentClient({ base: '/api/enemy-art', token: () => idToken(FIREBASE), cacheName: 'platform-enemy-art' })

const urls = new Map<string, Promise<string>>()
/** A look's PNG as an object URL, kept for the visit. */
export function lookUrl(look: { path: string; bytes: number; sha256: string }): Promise<string> {
  let url = urls.get(look.path)
  if (!url) {
    url = ENEMIES.pack(look.path, { path: look.path, bytes: look.bytes, sha256: look.sha256 }).then((b) => URL.createObjectURL(new Blob([b as BlobPart], { type: 'image/png' })))
    url.catch(() => urls.delete(look.path))
    urls.set(look.path, url)
  }
  return url
}
