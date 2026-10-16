// Sample Hub pages for review: a path network (a trunk and branches), the wilds stream, ground variants by a seeded
// hash and a scatter of props, composed the way the game will lay the tiles out.
import { rng } from '../rng.ts'
import { composeMap, type Layer } from './compose.ts'
import { Img } from './image.ts'
import { TILE } from './noise.ts'

export const MAP_COLS = 12
export const MAP_ROWS = 22

type Cells = Set<string>
const key = (x: number, y: number) => `${x},${y}`
const has = (c: Cells, x: number, y: number) => c.has(key(x, y))

/** True if marking (x, y) would close a 2×2 block (4-bit autotiles draw blocks as little loops, not as fills). */
export function closesBlock(c: Cells, x: number, y: number): boolean {
  for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]] as const) {
    const ox = x + dx, oy = y + dy
    const cells = [[ox, oy], [ox + 1, oy], [ox, oy + 1], [ox + 1, oy + 1]].filter(([cx, cy]) => !(cx === x && cy === y))
    if (cells.every(([cx, cy]) => has(c, cx ?? 0, cy ?? 0))) return true
  }
  return false
}

function mark(c: Cells, x: number, y: number): void {
  if (x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS && !closesBlock(c, x, y)) c.add(key(x, y))
}

/** A trunk running top to bottom with a couple of jogs, branches off it to either side, and one lone patch. */
export function pathNetwork(label: string, avoid: (x: number, y: number) => boolean, maxCol = MAP_COLS - 1): Cells {
  const r = rng(`${label}:network`)
  const c: Cells = new Set()
  let col = 4 + Math.floor(r() * 3)
  const jogs = new Set([6 + Math.floor(r() * 3), 14 + Math.floor(r() * 3)])
  const branchRows: number[] = []
  for (let y = 0; y < MAP_ROWS; y++) {
    mark(c, col, y)
    if (jogs.has(y)) {
      const to = Math.max(2, Math.min(maxCol - 3, col + (r() < 0.5 ? -2 : 2)))
      for (let x = Math.min(col, to); x <= Math.max(col, to); x++) mark(c, x, y)
      col = to
    } else if (y >= 2 && y <= MAP_ROWS - 3 && !jogs.has(y - 1) && !jogs.has(y + 1) && (branchRows.length === 0 || y - (branchRows[branchRows.length - 1] ?? 0) >= 4)) {
      branchRows.push(y)
      const sides = r() < 0.35 ? [-1, 1] : [r() < 0.5 ? -1 : 1]
      for (const side of sides) {
        const end = side < 0 ? 1 + Math.floor(r() * 2) : maxCol - 1 - Math.floor(r() * 2)
        let x = col
        while (x !== end && !avoid(x + side, y)) {
          x += side
          mark(c, x, y)
        }
        // Some branches turn at the end, toward a building lot above or below.
        if (r() < 0.5) mark(c, x, y + (r() < 0.5 ? -1 : 1))
      }
    }
  }
  // A lone stepping-stone patch, away from everything.
  for (let i = 0; i < 50; i++) {
    const x = 1 + Math.floor(r() * (maxCol - 1)), y = 1 + Math.floor(r() * (MAP_ROWS - 2))
    let clear = true
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (has(c, x + dx, y + dy) || avoid(x + dx, y + dy)) clear = false
    if (clear) {
      c.add(key(x, y))
      break
    }
  }
  return c
}

/** A stream meandering down the right side, with a side arm off to the edge and a lone pond. */
export function stream(label: string): Cells {
  const r = rng(`${label}:stream`)
  const c: Cells = new Set()
  let col = 9
  for (let y = 0; y < MAP_ROWS; y++) {
    mark(c, col, y)
    if (y > 1 && y < MAP_ROWS - 2 && r() < 0.2) {
      const to = Math.max(8, Math.min(10, col + (r() < 0.5 ? -1 : 1)))
      mark(c, to, y)
      col = to
    }
  }
  // A side arm off to the right edge, from a row where it can join without closing a 2×2 block.
  const rightmost = (y: number) => Math.max(...[...c].map((k) => k.split(',').map(Number)).filter(([, cy]) => cy === y).map(([x]) => x ?? 0))
  const start = 8 + Math.floor(r() * 6)
  for (let k = 0; k < MAP_ROWS - 4; k++) {
    const y = 2 + ((start - 2 + k) % (MAP_ROWS - 4))
    const x0 = rightmost(y) + 1
    if (x0 >= MAP_COLS || closesBlock(c, x0, y) || has(c, x0, y - 1) || has(c, x0, y + 1)) continue
    for (let x = x0; x < MAP_COLS; x++) mark(c, x, y)
    break
  }
  c.add(key(1, 15 + Math.floor(r() * 4)))
  return c
}

export interface PropSprite {
  id: string
  img: Img
  /** 'path': likes to stand beside a path (lamps, benches); 'open': stands away from it (trees, rocks). */
  near: 'path' | 'open'
  weight: number
}

/** Ground and networks, then props scattered on free cells and drawn in row order (tall props rise into the row above). */
export function sampleMap(label: string, ground: readonly Img[], layers: readonly (Layer & { cells: Cells })[], props: readonly PropSprite[], reserved: ReadonlySet<string> = new Set()): Img {
  const map = composeMap(label, MAP_COLS, MAP_ROWS, ground, layers)
  const taken = (x: number, y: number) => reserved.has(key(x, y)) || layers.some((l) => has(l.cells, x, y))
  const besidePath = (x: number, y: number) => [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => taken(x + (dx ?? 0), y + (dy ?? 0)))
  const r = rng(`${label}:props`)
  const placed: { x: number; y: number; p: PropSprite }[] = []
  const occupied = new Set<string>()
  const total = props.reduce((n, p) => n + p.weight, 0)
  for (let i = 0; i < 400 && placed.length < 26; i++) {
    const x = Math.floor(r() * MAP_COLS), y = 1 + Math.floor(r() * (MAP_ROWS - 1))
    let pick = r() * total
    const p = props.find((q) => (pick -= q.weight) < 0) ?? props[0]
    if (!p || taken(x, y) || occupied.has(key(x, y))) continue
    const tall = p.img.h > TILE
    if (tall && (occupied.has(key(x, y - 1)) || taken(x, y - 1) || y < 1)) continue
    if (p.near === 'path' ? !besidePath(x, y) : besidePath(x, y)) continue
    // Keep some breathing room: no two props side by side unless it's a cluster of the same kind.
    const crowded = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const q = placed.find((o) => o.x === x + (dx ?? 0) && o.y === y + (dy ?? 0))
      return q !== undefined && q.p.id !== p.id
    })
    if (crowded) continue
    placed.push({ x, y, p })
    occupied.add(key(x, y))
    if (tall) occupied.add(key(x, y - 1))
  }
  placed.sort((a, b) => a.y - b.y || a.x - b.x)
  for (const { x, y, p } of placed) map.draw(p.img, x * TILE, (y + 1) * TILE - p.img.h)
  return map
}
