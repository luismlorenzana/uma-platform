// The profile pictures' review copy (uma-farm F88, P180): `pnpm profiles:push` sends each Uma's profile pictures, as the
// master data release ships them, to the platform app's bucket, `art/universes/<universe>/profiles/`, where Uma Character
// Art shows them on her page for the owner's review. This builds that folder's index and file names; the CLI reads the
// release and uploads. The index names each Uma by the universe's id for her, as the portraits index does, never by a game's id.

import type { DialoguePortraits } from '@luismlorenzana/uma-data'

export interface ProfilesIndex {
  schemaVersion: 1
  kind: 'universe-profiles'
  universe: string
  /** The master data release the pictures are from. */
  release: string
  publishedAt: string
  size: number
  characters: { id: string; name: string }[]
  profiles: { id: string; character: string; outfit: string; path: string; bytes: number; sha256: string; width: number; height: number; crop: { left: number; top: number; size: number } }[]
}

/** Each Uma's profiles, in her portraits' outfit order, as files named by their hash and the index that lists them. */
export function buildProfilesIndex(universe: string, release: string, now: string, characters: readonly { key: string; name: string; portraits: DialoguePortraits; outfits: readonly string[] }[]): ProfilesIndex {
  const profiles: ProfilesIndex['profiles'] = [], listed: ProfilesIndex['characters'] = []
  for (const c of characters) {
    const mine = c.outfits.flatMap((outfit) => {
      const p = c.portraits.bases[outfit]?.profile
      if (!p) return []
      const id = `${c.key}-${outfit}`
      return [{ id, character: c.key, outfit, path: `profiles/${id}.${p.sha256.slice(0, 16)}.webp`, bytes: p.bytes, sha256: p.sha256, width: p.width, height: p.height, crop: p.crop }]
    })
    if (mine.length === 0) continue
    listed.push({ id: c.key, name: c.name })
    profiles.push(...mine)
  }
  return { schemaVersion: 1, kind: 'universe-profiles', universe, release, publishedAt: now, size: profiles[0]?.width ?? 0, characters: listed, profiles }
}
