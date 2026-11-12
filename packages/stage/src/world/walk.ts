// Walking a built world (Q4, Q5): the leader moves by the stick or keys, slides along what blocks her, climbs only by
// stairs (the domain's step rule) and follows the ground's height. Pure; the engine calls it every frame.
import { canStep, gridOf, townGrid, type Grid, type RoomDesign, type Side, type TownDesign } from '../formats/index.js'
import type { Move } from '../stage/input.js'

export interface Spot { x: number; z: number }
/** Tiles a second, walking and dashing. */
export const WALK_SPEED = 3
export const DASH_SPEED = 5.4
/** How close to what blocks her her middle may come. */
const RADIUS = 0.3

/** What she walks: the design's grid with buildings and blocking props closed. */
export interface WalkWorld { grid: Grid }

export function walkWorld(design: Pick<RoomDesign, 'cells' | 'heights'> | TownDesign, blocked: ReadonlySet<string>): WalkWorld {
  const base = 'buildings' in design ? townGrid(design) : gridOf(design)
  const grid: Grid = { ...base, walkable: (x, z) => base.walkable(x, z) && !blocked.has(`${x},${z}`) }
  return { grid }
}

/** The ground's height at a point: a tile's level, or partway up its stairs. */
export function heightAt(w: WalkWorld, x: number, z: number): number {
  const tx = Math.floor(x), tz = Math.floor(z), k = w.grid.kind(tx, tz), l = w.grid.level(tx, tz)
  const fx = x - tx, fz = z - tz
  if (k === 'stairs-n') return l + (1 - fz)
  if (k === 'stairs-s') return l + fz
  if (k === 'stairs-e') return l + fx
  if (k === 'stairs-w') return l + (1 - fx)
  return l
}

const SIDE_OF: Readonly<Record<string, Side>> = { '1,0': 'e', '-1,0': 'w', '0,1': 's', '0,-1': 'n' }
/** Whether she may stand with a part of her on tile (tx, tz) while her middle is on (cx, cz). */
function reach(g: Grid, cx: number, cz: number, tx: number, tz: number): boolean {
  if (tx === cx && tz === cz) return g.walkable(tx, tz)
  const dx = tx - cx, dz = tz - cz
  if (Math.abs(dx) + Math.abs(dz) === 1) return canStep(g, { x: cx, z: cz }, SIDE_OF[`${dx},${dz}`]!)
  // A corner: by either side.
  const viaX = canStep(g, { x: cx, z: cz }, SIDE_OF[`${dx},0`]!) && canStep(g, { x: tx, z: cz }, SIDE_OF[`0,${dz}`]!)
  const viaZ = canStep(g, { x: cx, z: cz }, SIDE_OF[`0,${dz}`]!) && canStep(g, { x: cx, z: tz }, SIDE_OF[`${dx},0`]!)
  return viaX || viaZ
}
function clear(w: WalkWorld, from: Spot, x: number, z: number): boolean {
  const cx = Math.floor(from.x), cz = Math.floor(from.z)
  const nx = Math.floor(x), nz = Math.floor(z)
  if ((nx !== cx || nz !== cz) && !reach(w.grid, cx, cz, nx, nz)) return false
  for (const [ox, oz] of [[-RADIUS, -RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [RADIUS, RADIUS]] as const) {
    if (!reach(w.grid, nx, nz, Math.floor(x + ox), Math.floor(z + oz))) return false
  }
  return true
}

/** One step of walking: the move (stage up is into the scene, −z) at walking or dashing speed, sliding along what blocks. */
export function walk(w: WalkWorld, at: Spot, move: Move, dt: number, dash: boolean): Spot {
  const speed = (dash ? DASH_SPEED : WALK_SPEED) * dt
  let { x, z } = at
  const nx = x + move.x * speed
  if (clear(w, { x, z }, nx, z)) x = nx
  const nz = z + move.y * speed
  if (clear(w, { x, z }, x, nz)) z = nz
  return { x, z }
}

/** The move toward Auto-walk's next waypoint, and which waypoint that is (advancing within 0.2 tiles of it). */
export function autoMove(loop: readonly Spot[], at: Spot, target: number): { move: Move; target: number } {
  if (loop.length === 0) return { move: { x: 0, y: 0 }, target: 0 }
  let i = target % loop.length
  let p = loop[i]!
  if (Math.hypot(p.x - at.x, p.z - at.z) < 0.2) { i = (i + 1) % loop.length; p = loop[i]! }
  const dx = p.x - at.x, dz = p.z - at.z, d = Math.hypot(dx, dz) || 1
  return { move: { x: dx / d, y: dz / d }, target: i }
}
