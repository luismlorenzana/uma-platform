// Tap picking and projection (uma-platform ST2; uma-farm F57's ask 8, FR9): a tap answers with what's drawn under it, a
// marker, a prop, a building or a figure, by casting the tap's ray into the world and taking the nearest thing it meets.
// The camera never turns, so a tap's ray is straight down its 35° view. Points are in stage CSS px: on the turned
// layout, map a touch with `toStage` first. Pure; also projects a world point to the stage (a bubble over an Uma's head).
import type { FarmMarker, KitAtlas, Tile } from '../formats/index.js'
import type { FarmWorld, Quad } from '../world/farm.js'
import type { Vec3 } from '../world/geometry.js'
import { CAMERA_PITCH, cameraOffset, spriteStretch, TEXELS_PER_UNIT } from './camera.js'

/** The camera as a tap sees it: the point it looks at, and the stage's CSS size and pixel ratio. */
export interface View { look: Vec3; width: number; height: number; ratio: number }

export type PickRef =
  | { kind: 'figure'; id: string }
  | { kind: 'prop'; name: string; tile: Tile }
  | { kind: 'building'; id: string }
  | { kind: 'marker'; marker: FarmMarker }
export interface PickTarget { ref: PickRef; quad: Quad; /** Drawn over others this much nearer (figures over what they stand on). */ bias?: number }
export interface PickHit { ref: PickRef; at: Vec3; depth: number }

const SIN = Math.sin(CAMERA_PITCH), COS = Math.cos(CAMERA_PITCH)
const RIGHT: Vec3 = { x: 1, y: 0, z: 0 }, UP: Vec3 = { x: 0, y: COS, z: -SIN }, FORWARD: Vec3 = { x: 0, y: -SIN, z: -COS }
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k })
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })

function eye(view: View): Vec3 {
  const o = cameraOffset()
  return { x: view.look.x, y: view.look.y + o.y, z: view.look.z + o.z }
}
const device = (view: View) => ({ w: Math.round(view.width * view.ratio), h: Math.round(view.height * view.ratio) })

/** A stage point's ray: where it leaves the camera's plane, and its direction (the camera's forward). */
export function rayAt(view: View, x: number, y: number): { origin: Vec3; dir: Vec3 } {
  const { w, h } = device(view)
  const right = (x * view.ratio - w / 2) / TEXELS_PER_UNIT, up = (h / 2 - y * view.ratio) / TEXELS_PER_UNIT
  return { origin: add(add(eye(view), RIGHT, right), UP, up), dir: FORWARD }
}

/** A world point on the stage, in CSS px, and its depth along the view. */
export function project(view: View, p: Vec3): { x: number; y: number; depth: number } {
  const { w, h } = device(view), rel = sub(p, eye(view))
  return { x: (dot(rel, RIGHT) * TEXELS_PER_UNIT + w / 2) / view.ratio, y: (h / 2 - dot(rel, UP) * TEXELS_PER_UNIT) / view.ratio, depth: dot(rel, FORWARD) }
}

function hitTriangle(o: Vec3, d: Vec3, a: Vec3, b: Vec3, c: Vec3): number | null {
  const e1 = sub(b, a), e2 = sub(c, a), p = cross(d, e2), det = dot(e1, p)
  if (Math.abs(det) < 1e-9) return null
  const inv = 1 / det, s = sub(o, a), u = dot(s, p) * inv
  if (u < 0 || u > 1) return null
  const q = cross(s, e1), w = dot(d, q) * inv
  if (w < 0 || u + w > 1) return null
  const t = dot(e2, q) * inv
  return t > 0 ? t : null
}

/** Where a ray meets a flat quad, as its distance along the ray, or null. */
export function hitQuad(ray: { origin: Vec3; dir: Vec3 }, quad: Quad): number | null {
  const [a, b, c, d] = quad
  return hitTriangle(ray.origin, ray.dir, a, b, c) ?? hitTriangle(ray.origin, ray.dir, a, c, d)
}

/** Everything under a stage point, nearest first. */
export function pickAt(view: View, x: number, y: number, targets: readonly PickTarget[]): PickHit[] {
  const ray = rayAt(view, x, y), hits: (PickHit & { order: number })[] = []
  for (const t of targets) {
    const d = hitQuad(ray, t.quad)
    if (d !== null) hits.push({ ref: t.ref, at: add(ray.origin, ray.dir, d), depth: d, order: d - (t.bias ?? 0) })
  }
  return hits.sort((a, b) => a.order - b.order).map(({ order: _, ...h }) => h)
}

/** An upright card's quad, stretched like the sprites: `w × h` texels with its foot `footX` from the left and `footUp`
 * above its bottom edge, standing at `foot`. */
export function cardQuad(foot: Vec3, w: number, h: number, footX = w / 2, footUp = 0): Quad {
  const s = spriteStretch(), x0 = foot.x - footX / TEXELS_PER_UNIT, x1 = x0 + w / TEXELS_PER_UNIT
  const y0 = foot.y - (footUp / TEXELS_PER_UNIT) * s, y1 = y0 + (h / TEXELS_PER_UNIT) * s
  return [{ x: x0, y: y0, z: foot.z }, { x: x1, y: y0, z: foot.z }, { x: x1, y: y1, z: foot.z }, { x: x0, y: y1, z: foot.z }]
}

/** A tile's top as a quad, a hair above its level. */
export const tileQuad = (x: number, z: number, y: number): Quad =>
  [{ x, y: y + 0.001, z: z + 1 }, { x: x + 1, y: y + 0.001, z: z + 1 }, { x: x + 1, y: y + 0.001, z }, { x, y: y + 0.001, z }]

/** A built farm's tap targets: its markers' tiles, its props' cards, and its buildings (fronts, roofs and mounted pieces). */
export function farmTargets(markers: readonly FarmMarker[], world: FarmWorld, kit: KitAtlas): PickTarget[] {
  const out: PickTarget[] = markers.map((m) => ({ ref: { kind: 'marker', marker: m }, quad: tileQuad(m.x, m.z, world.grid.level(m.x, m.z)) }))
  for (const p of world.props) {
    const f = kit.frames[p.frame]
    if (!f) continue
    const quad = cardQuad(p.foot, f.w, f.h, f.foot?.x ?? f.w / 2, f.h - (f.foot?.y ?? f.h))
    out.push({ ref: p.owner ? { kind: 'building', id: p.owner } : { kind: 'prop', name: p.frame, tile: { x: Math.floor(p.foot.x), z: Math.floor(p.foot.z) } }, quad })
  }
  for (const b of world.buildings) for (const quad of [b.front, b.roof, b.back]) if (quad) out.push({ ref: { kind: 'building', id: b.id }, quad })
  return out
}
