// Writes the `illustrations` family into the local release (`pnpm illustrations:pack`, uma-farm F84, P176;
// docs/sprites/illustrations.md): per character her scenes (WebP) and one manifest naming them in order, by character
// id. The art index gains an `illustrations` map; every other file and index entry is kept as it is. Deterministic: the
// same pictures write the same bytes.

import { parseIllustrations, type Illustrations, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { writeCharacterFamilyRelease } from './character-family-release'

export const ILLUSTRATIONS_DIR = 'art/illustrations'

/** A character's illustrations with their pictures still as bytes: their release paths depend on them. */
export interface PackedIllustrations {
  characterId: number
  universe: string
  scenes: { id: string; title: string; outfit: string; moment: string; approvedOn: string; bytes: Uint8Array; width: number; height: number }[]
}

export async function writeIllustrationRelease(releaseDir: string, characters: readonly PackedIllustrations[], now?: Date): Promise<ReleaseManifest> {
  return writeCharacterFamilyRelease(releaseDir, { dir: ILLUSTRATIONS_DIR, key: 'illustrations', parse: parseIllustrations }, characters.map((packed) => ({
    characterId: packed.characterId,
    build: async (put) => {
      const out: Illustrations = { characterId: packed.characterId, universe: packed.universe, scenes: [] }
      for (const s of packed.scenes) {
        const file = await put(`${packed.characterId}-${s.id}`, s.bytes)
        out.scenes.push({ id: s.id, title: s.title, outfit: s.outfit, moment: s.moment, approvedOn: s.approvedOn, path: file.path, width: s.width, height: s.height, bytes: file.bytes, sha256: file.sha256 })
      }
      return out
    },
  })), now)
}
