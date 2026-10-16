// The Hub's ground as a tile grid (uma-racer's `hub/scene/terrain.ts`, from uma-rpg's D61 and D64, with uma-rpg's stream;
// P48): seeded ground variants, a trunk road down the middle, a branch path from every place's door to it, a lane round
// any building on the road, an optional stream down the east edge, and props scattered on free ground away from paths,
// water, buildings and label rows. Pure, so the same page always lays out the same way; the scene only draws what this
// returns. Frame ids follow uma-art's `tiles` atlas: `<tiles>/ground-<n>`, `<tiles>/path-<mask>`, `<tiles>/water-<mask>`,
// `<tiles>/<prop>`.
import { placeCell } from './grid.js'
import type { PlaceAt, TileProp } from './types.js'

/** Connection bits for path and water masks; a map edge counts as connected. */
export const N = 1, E = 2, S = 4, W = 8

/** Each uma-art tile page's props: uma-rpg's lists, A01's for Racing and H31's for Battle. */
export const TILE_PROPS: Readonly<Record<string, readonly TileProp[]>> = {
  farmlands: [{ id: 'bush', tall: false }, { id: 'flowers-a', tall: false }, { id: 'flowers-b', tall: false }, { id: 'hay-bale', tall: false }, { id: 'tree', tall: true }, { id: 'rock', tall: false }],
  wilds: [{ id: 'pine', tall: true }, { id: 'boulder', tall: false }, { id: 'rock', tall: false }, { id: 'grass-tuft', tall: false }, { id: 'mushrooms', tall: false }, { id: 'log', tall: false }],
  learning: [{ id: 'lamp', tall: true }, { id: 'hedge', tall: false }, { id: 'bench', tall: false }, { id: 'banner', tall: true }, { id: 'flower-bed', tall: false }],
  town: [{ id: 'lamp', tall: true }, { id: 'barrel', tall: false }, { id: 'crate', tall: false }, { id: 'flower-pot', tall: false }, { id: 'bench', tall: false }, { id: 'tree', tall: true }],
  racing: [{ id: 'rail', tall: false }, { id: 'furlong-post', tall: true }, { id: 'pennant', tall: true }, { id: 'flower-box', tall: false }],
  battle: [{ id: 'banner', tall: true }, { id: 'weapon-rack', tall: false }, { id: 'training-dummy', tall: true }, { id: 'torch', tall: true }, { id: 'crate', tall: false }, { id: 'shield-stand', tall: false }],
}

export interface TerrainPlace {
  readonly id: string
  readonly at: PlaceAt
}

export interface Terrain {
  readonly cols: number
  readonly rows: number
  /** One frame id per cell, row by row: ground, path or water. */
  readonly cells: readonly string[]
  /** Props, bottom-left cell; tall ones take the cell above too. */
  readonly props: readonly { readonly col: number; readonly row: number; readonly frame: string; readonly tall: boolean }[]
  /** Each place's footprint: columns c−1…c+1 and rows r−2…r. */
  readonly footprints: Readonly<Record<string, { readonly col: number; readonly row: number }>>
}

export interface TerrainOptions {
  /** The page id: it seeds the layout, so two pages on the same tiles still differ. */
  readonly page: string
  /** The uma-art tile page drawn with. */
  readonly tiles: string
  readonly places: readonly TerrainPlace[]
  readonly cols: number
  readonly rows: number
  /** Spots kept free of props without a building, such as a plaza where an Uma stands. */
  readonly clearings?: readonly PlaceAt[]
  /** Props to scatter; `TILE_PROPS[tiles]` by default. */
  readonly props?: readonly TileProp[]
  /** A stream down the east edge (uma-rpg's Wilds). */
  readonly stream?: boolean
}

function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** A page's seed, from its id: the same formula both games used before the kit. */
export const pageSeed = (page: string): number => page.length * 31 + page.charCodeAt(0)

export function layTerrain({ page, tiles, places, cols, rows, clearings = [], props: propList, stream = false }: TerrainOptions): Terrain {
  const seed = pageSeed(page)
  const kind: ('ground' | 'path' | 'water' | 'block' | 'clear')[] = Array.from({ length: cols * rows }, () => 'ground')
  const at = (c: number, r: number) => (c >= 0 && r >= 0 && c < cols && r < rows ? kind[r * cols + c] : undefined)
  const set = (c: number, r: number, k: (typeof kind)[number], over: readonly string[] = ['ground', 'clear']) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return
    if (over.includes(kind[r * cols + c]!)) kind[r * cols + c] = k
  }
  const footprints: Record<string, { col: number; row: number }> = {}
  for (const p of places) {
    const cell = placeCell(p.at, cols, rows)
    footprints[p.id] = cell
    for (let c = cell.col - 1; c <= cell.col + 1; c++) for (let r = cell.row - 2; r <= cell.row; r++) set(c, r, 'block', ['ground', 'clear', 'path', 'water'])
  }
  // A stream down the east edge, clear of every building, wobbling by one column every five rows.
  if (stream) {
    for (let r = 0; r < rows; r++) {
      const wobble = hash(Math.floor(r / 5), 1, seed) > 0.5 ? 1 : 0
      set(cols - 2 + wobble, r, 'water')
      // Where the stream steps sideways, both cells carry water so the banks join.
      if (r > 0 && at(cols - 2 + wobble, r - 1) !== 'water') set(cols - 2 + (1 - wobble), r, 'water')
    }
  }
  // One road down the middle. No cross road: place rows sit too close together (uma-rpg D64).
  const trunk = Math.floor(cols / 2)
  for (let r = 0; r < rows; r++) set(trunk, r, 'path')
  // Branches: from each place's door (the cell below its footprint) to the trunk.
  for (const p of places) {
    const { col, row } = footprints[p.id]!
    const door = row + 1
    if (door >= rows) continue
    const step = trunk >= col ? 1 : -1
    for (let c = col; c !== trunk + step; c += step) set(c, door, 'path')
  }
  // A building standing on the road gets a lane round one side of it, from the road above its roof down to its door, so
  // the road still runs from edge to edge. A lane joins a road it meets instead of doubling it, and is never laid where it
  // would close a 2 × 2 of road (uma-platform D90), which the path tiles can't draw.
  const isPath = (c: number, r: number) => at(c, r) === 'path'
  const closesSquare = (c: number, r: number) => [[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([dc, dr]) =>
    [[0, 0], [1, 0], [0, 1], [1, 1]].every(([ec, er]) => {
      const cc = c + dc! + ec!
      const rr = r + dr! + er!
      return (cc === c && rr === r) || isPath(cc, rr)
    }))
  for (const p of places) {
    const { col, row } = footprints[p.id]!
    if (col !== trunk) continue
    const top = row - 3
    const bottom = row + 1
    for (const side of hash(col, row, seed) < 0.5 ? [-1, 1] : [1, -1]) {
      const lane = col + side * 2
      const joined = isPath(lane, top - 1)
      const route: [number, number][] = joined ? [] : [[col + side, top]]
      for (let r = top; r <= bottom; r++) route.push([lane, r])
      route.push([col + side, bottom])
      const onMap = route.filter(([c, r]) => c >= 0 && r >= 0 && c < cols && r < rows)
      if (onMap.some(([c, r]) => at(c, r) === 'block' || at(c, r) === 'water')) continue
      const laid: [number, number][] = []
      let closed = false
      for (const [c, r] of onMap) {
        if (isPath(c, r)) continue
        if (closesSquare(c, r)) {
          closed = true
          break
        }
        set(c, r, 'path')
        laid.push([c, r])
      }
      if (!closed) break
      for (const [c, r] of laid) kind[r * cols + c] = 'ground'
    }
  }
  // Keep each place's label rows clear of props: its name pill and up to two rows of pips hang under the door.
  for (const p of places) {
    const { col, row } = footprints[p.id]!
    for (let c = col - 2; c <= col + 2; c++) for (let r = row + 1; r <= row + 3; r++) set(c, r, 'clear')
  }
  for (const spot of clearings) {
    const { col, row } = placeCell(spot, cols, rows)
    for (let c = col - 2; c <= col + 2; c++) for (let r = row - 3; r <= row + 2; r++) set(c, r, 'clear')
  }
  // Paths and water at the map's edge run on off the map.
  const mask = (c: number, r: number, k: 'path' | 'water') => {
    const same = (cc: number, rr: number) => {
      const v = at(cc, rr)
      return v === undefined ? true : v === k
    }
    return (same(c, r - 1) ? N : 0) | (same(c + 1, r) ? E : 0) | (same(c, r + 1) ? S : 0) | (same(c - 1, r) ? W : 0)
  }
  const cells: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = kind[r * cols + c]
      if (k === 'path') cells.push(`${tiles}/path-${mask(c, r, 'path')}`)
      else if (k === 'water') cells.push(`${tiles}/water-${mask(c, r, 'water')}`)
      else {
        const v = hash(c, r, seed)
        cells.push(`${tiles}/ground-${v < 0.62 ? 0 : v < 0.82 ? 1 : v < 0.92 ? 2 : 3}`)
      }
    }
  }
  // Props: on plain ground away from paths, water and buildings, about one cell in eight.
  const props: { col: number; row: number; frame: string; tall: boolean }[] = []
  const free = (c: number, r: number) => at(c, r) === 'ground'
  const nearBusy = (c: number, r: number) => {
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      const v = at(c + dc, r + dr)
      if (v === 'block' || v === 'water' || (v === 'path' && dc === 0 && dr === 0)) return true
    }
    return false
  }
  const list = propList ?? TILE_PROPS[tiles] ?? []
  if (list.length > 0) {
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!free(c, r) || nearBusy(c, r) || hash(c, r, seed + 7) > 0.12) continue
        const prop = list[Math.floor(hash(c, r, seed + 13) * list.length)]!
        if (prop.tall && (!free(c, r - 1) || nearBusy(c, r - 1))) continue
        if (props.some((p) => Math.abs(p.col - c) <= 1 && Math.abs(p.row - r) <= 1)) continue
        props.push({ col: c, row: r, frame: `${tiles}/${prop.id}`, tall: prop.tall })
      }
    }
  }
  return { cols, rows, cells, props, footprints }
}
