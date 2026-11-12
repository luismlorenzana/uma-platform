// Room and town designs (Q5, D15): the shapes the world builder turns into 3D, and the format the dungeon generator (Q10)
// reads. A design is a grid of tiles, one character a tile, with heights in levels (a level is one tile high; walls are two
// levels tall). Pure: the types, strict parsers and the reachability check.

export type CellKind = 'wall' | 'floor' | 'void' | 'stairs-n' | 'stairs-e' | 'stairs-s' | 'stairs-w'
export type Side = 'n' | 'e' | 's' | 'w'
export interface Tile { x: number; z: number }

/** Room size limits, in tiles. */
export const ROOM_MAX = 16
export const ROOM_MIN = 3
/** Town size limits, in tiles. */
export const TOWN_MAX = { w: 40, d: 30 } as const
/** Heights a tile may have, in levels. */
export const MAX_LEVEL = 2
/** A wall's height, in levels (one storey). */
export const WALL_LEVELS = 2

/** The grid's characters: `#` wall, `.` floor, `_` void (a drop), and stairs `N`, `E`, `S`, `W` climbing toward that side. */
export const CELL_CHARS: Readonly<Record<string, CellKind>> = { '#': 'wall', '.': 'floor', '_': 'void', N: 'stairs-n', E: 'stairs-e', S: 'stairs-s', W: 'stairs-w' }
const STEP: Readonly<Record<Side, Tile>> = { n: { x: 0, z: -1 }, e: { x: 1, z: 0 }, s: { x: 0, z: 1 }, w: { x: -1, z: 0 } }
const OPPOSITE: Readonly<Record<Side, Side>> = { n: 's', e: 'w', s: 'n', w: 'e' }
export const SIDES: readonly Side[] = ['n', 'e', 's', 'w']

export type SpotKind = 'entrance' | 'exit-down' | 'spring' | 'waystone' | 'chest' | 'miniboss' | 'boss' | 'prop'
export const SPOT_KINDS: readonly SpotKind[] = ['entrance', 'exit-down', 'spring', 'waystone', 'chest', 'miniboss', 'boss', 'prop']
export type RoomTag = 'start' | 'end' | 'boss-room' | 'rest' | 'corridor' | 'small' | 'large'
export const ROOM_TAGS: readonly RoomTag[] = ['start', 'end', 'boss-room', 'rest', 'corridor', 'small', 'large']

/** One room design: a biome's dungeons are generated from 15–25 of them (DN6, Q10). */
export interface RoomDesign {
  id: string
  biome: string
  /** One string a row, from the back (z = 0) to the front; one character a tile (`CELL_CHARS`). */
  cells: string[]
  /** One digit (0–2) a tile, the same shape; absent, every tile is level 0. A stairs tile's level is its foot. */
  heights?: string[]
  /** Where corridors may join: a side, and the column (n, s) or row (e, w) of its edge tile. */
  sockets: { side: Side; at: number }[]
  /** What the generator may place here (DN15, DN16, DN22, DN9). */
  spots: { kind: SpotKind; x: number; z: number }[]
  tags: RoomTag[]
  /** How often the generator picks it, relative to the biome's others. */
  weight: number
}

export type BuildingKind = 'inn' | 'shop' | 'house'
export type MarkerKind = 'inn' | 'shop' | 'chapter' | 'world-map' | 'spawn'

/** A town (CM21, CM22): its streets as a grid, its buildings, the townsfolk's paths and its markers. */
export interface TownDesign {
  id: string
  /** The region whose town kit it uses: `warrior` in the slice (SL4). */
  region: string
  cells: string[]
  heights?: string[]
  /** A building stands on floor tiles: `w × d` from (x, z), `storeys` tall, its door on its front (south) face at
   * column `x + door`. */
  buildings: { id: string; kind: BuildingKind; x: number; z: number; w: number; d: number; storeys: 1 | 2; door: number }[]
  /** Where townsfolk walk, tile to tile in a straight line, round again when `loop`. */
  paths: { id: string; points: Tile[]; loop: boolean }[]
  markers: { kind: MarkerKind; x: number; z: number }[]
  /** Kit props by frame name (a well, a stall, a lantern), each standing on a walkable tile. */
  props?: { name: string; x: number; z: number }[]
}

export class DesignParseError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`)
    this.name = 'DesignParseError'
  }
}

// --- The grid ----------------------------------------------------------------------------------------------------------

/** A design's grid: its size, each tile's kind and level, and what blocks walking. */
export interface Grid {
  w: number
  d: number
  kind(x: number, z: number): CellKind
  level(x: number, z: number): number
  /** Floor or stairs, inside the grid and not under a building. */
  walkable(x: number, z: number): boolean
}

export function gridOf(design: Pick<RoomDesign, 'cells' | 'heights'>, blocked: ReadonlySet<string> = new Set()): Grid {
  const d = design.cells.length, w = design.cells[0]?.length ?? 0
  const kind = (x: number, z: number): CellKind => {
    if (x < 0 || z < 0 || x >= w || z >= d) return 'wall'
    return CELL_CHARS[design.cells[z]![x]!] ?? 'wall'
  }
  const level = (x: number, z: number): number => {
    if (x < 0 || z < 0 || x >= w || z >= d || !design.heights) return 0
    return Number(design.heights[z]![x]!) || 0
  }
  const walkable = (x: number, z: number): boolean => {
    const k = kind(x, z)
    return (k === 'floor' || k.startsWith('stairs')) && !blocked.has(`${x},${z}`)
  }
  return { w, d, kind, level, walkable }
}

const climbSide = (k: CellKind): Side | null => (k.startsWith('stairs-') ? (k.slice(7) as Side) : null)

/** Whether one step from a tile to its neighbour on `side` is legal: the same level, or up or down a level by stairs. */
export function canStep(g: Grid, from: Tile, side: Side): boolean {
  const to = { x: from.x + STEP[side].x, z: from.z + STEP[side].z }
  if (!g.walkable(from.x, from.z) || !g.walkable(to.x, to.z)) return false
  const a = g.kind(from.x, from.z), b = g.kind(to.x, to.z)
  const la = g.level(from.x, from.z), lb = g.level(to.x, to.z)
  const ca = climbSide(a), cb = climbSide(b)
  // Leaving stairs: up their climb side to the level above, or down their foot side at their level; never off a side.
  if (ca) {
    // Across a wide flight: to the stairs beside, climbing the same way from the same level.
    if (cb === ca && lb === la && side !== ca && side !== OPPOSITE[ca]) return true
    if (side === ca) return lb === la + 1
    if (side === OPPOSITE[ca]) return cb === ca ? lb === la - 1 : lb === la
    return false
  }
  // Onto stairs: at their foot (from the side they climb away from) or at their top (from the side they climb to).
  if (cb) {
    if (side === cb) return lb === la
    if (side === OPPOSITE[cb]) return la === lb + 1
    return false
  }
  return la === lb
}

/** The tiles reachable from `start` by legal steps. */
export function reachable(g: Grid, start: Tile): Set<string> {
  const seen = new Set<string>()
  if (!g.walkable(start.x, start.z)) return seen
  const queue = [start]
  seen.add(`${start.x},${start.z}`)
  while (queue.length) {
    const t = queue.shift()!
    for (const side of SIDES) {
      const n = { x: t.x + STEP[side].x, z: t.z + STEP[side].z }
      const key = `${n.x},${n.z}`
      if (!seen.has(key) && canStep(g, t, side)) { seen.add(key); queue.push(n) }
    }
  }
  return seen
}

/** A socket's edge tile. */
export function socketTile(g: Pick<Grid, 'w' | 'd'>, socket: { side: Side; at: number }): Tile {
  return socket.side === 'n' ? { x: socket.at, z: 0 } : socket.side === 's' ? { x: socket.at, z: g.d - 1 }
    : socket.side === 'e' ? { x: g.w - 1, z: socket.at } : { x: 0, z: socket.at }
}

// --- Parsing -----------------------------------------------------------------------------------------------------------

type Obj = Record<string, unknown>
function object(value: unknown, path: string, keys: readonly string[], optional: readonly string[] = []): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new DesignParseError(path, 'expected an object')
  const extra = Object.keys(value).filter((k) => !keys.includes(k) && !optional.includes(k))
  if (extra.length) throw new DesignParseError(path, `unknown keys ${extra.join(', ')}`)
  const missing = keys.filter((k) => !(k in value))
  if (missing.length) throw new DesignParseError(path, `missing ${missing.join(', ')}`)
  return value as Obj
}
const int = (v: unknown, path: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new DesignParseError(path, `expected an integer ${min}–${max}`)
  return v
}
const id = (v: unknown, path: string): string => {
  if (typeof v !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) || v.length > 48) throw new DesignParseError(path, 'expected a kebab-case id')
  return v
}
function list<T>(v: unknown, path: string, max: number, item: (x: unknown, p: string) => T): T[] {
  if (!Array.isArray(v) || v.length > max) throw new DesignParseError(path, `expected a list of at most ${max}`)
  return v.map((x, i) => item(x, `${path}[${i}]`))
}
function oneOf<T extends string>(v: unknown, path: string, all: readonly T[]): T {
  if (typeof v !== 'string' || !all.includes(v as T)) throw new DesignParseError(path, `expected one of ${all.join(', ')}`)
  return v as T
}
function rows(v: unknown, path: string, max: { w: number; d: number }, chars: RegExp): string[] {
  const r = list(v, path, max.d, (x, p) => {
    if (typeof x !== 'string' || !chars.test(x)) throw new DesignParseError(p, `expected a row of ${chars}`)
    return x
  })
  if (r.length < ROOM_MIN) throw new DesignParseError(path, `expected at least ${ROOM_MIN} rows`)
  const w = r[0]!.length
  if (w < ROOM_MIN || w > max.w || r.some((x) => x.length !== w)) throw new DesignParseError(path, `expected rows of one length, ${ROOM_MIN}–${max.w}`)
  return r
}
function tile(v: unknown, path: string, g: Grid): Tile {
  const o = object(v, path, ['x', 'z'])
  return { x: int(o.x, `${path}.x`, 0, g.w - 1), z: int(o.z, `${path}.z`, 0, g.d - 1) }
}
function heightsOf(v: unknown, path: string, cells: string[]): string[] | undefined {
  if (v === undefined) return undefined
  const h = rows(v, path, { w: cells[0]!.length, d: cells.length }, new RegExp(`^[0-${MAX_LEVEL}]+$`))
  if (h.length !== cells.length || h[0]!.length !== cells[0]!.length) throw new DesignParseError(path, 'expected the shape of cells')
  return h
}
/** Every stairs tile's top must be the next level up. */
function checkStairs(g: Grid, path: string): void {
  for (let z = 0; z < g.d; z++) for (let x = 0; x < g.w; x++) {
    const side = climbSide(g.kind(x, z))
    if (!side) continue
    const top = { x: x + STEP[side].x, z: z + STEP[side].z }
    if (!g.walkable(top.x, top.z) || g.level(top.x, top.z) !== g.level(x, z) + 1) throw new DesignParseError(`${path}[${z}][${x}]`, 'stairs must climb to a walkable tile one level up')
  }
}
function checkAllReached(g: Grid, from: Tile, path: string): Set<string> {
  const seen = reachable(g, from)
  for (let z = 0; z < g.d; z++) for (let x = 0; x < g.w; x++) {
    if (g.walkable(x, z) && !seen.has(`${x},${z}`)) throw new DesignParseError(`${path}[${z}][${x}]`, 'not reachable')
  }
  return seen
}

export function parseRoomDesign(value: unknown): RoomDesign {
  const o = object(value, 'room', ['id', 'biome', 'cells', 'sockets', 'spots', 'tags', 'weight'], ['heights'])
  const cells = rows(o.cells, 'room.cells', { w: ROOM_MAX, d: ROOM_MAX }, /^[#._NESW]+$/)
  const heights = heightsOf(o.heights, 'room.heights', cells)
  const g = gridOf({ cells, heights })
  checkStairs(g, 'room.cells')
  const sockets = list(o.sockets, 'room.sockets', 12, (x, p) => {
    const s = object(x, p, ['side', 'at'])
    const side = oneOf(s.side, `${p}.side`, SIDES)
    const at = int(s.at, `${p}.at`, 0, (side === 'n' || side === 's' ? g.w : g.d) - 1)
    const t = socketTile(g, { side, at })
    if (!g.walkable(t.x, t.z)) throw new DesignParseError(p, 'a socket must sit on a walkable edge tile')
    return { side, at }
  })
  if (sockets.length === 0) throw new DesignParseError('room.sockets', 'expected at least one')
  const seen = checkAllReached(g, socketTile(g, sockets[0]!), 'room.cells')
  const spots = list(o.spots, 'room.spots', 32, (x, p) => {
    const s = object(x, p, ['kind', 'x', 'z'])
    const kind = oneOf(s.kind, `${p}.kind`, SPOT_KINDS)
    const t = tile({ x: s.x, z: s.z }, p, g)
    if (!seen.has(`${t.x},${t.z}`) || g.kind(t.x, t.z) !== 'floor') throw new DesignParseError(p, 'a spot must sit on a reachable floor tile')
    return { kind, ...t }
  })
  return {
    id: id(o.id, 'room.id'), biome: id(o.biome, 'room.biome'), cells, ...(heights ? { heights } : {}), sockets, spots,
    tags: list(o.tags, 'room.tags', ROOM_TAGS.length, (x, p) => oneOf(x, p, ROOM_TAGS)),
    weight: int(o.weight, 'room.weight', 1, 100),
  }
}

export function parseTownDesign(value: unknown): TownDesign {
  const o = object(value, 'town', ['id', 'region', 'cells', 'buildings', 'paths', 'markers'], ['heights', 'props'])
  const cells = rows(o.cells, 'town.cells', TOWN_MAX, /^[#._NESW]+$/)
  const heights = heightsOf(o.heights, 'town.heights', cells)
  const open = gridOf({ cells, heights })
  checkStairs(open, 'town.cells')
  const taken = new Set<string>()
  const buildings = list(o.buildings, 'town.buildings', 32, (x, p) => {
    const b = object(x, p, ['id', 'kind', 'x', 'z', 'w', 'd', 'storeys', 'door'])
    const at = tile({ x: b.x, z: b.z }, p, open)
    const w = int(b.w, `${p}.w`, 2, 8), d = int(b.d, `${p}.d`, 2, 8)
    const door = int(b.door, `${p}.door`, 0, w - 1)
    const level = open.level(at.x, at.z)
    for (let z = at.z; z < at.z + d; z++) for (let xx = at.x; xx < at.x + w; xx++) {
      if (open.kind(xx, z) !== 'floor' || open.level(xx, z) !== level) throw new DesignParseError(p, 'a building stands on level floor tiles')
      if (taken.has(`${xx},${z}`)) throw new DesignParseError(p, 'buildings overlap')
      taken.add(`${xx},${z}`)
    }
    return { id: id(b.id, `${p}.id`), kind: oneOf(b.kind, `${p}.kind`, ['inn', 'shop', 'house'] as const), ...at, w, d,
      storeys: int(b.storeys, `${p}.storeys`, 1, 2) as 1 | 2, door }
  })
  const g = gridOf({ cells, heights }, taken)
  const markers = list(o.markers, 'town.markers', 32, (x, p) => {
    const m = object(x, p, ['kind', 'x', 'z'])
    const t = tile({ x: m.x, z: m.z }, p, g)
    if (!g.walkable(t.x, t.z)) throw new DesignParseError(p, 'a marker must sit on a walkable tile')
    return { kind: oneOf(m.kind, `${p}.kind`, ['inn', 'shop', 'chapter', 'world-map', 'spawn'] as const), ...t }
  })
  const spawn = markers.find((m) => m.kind === 'spawn')
  if (!spawn) throw new DesignParseError('town.markers', 'expected a spawn')
  const seen = checkAllReached(g, spawn, 'town.cells')
  for (const [i, b] of buildings.entries()) {
    const front = { x: b.x + b.door, z: b.z + b.d }
    if (!seen.has(`${front.x},${front.z}`)) throw new DesignParseError(`town.buildings[${i}].door`, 'the tile in front of the door must be reachable')
  }
  const paths = list(o.paths, 'town.paths', 16, (x, p) => {
    const q = object(x, p, ['id', 'points', 'loop'])
    const points = list(q.points, `${p}.points`, 32, (t, tp) => {
      const pt = tile(t, tp, g)
      if (!seen.has(`${pt.x},${pt.z}`)) throw new DesignParseError(tp, 'a path point must be reachable')
      return pt
    })
    if (points.length < 2) throw new DesignParseError(`${p}.points`, 'expected at least two')
    if (typeof q.loop !== 'boolean') throw new DesignParseError(`${p}.loop`, 'expected true or false')
    return { id: id(q.id, `${p}.id`), points, loop: q.loop }
  })
  const props = o.props === undefined ? undefined : list(o.props, 'town.props', 128, (x, p) => {
    const q = object(x, p, ['name', 'x', 'z'])
    const t = tile({ x: q.x, z: q.z }, p, g)
    if (!g.walkable(t.x, t.z)) throw new DesignParseError(p, 'a prop must stand on a walkable tile')
    return { name: id(q.name, `${p}.name`), ...t }
  })
  return { id: id(o.id, 'town.id'), region: id(o.region, 'town.region'), cells, ...(heights ? { heights } : {}), buildings, paths, markers,
    ...(props ? { props } : {}) }
}

/** A town's grid with its buildings blocking walking. */
export const townGrid = (t: TownDesign): Grid =>
  gridOf(t, new Set(t.buildings.flatMap((b) => Array.from({ length: b.w * b.d }, (_, i) => `${b.x + (i % b.w)},${b.z + Math.floor(i / b.w)}`))))
