// Kit format v2 (LK2, P166): a 3D kit pack for the look path. One glb holds every piece as a named root node; this
// manifest says what each piece is: its role, its kind by the size rule (LR1), its footprint on the 2 m grid and its
// height, the pieces set into it (a wall's window or door), and where it came from with its licence. Pure: no three.js,
// so a game's tools, a native engine's importer (LK4) or the platform app can read it. Written by `pnpm look:pack`.

/** Metres a grid cell: the CC0 kits' modules and the look path's houses. */
export const KIT_PACK_GRID = 2
/** How a piece is drawn, by the size rule (LR1): a card below character size, a cluster at it, a mesh above. */
export type PieceKind = '2d' | '2.5d' | '3d'
export const PIECE_KINDS: readonly PieceKind[] = ['2d', '2.5d', '3d']
export type PieceRole = 'wall' | 'window' | 'door' | 'shutter' | 'corner' | 'floor' | 'roof' | 'gable' | 'chimney' | 'prop' | 'tree' | 'bush' | 'flower' | 'grass' | 'rock'
export const PIECE_ROLES: readonly PieceRole[] = ['wall', 'window', 'door', 'shutter', 'corner', 'floor', 'roof', 'gable', 'chimney', 'prop', 'tree', 'bush', 'flower', 'grass', 'rock']
export type PieceLicence = 'CC0-1.0' | 'original'

export interface KitPieceSocket {
  /** The piece set into this one. */
  piece: string
  /** Its offset from this piece's origin, in this piece's frame (metres); the same origin when absent. */
  offset?: [number, number, number]
}
export interface KitPiece {
  role: PieceRole
  kind: PieceKind
  /** Cells it covers on the 2 m grid (at least 1 × 1), and its height in metres. */
  footprint: { w: number; d: number }
  height: number
  /** Its bounds about its origin, in metres: [minX, minY, minZ, maxX, maxY, maxZ]. */
  bounds: [number, number, number, number, number, number]
  sockets?: KitPieceSocket[]
  source: { kit: string; file: string; licence: PieceLicence }
}
export interface KitPack {
  formatVersion: 2
  /** `kit-pack-<name>`. */
  id: string
  /** The glb the pieces are in: a hash-named file beside this manifest. */
  glb: { path: string; bytes: number; sha256: string }
  grid: typeof KIT_PACK_GRID
  /** A storey's height in metres (walls stack by it). */
  storey: number
  /** The pixel scale the look path redraws the pack's textures at (LR4). */
  pixel: { texels: number; levels: number }
  pieces: Record<string, KitPiece>
}

export class KitPackParseError extends Error {
  constructor(readonly path: string, message: string) {
    super(`${path}: ${message}`)
    this.name = 'KitPackParseError'
  }
}

type Obj = Record<string, unknown>
const obj = (v: unknown, path: string): Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new KitPackParseError(path, 'expected an object')
  return v as Obj
}
const num = (v: unknown, path: string, min: number, max: number): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new KitPackParseError(path, `expected a number ${min}–${max}`)
  return v
}
const int = (v: unknown, path: string, min: number, max: number): number => {
  const n = num(v, path, min, max)
  if (!Number.isInteger(n)) throw new KitPackParseError(path, `expected an integer ${min}–${max}`)
  return n
}
function oneOf<T extends string>(v: unknown, path: string, all: readonly T[]): T {
  if (typeof v !== 'string' || !all.includes(v as T)) throw new KitPackParseError(path, `expected one of ${all.join(', ')}`)
  return v as T
}
const triple = (v: unknown, path: string): [number, number, number] => {
  if (!Array.isArray(v) || v.length !== 3) throw new KitPackParseError(path, 'expected [x, y, z]')
  return [num(v[0], `${path}[0]`, -100, 100), num(v[1], `${path}[1]`, -100, 100), num(v[2], `${path}[2]`, -100, 100)]
}
/** A piece's name: its node name in the glb (letters, digits and underscores, as the kits name them). */
export const PIECE_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

export function parseKitPack(value: unknown): KitPack {
  const o = obj(value, 'pack')
  if (o.formatVersion !== 2) throw new KitPackParseError('pack.formatVersion', 'expected 2')
  if (typeof o.id !== 'string' || !/^kit-pack-[a-z0-9]+(-[a-z0-9]+)*$/.test(o.id)) throw new KitPackParseError('pack.id', 'expected kit-pack-<name>')
  if (o.grid !== KIT_PACK_GRID) throw new KitPackParseError('pack.grid', `expected ${KIT_PACK_GRID}`)
  const g = obj(o.glb, 'pack.glb')
  if (typeof g.path !== 'string' || !/^[a-z0-9-]+\.[a-f0-9]{16}\.glb$/.test(g.path)) throw new KitPackParseError('pack.glb.path', 'expected a hash-named glb')
  if (typeof g.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(g.sha256)) throw new KitPackParseError('pack.glb.sha256', 'expected a lowercase hex SHA-256')
  if (!g.path.includes(g.sha256.slice(0, 16))) throw new KitPackParseError('pack.glb.path', 'expected the name to carry its hash')
  const glb = { path: g.path, bytes: int(g.bytes, 'pack.glb.bytes', 1, 200 * 2 ** 20), sha256: g.sha256 }
  const px = obj(o.pixel, 'pack.pixel')
  const pixel = { texels: int(px.texels, 'pack.pixel.texels', 8, 1024), levels: int(px.levels, 'pack.pixel.levels', 2, 256) }
  const pieces: Record<string, KitPiece> = {}
  const raw = obj(o.pieces, 'pack.pieces')
  if (Object.keys(raw).length === 0) throw new KitPackParseError('pack.pieces', 'expected at least one piece')
  for (const [name, value] of Object.entries(raw)) {
    const p = `pack.pieces.${name}`
    if (!PIECE_NAME.test(name)) throw new KitPackParseError(p, 'expected a node name (letters, digits, underscores)')
    const q = obj(value, p)
    const f = obj(q.footprint, `${p}.footprint`), s = obj(q.source, `${p}.source`)
    const b = q.bounds
    if (!Array.isArray(b) || b.length !== 6) throw new KitPackParseError(`${p}.bounds`, 'expected six numbers')
    const bounds = b.map((n, i) => num(n, `${p}.bounds[${i}]`, -100, 100)) as KitPiece['bounds']
    if (bounds[0] > bounds[3] || bounds[1] > bounds[4] || bounds[2] > bounds[5]) throw new KitPackParseError(`${p}.bounds`, 'expected min before max')
    if (typeof s.kit !== 'string' || !s.kit || typeof s.file !== 'string' || !s.file) throw new KitPackParseError(`${p}.source`, 'expected its kit and file')
    const piece: KitPiece = {
      role: oneOf(q.role, `${p}.role`, PIECE_ROLES), kind: oneOf(q.kind, `${p}.kind`, PIECE_KINDS),
      footprint: { w: int(f.w, `${p}.footprint.w`, 1, 32), d: int(f.d, `${p}.footprint.d`, 1, 32) },
      height: num(q.height, `${p}.height`, 0, 100), bounds,
      source: { kit: s.kit, file: s.file, licence: oneOf(s.licence, `${p}.source.licence`, ['CC0-1.0', 'original'] as const) },
    }
    if (q.sockets !== undefined) {
      if (!Array.isArray(q.sockets) || q.sockets.length > 8) throw new KitPackParseError(`${p}.sockets`, 'expected up to 8 sockets')
      piece.sockets = q.sockets.map((v, i) => {
        const k = obj(v, `${p}.sockets[${i}]`)
        if (typeof k.piece !== 'string' || !PIECE_NAME.test(k.piece)) throw new KitPackParseError(`${p}.sockets[${i}].piece`, 'expected a piece name')
        return k.offset === undefined ? { piece: k.piece } : { piece: k.piece, offset: triple(k.offset, `${p}.sockets[${i}].offset`) }
      })
    }
    pieces[name] = piece
  }
  for (const [name, piece] of Object.entries(pieces)) for (const [i, s] of (piece.sockets ?? []).entries()) {
    if (!pieces[s.piece]) throw new KitPackParseError(`pack.pieces.${name}.sockets[${i}].piece`, `no piece ${s.piece} in the pack`)
  }
  return { formatVersion: 2, id: o.id, glb, grid: KIT_PACK_GRID, storey: num(o.storey, 'pack.storey', 1, 10), pixel, pieces }
}

/** A piece's role and kind from its name, by the CC0 kits' naming (the importer's default; a kit may override it). */
export function pieceRole(name: string): PieceRole {
  if (/^WindowShutters_/.test(name)) return 'shutter'
  if (/^Window_/.test(name)) return 'window'
  if (/^Door_/.test(name)) return 'door'
  if (/^Wall_/.test(name)) return 'wall'
  if (/^Corner_/.test(name)) return 'corner'
  if (/^Floor_/.test(name)) return 'floor'
  if (/^Roof_Front_/.test(name)) return 'gable'
  if (/^Roof_/.test(name)) return 'roof'
  if (/Chimney/.test(name)) return 'chimney'
  if (/Tree|^Pine_/.test(name)) return 'tree'
  if (/^Bush_/.test(name)) return 'bush'
  if (/^Flower_/.test(name)) return 'flower'
  if (/^Grass_/.test(name)) return 'grass'
  if (/^Rock_/.test(name)) return 'rock'
  return 'prop'
}

/** The pieces a wall holds by the kits' naming: a window of its shape at its origin, a door offset along it. */
export function wallSockets(name: string, has: (piece: string) => boolean): KitPieceSocket[] {
  const out: KitPieceSocket[] = []
  const window = /_Window_(Wide|Thin)_(Flat|Round)$/.exec(name)
  if (window && has(`Window_${window[1]}_${window[2]}1`)) out.push({ piece: `Window_${window[1]}_${window[2]}1` })
  // The kit's door leaf hangs from its hinge, 0.53 m along the wall from the opening's middle (LK1's measurement).
  if (/_Door_Round$/.test(name) && has('Door_1_Round')) out.push({ piece: 'Door_1_Round', offset: [-0.53, 0, 0] })
  if (/_Door_Flat$/.test(name) && has('Door_1_Flat')) out.push({ piece: 'Door_1_Flat', offset: [-0.53, 0, 0] })
  return out
}
