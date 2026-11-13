// Surfaces the town and biome kits share (Q32, Q33; P147): stone laid as flags or courses, boards, and the pieces every
// kit of uma-quest's format holds: floors that meet in any variant order, walls two levels tall, wall tops, risers
// whose top 16 texels are the lip, stairs in four bands and roofs in courses. Each takes a palette, so a region's look
// is its colours and its finish. Lit from the top front-left (kits.md §5). Pure.
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { cells, fbm, hash, stream } from '../noise.js'
import { Canvas, capsule, circle, ellipse, fading, rect, type PaintFn } from '../paint.js'
import { fillAt, inside, scatter, tuft } from '../farm/ground.js'

export const T = 128
export type Zone = 'edge' | 'inner'

/** A floor of a family: a texture that repeats every tile, shared on the tile's edge band, and the variant's own inside;
 * then decorations on both zones (edge ones cross into the next tile). */
export function variantFloor(variant: number, family: number, texel: (x: number, y: number, seed: number, shared: number) => RGB,
  decorate: (c: Canvas, zone: Zone, seed: number) => void = () => {}): Canvas {
  const c = new Canvas(T, T), own = family + variant * 101
  c.paint((x, y) => {
    const a = texel(x, y, family, family), k = variant === 1 ? 0 : inside(x, y)
    return [...(k ? mix(a, texel(x, y, own, family), k) : a), 1] as RGBA
  })
  decorate(c, 'edge', family)
  decorate(c, 'inner', own)
  return c
}

export interface StonePalette { stones: RGB[]; mortar: RGB; moss?: RGB; mossAmount?: number }

/** Irregular flagstones (Worley cells, `n` across a tile): each stone its own tone, rounded, lit on its upper left, mortar
 * between. Stones whose middle sits near the tile's edge take the family's tone, so every variant meets. */
export function flagTexel(p: StonePalette, n: number, opts: { joint?: number; squash?: number } = {}) {
  const joint = opts.joint ?? 2.4, squash = opts.squash ?? 1
  return (x: number, y: number, seed: number, family: number): RGB => {
    const s = cells(x, y * squash, n, T, family, 0.75), edge = s.d2 - s.d1
    const nearEdge = Math.min(s.cx, T - s.cx, s.cy / squash, T - s.cy / squash) < 26
    const tone = hash(s.id, 3, nearEdge ? family : seed)
    let c = mix(p.stones[0]!, p.stones[Math.min(p.stones.length - 1, 1 + Math.floor(tone * (p.stones.length - 1)))]!, tone)
    c = shade(c, (fbm(x, y, { cells: 24, tile: T, octaves: 2, seed: family + 9 }) - 0.5) * 0.18)
    const dx = x - s.cx, dy = y * squash - s.cy, lit = -(dx + dy) / (T / n)
    c = shade(c, Math.max(-0.2, Math.min(0.16, lit * 0.18)) * smooth(joint, joint + 6, edge) + (1 - smooth(joint, joint + 3, edge)) * -0.12)
    if (p.moss) c = mix(c, p.moss, smooth(0.6, 0.78, fbm(x, y, { cells: 6, tile: T, seed: family + 4 })) * (1 - smooth(joint, joint + 4, edge)) * (p.mossAmount ?? 0.8))
    return mix(c, p.mortar, 1 - smooth(joint * 0.5, joint, edge))
  }
}

/** Courses of dressed stone (ashlar): rows `rowH` tall, blocks of seeded widths that repeat every tile, each lit on its
 * top and left, shaded below and right; `rough` rounds and chips them. */
export function courseTexel(p: StonePalette, rowH: number, opts: { rough?: number; widths?: [number, number] } = {}) {
  const rough = opts.rough ?? 0.4, [wMin, wMax] = opts.widths ?? [28, 52]
  return (x: number, y: number, seed: number, family: number): RGB => {
    const row = Math.floor(y / rowH), v = y - row * rowH
    // The row's joints: seeded widths whose sum is the tile.
    const r = stream(family * 13 + row), cuts: number[] = []
    for (let at = hash(row, 7, family) * wMax; at < T - wMin * 0.5; at += wMin + r() * (wMax - wMin)) cuts.push(at)
    // The block across the tile's edge runs from the last joint round to the first.
    let left: number, right: number, i: number
    if (x < cuts[0]!) { left = cuts.at(-1)! - T; right = cuts[0]!; i = cuts.length - 1 }
    else { i = 0; while (i < cuts.length - 1 && x >= cuts[i + 1]!) i++; left = cuts[i]!; right = i < cuts.length - 1 ? cuts[i + 1]! : cuts[0]! + T }
    const u = x - left, w = right - left, id = row * 31 + i
    // The block across the tile's edge keeps the family's tone, so variants that differ only by `seed` meet.
    const tone = hash(id % 97, 5, left < 0 ? family : seed)
    let c = mix(p.stones[0]!, p.stones[Math.min(p.stones.length - 1, 1 + Math.floor(tone * (p.stones.length - 1)))]!, tone)
    c = shade(c, (fbm(x, y, { cells: 16, tile: T, octaves: 3, seed: family + 2 }) - 0.5) * (0.2 + rough * 0.2))
    const chip = (fbm(x, y, { cells: 12, tile: T, octaves: 2, seed: family + 3 }) - 0.5) * rough * 4
    const dEdge = Math.min(u, w - u, v, rowH - v) + chip
    c = shade(c, (v < 3 ? 0.14 : 0) + (u < 3 ? 0.08 : 0) - (v > rowH - 4 ? 0.16 : 0) - (u > w - 3 ? 0.1 : 0))
    if (p.moss) c = mix(c, p.moss, smooth(0.58, 0.76, fbm(x, y, { cells: 5, tile: T, seed: family + 6 })) * (1 - smooth(1, 6, dEdge)) * (p.mossAmount ?? 0.8))
    return mix(c, p.mortar, 1 - smooth(0.4, 1.8, dEdge))
  }
}

/** Boards laid across (a boardwalk, a deck): rows `rowH` deep, grain along them, dark gaps, nails at the joists. */
export function plankTexel(base: RGB, rowH = 16, opts: { gap?: RGB; joist?: number } = {}) {
  const gap = opts.gap ?? shade(base, -0.6), joist = opts.joist ?? 64
  return (x: number, y: number, seed: number, family: number): RGB => {
    const row = Math.floor(y / rowH), v = y - row * rowH, tone = hash(row, 1, seed)
    let c = shade(mix(base, shade(base, 0.12), tone), (fbm(x, y, { cells: 3, tile: T, octaves: 3, seed: family + row, sx: 1, sy: 12 }) - 0.5) * 0.3)
    c = shade(c, v < 1.5 ? 0.14 : v > rowH - 2 ? -0.28 : 0)
    const end = (x + hash(row, 2, family) * T) % joist
    if (end < 1.2) c = shade(c, -0.45)
    if (Math.abs(end - 6) < 1.2 && Math.abs(v - rowH / 2) < 1.2) c = shade(hex('#4a4a50'), 0.1)
    return v > rowH - 1 ? gap : c
  }
}

/** Two faces as one: the shared face on a band along the tile's left and right edges, a variant's own inside, joined
 * by a ragged line, so wall variants meet whatever their inside. */
export const edgeBand = (shared: (x: number, y: number) => RGB, own: (x: number, y: number) => RGB, band = 22) =>
  (x: number, y: number): RGB => {
    const k = smooth(band - 8, band + 8, Math.min(x, T - x) + (fbm(x, y, { cells: 8, octaves: 2, seed: 77 }) - 0.5) * 18)
    return k <= 0 ? shared(x, y) : k >= 1 ? own(x, y) : mix(shared(x, y), own(x, y), k)
  }

/** A wall two levels tall (128 × 256): its face (a texture over the whole height), a lit cap where it meets its top,
 * dark at the foot where it meets the floor. */
export function wall(face: (x: number, y: number) => RGB, opts: { cap?: RGB; capH?: number; overhang?: (c: Canvas) => void } = {}): Canvas {
  const c = new Canvas(T, 2 * T)
  c.paint((x, y) => [...face(x, y), 1] as RGBA)
  if (opts.cap) {
    const capH = opts.capH ?? 10
    c.fill(rect(0, 0, T, capH), (x, y) => [...shade(opts.cap!, (y < 2 ? 0.2 : y > capH - 2 ? -0.2 : 0) + (fbm(x, y, { cells: 16, tile: T, seed: 3 }) - 0.5) * 0.15), 1] as RGBA)
    c.fill(rect(0, capH, T, 4), [0, 0, 0, 0.18], 'atop')
  }
  c.paint(fading(hex('#1a120c'), (_, y) => smooth(2 * T - 40, 2 * T, y) * 0.35), 'multiply')
  opts.overhang?.(c)
  return c
}

/** A riser: its face, its top 16 texels the lip of the floor above (grass, a kerb), shaded under the lip. */
export function riser(face: (x: number, y: number) => RGB, lip: (c: Canvas) => void): Canvas {
  const c = new Canvas(T, T)
  c.paint((x, y) => [...face(x, y), 1] as RGBA)
  c.paint(fading(hex('#1a120c'), (_, y) => (1 - smooth(14, 32, y)) * 0.45), 'multiply')
  lip(c)
  return c
}
/** A kerb lip: a band of the floor's stone with a lit edge. */
export function kerbLip(colour: RGB): (c: Canvas) => void {
  return (c) => c.fill(rect(0, 0, T, 15), (x, y) => [...shade(colour, (y < 3 ? 0.18 : y > 12 ? -0.25 : 0) + (fbm(x, y, { cells: 16, tile: T, seed: 21 }) - 0.5) * 0.18), 1] as RGBA)
}
/** A ragged green lip: the floor's grass hanging over the edge. */
export function grassyLip(base: RGB, deep: RGB, seed: number): (c: Canvas) => void {
  return (c) => {
    c.fill(rect(0, 0, T, 12), (x, y) => [...shade(mix(base, deep, fbm(x, y, { cells: 8, tile: T, seed }) * 0.5), -smooth(4, 12, y) * 0.15), 1] as RGBA)
    const r = stream(seed)
    for (let i = 0; i < 40; i++) {
      const x = r() * T, len = 4 + r() * 8
      for (const dx of [-T, 0, T]) c.fill(capsule(x + dx, 9, x + dx + (r() - 0.5) * 3, 9 + len, 1.4, 0.4), (px, py) => [...mix(base, deep, smooth(9, 9 + len, py)), 1] as RGBA)
    }
  }
}

/** Stairs: four bands of 32 texels, the bottom band the lowest step; each a step's top lit at its front edge and
 * shaded at its back, where the next step rises. */
export function stairs(top: (x: number, y: number) => RGB, nose: RGB): Canvas {
  const c = new Canvas(T, T)
  c.paint((x, y) => {
    const v = y % 32
    let col = top(x, y)
    col = shade(col, -(1 - smooth(0, 7, v)) * 0.3 + smooth(24, 30, v) * 0.1)
    return [...(v > 29 ? shade(nose, 0.1) : col), 1] as RGBA
  })
  return c
}

/** Roof courses (128 × 128, repeating both ways, the top edge toward the ridge): `tiles` hang a rounded lip over the
 * course below (barrel or scalloped tiles); `flat` are shingles or slates with a gap; `thatch` is straw or reed. */
export function roofTexel(kind: 'tiles' | 'flat' | 'thatch', palette: { a: RGB; b: RGB; dark?: RGB; moss?: RGB; accent?: RGB }, seed: number, variant: number) {
  const fam = seed, own = seed + variant * 10
  return (x: number, y: number): RGB => {
    if (kind === 'thatch') {
      const v = y % 32, straw = fbm(x, y, { cells: 4, tile: T, octaves: 3, seed: fam, sx: 12, sy: 1 }), fine = fbm(x, y, { cells: 8, tile: T, octaves: 2, seed: fam + 1, sx: 8, sy: 1 })
      let c = mix(palette.a, palette.b, straw)
      c = shade(c, (fine - 0.5) * 0.25 + (fbm(x, y, { cells: 16, tile: T, octaves: 1, seed: fam + 2, sx: 4, sy: 1 }) > 0.62 ? -0.12 : 0))
      c = shade(c, smooth(24, 31, v) * 0.18 - (1 - smooth(0, 6, v)) * 0.3)
      if (variant === 2 && palette.moss) c = mix(c, palette.moss, smooth(0.68, 0.8, fbm(x, y, { cells: 3, tile: T, seed: own + 5 })) * 0.35)
      return c
    }
    const row = Math.floor(y / 32), shift = (row % 2) * 16, col = Math.floor((x + shift) / 32), u = (x + shift) % 32, v = y % 32
    const start = col * 32 - shift, cut = start < 0 || start + 32 > T, id = row * 5 + (col % 4), tone = hash(id, 0, cut ? fam : own)
    // A glazed accent tile here and there (the same in every variant at the tile's edge).
    const base = palette.accent && tone > 0.84 ? { a: palette.accent, b: shade(palette.accent, 0.12) } : palette
    if (kind === 'tiles') {
      const above = row - 1, ushift = ((above % 2) + 2) % 2 * 16, ua = (x + ushift) % 32, hang = 6 * (1 - ((ua - 16) / 16) ** 2)
      if (v < hang) {
        const up = hash((Math.floor((x + ushift) / 32) % 4) + above * 5, 0, (Math.floor((x + ushift) / 32) * 32 - ushift < 0 || Math.floor((x + ushift) / 32) * 32 - ushift + 32 > T) ? fam : own)
        const pa = palette.accent && up > 0.84 ? { a: palette.accent, b: shade(palette.accent, 0.12) } : palette
        return shade(mix(pa.a, pa.b, up), -0.05 - (v / 6) * 0.1)
      }
      let c = mix(shade(base.a, -0.05), base.b, (tone * 0.5 + 0.25) % 1)
      c = shade(c, Math.cos(((u - 11) / 32) * Math.PI * 1.6) * 0.16 - (u > 28 || u < 2 ? 0.25 : 0))
      c = shade(c, -(1 - smooth(hang, hang + 6, v)) * 0.35 + (v / 32) * 0.05)
      if (variant === 2 && palette.moss && hash(id, 3, own) > 0.75) c = mix(c, palette.moss, smooth(0.55, 0.75, fbm(x, y, { cells: 16, tile: T, seed: own })) * 0.6)
      return c
    }
    let c = shade(mix(base.a, base.b, tone), (fbm(x, y, { cells: 2, tile: T, octaves: 3, seed: fam + id, sx: 6, sy: 1 }) - 0.5) * 0.18)
    c = shade(c, (u < 2 ? 0.12 : 0) - (1 - smooth(0, 7, v)) * 0.32 + smooth(18, 30, v) * 0.05)
    if (variant === 2 && palette.moss && hash(id, 3, own) > 0.72) c = mix(c, palette.moss, 0.22)
    return u > 30.5 || v > 30.5 ? shade(c, -0.55) : c
  }
}
export const roof = (texel: (x: number, y: number) => RGB) => new Canvas(T, T).paint((x, y) => [...texel(x, y), 1] as RGBA)

/** Water over a tile, repeating: deep and light by noise, crests stretched across, a few glints. */
export function waterTexel(deep: RGB, mid: RGB, light: RGB) {
  return (x: number, y: number, seed: number): RGB => {
    const big = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed, sy: 2 }), ripple = fbm(x, y, { cells: 4, tile: T, octaves: 3, seed: seed + 4, sy: 4 })
    return mix(mix(deep, mid, smooth(0.3, 0.7, big)), light, smooth(0.58, 0.76, ripple) * 0.45)
  }
}
/** Glints on water, scattered in a zone. */
export function glints(c: Canvas, zone: Zone, seed: number, light: RGB, n = 8): void {
  scatter(n, seed, zone, 8, (x, y, r) => {
    const l = 3 + r() * 6
    fillAt(c, capsule(x - l, y, x + l, y, 0.8), [...light, 0.8], zone)
  })
}
/** Grass tufts scattered in a zone (from the farm kit). */
export const tufts = (c: Canvas, zone: Zone, seed: number, n: number, size = 1) => scatter(n, seed, zone, 8, (x, y, r) => tuft(c, x, y, r, zone, size))
/** A soft patch of colour inside a tile (a variant's own: damp, worn, mossy). */
export const patch = (c: Canvas, colour: RGB, cx: number, cy: number, r: number, amount: number, seed: number) =>
  c.paint(fading(colour, (x, y) => (1 - smooth(r * 0.35, r, Math.hypot((x - cx) / 1.3, y - cy))) * amount * (0.5 + fbm(x, y, { cells: 8, seed }))))
/** A crack: a jagged dark line with a lit lip. */
export function crack(c: Canvas, x: number, y: number, len: number, seed: number): void {
  const r = stream(seed)
  let px = x, py = y
  for (let i = 0; i < 6; i++) {
    const nx = px + (r() - 0.3) * len / 3, ny = py + (r() - 0.5) * len / 4
    c.fill(capsule(px, py, nx, ny, 0.9, 0.5), [...hex('#2a2620'), 0.75])
    c.fill(capsule(px, py - 1, nx, ny - 1, 0.4), [1, 1, 1, 0.12])
    px = nx; py = ny
  }
}
void circle; void ellipse
export type { PaintFn }
