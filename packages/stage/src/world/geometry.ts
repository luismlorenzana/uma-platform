// The world builder's pure half (Q5, DN28): what a room or town design makes, as textured faces and props, before any
// three.js. The camera never turns (yaw 0, pitched 35° down), so only tops and south-facing faces are ever seen: east,
// west and north faces aren't built. A level is one tile high; a wall is two levels; stairs are four steps.
import { gridOf, kitVariants, pickVariant, townGrid, WALL_LEVELS, type Grid, type KitAtlas, type KitRole, type RoomDesign, type TownDesign } from '../formats/index.js'

export interface Vec3 { x: number; y: number; z: number }
/** One textured quad: corners bottom-left, bottom-right, top-right, top-left as seen from its front, and the part of the
 * kit frame it shows (u0, v0 bottom-left to u1, v1 top-right, in 0–1 of the frame). `repeat` tiles the frame. A farm
 * building's faces name their `owner` (ST3's fade). */
export interface Face { frame: string; corners: [Vec3, Vec3, Vec3, Vec3]; uv: [number, number, number, number]; repeat?: [number, number]; owner?: string }
/** An upright card standing at `foot` (a tile's middle, at its level). A building's mounted piece names its `owner`. */
export interface Prop { frame: string; foot: Vec3; blocks: boolean; owner?: string }
export interface LightSource { at: Vec3; color: string; radius: number; flicker: boolean }
export interface WorldGeometry {
  w: number
  d: number
  faces: Face[]
  props: Prop[]
  lights: LightSource[]
  /** Tiles a blocking prop stands on. */
  blocked: Set<string>
}

const STEPS = 4
/** A front wall's height when cut away (D18): a kerb, a quarter of a level. */
export const KERB = 0.25

/** A wall at the south edge of walkable ground, which would hide what stands behind it from the 35° camera, is cut down to
 * a kerb (D18): its south side isn't walkable, and walkable ground lies just north of it (through at most two more walls,
 * the flanks of a corridor leaving the room). Pillars, with ground on both sides, and back walls stay full height. */
export function isFrontWall(g: Grid, x: number, z: number): boolean {
  if (g.kind(x, z) !== 'wall' || g.walkable(x, z + 1)) return false
  for (let k = 1; k <= 3; k++) {
    if (g.walkable(x, z - k)) return true
    if (g.kind(x, z - k) !== 'wall' || z - k < 0) return false
  }
  return false
}
const wallTop = (g: Grid, x: number, z: number): number => g.level(x, z) + (isFrontWall(g, x, z) ? KERB : WALL_LEVELS)
const FULL: [number, number, number, number] = [0, 0, 1, 1]
const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
/** A top face over x0..x1, z0..z1 at height y; its texture's top edge is toward the back. */
const top = (frame: string, x0: number, x1: number, z0: number, z1: number, y: number, uv = FULL): Face =>
  ({ frame, corners: [v(x0, y, z1), v(x1, y, z1), v(x1, y, z0), v(x0, y, z0)], uv })
/** A south-facing face over x0..x1 at depth z, from y0 up to y1. */
const front = (frame: string, x0: number, x1: number, z: number, y0: number, y1: number, uv = FULL): Face =>
  ({ frame, corners: [v(x0, y0, z), v(x1, y0, z), v(x1, y1, z), v(x0, y1, z)], uv })

/** The height of a tile's top along its south edge at column offset `u` (0–1 across it). Void and outside: −1. */
function southEdge(g: Grid, x: number, z: number, u = 0.5): number {
  if (x < 0 || z < 0 || x >= g.w || z >= g.d) return -1
  const k = g.kind(x, z), l = g.level(x, z)
  if (k === 'void') return -1
  if (k === 'wall') return wallTop(g, x, z)
  if (k === 'stairs-s') return l + 1
  if (k === 'stairs-e') return l + Math.ceil(u * STEPS) / STEPS
  if (k === 'stairs-w') return l + Math.ceil((1 - u) * STEPS) / STEPS
  if (k === 'stairs-n') return l + 1 / STEPS
  return l
}
/** The height of a tile's top along its north edge (what a tile north of it looks down onto). */
function northEdge(g: Grid, x: number, z: number, u = 0.5): number {
  if (x < 0 || z < 0 || x >= g.w || z >= g.d) return -1
  const k = g.kind(x, z), l = g.level(x, z)
  if (k === 'stairs-n') return l + 1
  if (k === 'stairs-s') return l + 1 / STEPS
  return southEdge(g, x, z, u)
}

/** Riser faces on a south side from y0 to y1, one a level, each a riser variant; a level cut short shows its top part. */
function risers(kit: KitAtlas, x: number, z: number, y0: number, y1: number, faces: Face[]): void {
  const variants = kitVariants(kit, 'riser')
  for (let base = Math.floor(y0); base < y1; base++) {
    const lo = Math.max(base, y0), hi = Math.min(base + 1, y1)
    if (hi <= lo) continue
    faces.push(front(pickVariant(variants, x, z, base + 10)!, x, x + 1, z + 1, lo, hi, [0, lo - base, 1, hi - base]))
  }
}

/** A tile's own south face, from its south neighbour's top up to its own edge. */
function southFace(g: Grid, kit: KitAtlas, x: number, z: number, own: number, faces: Face[]): void {
  const below = Math.max(-1, northEdge(g, x, z + 1))
  if (own <= below) return
  if (g.kind(x, z) === 'wall' && isFrontWall(g, x, z)) risers(kit, x, z, below, own, faces)
  else if (g.kind(x, z) === 'wall') {
    // The wall's own face covers its top two levels; anything below it shows risers.
    const wallBase = own - WALL_LEVELS, from = Math.max(below, wallBase)
    faces.push(front(pickVariant(kitVariants(kit, 'wall'), x, z)!, x, x + 1, z + 1, from, own, [0, (from - wallBase) / WALL_LEVELS, 1, 1]))
    if (below < wallBase) risers(kit, x, z, below, wallBase, faces)
  } else risers(kit, x, z, below, own, faces)
}

function stairs(g: Grid, kit: KitAtlas, x: number, z: number, faces: Face[]): void {
  const k = g.kind(x, z), l = g.level(x, z)
  const riser = pickVariant(kitVariants(kit, 'riser'), x, z, 7)!
  for (let s = 0; s < STEPS; s++) {
    const y = l + (s + 1) / STEPS, slice: [number, number, number, number] = [0, s / STEPS, 1, (s + 1) / STEPS]
    if (k === 'stairs-n') {
      const z1 = z + 1 - s / STEPS, z0 = z1 - 1 / STEPS
      faces.push(top('stairs', x, x + 1, z0, z1, y, slice), front(riser, x, x + 1, z1, y - 1 / STEPS, y, [0, 0, 1, 1 / STEPS]))
    } else if (k === 'stairs-s') {
      const z0 = z + s / STEPS, z1 = z0 + 1 / STEPS
      faces.push(top('stairs', x, x + 1, z0, z1, y, slice))
    } else {
      const x0 = k === 'stairs-e' ? x + s / STEPS : x + 1 - (s + 1) / STEPS, x1 = x0 + 1 / STEPS
      faces.push(top('stairs', x0, x1, z, z + 1, y, slice))
      const below = Math.max(-1, northEdge(g, x, z + 1))
      if (y > below) faces.push(front(riser, x0, x1, z + 1, below, y, [0, 0, 1, Math.min(1, y - below)]))
    }
  }
  if (k === 'stairs-n') { const below = northEdge(g, x, z + 1); if (l > below) risers(kit, x, z, below, l, faces) }
  if (k === 'stairs-s') southFace(g, kit, x, z, l + 1, faces)
}

function grid(g: Grid, kit: KitAtlas, faces: Face[]): void {
  const floors = kitVariants(kit, 'floor')
  for (let z = 0; z < g.d; z++) for (let x = 0; x < g.w; x++) {
    const k = g.kind(x, z), l = g.level(x, z)
    if (k === 'void') { if (kit.frames.void) faces.push(top('void', x, x + 1, z, z + 1, -1)); continue }
    if (k.startsWith('stairs')) { stairs(g, kit, x, z, faces); continue }
    const height = k === 'wall' ? wallTop(g, x, z) : l
    faces.push(top(k === 'wall' ? 'wall-top' : pickVariant(floors, x, z)!, x, x + 1, z, z + 1, height))
    southFace(g, kit, x, z, height, faces)
  }
}

/** Which kit prop a room spot shows; foes (mini-boss, boss) aren't props. */
const SPOT_FRAME: Readonly<Record<string, string | null>> = {
  spring: 'spring', waystone: 'waystone', chest: 'chest-closed', 'exit-down': 'stairs-down', entrance: 'stairs-up', miniboss: null, boss: null,
}
/** The kit's decoration props: every prop that isn't one of the dungeon's pieces. */
const decorations = (kit: KitAtlas): { name: string; weight: number }[] =>
  kitVariants(kit, 'prop' as KitRole).filter((p) => !Object.values(SPOT_FRAME).includes(p.name))

function place(kit: KitAtlas, frame: string, x: number, z: number, level: number, out: WorldGeometry): void {
  const f = kit.frames[frame]
  if (!f) return
  const foot = v(x + 0.5, level, z + 0.5)
  out.props.push({ frame, foot, blocks: f.blocks ?? false })
  if (f.blocks) out.blocked.add(`${x},${z}`)
  if (f.light) out.lights.push({ at: v(foot.x, level + 1.2, foot.z), color: f.light.color, radius: f.light.radius, flicker: f.light.flicker ?? false })
}

/** A room design, or any grid in its format (a generated floor), built from a biome kit. Chests on `opened` tiles
 * (`x,z`) show open (Q11). */
export function roomGeometry(design: Pick<RoomDesign, 'cells' | 'heights' | 'spots'>, kit: KitAtlas, opened: ReadonlySet<string> = new Set()): WorldGeometry {
  const g = gridOf(design)
  const out: WorldGeometry = { w: g.w, d: g.d, faces: [], props: [], lights: [], blocked: new Set() }
  grid(g, kit, out.faces)
  const decor = decorations(kit)
  for (const s of design.spots) {
    const frame = s.kind === 'prop' ? pickVariant(decor, s.x, s.z, 3) : s.kind === 'chest' && opened.has(`${s.x},${s.z}`) ? 'chest-open' : SPOT_FRAME[s.kind]
    if (frame) place(kit, frame, s.x, s.z, g.level(s.x, s.z), out)
  }
  return out
}

/** A town design built from a town kit: its streets, its buildings from modules, its props and its signs. */
export function townGeometry(design: TownDesign, kit: KitAtlas): WorldGeometry {
  const g = townGrid(design)
  const out: WorldGeometry = { w: g.w, d: g.d, faces: [], props: [], lights: [], blocked: new Set() }
  grid(gridOf(design), kit, out.faces)
  const walls = kitVariants(kit, 'building-wall'), windows = kitVariants(kit, 'window'), roofs = kitVariants(kit, 'roof')
  for (const b of design.buildings) {
    const base = g.level(b.x, b.z), height = base + b.storeys * WALL_LEVELS, fz = b.z + b.d
    for (let c = 0; c < b.w; c++) {
      const x = b.x + c
      for (let s = 0; s < b.storeys; s++) {
        const lo = base + s * WALL_LEVELS
        if (s === 0 && c === b.door) out.faces.push(front('door', x, x + 1, fz, lo, lo + 2))
        else out.faces.push(front(pickVariant(walls, x, b.z, s)!, x, x + 1, fz, lo, lo + 1), front(pickVariant(windows, x, b.z, s)!, x, x + 1, fz, lo + 1, lo + 2))
      }
      // The roof's front slope, from the eave up to the ridge over the building's middle, no steeper than 45°.
      const run = b.d / 2, rise = Math.min(1.5, run)
      out.faces.push({ frame: pickVariant(roofs, x, b.z)!, corners: [v(x, height, fz), v(x + 1, height, fz), v(x + 1, height + rise, fz - run), v(x, height + rise, fz - run)],
        uv: FULL, repeat: [1, Math.max(1, Math.round(Math.hypot(run, rise)))] })
    }
    // Behind the ridge, a flat roof, so a deep building never shows the street through its back.
    if (b.d > 2) out.faces.push({ ...top(pickVariant(roofs, b.x, b.z, 9)!, b.x, b.x + b.w, b.z, fz - b.d / 2, height + Math.min(1.5, b.d / 2)), repeat: [b.w, Math.max(1, Math.round(b.d / 2))] })
    const sign = b.kind === 'inn' ? 'sign-inn' : b.kind === 'shop' ? 'sign-shop' : null
    const f = sign ? kit.frames[sign] : undefined
    if (sign && f) {
      // Hung on the front, beside the door.
      const x = b.x + Math.min(b.w - 1, b.door + 1) + 0.5, w = f.w / kit.tile, h = f.h / kit.tile, y = base + 1.4
      out.faces.push(front(sign, x - w / 2, x + w / 2, fz + 0.02, y, y + h))
    }
  }
  for (const p of design.props ?? []) place(kit, p.name, p.x, p.z, g.level(p.x, p.z), out)
  for (const b of design.buildings) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) out.blocked.add(`${x},${z}`)
  return out
}

/** The builders' face and prop helpers, for the farm's builder (ST2). */
export { front as frontFace, place as placeProp, top as topFace }
