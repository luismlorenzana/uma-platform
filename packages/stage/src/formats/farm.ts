// The farm design (uma-platform ST2; uma-farm F57's ask 6, KF2–KF4): the town format opened up for a portrait farm. A grid
// up to 9 × 48 tiles of ground, with heights; buildings made from a kit's sets, each with its door (one column or two) and
// its mounted pieces; props by name; and the markers the farm taps and walks by. The farm builds its design from its own
// rules (uma-farm F11); the package only parses and builds it. Pure.
import { heightsOf, reachable, tile, type Grid } from './design.js'
import { DesignParseError, id, int, list, object, oneOf, rows } from './parse.js'

/** The farm's ground (kit-farm.md §6): each names a family of floor frames in a farm kit (`grass-1` … for `grass`). */
export type FarmGround = 'grass' | 'path' | 'tilled' | 'forest-floor' | 'water' | 'paving' | 'paddock' | 'quarry' | 'rock'
/** The grid's characters. `w` water and `#` rock aren't walkable; `#` is a cliff two levels tall (the Mine's, wave 2). */
export const FARM_CHARS: Readonly<Record<string, FarmGround>> = {
  g: 'grass', p: 'path', t: 'tilled', f: 'forest-floor', w: 'water', v: 'paving', d: 'paddock', q: 'quarry', '#': 'rock',
}
/** A farm's size limits, in tiles: 9 across (a portrait phone, FR3), up to 48 deep (KF2: 32 to 44). */
export const FARM_MAX = { w: 9, d: 48 } as const
/** Ground a figure may stand on and walk. */
export const FARM_WALKABLE: ReadonlySet<FarmGround> = new Set(['grass', 'path', 'tilled', 'forest-floor', 'paving', 'paddock', 'quarry'])
/** Ground walkers keep to when they can (the farm's paths, FR10); they step off it only to reach a slot. */
export const FARM_PATHS: ReadonlySet<FarmGround> = new Set(['path', 'paving'])

export type MountFace = 'front' | 'roof'
/** A piece fixed to a building (kit-farm KF1's fourth opening): a `sign` or `prop` frame, standing at `column` on its front
 * or its roof. `level` is in levels, in quarters: on the front, above the building's foot (the eave is `storeys × 2`); on
 * the roof, up its slope from the eave (the ridge caps it). */
export interface FarmMount { name: string; face: MountFace; column: number; level: number }
/** A building's door: at `column` of its front; `wide`, it spans that column and the next (a 256 × 256 frame). `frame`
 * names a door frame; without it, the wall set's `door-<set>` (`door-wide-<set>`) or another of the set's doors. */
export interface FarmDoor { column: number; wide?: boolean; frame?: string }
/** A building (KF3): `w × d` tiles from (x, z), `storeys` tall, its front of the `walls` set and its roof of the `roof` set. */
export interface FarmBuilding {
  id: string
  walls: string
  roof: string
  x: number
  z: number
  w: number
  d: number
  storeys: 1 | 2
  door: FarmDoor | null
  mounts: FarmMount[]
}
export type FarmMarkerKind = 'place' | 'slot' | 'gate' | 'path' | 'lot'
export const FARM_MARKER_KINDS: readonly FarmMarkerKind[] = ['place', 'slot', 'gate', 'path', 'lot']
/** A tile the farm taps or walks by: a place, an Uma's slot, the Gate, a path point, an overgrown lot. */
export interface FarmMarker { kind: FarmMarkerKind; id: string; x: number; z: number }

export interface FarmDesign {
  id: string
  /** One string a row, from the back (z = 0) to the front; one character a tile (`FARM_CHARS`). */
  cells: string[]
  /** One digit (0–2) a tile, the same shape; absent, every tile is level 0. */
  heights?: string[]
  buildings: FarmBuilding[]
  /** Kit props by frame name, each on a tile no building stands on (a dock may stand on water). */
  props?: { name: string; x: number; z: number }[]
  markers: FarmMarker[]
}

/** A farm's grid: its ground, levels and what's walkable (ground figures walk, not under a building). */
export interface FarmGrid extends Grid {
  ground(x: number, z: number): FarmGround | null
  /** A building's id on a tile, or null. */
  building(x: number, z: number): string | null
}

const key = (x: number, z: number) => `${x},${z}`

/** A farm design's grid, with its buildings (and any `blocked` tiles: blocking props) closed to walking. */
export function farmGrid(design: Pick<FarmDesign, 'cells' | 'heights' | 'buildings'>, blocked: ReadonlySet<string> = new Set()): FarmGrid {
  const d = design.cells.length, w = design.cells[0]?.length ?? 0
  const under = new Map<string, string>()
  for (const b of design.buildings) for (let z = b.z; z < b.z + b.d; z++) for (let x = b.x; x < b.x + b.w; x++) under.set(key(x, z), b.id)
  const inside = (x: number, z: number) => x >= 0 && z >= 0 && x < w && z < d
  const ground = (x: number, z: number): FarmGround | null => (inside(x, z) ? FARM_CHARS[design.cells[z]![x]!] ?? null : null)
  return {
    w, d, ground,
    building: (x, z) => under.get(key(x, z)) ?? null,
    kind: (x, z) => (ground(x, z) === 'rock' || !inside(x, z) ? 'wall' : 'floor'),
    level: (x, z) => (inside(x, z) && design.heights ? Number(design.heights[z]![x]!) || 0 : 0),
    walkable: (x, z) => {
      const g = ground(x, z)
      return !!g && FARM_WALKABLE.has(g) && !under.has(key(x, z)) && !blocked.has(key(x, z))
    },
  }
}

/** A quarter-level number from `min` to `max`. */
function quarters(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v * 4) || v < min || v > max) throw new DesignParseError(path, `expected ${min}–${max} in quarters`)
  return v
}

export function parseFarmDesign(value: unknown): FarmDesign {
  const o = object(value, 'farm', ['id', 'cells', 'buildings', 'markers'], ['heights', 'props'])
  const cells = rows(o.cells, 'farm.cells', FARM_MAX, /^[gptfwvdq#]+$/)
  const heights = heightsOf(o.heights, 'farm.heights', cells)
  const open = farmGrid({ cells, heights, buildings: [] })
  const taken = new Set<string>()
  const ids = new Set<string>()
  const buildings = list(o.buildings, 'farm.buildings', 48, (x, p): FarmBuilding => {
    const b = object(x, p, ['id', 'walls', 'roof', 'x', 'z', 'w', 'd', 'storeys', 'door', 'mounts'])
    const bid = id(b.id, `${p}.id`)
    if (ids.has(bid)) throw new DesignParseError(`${p}.id`, 'buildings have distinct ids')
    ids.add(bid)
    const at = tile({ x: b.x, z: b.z }, p, open)
    const w = int(b.w, `${p}.w`, 1, FARM_MAX.w), d = int(b.d, `${p}.d`, 1, 8)
    const storeys = int(b.storeys, `${p}.storeys`, 1, 2) as 1 | 2
    const level = open.level(at.x, at.z)
    for (let z = at.z; z < at.z + d; z++) for (let xx = at.x; xx < at.x + w; xx++) {
      if (!open.walkable(xx, z) || open.level(xx, z) !== level) throw new DesignParseError(p, 'a building stands on level ground inside the farm')
      if (taken.has(key(xx, z))) throw new DesignParseError(p, 'buildings overlap')
      taken.add(key(xx, z))
    }
    let door: FarmDoor | null = null
    if (b.door !== null) {
      const q = object(b.door, `${p}.door`, ['column'], ['wide', 'frame'])
      if (q.wide !== undefined && typeof q.wide !== 'boolean') throw new DesignParseError(`${p}.door.wide`, 'expected true or false')
      const wide = q.wide === true
      door = { column: int(q.column, `${p}.door.column`, 0, w - (wide ? 2 : 1)), ...(wide ? { wide } : {}),
        ...(q.frame !== undefined ? { frame: id(q.frame, `${p}.door.frame`) } : {}) }
    }
    const mounts = list(b.mounts, `${p}.mounts`, 8, (m, mp): FarmMount => {
      const q = object(m, mp, ['name', 'face', 'column', 'level'])
      const face = oneOf(q.face, `${mp}.face`, ['front', 'roof'] as const)
      return { name: id(q.name, `${mp}.name`), face, column: int(q.column, `${mp}.column`, 0, w - 1),
        level: quarters(q.level, `${mp}.level`, 0, face === 'front' ? storeys * 2 : 2) }
    })
    return { id: bid, walls: id(b.walls, `${p}.walls`), roof: id(b.roof, `${p}.roof`), ...at, w, d, storeys, door, mounts }
  })
  const g = farmGrid({ cells, heights, buildings })
  const props = o.props === undefined ? undefined : list(o.props, 'farm.props', 256, (x, p) => {
    const q = object(x, p, ['name', 'x', 'z'])
    const t = tile({ x: q.x, z: q.z }, p, g)
    if (g.building(t.x, t.z)) throw new DesignParseError(p, 'a prop stands where no building does')
    return { name: id(q.name, `${p}.name`), ...t }
  })
  const marked = new Set<string>()
  const markers = list(o.markers, 'farm.markers', 256, (x, p): FarmMarker => {
    const m = object(x, p, ['kind', 'id', 'x', 'z'])
    const kind = oneOf(m.kind, `${p}.kind`, FARM_MARKER_KINDS), mid = id(m.id, `${p}.id`)
    if (marked.has(`${kind}:${mid}`)) throw new DesignParseError(`${p}.id`, `a ${kind} marker's id is its own`)
    marked.add(`${kind}:${mid}`)
    const t = tile({ x: m.x, z: m.z }, p, g)
    if (!g.walkable(t.x, t.z)) throw new DesignParseError(p, 'a marker sits on walkable ground')
    return { kind, id: mid, ...t }
  })
  // Umas enter at the Gate and walk to their slots (FR9, FR10): every slot and path point is reachable from it.
  const gate = markers.find((m) => m.kind === 'gate')
  const walked = markers.filter((m) => m.kind === 'slot' || m.kind === 'path')
  if (walked.length && !gate) throw new DesignParseError('farm.markers', 'slots and paths need a gate')
  if (gate) {
    const seen = reachable(g, gate)
    for (const [i, m] of markers.entries()) {
      if ((m.kind === 'slot' || m.kind === 'path') && !seen.has(key(m.x, m.z))) throw new DesignParseError(`farm.markers[${i}]`, 'not reachable from the gate')
    }
  }
  return { id: id(o.id, 'farm.id'), cells, ...(heights ? { heights } : {}), buildings, ...(props ? { props } : {}), markers }
}

/** Every tile reachable from a farm's gate (the first), or none without one. */
export function farmReach(design: FarmDesign, blocked: ReadonlySet<string> = new Set()): Set<string> {
  const gate = design.markers.find((m) => m.kind === 'gate')
  return gate ? reachable(farmGrid(design, blocked), gate) : new Set()
}
