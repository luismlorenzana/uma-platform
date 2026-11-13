// `pnpm release:publish -- --enemies-only` (uma-quest Q16 part A): a release that is the published `latest` plus the
// local release's `enemies` set and `enemy-keys` family (`pnpm enemies:pack`). Every file of `latest` is carried byte
// for byte except its art index, which is replaced by the same index with an `enemyKeys` map, and the manifest's sets
// gain or replace `enemies` only. A GameTora refresh or a sprite set in the local release never rides along. Older
// uma-data clients ignore both, so the games stay pinned where they are.

import {
  enemyKeyPaths,
  parseArtIndex,
  parseEnemyKey,
  parseOptionalSet,
  type Enemy,
  type EnemyKey,
  type ReleaseFile,
  type ReleaseManifest,
} from '@luismlorenzana/uma-data'
import { resolve } from 'node:path'
import type { ReleaseStorageClient } from './publish'
import { readLocalManifest, readVerifiedFile } from './release-dir'
import { composeOnBase, remoteBase } from './sprites-only'

export interface EnemiesOnlyPlan {
  base: ReleaseManifest
  manifest: ReleaseManifest
  manifestPath: string
  localPaths: Map<string, string>
  /** The roster this release carries. */
  enemies: Enemy[]
  /** The enemy keys this release adds or replaces. */
  added: EnemyKey[]
  /** Every enemy the new release's `enemyKeys` map lists, by id. */
  enemyKeys: Record<string, string>
  /** Enemy keys whose enemy isn't in the roster (a unit taken off every board after her art was published). */
  unlisted: number[]
}

export interface PlanEnemiesOnlyOptions {
  /** The local release holding the enemies set and family (`pnpm enemies:pack`). */
  releaseDir: string
  storage: ReleaseStorageClient
  /** An empty folder for the new manifest and art index. */
  stagingDir: string
  from?: string
  now?: () => Date
}

export async function planEnemiesOnly(options: PlanEnemiesOnlyOptions): Promise<EnemiesOnlyPlan> {
  const { manifest: base, index: baseIndex } = await remoteBase(options.storage, options.from ?? 'latest')
  const local = await readLocalManifest(options.releaseDir)
  if (!local?.sets.enemies) throw new Error('The local release has no enemies set; run pnpm enemies:pack first')

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
  const enemies = parseOptionalSet('enemies', json(await take(local.sets.enemies)))

  let localKeys: Record<string, string> = {}
  if (local.art) {
    const indexFile = byPath.get(local.art)!
    localKeys = parseArtIndex(json(await readVerifiedFile(options.releaseDir, indexFile)), local.art).enemyKeys ?? {}
  }
  const added: EnemyKey[] = []
  for (const [enemyId, path] of Object.entries(localKeys)) {
    const key = parseEnemyKey(json(await take(path)), path)
    if (String(key.enemyId) !== enemyId) throw new Error(`${path} holds enemy ${key.enemyId}, not ${enemyId}`)
    for (const image of enemyKeyPaths(key)) await take(image)
    added.push(key)
  }

  // The published index, untouched except for its `enemyKeys` map: earlier keys stay unless a newer one replaces them.
  const merged = { ...((baseIndex.enemyKeys as Record<string, string> | undefined) ?? {}), ...localKeys }
  const enemyKeys = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => Number(a) - Number(b)))
  const nextIndex = Object.keys(enemyKeys).length > 0 ? { ...baseIndex, enemyKeys } : baseIndex
  const composed = await composeOnBase({
    base, nextIndex, added: files, localPaths, stagingDir: options.stagingDir, now: options.now ?? (() => new Date()),
    sets: { ...base.sets, enemies: local.sets.enemies },
  })
  const listed = new Set(composed.manifest.files.map((file) => file.path))
  for (const path of Object.values(enemyKeys)) if (!listed.has(path)) throw new Error(`${path} is in the enemyKeys map but not in the release`)
  const roster = new Set(enemies.map((enemy) => enemy.id))
  const unlisted = Object.keys(enemyKeys).map(Number).filter((id) => !roster.has(id))
  return { base, ...composed, localPaths, enemies, added, enemyKeys, unlisted }
}
