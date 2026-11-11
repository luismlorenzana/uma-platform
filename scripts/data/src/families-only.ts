// `pnpm release:publish -- --add-families=<family,…>` (P137): a release that is the published `latest` plus image
// families it doesn't have yet, taken from the local release. Every file of `latest` is carried byte for byte except its
// art index, which is replaced by the same index with the new families added. Only additions: a family `latest`
// already holds is refused, so a GameTora refresh of a published family never rides along, and nothing a game reads
// moves. Older uma-data parsers skip a family they don't know, so the games stay pinned where they are.

import { IMAGE_FAMILIES, parseArtIndex, type ReleaseFile, type ReleaseManifest } from '@luismlorenzana/uma-data'
import { resolve } from 'node:path'
import type { ReleaseStorageClient } from './publish'
import { readLocalManifest, readVerifiedFile } from './release-dir'
import { composeOnBase, remoteBase } from './sprites-only'

export interface FamiliesOnlyPlan {
  base: ReleaseManifest
  manifest: ReleaseManifest
  manifestPath: string
  localPaths: Map<string, string>
  /** Each added family and how many images it holds. */
  added: Record<string, number>
  /** The bytes of the files it adds, the new art index aside. */
  addedBytes: number
}

export interface PlanFamiliesOnlyOptions {
  /** The local release holding the families (`pnpm assets:import -- --families=…`). */
  releaseDir: string
  storage: ReleaseStorageClient
  /** The image families to add. */
  families: readonly string[]
  /** An empty folder for the new manifest and art index. */
  stagingDir: string
  from?: string
  now?: () => Date
}

export async function planFamiliesOnly(options: PlanFamiliesOnlyOptions): Promise<FamiliesOnlyPlan> {
  if (options.families.length === 0) throw new Error('Name the families to add, e.g. --add-families=outfit-renders')
  const unknown = options.families.filter((family) => !(IMAGE_FAMILIES as readonly string[]).includes(family))
  if (unknown.length > 0) throw new Error(`Not an image family: ${unknown.join(', ')} (any of: ${IMAGE_FAMILIES.join(', ')})`)
  const { manifest: base, index: baseIndex } = await remoteBase(options.storage, options.from ?? 'latest')
  const baseImages = (baseIndex.images ?? {}) as Record<string, unknown>
  const present = options.families.filter((family) => family in baseImages)
  if (present.length > 0) throw new Error(`latest already has ${present.join(', ')}; this release only adds families`)

  const local = await readLocalManifest(options.releaseDir)
  if (!local?.art) throw new Error('The local release has no art index; run pnpm assets:import first')
  const localIndexFile = local.files.find((file) => file.path === local.art)!
  const localIndex = parseArtIndex(JSON.parse((await readVerifiedFile(options.releaseDir, localIndexFile)).toString('utf8')) as unknown, local.art)
  const byPath = new Map(local.files.map((file) => [file.path, file]))
  const localPaths = new Map<string, string>()
  const files: ReleaseFile[] = []
  const images: Record<string, unknown> = { ...baseImages }
  const added: Record<string, number> = {}
  for (const family of options.families) {
    const entries = localIndex.images[family as keyof typeof localIndex.images]
    if (!entries || Object.keys(entries).length === 0) throw new Error(`The local release has no ${family}; run pnpm assets:import -- --families=${family}`)
    for (const image of Object.values(entries)) {
      const file = byPath.get(image.path)
      if (!file) throw new Error(`The local manifest doesn't list ${image.path}`)
      await readVerifiedFile(options.releaseDir, file)
      localPaths.set(image.path, resolve(options.releaseDir, ...image.path.split('/')))
      files.push(file)
    }
    images[family] = entries
    added[family] = Object.keys(entries).length
  }

  const composed = await composeOnBase({
    base, nextIndex: { ...baseIndex, images }, added: files, localPaths, stagingDir: options.stagingDir, now: options.now ?? (() => new Date()),
  })
  return { base, ...composed, localPaths, added, addedBytes: files.reduce((sum, file) => sum + file.bytes, 0) }
}
