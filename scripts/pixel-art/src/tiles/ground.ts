// Seamless ground tiles. Every variant of a page shares the same 2 px band along its edges (grain and marks dealt once
// on a torus), and only the inside is re-dealt per variant. So any variant sits next to any other, in any arrangement,
// with the seam reading exactly as it would between two copies of one tile.
import { hex, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { Img } from './image.ts'
import { hash2, seedOf, TILE, wrap } from './noise.ts'

/** A stamp: rows of characters, each mapped to a color by the style's ink table ('.' leaves the pixel alone). */
export type Stamp = readonly string[]

export interface GroundStyle {
  page: string
  base: string
  /** Optional faint mowing bands, repeating within the tile (used by the Racing lawn). */
  stripes?: { width: number; color: string }
  /** Sparse one-pixel grain over the whole tile, a touch lighter or darker than the base. */
  grain: { light: string; dark: string; rate: number }
  ink: Readonly<Record<string, string>>
  /** Everyday marks (grass tufts, specks), dealt over every variant. */
  marks: readonly Stamp[]
  /** Darts thrown per deal, and the least distance between two marks. */
  darts: number
  spacing: number
  /** A little more detail for variants 2 and 3 (a flower tuft, a pebble), kept inside. */
  features: readonly [readonly Stamp[], readonly Stamp[]]
}

export const BAND = 2

export const inBand = (x: number, y: number) => {
  const a = wrap(x), b = wrap(y)
  return a < BAND || a >= TILE - BAND || b < BAND || b >= TILE - BAND
}

interface Placed {
  x: number
  y: number
  stamp: Stamp
}

function cells(stamp: Stamp, ax: number, ay: number): [number, number, string][] {
  const out: [number, number, string][] = []
  stamp.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && out.push([ax + dx, ay + dy, ch])))
  return out
}

const stampW = (s: Stamp) => Math.max(...s.map((r) => r.length))

function torusDist(a: Placed, b: Placed): number {
  const ax = a.x + stampW(a.stamp) / 2, ay = a.y + a.stamp.length / 2
  const bx = b.x + stampW(b.stamp) / 2, by = b.y + b.stamp.length / 2
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by)
  return Math.hypot(Math.min(dx, TILE - dx), Math.min(dy, TILE - dy))
}

function deal(label: string, stamps: readonly Stamp[], darts: number, spacing: number, accept: (px: [number, number, string][]) => boolean, taken: Placed[]): Placed[] {
  const r = rng(label)
  const out: Placed[] = []
  for (let i = 0; i < darts && stamps.length; i++) {
    const stamp = stamps[Math.floor(r() * stamps.length)] ?? stamps[0] ?? []
    const p: Placed = { x: Math.floor(r() * TILE), y: Math.floor(r() * TILE), stamp }
    if (!accept(cells(stamp, p.x, p.y))) continue
    if ([...taken, ...out].some((q) => torusDist(p, q) < spacing)) continue
    out.push(p)
  }
  return out
}

const insideOnly = (px: [number, number, string][]) => px.every(([x, y]) => x >= BAND && y >= BAND && x < TILE - BAND && y < TILE - BAND)

/** The marks every variant shares along its edges. */
function bandMarks(style: GroundStyle): Placed[] {
  return deal(`${style.page}:ground:band`, style.marks, style.darts, style.spacing, (px) => px.some(([x, y]) => inBand(x, y)), [])
}

export function groundTile(style: GroundStyle, variant: number): Img {
  const img = new Img(TILE, TILE).fill(hex(style.base))
  const light = hex(style.grain.light), dark = hex(style.grain.dark)
  const bandSeed = seedOf(`${style.page}:grain:band`), ownSeed = seedOf(`${style.page}:grain:v${variant}`)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (style.stripes && Math.floor(x / style.stripes.width) % 2) img.set(x, y, hex(style.stripes.color))
      const h = hash2(x, y, inBand(x, y) ? bandSeed : ownSeed)
      if (h < style.grain.rate / 2) img.set(x, y, dark)
      else if (h < style.grain.rate) img.set(x, y, light)
    }
  const band = bandMarks(style)
  const features = variant >= 2 ? deal(`${style.page}:feature:v${variant}`, style.features[variant - 2] ?? [], 40, 4, insideOnly, band).slice(0, 1) : []
  const own = deal(`${style.page}:ground:v${variant}`, style.marks, style.darts, style.spacing, insideOnly, [...band, ...features])
  const ink = (ch: string): RGBA => hex(style.ink[ch] ?? '#ff00ff')
  for (const p of [...band, ...own, ...features]) for (const [x, y, ch] of cells(p.stamp, p.x, p.y)) img.set(wrap(x), wrap(y), ink(ch))
  return img
}
