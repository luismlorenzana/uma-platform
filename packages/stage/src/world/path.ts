// Grid path-finding for walkers (uma-platform ST2; uma-farm F57's ask 9, FR10): the shortest legal way from one tile to
// another by the step rule (`canStep`: one level, or stairs), each step costing what the tile it enters costs. The farm
// prices its paths at 1 and other ground at 3, so Umas keep to the paths and step off them only to reach a slot. Pure.
import { canStep, FARM_PATHS, SIDES, type FarmGrid, type Grid, type Side, type Tile } from '../formats/index.js'

const STEP: Readonly<Record<Side, Tile>> = { n: { x: 0, z: -1 }, e: { x: 1, z: 0 }, s: { x: 0, z: 1 }, w: { x: -1, z: 0 } }
/** What a step onto a farm tile costs: its paths 1, any other walkable ground 3. */
export const OFF_PATH_COST = 3
export const farmStepCost = (g: FarmGrid) => (x: number, z: number): number => (FARM_PATHS.has(g.ground(x, z)!) ? 1 : OFF_PATH_COST)

/** The tiles from `from` to `to` inclusive (A*, ties broken the same way every time), or null when there's no way. */
export function findPath(g: Grid, from: Tile, to: Tile, cost: (x: number, z: number) => number = () => 1): Tile[] | null {
  if (!g.walkable(from.x, from.z) || !g.walkable(to.x, to.z)) return null
  const key = (t: Tile) => t.z * g.w + t.x
  const best = new Map<number, number>([[key(from), 0]]), came = new Map<number, number>()
  const open: { t: Tile; g: number; f: number; n: number }[] = [{ t: from, g: 0, f: Math.abs(to.x - from.x) + Math.abs(to.z - from.z), n: 0 }]
  let order = 0
  while (open.length) {
    let i = 0
    for (let j = 1; j < open.length; j++) { const a = open[j]!, b = open[i]!; if (a.f < b.f || (a.f === b.f && a.n < b.n)) i = j }
    const cur = open.splice(i, 1)[0]!
    if (cur.t.x === to.x && cur.t.z === to.z) {
      const path = [cur.t]
      let k = key(cur.t)
      while (came.has(k)) { k = came.get(k)!; path.unshift({ x: k % g.w, z: Math.floor(k / g.w) }) }
      return path
    }
    if (cur.g > (best.get(key(cur.t)) ?? Infinity)) continue
    for (const side of SIDES) {
      if (!canStep(g, cur.t, side)) continue
      const n = { x: cur.t.x + STEP[side].x, z: cur.t.z + STEP[side].z }, gn = cur.g + cost(n.x, n.z)
      if (gn >= (best.get(key(n)) ?? Infinity)) continue
      best.set(key(n), gn)
      came.set(key(n), key(cur.t))
      open.push({ t: n, g: gn, f: gn + Math.abs(to.x - n.x) + Math.abs(to.z - n.z), n: ++order })
    }
  }
  return null
}

/** A path's tiles as the points a walker heads for: each tile's middle. */
export const pathPoints = (tiles: readonly Tile[]): { x: number; z: number }[] => tiles.map((t) => ({ x: t.x + 0.5, z: t.z + 0.5 }))
