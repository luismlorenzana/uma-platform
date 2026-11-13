// `pnpm enemies:pack` (uma-quest Q16 part A; docs/sprites/enemy-keys.md §7): the owner's enemy boards → master data's
// `enemies` set, and approved enemy keys → its `enemy-keys` family, both into the local release.
//
// - The roster is every unit on the enemy boards of the private tier plan (`content/authoring/tiers/plan.json`), by a
//   numeric id from the private id ledger beside it (`enemy-ids.json`): a unit keeps her id whatever board or rank she
//   moves to, and a new unit takes the next one. Her tier is the board group that casts her (SS, S or A), cascading
//   as the boards do: a boss board, else Key enemies, else Regular enemies.
// - An enemy key is packed when her current revision's set review is approved against its present file hashes
//   (`content/authoring/enemies/keys/reviews.json`), its poses fill her tier's canvas inside a clear border, and a
//   boss's layers re-composite to her battle pose. The PNG masters go to the release as lossless WebP.

import { ENEMY_BORDER, ENEMY_ID_MAX, ENEMY_ID_MIN, ENEMY_TIERS, parseEnemyKey, type Enemy, type EnemyAnchors, type EnemyPoint, type EnemyTier } from '@luismlorenzana/uma-data'
import { clearBorder, decodeRgba, encodeLossless, encodePng, imageDistance, recomposites, type Rgba } from '@uma-platform/data-pipeline/enemy-images'
import { fixtureEnemy, fixtureRosterEntry } from '@uma-platform/data-pipeline/enemy-fixture'
import type { PackedEnemyImage, PackedEnemyKey } from '@uma-platform/data-pipeline/enemy-release'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { atomicJson, content, hash, inside, maybeJson, readJson } from './io.js'
import { gateStatus } from './reviews.js'
import type { Gate } from './types.js'

export const TIER_PLAN = resolve(content, 'authoring/tiers/plan.json')
export const ENEMY_LEDGER = resolve(content, 'authoring/tiers/enemy-ids.json')
export const ENEMY_KEYS = resolve(content, 'authoring/enemies/keys')

// ── The roster ──────────────────────────────────────────────────────────────────────────────────────────────

/** The ranks that cast a unit on an enemy board; B, F and the unranked cascade to the next board. */
export const CAST_RANKS = ['SS', 'S', 'A'] as const

interface PlanUnit { id: string; name: string; franchise: string; tier?: string; order?: number }
export interface TierPlanBoard { id: string; order: PlanUnit[]; unranked?: PlanUnit[] }
export interface TierPlan { boards: TierPlanBoard[] }

/** The enemy group a board belongs to, or null for the other boards (Umas, NPCs). */
export function boardGroup(boardId: string): EnemyTier | null {
  if (boardId.endsWith('-bosses')) return 'boss'
  if (boardId === 'key-enemies') return 'key'
  if (boardId === 'regular-enemies') return 'regular'
  return null
}

export interface EnemyLedger {
  schemaVersion: 1
  /** The next id a new unit takes; it only ever counts up, so an id is never reused. */
  next: number
  /** Each unit's id, by her board key (`al-…`, `gi-…`, …); a unit stays here when she leaves the boards. */
  ids: Record<string, number>
}
export const emptyLedger = (): EnemyLedger => ({ schemaVersion: 1, next: ENEMY_ID_MIN, ids: {} })

/**
 * Every unit on the enemy boards, with her id (new ones assigned in board order: the boss boards as the plan lists
 * them, Key enemies, Regular enemies; each board's ranked order, then its unranked), franchise, tier and name.
 */
export function rosterFromPlan(plan: TierPlan, previous: EnemyLedger): { enemies: Enemy[]; ledger: EnemyLedger; assigned: string[] } {
  const ledger: EnemyLedger = { schemaVersion: 1, next: previous.next, ids: { ...previous.ids } }
  const assigned: string[] = []
  const units = new Map<string, { name: string; franchise: string; cast: Set<EnemyTier> }>()
  for (const board of plan.boards) {
    const group = boardGroup(board.id)
    if (!group) continue
    const ranked = [...board.order].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    for (const unit of [...ranked, ...(board.unranked ?? [])]) {
      let entry = units.get(unit.id)
      if (!entry) {
        entry = { name: unit.name, franchise: unit.franchise, cast: new Set() }
        units.set(unit.id, entry)
      }
      if (unit.tier && (CAST_RANKS as readonly string[]).includes(unit.tier)) entry.cast.add(group)
      if (ledger.ids[unit.id] === undefined) {
        if (ledger.next > ENEMY_ID_MAX) throw new Error(`The enemy id range is used up at ${ENEMY_ID_MAX}`)
        ledger.ids[unit.id] = ledger.next
        ledger.next += 1
        assigned.push(unit.id)
      }
    }
  }
  const enemies = [...units].map(([key, unit]): Enemy => ({
    id: ledger.ids[key]!, franchise: unit.franchise, name: unit.name,
    tier: unit.cast.has('boss') ? 'boss' : unit.cast.has('key') ? 'key' : 'regular',
  }))
  return { enemies: enemies.sort((a, b) => a.id - b.id), ledger, assigned }
}

// ── Approved keys ───────────────────────────────────────────────────────────────────────────────────────────

/** An enemy key's master, `<keys>/<enemyId>/r<n>/key.json`: the release manifest with PNG files for paths. */
export interface MasterEnemyKey {
  enemyId: number
  revision: number
  tier: EnemyTier
  canvas: { width: number; height: number }
  display: { figure: number; envelope?: number }
  poses: Record<string, { file: string; anchors: EnemyAnchors; layers?: { name: string; file: string; pivot: EnemyPoint }[] }>
}
export interface EnemyReviews { schemaVersion: 1; enemies: Record<string, Record<string, { key?: Gate; set?: Gate }>> }

/** Every file of a master: key.json and each pose's and layer's PNG. */
export const masterFiles = (key: MasterEnemyKey): string[] =>
  ['key.json', ...Object.values(key.poses).flatMap((pose) => [pose.file, ...(pose.layers ?? []).map((layer) => layer.file)])]

export interface EnemyCandidate { enemyId: number; dir: string; key: MasterEnemyKey }

/** Every enemy whose current revision's set review is approved against its present files; the rest, with why. */
export async function approvedEnemyKeys(root: string): Promise<{ ready: EnemyCandidate[]; skipped: { enemyId: number; reason: string }[] }> {
  let names: string[] = []
  try {
    names = await readdir(root)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const reviews = await maybeJson<EnemyReviews>(resolve(root, 'reviews.json'), { schemaVersion: 1, enemies: {} })
  const ready: EnemyCandidate[] = []
  const skipped: { enemyId: number; reason: string }[] = []
  for (const enemyId of names.filter((name) => /^\d+$/.test(name)).map(Number).sort((a, b) => a - b)) {
    let revision: number
    try {
      revision = (await readJson<{ revision: number }>(resolve(root, String(enemyId), 'current.json'))).revision
    } catch {
      skipped.push({ enemyId, reason: 'no current revision' })
      continue
    }
    const dir = resolve(root, String(enemyId), `r${revision}`)
    const key = await readJson<MasterEnemyKey>(resolve(dir, 'key.json'))
    if (key.enemyId !== enemyId || key.revision !== revision) throw new Error(`${dir}/key.json is enemy ${key.enemyId} r${key.revision}, not ${enemyId} r${revision}`)
    const state = await gateStatus(dir, reviews.enemies[String(enemyId)]?.[`r${revision}`]?.set, masterFiles(key))
    if (state.approved) ready.push({ enemyId, dir, key })
    else skipped.push({ enemyId, reason: `r${revision}: ${state.changed ? `${state.missing.length} file(s) changed since the set approval (e.g. ${state.missing[0]})` : 'no set approval'}` })
  }
  return { ready, skipped }
}

// ── Packing one key ─────────────────────────────────────────────────────────────────────────────────────────

/** Packs one approved enemy key: every image checked and encoded lossless, checked again decoded. */
export async function packEnemyKey(candidate: EnemyCandidate): Promise<PackedEnemyKey> {
  const { key, dir } = candidate
  const label = `enemy ${key.enemyId} r${key.revision}`
  const image = async (file: string, at: string): Promise<{ rgba: Rgba; packed: PackedEnemyImage }> => {
    const rgba = await decodeRgba(await readFile(await inside(dir, file)))
    if (rgba.width !== key.canvas.width || rgba.height !== key.canvas.height) throw new Error(`${label} ${at} is ${rgba.width}x${rgba.height}, not the ${key.canvas.width}x${key.canvas.height} canvas`)
    if (!clearBorder(rgba, ENEMY_BORDER)) throw new Error(`${label} ${at} reaches into its ${ENEMY_BORDER} px border`)
    const bytes = await encodeLossless(rgba)
    const back = imageDistance(await decodeRgba(bytes), rgba)
    if (back.alpha !== 0 || back.color !== 0) throw new Error(`${label} ${at} doesn't decode to its pixels`)
    return { rgba, packed: { bytes, width: rgba.width, height: rgba.height } }
  }
  const poses: PackedEnemyKey['poses'] = {}
  for (const [name, pose] of Object.entries(key.poses)) {
    const whole = await image(pose.file, name)
    poses[name] = { image: whole.packed, anchors: pose.anchors }
    if (pose.layers) {
      const layers = await Promise.all(pose.layers.map(async (layer) => ({ ...layer, ...(await image(layer.file, `${name}/${layer.name}`)) })))
      const fit = recomposites(layers.map((layer) => layer.rgba), whole.rgba)
      if (!fit.ok) throw new Error(`${label}: the ${name} pose's layers don't re-composite to it (alpha off by ${fit.alpha}, colour by ${fit.color.toFixed(1)} at ${fit.at?.x},${fit.at?.y})`)
      poses[name]!.layers = layers.map((layer) => ({ name: layer.name, pivot: layer.pivot, image: layer.packed }))
    }
  }
  const packed: PackedEnemyKey = { enemyId: key.enemyId, revision: key.revision, tier: key.tier, canvas: key.canvas, display: key.display, poses }
  // The format's rules (tier poses, canvases, anchors, layers) before anything is written, with stand-in paths.
  const stand = (stem: string, img: PackedEnemyImage) => ({ path: `art/enemy-keys/${stem}.webp`, width: img.width, height: img.height })
  parseEnemyKey({ ...packed, poses: Object.fromEntries(Object.entries(poses).map(([name, pose]) => [name, {
    ...stand(name, pose.image), anchors: pose.anchors,
    ...(pose.layers ? { layers: pose.layers.map((layer) => ({ ...stand(`${name}-${layer.name}`, layer.image), name: layer.name, pivot: layer.pivot })) } : {}),
  }])) }, label)
  return packed
}

// ── The test enemy (`--fixture`) ────────────────────────────────────────────────────────────────────────────

/**
 * Writes the code-drawn test boss as an approved master under `root` (a temporary folder), so a dry run packs her
 * through the same approval and checks as a real enemy. Returns her roster entry.
 */
export async function writeFixtureMaster(root: string, tier: EnemyTier = 'boss'): Promise<Enemy> {
  const enemy = fixtureEnemy(tier)
  const dir = resolve(root, String(enemy.enemyId), `r${enemy.revision}`)
  await mkdir(dir, { recursive: true })
  const key: MasterEnemyKey = { enemyId: enemy.enemyId, revision: enemy.revision, tier, canvas: enemy.canvas, display: enemy.display, poses: {} }
  for (const [name, pose] of Object.entries(enemy.poses)) {
    await writeFile(resolve(dir, `${name}.png`), await encodePng(pose.image))
    key.poses[name] = { file: `${name}.png`, anchors: pose.anchors }
    if (pose.layers) {
      key.poses[name]!.layers = []
      for (const layer of pose.layers) {
        await writeFile(resolve(dir, `${name}-${layer.name}.png`), await encodePng(layer.image))
        key.poses[name]!.layers!.push({ name: layer.name, file: `${name}-${layer.name}.png`, pivot: layer.pivot })
      }
    }
  }
  await writeFile(resolve(dir, 'key.json'), JSON.stringify(key, null, 2) + '\n')
  await atomicJson(resolve(root, String(enemy.enemyId), 'current.json'), { revision: enemy.revision })
  const hashes: Record<string, string> = {}
  for (const file of masterFiles(key)) hashes[file] = hash(await readFile(resolve(dir, file)))
  const reviews: EnemyReviews = { schemaVersion: 1, enemies: { [enemy.enemyId]: { [`r${enemy.revision}`]: { set: { decision: 'approved', note: 'the code-drawn test enemy', hashes } } } } }
  await atomicJson(resolve(root, 'reviews.json'), reviews)
  return fixtureRosterEntry(tier, enemy.enemyId)
}

export const isEnemyTier = (value: string): value is EnemyTier => (ENEMY_TIERS as readonly string[]).includes(value)
