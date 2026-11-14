// `pnpm release:publish -- --portraits-only` and/or `--illustrations-only` (uma-farm F75 and F84; P170, P176): a release
// that is the published `latest` plus the local release's per-character families (`pnpm portraits:pack`,
// `pnpm illustrations:pack`). Every file of `latest` is carried byte for byte except its art index, which is replaced by
// the same index with each family's map merged in; the sets never change. Earlier characters stay unless a newer pack
// replaces them. A GameTora refresh, a sprite set or an enemy key in the local release never rides along, and older
// uma-data clients ignore the maps, so the games stay pinned where they are.

import { dialoguePortraitPaths, illustrationPaths, parseArtIndex, parseDialoguePortraits, parseIllustrations, type ReleaseFile, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { resolve } from 'node:path'
import type { CharacterFamilyKey } from './character-family-release'
import type { ReleaseStorageClient } from './publish'
import { readLocalManifest, readVerifiedFile } from './release-dir'
import { composeOnBase, remoteBase } from './sprites-only'

interface CharacterFamily {
  /** What a person calls it. */
  name: string
  /** The command that packs it into the local release. */
  pack: string
  /** Her manifest read as a game reads it: her id, every picture it names, and a line about it. */
  read: (value: unknown, path: string) => { characterId: number; pictures: string[]; summary: string }
}
export const CHARACTER_FAMILIES: Record<CharacterFamilyKey, CharacterFamily> = {
  dialoguePortraits: {
    name: 'dialogue portraits', pack: 'pnpm portraits:pack',
    read: (value, path) => {
      const p = parseDialoguePortraits(value, path)
      return { characterId: p.characterId, pictures: dialoguePortraitPaths(p), summary: `${p.characterId} r${p.revision} (${Object.keys(p.bases).length} bases, ${Object.keys(p.faces).length} faces)` }
    },
  },
  illustrations: {
    name: 'illustrations', pack: 'pnpm illustrations:pack',
    read: (value, path) => {
      const i = parseIllustrations(value, path)
      return { characterId: i.characterId, pictures: illustrationPaths(i), summary: `${i.characterId} (${i.scenes.length} scenes: ${i.scenes.map((s) => s.moment).join(', ')})` }
    },
  },
}

export interface CharacterFamiliesOnlyPlan {
  base: ReleaseManifest
  manifest: ReleaseManifest
  manifestPath: string
  localPaths: Map<string, string>
  /** Per family, the characters this release adds or replaces. */
  added: Partial<Record<CharacterFamilyKey, { characterId: number; summary: string }[]>>
  /** Per family, every character the new release's map lists, by id. */
  maps: Partial<Record<CharacterFamilyKey, Record<string, string>>>
  /** The bytes of the files it adds, the new art index aside. */
  addedBytes: number
}

export interface PlanCharacterFamiliesOnlyOptions {
  /** The local release holding the families. */
  releaseDir: string
  storage: ReleaseStorageClient
  families: readonly CharacterFamilyKey[]
  /** An empty folder for the new manifest and art index. */
  stagingDir: string
  from?: string
  now?: () => Date
}

export async function planCharacterFamiliesOnly(options: PlanCharacterFamiliesOnlyOptions): Promise<CharacterFamiliesOnlyPlan> {
  if (options.families.length === 0) throw new Error('Name a family: --portraits-only, --illustrations-only')
  const { manifest: base, index: baseIndex } = await remoteBase(options.storage, options.from ?? 'latest')
  const local = await readLocalManifest(options.releaseDir)
  const first = CHARACTER_FAMILIES[options.families[0]!]
  if (!local?.art) throw new Error(`The local release has no art index; run ${first.pack} first`)

  const byPath = new Map(local.files.map((file) => [file.path, file]))
  const localPaths = new Map<string, string>()
  const files: ReleaseFile[] = []
  const take = async (path: string): Promise<Buffer> => {
    const file = byPath.get(path)
    if (!file) throw new Error(`The local manifest doesn't list ${path}`)
    const bytes = await readVerifiedFile(options.releaseDir, file)
    localPaths.set(path, resolve(options.releaseDir, ...path.split('/')))
    if (!files.some((f) => f.path === path)) files.push(file)
    return bytes
  }
  const json = (bytes: Buffer) => JSON.parse(bytes.toString('utf8')) as unknown
  const localIndex = parseArtIndex(json(await readVerifiedFile(options.releaseDir, byPath.get(local.art)!)), local.art)
  const nextIndex: Record<string, unknown> = { ...baseIndex }
  const added: CharacterFamiliesOnlyPlan['added'] = {}, maps: CharacterFamiliesOnlyPlan['maps'] = {}
  for (const key of options.families) {
    const family = CHARACTER_FAMILIES[key]
    const localMap = localIndex[key] ?? {}
    if (Object.keys(localMap).length === 0) throw new Error(`The local release has no ${family.name}; run ${family.pack} first`)
    added[key] = []
    for (const [id, path] of Object.entries(localMap)) {
      const read = family.read(json(await take(path)), path)
      if (String(read.characterId) !== id) throw new Error(`${path} holds ${read.characterId}, not ${id}`)
      for (const picture of read.pictures) await take(picture)
      added[key].push({ characterId: read.characterId, summary: read.summary })
    }
    const merged = { ...((baseIndex[key] as Record<string, string> | undefined) ?? {}), ...localMap }
    maps[key] = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => Number(a) - Number(b)))
    nextIndex[key] = maps[key]
  }

  const composed = await composeOnBase({ base, nextIndex, added: files, localPaths, stagingDir: options.stagingDir, now: options.now ?? (() => new Date()) })
  const listed = new Set(composed.manifest.files.map((file) => file.path))
  for (const map of Object.values(maps)) for (const path of Object.values(map)) if (!listed.has(path)) throw new Error(`${path} is in an art index map but not in the release`)
  const basePaths = new Set(base.files.map((file) => file.path))
  const addedBytes = files.filter((file) => !basePaths.has(file.path)).reduce((sum, file) => sum + file.bytes, 0)
  return { base, ...composed, localPaths, added, maps, addedBytes }
}
