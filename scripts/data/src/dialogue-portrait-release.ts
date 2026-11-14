// Writes the `dialogue-portraits` family into the local release (`pnpm portraits:pack`, uma-farm F75, P170;
// docs/sprites/dialogue-portraits.md): per character her bases and faces (lossless WebP) and one manifest naming them,
// by character id. The art index gains a `dialoguePortraits` map; every other file and index entry is kept as it is.
// Deterministic: the same pictures write the same bytes.

import { parseDialoguePortraits, type DialoguePortraits, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { writeCharacterFamilyRelease, type PutPicture } from './character-family-release'

export const DIALOGUE_PORTRAITS_DIR = 'art/dialogue-portraits'

export interface PackedPortraitImage { bytes: Uint8Array; width: number; height: number }
/** A character's portraits with their pictures still as bytes: their release paths depend on them. */
export interface PackedDialoguePortraits {
  characterId: number
  revision: number
  approvedOn: string
  base: { width: number; height: number }
  faceSize: { width: number; height: number }
  bases: Record<string, PackedPortraitImage & { face: { left: number; top: number } }>
  faces: Record<string, PackedPortraitImage>
}

export async function writeDialoguePortraitRelease(releaseDir: string, characters: readonly PackedDialoguePortraits[], now?: Date): Promise<ReleaseManifest> {
  return writeCharacterFamilyRelease(releaseDir, { dir: DIALOGUE_PORTRAITS_DIR, key: 'dialoguePortraits', parse: parseDialoguePortraits }, characters.map((packed) => ({
    characterId: packed.characterId,
    build: async (put: PutPicture) => {
      const write = async (stem: string, img: PackedPortraitImage) => {
        const file = await put(stem, img.bytes)
        return { path: file.path, width: img.width, height: img.height, bytes: file.bytes, sha256: file.sha256 }
      }
      const out: DialoguePortraits = { characterId: packed.characterId, revision: packed.revision, approvedOn: packed.approvedOn, base: packed.base, faceSize: packed.faceSize, bases: {}, faces: {} }
      for (const name of Object.keys(packed.bases).sort()) out.bases[name] = { ...(await write(`${packed.characterId}-base-${name}`, packed.bases[name]!)), face: packed.bases[name]!.face }
      for (const name of Object.keys(packed.faces).sort()) out.faces[name] = await write(`${packed.characterId}-face-${name}`, packed.faces[name]!)
      return out
    },
  })), now)
}
