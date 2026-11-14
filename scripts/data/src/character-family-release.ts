// Writes a per-character art family into the local release (P170, P176): the `dialogue-portraits` and `illustrations`
// families each hold one manifest a character, by character id, in an art index map, and the pictures it names. The whole
// family is replaced: every earlier file under its folder and its map go, the characters given are written, and every
// other file and index entry is kept as it is. Deterministic: the same pictures write the same bytes.

import type { ReleaseFile, ReleaseManifest } from '@luismlorenzana/uma-data'
import { readLocalManifest, readVerifiedFile, removeUnlisted, writeLocalManifest, writeReleaseFile } from './release-dir'

export type CharacterFamilyKey = 'dialoguePortraits' | 'illustrations'
export interface CharacterFamilyLayout {
  /** The release folder, `art/dialogue-portraits`. */
  dir: string
  /** The art index map. */
  key: CharacterFamilyKey
  /** The uma-data parser a game reads her manifest with; it must accept what is written. */
  parse: (value: unknown, path: string) => unknown
}
/** A written picture's release path, bytes and SHA-256. */
export type PutPicture = (stem: string, bytes: Uint8Array) => Promise<ReleaseFile>
export interface CharacterFamilyEntry {
  characterId: number
  /** Writes her pictures (WebP) with `put` and returns her manifest. */
  build: (put: PutPicture) => Promise<unknown>
}

export async function writeCharacterFamilyRelease(releaseDir: string, layout: CharacterFamilyLayout, characters: readonly CharacterFamilyEntry[], now?: Date): Promise<ReleaseManifest> {
  const previous = await readLocalManifest(releaseDir)
  if (!previous) throw new Error('No local release; run pnpm data:import first')
  let index: Record<string, unknown> = { atlases: {}, images: {} }
  if (previous.art) {
    const file = previous.files.find((entry) => entry.path === previous.art)!
    index = JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as Record<string, unknown>
  }
  const files: ReleaseFile[] = previous.files.filter((file) => file.path !== previous.art && !file.path.startsWith(`${layout.dir}/`))

  const map: Record<string, string> = {}
  for (const character of [...characters].sort((a, b) => a.characterId - b.characterId)) {
    const put: PutPicture = async (stem, bytes) => {
      const file = await writeReleaseFile(releaseDir, layout.dir, stem, 'webp', bytes)
      files.push(file)
      return file
    }
    const json = JSON.stringify(await character.build(put))
    layout.parse(JSON.parse(json) as unknown, `${layout.dir}/${character.characterId}`)
    const file = await writeReleaseFile(releaseDir, layout.dir, String(character.characterId), 'json', json)
    files.push(file)
    map[String(character.characterId)] = file.path
  }

  const { [layout.key]: _previous, ...rest } = index
  const nextIndex = Object.keys(map).length > 0 ? { ...rest, [layout.key]: map } : rest
  const indexFile = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify(nextIndex))
  files.push(indexFile)
  const manifest = await writeLocalManifest(releaseDir, { sources: previous.sources, sets: previous.sets, art: indexFile.path, files }, now)
  await removeUnlisted(releaseDir, 'data', manifest)
  await removeUnlisted(releaseDir, layout.dir, manifest)
  return manifest
}
