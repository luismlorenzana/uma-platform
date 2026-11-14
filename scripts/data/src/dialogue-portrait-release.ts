// Writes the `dialogue-portraits` family into the local release (`pnpm portraits:pack`, uma-farm F75, P170;
// docs/sprites/dialogue-portraits.md): per character her bases and faces (lossless WebP) and one manifest naming them,
// by character id. The art index gains a `dialoguePortraits` map; every other file and index entry is kept as it is.
// Deterministic: the same pictures write the same bytes.

import { parseDialoguePortraits, type DialoguePortraits, type ReleaseFile, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { readLocalManifest, readVerifiedFile, removeUnlisted, writeLocalManifest, writeReleaseFile } from './release-dir'

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
  const previous = await readLocalManifest(releaseDir)
  if (!previous) throw new Error('No local release; run pnpm data:import first')
  let index: Record<string, unknown> = { atlases: {}, images: {} }
  if (previous.art) {
    const file = previous.files.find((entry) => entry.path === previous.art)!
    index = JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as Record<string, unknown>
  }
  const files: ReleaseFile[] = previous.files.filter((file) => file.path !== previous.art && !file.path.startsWith(`${DIALOGUE_PORTRAITS_DIR}/`))

  const dialoguePortraits: Record<string, string> = {}
  for (const packed of [...characters].sort((a, b) => a.characterId - b.characterId)) {
    const write = async (stem: string, img: PackedPortraitImage) => {
      const file = await writeReleaseFile(releaseDir, DIALOGUE_PORTRAITS_DIR, stem, 'webp', img.bytes)
      files.push(file)
      return { path: file.path, width: img.width, height: img.height, bytes: file.bytes, sha256: file.sha256 }
    }
    const out: DialoguePortraits = { characterId: packed.characterId, revision: packed.revision, approvedOn: packed.approvedOn, base: packed.base, faceSize: packed.faceSize, bases: {}, faces: {} }
    for (const name of Object.keys(packed.bases).sort()) out.bases[name] = { ...(await write(`${packed.characterId}-base-${name}`, packed.bases[name]!)), face: packed.bases[name]!.face }
    for (const name of Object.keys(packed.faces).sort()) out.faces[name] = await write(`${packed.characterId}-face-${name}`, packed.faces[name]!)
    const json = JSON.stringify(out)
    parseDialoguePortraits(JSON.parse(json) as unknown, `dialogue-portraits/${packed.characterId}`)
    const file = await writeReleaseFile(releaseDir, DIALOGUE_PORTRAITS_DIR, String(packed.characterId), 'json', json)
    files.push(file)
    dialoguePortraits[String(packed.characterId)] = file.path
  }

  const { dialoguePortraits: _previous, ...rest } = index
  const nextIndex = Object.keys(dialoguePortraits).length > 0 ? { ...rest, dialoguePortraits } : rest
  const indexFile = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify(nextIndex))
  files.push(indexFile)
  const manifest = await writeLocalManifest(releaseDir, { sources: previous.sources, sets: previous.sets, art: indexFile.path, files }, now)
  await removeUnlisted(releaseDir, 'data', manifest)
  await removeUnlisted(releaseDir, DIALOGUE_PORTRAITS_DIR, manifest)
  return manifest
}
