// The `enemy-keys` family (uma-quest Q16 part A; docs/sprites/enemy-keys.md): an enemy's key poses, one image a pose on
// her tier's canvas, a boss's battle pose also split into layers that re-composite to it exactly, with each pose's
// anchors and her display targets. One manifest file an enemy, by enemy id, in the art index's `enemyKeys` map; the
// images are lossless WebP. Facing right, never mirrored; effects never baked in.

import { arrayOf, fail, fields, finite, id, oneOf, optional, positiveInteger, recordOf, text, type Parser } from './parse.js'
import { ENEMY_ID_MAX, ENEMY_ID_MIN, ENEMY_TIERS, type EnemyTier } from './sets/enemies.js'

/** Every pose a tier may have, required first; the rest are optional (the format's `+`). */
export const ENEMY_POSES: Readonly<Record<EnemyTier, { required: readonly string[]; optional: readonly string[] }>> = {
  regular: { required: ['battle'], optional: ['break'] },
  key: { required: ['battle', 'action'], optional: ['break'] },
  boss: { required: ['battle', 'attack', 'skill', 'break'], optional: ['phase'] },
}
/** Each tier's canvas: every pose of an enemy is drawn on it. A boss may widen hers up to 1024 × 1024 for wide rigging. */
export const ENEMY_CANVAS: Readonly<Record<EnemyTier, { width: number; height: number; max?: number }>> = {
  regular: { width: 512, height: 768 },
  key: { width: 640, height: 768 },
  boss: { width: 768, height: 768, max: 1024 },
}
/** A boss's battle pose in 3–5 named layers, back to front. */
export const BOSS_LAYERS = { min: 3, max: 5, names: ['rear', 'behind', 'body', 'front', 'over'] } as const
/** The clear transparent border every pose keeps, in pixels. */
export const ENEMY_BORDER = 8

export interface EnemyPoint { x: number; y: number }
export interface EnemyAnchors {
  /** Where she stands; a floating figure has `hover` instead. */
  foot?: EnemyPoint
  hover?: EnemyPoint
  /** Where hits land and her face is (a bubble, a flash). */
  hit: EnemyPoint
  face: EnemyPoint
  /** Where a cast or a shot leaves her. */
  cast?: EnemyPoint
  muzzle?: EnemyPoint
}
export interface EnemyImage { path: string; width: number; height: number }
export interface EnemyLayer extends EnemyImage {
  name: string
  /** What the layer turns or sways about. */
  pivot: EnemyPoint
}
export interface EnemyPose extends EnemyImage {
  anchors: EnemyAnchors
  /** A boss's battle pose: 3–5 layers, back to front, that re-composite to the pose exactly. */
  layers?: EnemyLayer[]
}
export interface EnemyKey {
  enemyId: number
  revision: number
  /** The tier her art was drawn to. */
  tier: EnemyTier
  canvas: { width: number; height: number }
  /** Display targets at the 844 × 390 reference stage (EN3): her figure's height, a boss's envelope. */
  display: { figure: number; envelope?: number }
  poses: Record<string, EnemyPose>
}

const point: Parser<EnemyPoint> = (value, path) => {
  const f = fields(value, path)
  return { x: f('x', finite), y: f('y', finite) }
}
const releasePath: Parser<string> = (value, path) => {
  const v = text(value, path)
  return /^art\/enemy-keys\/[a-z0-9][a-z0-9._-]*\.webp$/i.test(v) ? v : fail(path, 'a WebP under art/enemy-keys/')
}
const image = (value: unknown, path: string): EnemyImage => {
  const f = fields(value, path)
  return { path: f('path', releasePath), width: f('width', positiveInteger), height: f('height', positiveInteger) }
}
const anchors: Parser<EnemyAnchors> = (value, path) => {
  const f = fields(value, path)
  const out: EnemyAnchors = { hit: f('hit', point), face: f('face', point) }
  for (const key of ['foot', 'hover', 'cast', 'muzzle'] as const) { const v = f(key, optional(point)); if (v) out[key] = v }
  if (!out.foot === !out.hover) fail(path, 'either foot or hover')
  return out
}
const layer: Parser<EnemyLayer> = (value, path) => ({ ...image(value, path), name: fields(value, path)('name', text), pivot: fields(value, path)('pivot', point) })
const pose: Parser<EnemyPose> = (value, path) => {
  const f = fields(value, path)
  const out: EnemyPose = { ...image(value, path), anchors: f('anchors', anchors) }
  const layers = f('layers', optional(arrayOf(layer)))
  if (layers) out.layers = layers
  return out
}

export const parseEnemyKey: Parser<EnemyKey> = (value, path) => {
  const f = fields(value, path)
  const key: EnemyKey = {
    enemyId: f('enemyId', id), revision: f('revision', positiveInteger), tier: f('tier', oneOf(ENEMY_TIERS)),
    canvas: f('canvas', (v, p) => ({ width: fields(v, p)('width', positiveInteger), height: fields(v, p)('height', positiveInteger) })),
    display: f('display', (v, p) => {
      const d = fields(v, p), envelope = d('envelope', optional(positiveInteger))
      return { figure: d('figure', positiveInteger), ...(envelope === undefined ? {} : { envelope }) }
    }),
    poses: f('poses', recordOf(pose)),
  }
  if (key.enemyId < ENEMY_ID_MIN || key.enemyId > ENEMY_ID_MAX) fail(`${path}.enemyId`, `an enemy id from ${ENEMY_ID_MIN} to ${ENEMY_ID_MAX}`)
  const canvas = ENEMY_CANVAS[key.tier], c = key.canvas
  const fits = c.width === canvas.width && c.height === canvas.height
  const wide = canvas.max !== undefined && c.width >= canvas.width && c.height >= canvas.height && c.width <= canvas.max && c.height <= canvas.max
  if (!fits && !wide) fail(`${path}.canvas`, `a ${key.tier}'s ${canvas.width} × ${canvas.height}${canvas.max ? ` (up to ${canvas.max} × ${canvas.max})` : ''} canvas`)
  if (key.display.figure > 300 || (key.display.envelope !== undefined && (key.display.envelope > 300 || key.display.envelope < key.display.figure))) {
    fail(`${path}.display`, 'a figure up to 300 px and an envelope at least the figure, up to 300 px')
  }
  const names = ENEMY_POSES[key.tier]
  for (const name of names.required) if (!key.poses[name]) fail(`${path}.poses.${name}`, `a ${key.tier}'s ${name} pose`)
  for (const name of Object.keys(key.poses)) if (!names.required.includes(name) && !names.optional.includes(name)) fail(`${path}.poses.${name}`, `one of a ${key.tier}'s poses (${[...names.required, ...names.optional].join(', ')})`)
  const inside = (p: EnemyPoint, at: string) => { if (p.x < 0 || p.y < 0 || p.x >= c.width || p.y >= c.height) fail(at, 'a point on the canvas') }
  for (const [name, p] of Object.entries(key.poses)) {
    const at = `${path}.poses.${name}`
    if (p.width !== c.width || p.height !== c.height) fail(at, `the ${c.width} × ${c.height} canvas`)
    for (const [anchor, point] of Object.entries(p.anchors)) inside(point as EnemyPoint, `${at}.anchors.${anchor}`)
    if (p.layers) {
      if (key.tier !== 'boss' || name !== 'battle') fail(`${at}.layers`, "layers only on a boss's battle pose")
      if (p.layers.length < BOSS_LAYERS.min || p.layers.length > BOSS_LAYERS.max) fail(`${at}.layers`, `${BOSS_LAYERS.min}–${BOSS_LAYERS.max} layers`)
      const seen = new Set<string>()
      for (const [i, l] of p.layers.entries()) {
        if (seen.has(l.name)) fail(`${at}.layers[${i}].name`, 'a unique layer name')
        seen.add(l.name)
        if (l.width !== c.width || l.height !== c.height) fail(`${at}.layers[${i}]`, `the ${c.width} × ${c.height} canvas`)
        inside(l.pivot, `${at}.layers[${i}].pivot`)
      }
    }
  }
  if (key.tier === 'boss' && !key.poses.battle!.layers) fail(`${path}.poses.battle.layers`, "a boss's battle pose in layers")
  return key
}

/** Every release file an enemy key points at. */
export const enemyKeyPaths = (key: EnemyKey): string[] =>
  Object.values(key.poses).flatMap((p) => [p.path, ...(p.layers ?? []).map((l) => l.path)])
