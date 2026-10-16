// Path materials drawn over a page's ground-0. Every texture is sampled from a pattern that repeats every tile and is
// only masked by the autotile region, so any two masks that share an edge join without a seam.
import { hex, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { bandRegion, E, N, N4, N8, type Region, S, skeletonDist, W } from './autotile.ts'
import { BAND, type Stamp } from './ground.ts'
import { Img } from './image.ts'
import { hash2, periodicNoise, seedOf, TILE, wrap } from './noise.ts'

export type PathPainter = (mask: number, ground: Img) => Img

/** A01's raked dirt track. The white edging follows only the turf boundary, never cuts across a joined arm. */
export const racingPath: PathPainter = (mask, ground) => {
  const img = ground.crop(0, 0, TILE, TILE)
  const inside = bandRegion(mask, 'round', 5, 0, () => 0.5)
  const dirt = hex('#b88b60'), rake = hex('#aa7e55'), light = hex('#c6986b')
  const rail = hex('#ecebdc'), litRail = hex('#fff8e5'), shadow = hex('#827864')
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    if (!inside(x, y)) continue
    const top = !inside(x, y - 1), left = !inside(x - 1, y)
    const edge = top || left || !inside(x, y + 1) || !inside(x + 1, y)
    // Periodic short rake strokes, not stones or pebbles. Rail posts sit on the inner edge, leaving ground seams alone.
    let color = y % 4 === 1 && x % 4 !== 3 ? rake : (x + y) % 8 === 0 ? light : dirt
    if (N4.some(([dx, dy]) => !inside(x + dx * 2, y + dy * 2))) color = shadow
    if (edge) color = top || left ? litRail : rail
    img.set(x, y, color)
  }
  return img
}

/** Stamps dealt once on a torus (same anchors for every mask), drawn wherever they fit wholly inside a region. */
export interface Scatter {
  stamps: readonly Stamp[]
  ink: Readonly<Record<string, string>>
  darts: number
  spacing: number
}

interface Anchor {
  x: number
  y: number
  stamp: Stamp
}

export function dealTorus(label: string, s: Scatter): Anchor[] {
  const r = rng(label)
  const out: Anchor[] = []
  for (let i = 0; i < s.darts && s.stamps.length; i++) {
    const a: Anchor = { x: Math.floor(r() * TILE), y: Math.floor(r() * TILE), stamp: s.stamps[Math.floor(r() * s.stamps.length)] ?? [] }
    const near = out.some((b) => {
      const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y)
      return Math.hypot(Math.min(dx, TILE - dx), Math.min(dy, TILE - dy)) < s.spacing
    })
    if (!near) out.push(a)
  }
  return out
}

function stampCells(stamp: Stamp, ax: number, ay: number): [number, number, string][] {
  const out: [number, number, string][] = []
  stamp.forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && out.push([ax + dx, ay + dy, ch])))
  return out
}

/**
 * Draws each anchor whose pixels (and, with `margin`, their 8 neighbours) pass `fits`. Stamps stay out of the 2 px edge
 * strips, where a junction's second arm could change what fits; so the strips stay identical across masks.
 */
export function drawScatter(img: Img, anchors: readonly Anchor[], ink: Readonly<Record<string, string>>, fits: Region, margin = true): void {
  for (const a of anchors) {
    const px = stampCells(a.stamp, a.x, a.y)
    if (!px.every(([x, y]) => x >= BAND && y >= BAND && x < TILE - BAND && y < TILE - BAND)) continue
    if (!px.every(([x, y]) => fits(x, y) && (!margin || N8.every(([dx, dy]) => fits(x + dx, y + dy))))) continue
    for (const [x, y, ch] of px) img.set(x, y, hex(ink[ch] ?? '#ff00ff'))
  }
}

const clone = (g: Img) => g.crop(0, 0, g.w, g.h)

// ---------------------------------------------------------------------------------------------------- dirt and trails

export interface DirtSpec {
  page: string
  half: number
  wobble: number
  /** Lattice cells of the edge noise per tile (more cells: a busier edge). */
  edgeCells: number
  base: string
  /** Inner edge on the top and left: shade cast by the grass lip. */
  shade: string
  /** Inner edge on the bottom and right: the lit lip of the rut. */
  lit: string
  /** The ground's own pixels touching the path: a darker grass (or earth) fringe. */
  fringe: string
  speck: { dark: string; light: string; rate: number }
  scatter: Scatter
}

export function dirtPath(spec: DirtSpec): PathPainter {
  const noise = periodicNoise(`${spec.page}:path:edge`, spec.edgeCells)
  const anchors = dealTorus(`${spec.page}:path:scatter`, spec.scatter)
  const speckSeed = seedOf(`${spec.page}:path:speck`)
  const c = { base: hex(spec.base), shade: hex(spec.shade), lit: hex(spec.lit), fringe: hex(spec.fringe), dark: hex(spec.speck.dark), light: hex(spec.speck.light) }
  return (mask, ground) => {
    const img = clone(ground)
    const inside = bandRegion(mask, 'round', spec.half, spec.wobble, noise)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (!inside(x, y)) {
          if (N4.some(([dx, dy]) => inside(x + dx, y + dy))) img.set(x, y, c.fringe)
          continue
        }
        const h = hash2(wrap(x), wrap(y), speckSeed)
        let col: RGBA = h < spec.speck.rate / 2 ? c.dark : h < spec.speck.rate ? c.light : c.base
        if (!inside(x, y - 1) || !inside(x - 1, y)) col = c.shade
        else if (!inside(x, y + 1) || !inside(x + 1, y)) col = c.lit
        img.set(x, y, col)
      }
    drawScatter(img, anchors, spec.scatter.ink, inside)
    return img
  }
}

// ---------------------------------------------------------------------------------------------- cells (stone paving)

/** The cell around coordinate v on an axis cut by `lines` (repeating every tile): its bounding lines, or null on a line. */
function axisCell(v: number, lines: readonly number[]): [number, number] | null {
  const base = v - wrap(v)
  let lo = -Infinity, hi = Infinity
  for (const l of lines)
    for (const k of [-TILE, 0, TILE]) {
      const c = base + l + k
      if (c <= v && c > lo) lo = c
      if (c >= v && c < hi) hi = c
    }
  return lo === v ? null : [lo, hi]
}

export interface FlagSpec {
  page: string
  half: number
  /** Joint lines across each axis, repeating every tile. */
  lines: readonly number[]
  slabs: readonly string[]
  light: string
  shadow: string
  joint: string
  /** Outer kerb line where the paving meets the ground. */
  kerb: string
  kerbShade: string
}

/** Square-cut slabs on a fixed grid; a slab is laid when its centre is on the path, and the paving gets a kerb line. */
export function flagstonePath(spec: FlagSpec): PathPainter {
  const tone = spec.slabs.map((s) => hex(s))
  const light = hex(spec.light), shadow = hex(spec.shadow), joint = hex(spec.joint), kerb = hex(spec.kerb), kerbShade = hex(spec.kerbShade)
  const seed = seedOf(`${spec.page}:slabs`)
  return (mask, ground) => {
    const img = clone(ground)
    const slabAt = (x: number, y: number) => {
      const cx = axisCell(x, spec.lines), cy = axisCell(y, spec.lines)
      if (!cx || !cy) return null
      const laid = skeletonDist(mask, 'square', (cx[0] + cx[1]) / 2 + 0.5, (cy[0] + cy[1]) / 2 + 0.5) < spec.half
      return laid ? { cx, cy } : null
    }
    const paved = (x: number, y: number) => slabAt(x, y) !== null || N8.some(([dx, dy]) => slabAt(x + dx, y + dy) !== null)
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const slab = slabAt(x, y)
        if (slab) {
          const [x0, x1] = slab.cx, [y0, y1] = slab.cy
          const t = tone[Math.floor(hash2(wrap(x0), wrap(y0), seed) * tone.length)] ?? tone[0] ?? light
          // Flat slabs: a lit top edge and a shaded bottom edge, nothing more, so the paving stays calm.
          img.set(x, y, y === y0 + 1 && x < x1 - 1 ? light : y === y1 - 1 && x > x0 + 1 ? shadow : t)
          continue
        }
        if (!N8.some(([dx, dy]) => slabAt(x + dx, y + dy) !== null)) continue
        // A joint between slabs, or the kerb where the paving ends (darker on the bottom and right, away from the light).
        const outer = N4.some(([dx, dy]) => !paved(x + dx, y + dy))
        if (!outer) img.set(x, y, joint)
        else img.set(x, y, slabAt(x, y - 1) || slabAt(x - 1, y) || slabAt(x - 1, y - 1) ? kerbShade : kerb)
      }
    return img
  }
}

export interface CobbleSpec {
  page: string
  half: number
  wobble: number
  /** Stone widths per course (each summing to a tile) and each course's offset. Courses are 4 px: 3 stone + 1 gap. */
  courses: readonly { offset: number; widths: readonly number[] }[]
  /** Stone ramps: [highlight, light, base, shadow, deep]. */
  stones: readonly (readonly [string, string, string, string, string])[]
  /** The mortar bed between stones. */
  gap: string
  /** Mortar along the road's edge, a shade darker. */
  rim: string
  /** Ground darkened just outside the road on its bottom and right (the stones sit a touch proud). */
  cast: string
}

/**
 * Rounded cobbles in staggered courses on a mortar bed, clipped to a band with a softly wobbling edge, so the road reads
 * as one continuous band. A stone cut down to a sliver at the edge is left as mortar.
 */
export function cobblePath(spec: CobbleSpec): PathPainter {
  const noise = periodicNoise(`${spec.page}:path:edge`, 4)
  const seed = seedOf(`${spec.page}:cobbles`)
  const ramps = spec.stones.map((s) => s.map((c) => hex(c)))
  const gap = hex(spec.gap), rim = hex(spec.rim), cast = hex(spec.cast)
  const breaks = spec.courses.map((c) => {
    const out: number[] = []
    let at = c.offset
    for (const w of c.widths) {
      at += w
      out.push(wrap(at - 1))
    }
    return out
  })
  /** The stone under (x, y) as its pixel bounds, or null on a gap. */
  const stoneAt = (x: number, y: number) => {
    if (wrap(y, 4) === 3) return null
    const row = Math.floor(y / 4)
    const cx = axisCell(x, breaks[wrap(row, spec.courses.length)] ?? [])
    return cx ? { x0: cx[0] + 1, x1: cx[1] - 1, y0: row * 4, y1: row * 4 + 2 } : null
  }
  /** One arm alone: judges stones at the tile edge, so a junction's other arms can't change what crosses the seam. */
  const arms = new Map([N, E, S, W].map((bit) => [bit, bandRegion(bit, 'round', spec.half, spec.wobble, noise)]))
  const edgeOf = (x: number, y: number) => (y < 2 ? N : y >= TILE - 2 ? S : x < 2 ? W : x >= TILE - 2 ? E : 0)
  return (mask, ground) => {
    const img = clone(ground)
    const road = bandRegion(mask, 'round', spec.half, spec.wobble, noise)
    const whole = (st: { x0: number; x1: number; y0: number; y1: number }) => {
      let judge = road
      for (let y = st.y0; y <= st.y1; y++)
        for (let x = st.x0; x <= st.x1; x++) if (img.inside(x, y) && edgeOf(x, y) && road(x, y)) judge = arms.get(edgeOf(x, y)) ?? road
      let n = 0, all = 0
      for (let y = st.y0; y <= st.y1; y++) for (let x = st.x0; x <= st.x1; x++, all++) if (judge(x, y)) n++
      return n >= 3
    }
    const stone = (x: number, y: number) => {
      const st = road(x, y) ? stoneAt(x, y) : null
      return st && whole(st) ? st : null
    }
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        if (!road(x, y)) {
          if (road(x - 1, y) || road(x, y - 1)) img.set(x, y, cast)
          continue
        }
        const edge = N4.some(([dx, dy]) => !road(x + dx, y + dy))
        const st = stone(x, y)
        if (!st) {
          img.set(x, y, edge ? rim : gap)
          continue
        }
        const r = ramps[Math.floor(hash2(wrap(st.x0), wrap(st.y0), seed) * ramps.length)] ?? ramps[0] ?? []
        const u = x - st.x0, v = y - st.y0, last = st.x1 - st.x0
        // Rounded: wide stones lose all four corners, narrow ones their bottom-right corner.
        if ((v === 0 || v === 2) && (u === 0 || u === last) && (last >= 3 || (v === 2 && u === last))) {
          img.set(x, y, edge ? rim : gap)
          continue
        }
        // Lit from the top left: a highlight near the top-left corner, shadow along the bottom, a dark bottom-right corner.
        let k = 2
        if (v === 0) k = u === last ? 2 : u === 1 || (last === 1 && u === 0) ? 0 : 1
        else if (v === 1) k = u === 0 ? 1 : u === last ? 3 : 2
        else k = u === last ? 4 : 3
        img.set(x, y, r[Math.min(4, k + (edge ? 1 : 0))] ?? gap)
      }
    return img
  }
}
