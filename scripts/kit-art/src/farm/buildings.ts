// kit-farm's buildings (KF3): modular fronts in sets, drawn in code (P147). The `plank` set is weathered vertical boards
// over a darker sill; the `plaster` set is warm whitewash between timber corners on a stone footing. A storey is a
// `building-wall` level under a `window` level, so both share their edges, and every module repeats left to right and
// up. Roofs (`red`, `thatch`, `shingle`, `slate`) repeat both ways, their top edge toward the ridge. Lit from the top
// front-left (format.md §10); no text.
import { hex, mix, shade, smooth, type RGB, type RGBA } from '../color.js'
import { fbm, hash } from '../noise.js'
import { Canvas, capsule, circle, linear, poly, rect, union, type Shape } from '../paint.js'

const T = 128

// --- Plank -----------------------------------------------------------------------------------------------------------------

export const WOOD = { base: hex('#a5733f'), light: hex('#c08b52'), dark: hex('#7b522c'), gap: hex('#3e2918'), sill: hex('#6c4527'), grey: hex('#9a8a72') }
/** Eight boards a module, 16 texels each; each its own tone, grain running up, lit on its left edge, a dark gap between. */
export const boardTexel = (x: number, y: number, seed: number): RGB => {
  const board = Math.floor(x / 16), u = x % 16, tone = hash(board, 0, seed)
  const grain = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed: seed + board, sx: 16, sy: 1 })
  let c = mix(WOOD.dark, WOOD.light, 0.35 + tone * 0.3)
  c = mix(c, WOOD.grey, 0.18 + hash(board, 2, seed) * 0.15)
  c = shade(c, (grain - 0.5) * 0.3)
  c = shade(c, u < 2 ? 0.12 : u > 13 ? -0.18 : 0)
  return u === 15 || u === 0 ? mix(c, WOOD.gap, u === 15 ? 0.9 : 0.4) : c
}
function boards(c: Canvas, seed: number, h = T): void {
  c.paint((x, y) => [...boardTexel(x, y % T, seed + Math.floor(y / T) * 0), 1] as RGBA, 'over', rect(0, 0, c.w, h))
}
/** A knot: a dark ring in a board. */
export function knot(c: Canvas, x: number, y: number, r: number): void {
  c.fill(circle(x, y, r + 1), [...WOOD.gap, 0.35], 'atop')
  c.fill(circle(x, y, r), [...shade(WOOD.dark, -0.15), 1], 'atop')
  c.fill(circle(x - r * 0.3, y - r * 0.3, r * 0.4), [...WOOD.base, 0.6], 'atop')
}
/** The darker sill at a storey's foot. */
function sill(c: Canvas, y: number): void {
  c.fill(rect(0, y, c.w, 12), (px, py) => [...shade(WOOD.sill, (fbm(px, py, { cells: 2, tile: T, sx: 1, sy: 8, seed: 41 }) - 0.5) * 0.25 + (py < y + 2 ? 0.2 : py > y + 10 ? -0.2 : 0)), 1] as RGBA)
  c.fill(rect(0, y - 3, c.w, 3), [0, 0, 0, 0.18], 'atop')
}

export function wallPlank(variant: number): Canvas {
  const c = new Canvas(T, T)
  boards(c, 11)
  if (variant === 1) { knot(c, 37, 40, 2.2); knot(c, 90, 74, 1.8) }
  else {
    // A replaced board, fresher, and a batten nailed across.
    c.fill(rect(64, 0, 16, 116), (x, y) => [...shade(mix(WOOD.base, WOOD.grey, 0.12), (fbm(x, y, { cells: 2, tile: T, sx: 16, seed: 3 }) - 0.5) * 0.25 + (x < 66 ? 0.1 : x > 77 ? -0.15 : 0.03)), 1] as RGBA, 'atop')
    c.fill(rect(64, 0, 1, 116), [...WOOD.gap, 0.5], 'atop')
    knot(c, 21, 88, 2)
  }
  sill(c, 116)
  return c
}

/** A window: a timber frame, four panes of sky, a mullion cross, a sill; `inset` paints the wall around it first. */
export function windowFrame(c: Canvas, x: number, y: number, w: number, h: number, frame: RGB, sillColor: RGB, panes: [number, number] = [2, 2]): void {
  c.fill(rect(x - 3, y - 3, w + 6, h + 6, 2), [0, 0, 0, 0.25])
  c.fill(rect(x, y, w, h, 2), (px, py) => [...shade(frame, (px < x + 3 || py < y + 3) ? 0.18 : 0), 1] as RGBA)
  const gx = x + 5, gy = y + 5, gw = w - 10, gh = h - 10
  // Glass: the sky's light at the top, deeper below, a diagonal glint.
  c.fill(rect(gx, gy, gw, gh), linear(gx, gy, gx + gw * 0.3, gy + gh, [[0, hex('#cfe9f6')], [0.55, hex('#7fb6d6')], [1, hex('#3f6f8f')]]))
  c.fill(poly([[gx + gw * 0.15, gy + gh], [gx + gw * 0.38, gy + gh], [gx + gw * 0.75, gy], [gx + gw * 0.52, gy]]), [1, 1, 1, 0.22], 'atop')
  c.fill(rect(gx, gy, gw, 3), [0, 0, 0, 0.25], 'atop')
  for (let i = 1; i < panes[0]; i++) c.fill(rect(gx + (gw * i) / panes[0] - 1.5, gy, 3, gh), [...frame, 1])
  for (let j = 1; j < panes[1]; j++) c.fill(rect(gx, gy + (gh * j) / panes[1] - 1.5, gw, 3), [...frame, 1])
  // The sill juts out: lit on top, a shadow under it.
  c.fill(rect(x - 6, y + h, w + 12, 7, 1.5), (px, py) => [...shade(sillColor, py < y + h + 2 ? 0.2 : -0.05), 1] as RGBA)
  c.fill(rect(x - 6, y + h + 7, w + 12, 3), [0, 0, 0, 0.22], 'atop')
}
/** Plank shutters either side of a window, Z-braced. */
export function shutters(c: Canvas, x: number, y: number, w: number, h: number, colour: RGB): void {
  for (const sx of [x - 20, x + w + 2]) {
    c.fill(rect(sx, y, 18, h, 1.5), (px, py) => [...shade(colour, ((px - sx) % 6 < 1 ? -0.25 : 0) + (px - sx < 2 ? 0.15 : 0) + (fbm(px, py, { cells: 2, tile: T, sx: 16, seed: 5 }) - 0.5) * 0.2), 1] as RGBA)
    c.fill(rect(sx, y + 6, 18, 3), [...shade(colour, -0.2), 1])
    c.fill(rect(sx, y + h - 9, 18, 3), [...shade(colour, -0.2), 1])
    c.fill(capsule(sx + 2, y + h - 9, sx + 16, y + 9, 1.4), [...shade(colour, -0.12), 1])
  }
}

export function windowPlank(variant: number): Canvas {
  const c = new Canvas(T, T)
  boards(c, 11)
  if (variant === 1) windowFrame(c, 34, 22, 60, 64, hex('#5a3a20'), WOOD.sill)
  else { windowFrame(c, 40, 24, 48, 60, hex('#5a3a20'), WOOD.sill); shutters(c, 40, 24, 48, 60, hex('#6f7f5a')) }
  return c
}

/** Iron: a dark strap with rivets, lit on its upper edge. */
export function strap(c: Canvas, x: number, y: number, w: number): void {
  c.fill(rect(x, y, w, 6, 2), (px, py) => [...shade(hex('#2f2f33'), py < y + 2 ? 0.25 : 0), 1] as RGBA)
  for (let i = 0; i < 3; i++) c.fill(circle(x + 5 + i * (w - 10) / 2, y + 3, 1.2), [...hex('#8a8a90'), 1])
}
/** A door leaf of vertical planks, Z-braced, within (x, y, w, h). */
export function plankLeaf(c: Canvas, x: number, y: number, w: number, h: number, colour: RGB, seed: number, brace: 'z' | 'x' = 'z'): void {
  c.fill(rect(x, y, w, h), (px, py) => {
    const u = (px - x) % 14, g = fbm(px, py, { cells: 2, tile: T, sx: 14, seed })
    return [...shade(colour, (g - 0.5) * 0.28 + (u < 1.5 ? 0.12 : u > 12.5 ? -0.3 : 0)), 1] as RGBA
  })
  const rail = shade(colour, 0.08)
  const rails: Shape[] = [rect(x + 2, y + 14, w - 4, 10, 1), rect(x + 2, y + h - 26, w - 4, 10, 1)]
  if (brace === 'z') rails.push(capsule(x + 6, y + h - 22, x + w - 6, y + 20, 4.5))
  else rails.push(capsule(x + 6, y + h - 22, x + w - 6, y + 20, 4.5), capsule(x + 6, y + 20, x + w - 6, y + h - 22, 4.5))
  for (const r of rails) {
    c.fill(r, [0, 0, 0, 0.3])
    c.fill(r, (px, py) => [...shade(rail, (fbm(px, py, { cells: 4, tile: T, seed: seed + 3 }) - 0.5) * 0.2), 1] as RGBA)
  }
}
/** A doorway's frame: posts and a lintel round (x, y, w, h), the threshold at the foot. */
export function doorway(c: Canvas, x: number, y: number, w: number, h: number, timber: RGB): void {
  c.fill(rect(x - 9, y - 11, w + 18, h + 11), [0, 0, 0, 0.25])
  for (const px of [x - 8, x + w]) c.fill(rect(px, y - 10, 8, h + 10), (qx, qy) => [...shade(timber, qx < px + 2 ? 0.18 : qx > px + 6 ? -0.2 : 0), 1] as RGBA)
  c.fill(rect(x - 10, y - 12, w + 20, 10, 1), (qx, qy) => [...shade(timber, qy < y - 10 ? 0.22 : qy > y - 5 ? -0.15 : 0), 1] as RGBA)
  c.fill(rect(x, y, w, 6), [0, 0, 0, 0.35], 'atop')
}

export function doorPlank(): Canvas {
  const c = new Canvas(T, 2 * T)
  boards(c, 11, 2 * T)
  sill(c, 2 * T - 12)
  doorway(c, 26, 52, 76, 204, hex('#5e3d22'))
  plankLeaf(c, 26, 52, 76, 204, hex('#8a5a32'), 21)
  strap(c, 28, 84, 40); strap(c, 28, 212, 40)
  c.fill(circle(90, 156, 4.5), [...hex('#2f2f33'), 1]); c.fill(circle(90, 156, 2.5), [...hex('#7d6a48'), 1])
  c.fill(rect(18, 2 * T - 6, 92, 6, 1), [...hex('#a39a8a'), 1])
  return c
}
/** The Warehouse's and Barn's double doors, two columns wide. */
export function doorWidePlank(): Canvas {
  const c = new Canvas(2 * T, 2 * T)
  boards(c, 11, 2 * T)
  sill(c, 2 * T - 12)
  doorway(c, 22, 60, 212, 196, hex('#5e3d22'))
  plankLeaf(c, 22, 60, 106, 196, hex('#985f34'), 23, 'x')
  plankLeaf(c, 128, 60, 106, 196, hex('#985f34'), 24, 'x')
  c.fill(rect(127, 60, 2, 196), [...WOOD.gap, 1])
  for (const hx of [116, 134]) { c.fill(rect(hx, 150, 6, 22, 2), [...hex('#2f2f33'), 1]); c.fill(rect(hx + 1, 151, 2, 20), [...hex('#6f6f75'), 1]) }
  c.fill(rect(14, 2 * T - 6, 228, 6, 1), [...hex('#a39a8a'), 1])
  return c
}

// --- Plaster ---------------------------------------------------------------------------------------------------------------

export const PLASTER = { base: hex('#f0e4c8'), shade: hex('#d8c6a2'), grime: hex('#b5a07c'), timber: hex('#6f4a2b'), stone: hex('#a79e8d'), mortar: hex('#7f776a') }
export const plasterTexel = (x: number, y: number): RGB => {
  const m = fbm(x, y, { cells: 4, tile: T, octaves: 4, seed: 61 }), fine = fbm(x, y, { cells: 32, tile: T, octaves: 2, seed: 62 })
  let c = mix(PLASTER.shade, PLASTER.base, 0.55 + m * 0.45)
  c = shade(c, (fine - 0.5) * 0.06)
  // Weather streaks running down from the top, grime at the foot.
  const streak = fbm(x, y, { cells: 2, tile: T, sx: 12, sy: 1, seed: 63 })
  return mix(c, PLASTER.grime, smooth(0.62, 0.8, streak) * 0.18 + smooth(80, 128, y) * 0.12)
}
/** Timber half-posts on both edges (a whole post where two modules meet), lit on the left. */
export function posts(c: Canvas, h = c.h): void {
  // The post where two modules meet: its lit left half ends this module, its shaded right half starts the next.
  const post = (px: number, py: number): RGBA => {
    const u = (px - (c.w - 6) + c.w) % c.w
    return [...shade(PLASTER.timber, (fbm(px % T, py, { cells: 2, tile: T, sx: 12, seed: 64 }) - 0.5) * 0.25 + (u < 2 ? 0.16 : u > 9 ? -0.14 : 0)), 1] as RGBA
  }
  c.fill(rect(0, 0, 6, h), post)
  c.fill(rect(c.w - 6, 0, 6, h), post)
  c.fill(rect(6, 0, 3, h), [0, 0, 0, 0.12], 'atop')
}
/** The stone footing at a storey's foot. */
export function footing(c: Canvas, y: number, h = 18): void {
  c.fill(rect(0, y, c.w, h), (px, py) => {
    const W = T / 6, row = Math.floor((py - y) / 9), shifted = (px + (row % 2) * (W / 2)) % c.w, sx = shifted % W, sy = (py - y) % 9
    const id = Math.floor(shifted / W) * 7 + row, tone = hash(id, 0, 65)
    let col = mix(PLASTER.stone, shade(PLASTER.stone, 0.15), tone)
    col = shade(col, (sy < 2 ? 0.14 : sy > 7 ? -0.12 : 0) + (sx < 2 ? 0.06 : 0))
    return [...(sx > W - 1.4 || sy > 8 ? PLASTER.mortar : col), 1] as RGBA
  })
  c.fill(rect(0, y - 2, c.w, 2), [0, 0, 0, 0.15], 'atop')
}
export function plaster(c: Canvas, h = c.h): void { c.paint((x, y) => [...plasterTexel(x % T, y % T), 1] as RGBA, 'over', rect(0, 0, c.w, h)) }

export function wallPlaster(variant: number): Canvas {
  const c = new Canvas(T, T)
  plaster(c)
  if (variant === 2) {
    // Half-timbering: a diagonal brace from post to post.
    const brace = poly([[6, 104], [16, 110], [122, 18], [112, 12]])
    c.fill(brace, [0, 0, 0, 0.2]); c.fill(brace, (x, y) => [...shade(PLASTER.timber, (fbm(x, y, { cells: 4, tile: T, seed: 66 }) - 0.5) * 0.2), 1] as RGBA)
  }
  footing(c, 110)
  posts(c)
  return c
}
export function windowPlaster(variant: number): Canvas {
  const c = new Canvas(T, T)
  plaster(c)
  // A timber lintel over the window.
  c.fill(rect(28, 16, 72, 9, 1), (x, y) => [...shade(PLASTER.timber, y < 18 ? 0.18 : 0), 1] as RGBA)
  if (variant === 1) windowFrame(c, 36, 25, 56, 60, hex('#f4f1e8'), hex('#bcb3a2'), [2, 3])
  else { windowFrame(c, 40, 25, 48, 60, hex('#f4f1e8'), hex('#bcb3a2'), [2, 2]); shutters(c, 40, 25, 48, 60, hex('#7f9a86')) }
  posts(c)
  return c
}
export function doorPlaster(): Canvas {
  const c = new Canvas(T, 2 * T)
  plaster(c)
  footing(c, 2 * T - 18)
  // An arched stone surround, then the door.
  const arch = (grow: number): Shape => union(rect(30 - grow, 70, 68 + grow * 2, 186), circle(64, 70, 34 + grow))
  c.fill(arch(8), [0, 0, 0, 0.2])
  c.fill(arch(7), (x, y) => {
    const a = Math.atan2(y - 70, x - 64), stone = y < 70 ? Math.floor((a + Math.PI) / (Math.PI / 7)) : Math.floor((y - 70) / 22) + 20
    return [...shade(mix(PLASTER.stone, shade(PLASTER.stone, 0.18), hash(stone, 1, 67)), x < 40 || y < 50 ? 0.1 : -0.05), 1] as RGBA
  })
  c.fill(arch(0), (x, y) => {
    const u = (x - 30) % 17, g = fbm(x, y, { cells: 2, tile: T, sx: 14, seed: 68 })
    return [...shade(hex('#7a4a2a'), (g - 0.5) * 0.25 + (u < 1.5 ? 0.1 : u > 15.5 ? -0.3 : 0)), 1] as RGBA
  })
  c.fill(rect(30, 70, 68, 5), [0, 0, 0, 0.2], 'atop')
  for (const y of [110, 214]) strap(c, 32, y, 34)
  c.fill(circle(86, 166, 3.5), [...hex('#c9a24a'), 1]); c.fill(circle(85, 165, 1.4), [...hex('#f2dd8a'), 1])
  c.fill(rect(22, 2 * T - 6, 84, 6, 1), [...shade(PLASTER.stone, 0.12), 1])
  posts(c)
  return c
}
/** The Shop's glazed door: a painted frame, panes of glass, a kick panel, a transom light above. */
export function doorShop(): Canvas {
  const c = new Canvas(T, 2 * T)
  plaster(c)
  footing(c, 2 * T - 18)
  const paint = hex('#3f6b55')
  doorway(c, 28, 44, 72, 212, PLASTER.timber)
  c.fill(rect(28, 44, 72, 212), (x, y) => [...shade(paint, x < 31 ? 0.15 : x > 97 ? -0.2 : 0), 1] as RGBA)
  // Transom, then the glazed upper door and the kick panel.
  c.fill(rect(34, 48, 60, 22), linear(34, 48, 50, 70, [[0, hex('#d6eef8')], [1, hex('#6fa6c6')]]))
  c.fill(rect(34, 76, 60, 104), linear(34, 76, 60, 180, [[0, hex('#cfe9f6')], [0.6, hex('#7fb6d6')], [1, hex('#3f6f8f')]]))
  c.fill(poly([[44, 180], [58, 180], [84, 76], [70, 76]]), [1, 1, 1, 0.2], 'atop')
  for (const x of [54, 74]) c.fill(rect(x - 1.5, 76, 3, 104), [...paint, 1])
  for (const y of [110, 145]) c.fill(rect(34, y - 1.5, 60, 3), [...paint, 1])
  c.fill(rect(34, 188, 60, 58, 2), [...shade(paint, -0.12), 1])
  c.fill(rect(38, 192, 52, 50, 2), [...shade(paint, 0.06), 1])
  c.fill(circle(88, 184, 3), [...hex('#c9a24a'), 1])
  c.fill(rect(20, 2 * T - 6, 88, 6, 1), [...shade(PLASTER.stone, 0.12), 1])
  posts(c)
  return c
}

// --- Roofs -----------------------------------------------------------------------------------------------------------------

/** Rows of 32 texels, four pieces a row, every other row shifted half a piece; a piece's colour is its own, except
 * pieces cut by the tile's edge, which keep the family's, so every variant meets. */
export function piece(x: number, y: number, seed: number, familySeed: number): { u: number; v: number; id: number; tone: number; row: number } {
  const row = Math.floor(y / 32), shift = (row % 2) * 16, col = Math.floor((x + shift) / 32), u = (x + shift) % 32, v = y % 32
  const start = col * 32 - shift, cut = start < 0 || start + 32 > T
  const id = row * 5 + (col % 4)
  return { u, v, id, row, tone: hash(id, 0, cut ? familySeed : seed) }
}
/** The piece in the row above hangs over this row's top: how far it reaches at this column. */
export const overhang = (x: number, y: number, depth: number, shape: (u: number) => number) => {
  const above = Math.floor(y / 32) - 1, shift = ((above % 2) + 2) % 2 * 16, u = (x + shift) % 32
  return depth * shape(u)
}

function roofTexel(kind: 'red' | 'thatch' | 'shingle' | 'slate', x: number, y: number, variant: number): RGB {
  const fam = { red: 71, thatch: 72, shingle: 73, slate: 74 }[kind], seed = fam + variant * 10
  if (kind === 'thatch') {
    const v = y % 32, straw = fbm(x, y, { cells: 4, tile: T, octaves: 3, seed: fam, sx: 12, sy: 1 }), fine = fbm(x, y, { cells: 8, tile: T, octaves: 2, seed: fam + 1, sx: 8, sy: 1 })
    let c = mix(hex('#b8913f'), hex('#e3c27a'), straw)
    c = shade(c, (fine - 0.5) * 0.25 + (fbm(x, y, { cells: 16, tile: T, octaves: 1, seed: fam + 2, sx: 4, sy: 1 }) > 0.62 ? -0.12 : 0))
    // Each course: bright cut ends at its foot, the course above's shadow at its top.
    c = shade(c, smooth(24, 31, v) * 0.18 - (1 - smooth(0, 6, v)) * 0.3)
    if (variant === 2) c = mix(c, hex('#8f9a55'), smooth(0.68, 0.8, fbm(x, y, { cells: 3, tile: T, seed: seed + 5 })) * 0.35)
    return c
  }
  const p = piece(x, y, seed, fam)
  if (kind === 'red') {
    // Barrel tiles: a lit crown left of middle, shade to the right, a rounded lip hanging over the row below.
    const hang = overhang(x, y, 6, (u) => 1 - ((u - 16) / 16) ** 2)
    if (p.v < hang) return shade(mix(hex('#b24e36'), hex('#c8634a'), p.tone), -0.05 - (p.v / 6) * 0.1)
    const across = Math.cos(((p.u - 11) / 32) * Math.PI * 1.6)
    let c = mix(hex('#a8442f'), hex('#cf6a4d'), p.tone * 0.5 + 0.25)
    c = shade(c, across * 0.16 - (p.u > 28 || p.u < 2 ? 0.25 : 0))
    c = shade(c, -(1 - smooth(hang, hang + 6, p.v)) * 0.35 + (p.v / 32) * 0.05)
    if (variant === 2 && hash(p.id, 3, seed) > 0.75) c = mix(c, hex('#6f7d45'), smooth(0.55, 0.75, fbm(x, y, { cells: 16, tile: T, seed })) * 0.6)
    return c
  }
  // Shingles and slates: flat pieces with a gap between, a shadow under the course above.
  const flat = kind === 'shingle'
  const base = flat ? mix(hex('#6f7a48'), hex('#8e8a58'), p.tone) : mix(hex('#56677c'), hex('#7488a0'), p.tone)
  const grain = fbm(x, y, { cells: 2, tile: T, octaves: 3, seed: seed + p.id, sx: flat ? 12 : 4, sy: 1 })
  let c = shade(base, (grain - 0.5) * (flat ? 0.28 : 0.14))
  c = shade(c, (p.u < 2 ? 0.12 : 0) - (1 - smooth(0, 7, p.v)) * 0.32 + (flat ? 0 : smooth(18, 30, p.v) * 0.06))
  if (!flat) c = mix(c, hex('#c9d6e2'), smooth(0.7, 0.85, fbm(x, y, { cells: 8, tile: T, seed: fam + 3 })) * 0.15)
  if (variant === 2 && hash(p.id, 3, seed) > 0.7) c = mix(c, flat ? hex('#7f9a4a') : hex('#8f9a7a'), 0.25)
  const gap = p.u > 30.5 || p.v > 30.5
  return gap ? shade(c, -0.55) : c
}
export function roof(kind: 'red' | 'thatch' | 'shingle' | 'slate', variant: number): Canvas {
  return new Canvas(T, T).paint((x, y) => [...roofTexel(kind, x, y, variant), 1] as RGBA)
}

/** Every building piece of wave 1, by name. */
export const BUILDING_DRAWERS: Readonly<Record<string, () => Canvas>> = {
  'building-wall-plank-1': () => wallPlank(1), 'building-wall-plank-2': () => wallPlank(2),
  'window-plank-1': () => windowPlank(1), 'window-plank-2': () => windowPlank(2),
  'door-plank': doorPlank, 'door-wide-plank': doorWidePlank,
  'building-wall-plaster-1': () => wallPlaster(1), 'building-wall-plaster-2': () => wallPlaster(2),
  'window-plaster-1': () => windowPlaster(1), 'window-plaster-2': () => windowPlaster(2),
  'door-plaster': doorPlaster, 'door-shop': doorShop,
  'roof-red-1': () => roof('red', 1), 'roof-red-2': () => roof('red', 2), 'roof-thatch-1': () => roof('thatch', 1), 'roof-thatch-2': () => roof('thatch', 2),
  'roof-shingle-1': () => roof('shingle', 1), 'roof-shingle-2': () => roof('shingle', 2), 'roof-slate-1': () => roof('slate', 1), 'roof-slate-2': () => roof('slate', 2),
}
