// The farm's builder (uma-platform ST2; uma-farm F57's asks 5 and 6, KF1–KF4): a farm design and a `farm` kit as faces and
// props, like a town's. Ground by family (`grass-1` … for grass), risers by what lies below (a bank over water), the
// Mine's rock as a two-level cliff, buildings from their wall and roof sets with a one- or two-column door, and mounted
// pieces on a building's front or roof. Pure: no three.js.
import {
  familyVariants, farmGrid, farmReach, kitVariants, pickVariant, WALL_LEVELS, type FarmBuilding, type FarmDesign, type FarmGrid, type FarmGround,
  type KitAtlas,
} from '../formats/index.js'
import { frontFace, placeProp, topFace, type Face, type Vec3, type WorldGeometry } from './geometry.js'

export type Quad = [Vec3, Vec3, Vec3, Vec3]
/** A building as built: its front and its roof (for taps), and where its roof's ridge sits. */
export interface BuiltBuilding { id: string; front: Quad; roof: Quad; back: Quad | null }
/** A farm as built: the world, its grid with blocking props closed, and its buildings' shapes. */
export interface FarmWorld extends WorldGeometry { grid: FarmGrid; buildings: BuiltBuilding[] }

const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
/** A roof's run and rise over a building `d` deep: the ridge over the middle, no steeper than 45° and at most 1.5 levels. */
export const roofShape = (d: number): { run: number; rise: number } => ({ run: d / 2, rise: Math.min(1.5, d / 2) })

/** A family's frame for a tile: one of `family-1` … by the position hash, or the frame named `family` itself. */
export function groundFrame(kit: Pick<KitAtlas, 'frames'>, family: string, x: number, z: number, salt = 0): string | null {
  const variants = familyVariants(kit, family)
  if (variants.length) return pickVariant(variants, x, z, salt)
  return kit.frames[family] ? family : null
}

/** The frame family each ground draws its top from. */
const TOP: Readonly<Record<FarmGround, string>> = {
  grass: 'grass', path: 'path', tilled: 'tilled', 'forest-floor': 'forest-floor', water: 'water', paving: 'paving', paddock: 'paddock', quarry: 'quarry',
  rock: 'wall-top-rock',
}
/** The riser family on a drop down to `below`: a bank over water, the pit's own sides in the quarry, a grassy lip elsewhere. */
const riserFamily = (kit: Pick<KitAtlas, 'frames'>, below: FarmGround | null): string =>
  below === 'water' ? 'riser-bank' : below === 'quarry' && groundFrame(kit, 'riser-quarry', 0, 0) ? 'riser-quarry' : 'riser-grass'

/** A building's door frame: the one it names, else the wall set's `door-<set>` (`door-wide-<set>`), else another of the
 * set's doors of the right width; null with no door or none that fits. */
export function doorFrame(kit: Pick<KitAtlas, 'frames'>, b: Pick<FarmBuilding, 'walls' | 'door' | 'x' | 'z'>): string | null {
  if (!b.door) return null
  const width = b.door.wide ? 256 : 128
  const fits = (name: string) => { const f = kit.frames[name]; return !!f && f.role === 'door' && f.w === width }
  if (b.door.frame) return fits(b.door.frame) ? b.door.frame : null
  const named = b.door.wide ? `door-wide-${b.walls}` : `door-${b.walls}`
  if (fits(named)) return named
  return pickVariant(kitVariants(kit, 'door', b.walls).filter((d) => fits(d.name)), b.x, b.z)
}

/**
 * What a design needs that a kit lacks, or that won't work once built: ground and riser frames, each building's sets, door
 * and mounts, props by name, and slots a blocking prop covers or cuts off from the gate. Empty when the farm can be built.
 */
export function farmProblems(design: FarmDesign, kit: KitAtlas): string[] {
  const out: string[] = []
  const g = farmGrid(design)
  const grounds = new Set<FarmGround>()
  let drops = false, banks = false
  for (let z = 0; z < g.d; z++) for (let x = 0; x < g.w; x++) {
    const here = g.ground(x, z)!
    grounds.add(here)
    const below = g.ground(x, z + 1)
    if (below && g.level(x, z) > g.level(x, z + 1)) { drops = true; if (below === 'water') banks = true }
  }
  for (const ground of grounds) if (!groundFrame(kit, TOP[ground], 0, 0)) out.push(`no ${TOP[ground]} frame for the ${ground}`)
  if (grounds.has('rock') && !groundFrame(kit, 'wall-rock', 0, 0)) out.push('no wall-rock frame for the rock')
  if (drops && !groundFrame(kit, 'riser-grass', 0, 0)) out.push('no riser-grass frame for a drop')
  if (banks && !groundFrame(kit, 'riser-bank', 0, 0)) out.push('no riser-bank frame for a bank over water')
  for (const b of design.buildings) {
    if (!kitVariants(kit, 'building-wall', b.walls).length) out.push(`${b.id}: no building-wall in the ${b.walls} set`)
    if (!kitVariants(kit, 'window', b.walls).length) out.push(`${b.id}: no window in the ${b.walls} set`)
    if (!kitVariants(kit, 'roof', b.roof).length) out.push(`${b.id}: no roof in the ${b.roof} set`)
    if (b.door && !doorFrame(kit, b)) out.push(`${b.id}: no ${b.door.wide ? '256' : '128'}-wide door ${b.door.frame ?? `in the ${b.walls} set`}`)
    for (const m of b.mounts) {
      const f = kit.frames[m.name]
      if (!f || (f.role !== 'sign' && f.role !== 'prop')) out.push(`${b.id}: no sign or prop frame ${m.name} to mount`)
    }
  }
  const blocked = new Set<string>()
  for (const p of design.props ?? []) {
    const f = kit.frames[p.name]
    if (!f || f.role !== 'prop') out.push(`no prop frame ${p.name}`)
    else if (f.blocks) blocked.add(`${p.x},${p.z}`)
  }
  const reach = farmReach(design, blocked)
  for (const m of design.markers) {
    if (m.kind !== 'slot' && m.kind !== 'gate') continue
    if (blocked.has(`${m.x},${m.z}`)) out.push(`the ${m.kind} ${m.id} is under a blocking prop`)
    else if (m.kind === 'slot' && !reach.has(`${m.x},${m.z}`)) out.push(`the slot ${m.id} can't be reached from the gate past the props`)
  }
  return out
}

/** Riser faces on a tile's south side from y0 to y1, one a level, each a variant of `family`. */
function risers(kit: KitAtlas, family: string, x: number, z: number, y0: number, y1: number, faces: Face[]): void {
  for (let base = Math.floor(y0); base < y1; base++) {
    const lo = Math.max(base, y0), hi = Math.min(base + 1, y1)
    if (hi <= lo) continue
    const frame = groundFrame(kit, family, x, z, base + 10)
    if (frame) faces.push(frontFace(frame, x, x + 1, z + 1, lo, hi, [0, lo - base, 1, hi - base]))
  }
}

function ground(g: FarmGrid, kit: KitAtlas, faces: Face[]): void {
  const topOf = (x: number, z: number): number => {
    const here = g.ground(x, z)
    if (!here) return -1
    return g.level(x, z) + (here === 'rock' ? WALL_LEVELS : 0)
  }
  for (let z = 0; z < g.d; z++) for (let x = 0; x < g.w; x++) {
    const here = g.ground(x, z)!, l = g.level(x, z), own = topOf(x, z)
    const frame = groundFrame(kit, TOP[here], x, z)
    if (frame) faces.push(topFace(frame, x, x + 1, z, z + 1, own))
    const below = topOf(x, z + 1)
    if (own <= below) continue
    const family = riserFamily(kit, g.ground(x, z + 1))
    if (here === 'rock') {
      // The cliff's face covers its two levels; any drop below its foot shows risers.
      const from = Math.max(below, l), wall = groundFrame(kit, 'wall-rock', x, z)
      if (wall) faces.push(frontFace(wall, x, x + 1, z + 1, from, own, [0, (from - l) / WALL_LEVELS, 1, 1]))
      if (below < l) risers(kit, family, x, z, below, l, faces)
    } else risers(kit, family, x, z, below, own, faces)
  }
}

function building(g: FarmGrid, kit: KitAtlas, b: FarmBuilding, out: FarmWorld): void {
  const first = out.faces.length
  buildingFaces(g, kit, b, out)
  for (let i = first; i < out.faces.length; i++) out.faces[i]!.owner = b.id
}

function buildingFaces(g: FarmGrid, kit: KitAtlas, b: FarmBuilding, out: FarmWorld): void {
  const base = g.level(b.x, b.z), height = base + b.storeys * WALL_LEVELS, fz = b.z + b.d
  const walls = kitVariants(kit, 'building-wall', b.walls), windows = kitVariants(kit, 'window', b.walls), roofs = kitVariants(kit, 'roof', b.roof)
  const door = doorFrame(kit, b), span = b.door?.wide ? 2 : 1
  const { run, rise } = roofShape(b.d)
  for (let c = 0; c < b.w; c++) {
    const x = b.x + c
    for (let s = 0; s < b.storeys; s++) {
      const lo = base + s * WALL_LEVELS
      if (s === 0 && door && b.door) {
        if (c === b.door.column) { out.faces.push(frontFace(door, x, x + span, fz, lo, lo + WALL_LEVELS)); continue }
        if (c > b.door.column && c < b.door.column + span) continue
      }
      const wall = pickVariant(walls, x, b.z, s), window = pickVariant(windows, x, b.z, s)
      if (wall) out.faces.push(frontFace(wall, x, x + 1, fz, lo, lo + 1))
      if (window) out.faces.push(frontFace(window, x, x + 1, fz, lo + 1, lo + 2))
    }
    const roof = pickVariant(roofs, x, b.z)
    if (roof) out.faces.push({ frame: roof, corners: [v(x, height, fz), v(x + 1, height, fz), v(x + 1, height + rise, fz - run), v(x, height + rise, fz - run)],
      uv: [0, 0, 1, 1], repeat: [1, Math.max(1, Math.round(Math.hypot(run, rise)))] })
  }
  // Behind the ridge, a flat roof, so a deep building never shows the ground through its back.
  const flat = b.d > 2 ? pickVariant(roofs, b.x, b.z, 9) : null
  if (flat) out.faces.push({ ...topFace(flat, b.x, b.x + b.w, b.z, fz - run, height + rise), repeat: [b.w, Math.max(1, Math.round(run))] })
  for (const m of b.mounts) {
    const f = kit.frames[m.name]
    if (!f) continue
    const x = b.x + m.column + 0.5
    let foot: Vec3
    if (m.face === 'front') foot = v(x, base + m.level, fz + 0.03)
    else { const t = rise > 0 ? Math.min(m.level, rise) / rise : 0; foot = v(x, height + t * rise, fz - t * run + 0.03) }
    out.props.push({ frame: m.name, foot, blocks: false, owner: b.id })
    if (f.light) out.lights.push({ at: v(foot.x, foot.y + 0.6, foot.z), color: f.light.color, radius: f.light.radius, flicker: f.light.flicker ?? false })
  }
  out.buildings.push({
    id: b.id,
    front: [v(b.x, base, fz), v(b.x + b.w, base, fz), v(b.x + b.w, height, fz), v(b.x, height, fz)],
    roof: [v(b.x, height, fz), v(b.x + b.w, height, fz), v(b.x + b.w, height + rise, fz - run), v(b.x, height + rise, fz - run)],
    back: b.d > 2 ? [v(b.x, height + rise, fz - run), v(b.x + b.w, height + rise, fz - run), v(b.x + b.w, height + rise, b.z), v(b.x, height + rise, b.z)] : null,
  })
}

/** A farm design built from a farm kit (call `farmProblems` first: a frame the kit lacks is left out here, not drawn). */
export function farmGeometry(design: FarmDesign, kit: KitAtlas): FarmWorld {
  const open = farmGrid(design)
  const out: FarmWorld = { w: open.w, d: open.d, faces: [], props: [], lights: [], blocked: new Set(), grid: open, buildings: [] }
  ground(open, kit, out.faces)
  for (const b of design.buildings) building(open, kit, b, out)
  for (const p of design.props ?? []) placeProp(kit, p.name, p.x, p.z, open.level(p.x, p.z), out)
  out.grid = farmGrid(design, out.blocked)
  return out
}
