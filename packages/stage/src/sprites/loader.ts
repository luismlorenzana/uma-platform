// Loading a traveler's sprite set (Q6, CR18, N5): by outfit id from master data's `outfit-sprites` family through
// uma-data's client (hash-checked), each page's verified bytes decoded into an image for the GPU. The service worker caches
// the hash-named files, so a set downloads once (CacheFirst on /api/master/files/).
import type { ArtIndex, ReleaseClient, ReleaseManifest, SpriteSet } from '@luismlorenzana/uma-data'


export interface LoadedSet<Img> {
  set: SpriteSet
  pages: Img[]
  /** Each page's bytes, by file name, for a measured play. */
  bytes: Record<string, number>
}

export type Decode<Img> = (bytes: Uint8Array, type: string) => Promise<Img>

/** A set and its decoded pages, or null when this release has none for the outfit. */
export async function loadSpriteSet<Img>(client: Pick<ReleaseClient, 'spriteSet' | 'file'>, manifest: ReleaseManifest, art: ArtIndex,
  outfitId: number, decode: Decode<Img>): Promise<LoadedSet<Img> | null> {
  const set = await client.spriteSet(manifest, art, outfitId)
  if (!set) return null
  const bytes: Record<string, number> = {}
  const pages = await Promise.all(set.pages.map(async (page) => {
    const data = await client.file(manifest, page.path)
    bytes[page.path.split('/').pop()!] = data.byteLength
    return decode(data, page.path.endsWith('.png') ? 'image/png' : 'image/webp')
  }))
  return { set, pages, bytes }
}

/** The browser's decode: verified bytes into a decoded image. */
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
