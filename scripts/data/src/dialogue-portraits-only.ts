// `pnpm release:publish -- --portraits-only` (uma-farm F75, P170): a release that is the published `latest` plus the local
// release's `dialogue-portraits` family (`pnpm portraits:pack`). Every file of `latest` is carried byte for byte except
// its art index, which is replaced by the same index with a `dialoguePortraits` map; the sets never change. Earlier
// characters stay unless a newer pack replaces them. A GameTora refresh, a sprite set or an enemy key in the local release
// never rides along, and older uma-data clients ignore the map, so the games stay pinned where they are.

import { dialoguePortraitPaths, parseArtIndex, parseDialoguePortraits, type DialoguePortraits, type ReleaseFile, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { resolve } from 'node:path'
import type { ReleaseStorageClient } from './publish'
import { readLocalManifest, readVerifiedFile } from './release-dir'
import { composeOnBase, remoteBase } from './sprites-only'

export interface DialoguePortraitsOnlyPlan {
  base: ReleaseManifest
  manifest: ReleaseManifest
  manifestPath: string
  localPaths: Map<string, string>
  /** The characters this release adds or replaces. */
  added: DialoguePortraits[]
  /** Every character the new release's `dialoguePortraits` map lists, by id. */
  dialoguePortraits: Record<string, string>
  /** The bytes of the files it adds, the new art index aside. */
  addedBytes: number
}

export interface PlanDialoguePortraitsOnlyOptions {
  /** The local release holding the family (`pnpm portraits:pack`). */
  releaseDir: string
  storage: ReleaseStorageClient
  /** An empty folder for the new manifest and art index. */
  stagingDir: string
  from?: string
  now?: () => Date
}

export async function planDialoguePortraitsOnly(options: PlanDialoguePortraitsOnlyOptions): Promise<DialoguePortraitsOnlyPlan> {
  const { manifest: base, index: baseIndex } = await remoteBase(options.storage, options.from ?? 'latest')
  const local = await readLocalManifest(options.releaseDir)
  if (!local?.art) throw new Error('The local release has no art index; run pnpm portraits:pack first')

  const byPath = new Map(local.files.map((file) => [file.path, file]))
  const localPaths = new Map<string, string>()
  const files: ReleaseFile[] = []
  const take = async (path: string): Promise<Buffer> => {
    const file = byPath.get(path)
    if (!file) throw new Error(`The local manifest doesn't list ${path}`)
    const bytes = await readVerifiedFile(options.releaseDir, file)
    localPaths.set(path, resolve(options.releaseDir, ...path.split('/')))
    files.push(file)
    return bytes
  }
  const json = (bytes: Buffer) => JSON.parse(bytes.toString('utf8')) as unknown
  const localPortraits = parseArtIndex(json(await readVerifiedFile(options.releaseDir, byPath.get(local.art)!)), local.art).dialoguePortraits ?? {}
  if (Object.keys(localPortraits).length === 0) throw new Error('The local release has no dialogue portraits; run pnpm portraits:pack first')
  const added: DialoguePortraits[] = []
  for (const [key, path] of Object.entries(localPortraits)) {
    const portraits = parseDialoguePortraits(json(await take(path)), path)
    if (String(portraits.characterId) !== key) throw new Error(`${path} holds ${portraits.characterId}, not ${key}`)
    for (const image of dialoguePortraitPaths(portraits)) await take(image)
    added.push(portraits)
  }

  const merged = { ...((baseIndex.dialoguePortraits as Record<string, string> | undefined) ?? {}), ...localPortraits }
  const dialoguePortraits = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => Number(a) - Number(b)))
  const composed = await composeOnBase({ base, nextIndex: { ...baseIndex, dialoguePortraits }, added: files, localPaths, stagingDir: options.stagingDir, now: options.now ?? (() => new Date()) })
  const listed = new Set(composed.manifest.files.map((file) => file.path))
  for (const path of Object.values(dialoguePortraits)) if (!listed.has(path)) throw new Error(`${path} is in the dialoguePortraits map but not in the release`)
  const basePaths = new Set(base.files.map((file) => file.path))
  const addedBytes = files.filter((file) => !basePaths.has(file.path)).reduce((sum, file) => sum + file.bytes, 0)
  return { base, ...composed, localPaths, added, dialoguePortraits, addedBytes }
}
