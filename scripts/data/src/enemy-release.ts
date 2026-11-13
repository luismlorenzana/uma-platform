// Writes the `enemies` set and the `enemy-keys` family into the local release (`pnpm enemies:pack`, uma-quest Q16
// part A; docs/sprites/enemy-keys.md): one set file of every unit on the enemy boards, and per packed enemy her pose
// images (lossless WebP) and one manifest naming them. The art index gains an `enemyKeys` map; every other file and
// index entry is kept as it is. Deterministic: the same roster and images write the same bytes.

import {
  parseEnemyKey,
  parseOptionalSet,
  type Enemy,
  type EnemyAnchors,
  type EnemyKey,
  type EnemyPoint,
  type ReleaseFile,
  type ReleaseManifest,
} from '@luismlorenzana/uma-data'
import { readLocalManifest, readVerifiedFile, removeUnlisted, writeLocalManifest, writeReleaseFile } from './release-dir'

export const ENEMY_KEYS_DIR = 'art/enemy-keys'

export interface PackedEnemyImage { bytes: Uint8Array; width: number; height: number }
export interface PackedEnemyPose {
  image: PackedEnemyImage
  anchors: EnemyAnchors
  layers?: { name: string; pivot: EnemyPoint; image: PackedEnemyImage }[]
}
/** An enemy key with its images still as bytes: their release paths depend on them. */
export interface PackedEnemyKey extends Omit<EnemyKey, 'poses'> {
  poses: Record<string, PackedEnemyPose>
}

/** The exact bytes of the enemies set: `{ set, items }` sorted by id. */
export function serializeEnemies(enemies: readonly Enemy[]): string {
  const items = [...enemies].sort((a, b) => a.id - b.id).map(({ id, franchise, tier, name }) => ({ id, franchise, tier, name }))
  const json = JSON.stringify({ set: 'enemies', items })
  // The published parser must accept the set before it's written.
  parseOptionalSet('enemies', JSON.parse(json) as unknown)
  return json
}

export async function writeEnemyRelease(releaseDir: string, enemies: readonly Enemy[], keys: readonly PackedEnemyKey[], now?: Date): Promise<ReleaseManifest> {
  const previous = await readLocalManifest(releaseDir)
  if (!previous) throw new Error('No local release; run pnpm data:import first')
  let index: Record<string, unknown> = { atlases: {}, images: {} }
  if (previous.art) {
    const file = previous.files.find((entry) => entry.path === previous.art)!
    index = JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as Record<string, unknown>
  }
  const files: ReleaseFile[] = previous.files.filter((file) =>
    file.path !== previous.art && file.path !== previous.sets.enemies && !file.path.startsWith(`${ENEMY_KEYS_DIR}/`))

  const setFile = await writeReleaseFile(releaseDir, 'data', 'enemies', 'json', serializeEnemies(enemies))
  files.push(setFile)

  const enemyKeys: Record<string, string> = {}
  for (const packed of [...keys].sort((a, b) => a.enemyId - b.enemyId)) {
    const image = async (stem: string, img: PackedEnemyImage) => {
      const file = await writeReleaseFile(releaseDir, ENEMY_KEYS_DIR, stem, 'webp', img.bytes)
      files.push(file)
      return { path: file.path, width: img.width, height: img.height }
    }
    const poses: EnemyKey['poses'] = {}
    for (const [name, pose] of Object.entries(packed.poses)) {
      const out: EnemyKey['poses'][string] = { ...(await image(`${packed.enemyId}-${name}`, pose.image)), anchors: pose.anchors }
      if (pose.layers) {
        out.layers = []
        for (const layer of pose.layers) out.layers.push({ ...(await image(`${packed.enemyId}-${name}-${layer.name}`, layer.image)), name: layer.name, pivot: layer.pivot })
      }
      poses[name] = out
    }
    const key: EnemyKey = { enemyId: packed.enemyId, revision: packed.revision, tier: packed.tier, canvas: packed.canvas, display: packed.display, poses }
    const json = JSON.stringify(key)
    parseEnemyKey(JSON.parse(json) as unknown, `enemy-keys/${packed.enemyId}`)
    const file = await writeReleaseFile(releaseDir, ENEMY_KEYS_DIR, String(packed.enemyId), 'json', json)
    files.push(file)
    enemyKeys[String(packed.enemyId)] = file.path
  }

  const { enemyKeys: _previousKeys, ...rest } = index
  const nextIndex = Object.keys(enemyKeys).length > 0 ? { ...rest, enemyKeys } : rest
  const indexFile = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify(nextIndex))
  files.push(indexFile)
  const manifest = await writeLocalManifest(releaseDir,
    { sources: previous.sources, sets: { ...previous.sets, enemies: setFile.path }, art: indexFile.path, files }, now)
  await removeUnlisted(releaseDir, 'data', manifest)
  await removeUnlisted(releaseDir, ENEMY_KEYS_DIR, manifest)
  return manifest
}
