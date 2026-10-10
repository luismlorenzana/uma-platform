// Pantry kit: the containers shared by the refined farming families (glass jars, bottles, sacks, bowls, boards,
// leaves), plus small helpers for motifs and effects (glass shine, glow halos, rays).
import { hex, ramp, type RGBA } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask, shadeDome, toneFor } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'

export type Tones = RGBA[]
/** A ramp id, or a function choosing one per pixel. */
export type RampPick = number | ((x: number, y: number) => number)
const pick = (r: RampPick, x: number, y: number): number => (typeof r === 'number' ? r : r(x, y))

// ---------------------------------------------------------------------------------------------------------------
// Masks

/** Inclusive pixel rectangle. */
export function box(x0: number, y0: number, x1: number, y1: number): Mask {
  const m = new Mask()
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y)
  return m
}

/** A box with its corners trimmed in steps of `r` pixels. */
export function roundBox(x0: number, y0: number, x1: number, y1: number, r = 1): Mask {
  const m = box(x0, y0, x1, y1)
  for (let k = 0; k < r; k++)
    for (let j = 0; j < r - k; j++) {
      m.set(x0 + j, y0 + k, false)
      m.set(x1 - j, y0 + k, false)
      m.set(x0 + j, y1 - k, false)
      m.set(x1 - j, y1 - k, false)
    }
  return m
}

export function copy(mask: Mask): Mask {
  return new Mask(mask.w, mask.h).union(mask)
}

export function intersect(a: Mask, b: Mask): Mask {
  const m = new Mask(a.w, a.h)
  a.each((x, y) => {
    if (b.get(x, y)) m.set(x, y)
  })
  return m
}

/** Row extents: y → [first x, last x]. */
export function spans(mask: Mask): Map<number, [number, number]> {
  const out = new Map<number, [number, number]>()
  mask.each((x, y) => {
    const s = out.get(y)
    if (!s) out.set(y, [x, x])
    else s[1] = x
  })
  return out
}

export function bounds(mask: Mask): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = 99, y0 = 99, x1 = -1, y1 = -1
  mask.each((x, y) => {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  })
  return { x0, y0, x1, y1 }
}

/** A thick line between two points (a capsule), for stems, sticks and strands. */
export function capsule(x0: number, y0: number, x1: number, y1: number, r: number): Mask {
  const dx = x1 - x0, dy = y1 - y0
  const len2 = dx * dx + dy * dy || 1
  return Mask.from((px, py) => {
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2))
    return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)) <= r
  })
}

// ---------------------------------------------------------------------------------------------------------------
// Shading

export interface CylinderOptions {
  /** Added to every light value. */
  bias?: number
  /** Row extents come from this mask (so a label wraps the jar it sits on). Defaults to the mask itself. */
  frame?: Mask
  /** Scales the left/right light difference. */
  spread?: number
}

/** Shades a mask as an upright cylinder: lit on the left, falling into shadow on the right. */
export function shadeCylinder(s: Sprite, mask: Mask, r: RampPick, o: CylinderOptions = {}): void {
  const own = spans(mask)
  const frame = o.frame ? spans(o.frame) : own
  const spread = o.spread ?? 1
  mask.each((x, y) => {
    const [a, b] = frame.get(y) ?? own.get(y) ?? [x, x]
    const nx = ((x - a + 0.5) / (b - a + 1)) * 2 - 1
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx))
    s.paint(x, y, pick(r, x, y), toneFor(-0.53 * nx * spread + 0.58 * nz + (o.bias ?? 0)))
  })
}

/** Paints a tiny pixel motif. Each character maps to [ramp id, tone]; '.' and ' ' are skipped. */
export function pix(s: Sprite, x0: number, y0: number, art: readonly string[], key: Record<string, readonly [number, number]>): void {
  art.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const k = key[row[dx] ?? '.']
      if (k) s.paint(x0 + dx, y0 + dy, k[0], k[1])
    }
  })
}

/** Seeded random pixels of `mask` (whose current tone is at least `minTone`), returned in pick order. */
export function scatter(seed: string, mask: Mask, count: number, s?: Sprite, minTone = 0): [number, number][] {
  const r = rng(seed)
  const cells: [number, number][] = []
  mask.each((x, y) => {
    if (!s || s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  const out: [number, number][] = []
  for (let i = 0; i < count && cells.length > 0; i++) out.push(cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0])
  return out
}

/** Repaints seeded pixels of `mask` with `id` (keeping a tone near the one underneath, nudged by `delta`). */
export function fleck(s: Sprite, seed: string, mask: Mask, count: number, id: number, delta = 0): void {
  for (const [x, y] of scatter(seed, mask, count)) s.paint(x, y, id, s.toneAt(x, y) + delta)
}

/** Shifts the tone of seeded pixels of `mask`. */
export function speckle(s: Sprite, seed: string, mask: Mask, count: number, delta: number, minTone = 0): void {
  for (const [x, y] of scatter(seed, mask, count, s, minTone)) s.shift(x, y, delta)
}

// ---------------------------------------------------------------------------------------------------------------
// Effects (translucent overlays)

/** A vertical glass highlight two pixels in from the left edge, plus a short tick near the top right. */
export function shine(s: Sprite, body: Mask, o: { skip?: Mask; alpha?: number; from?: number; to?: number } = {}): void {
  const sp = spans(body)
  const ys = [...sp.keys()].sort((a, b) => a - b)
  const top = ys[0] ?? 0, bottom = ys[ys.length - 1] ?? 0
  const alpha = o.alpha ?? 150
  const from = o.from ?? top + 1, to = o.to ?? bottom - 2
  for (let y = from; y <= to; y++) {
    const s0 = sp.get(y)
    if (!s0) continue
    const x = s0[0] + 1
    if (!o.skip?.get(x, y)) s.overlay(x, y, hex('#ffffff', alpha))
    if (!o.skip?.get(x + 1, y) && y > from && y < to) s.overlay(x + 1, y, hex('#ffffff', Math.round(alpha * 0.35)))
  }
  for (let y = from + 1; y <= Math.min(to, from + 2); y++) {
    const s0 = sp.get(y)
    if (s0 && !o.skip?.get(s0[1] - 1, y)) s.overlay(s0[1] - 1, y, hex('#ffffff', Math.round(alpha * 0.6)))
  }
}

/** True if (x, y) is empty and not where the render will put an outline. */
function open(s: Sprite, x: number, y: number): boolean {
  if (!s.inside(x, y) || s.filled(x, y)) return false
  return !(s.filled(x - 1, y) || s.filled(x + 1, y) || s.filled(x, y - 1) || s.filled(x, y + 1))
}

/** A soft glow on the empty canvas around the object. Call it last. */
export function halo(s: Sprite, cx: number, cy: number, rx: number, ry: number, color: string, alpha: number): void {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry
      const d = dx * dx + dy * dy
      if (d > 1 || !open(s, x, y)) continue
      s.overlay(x, y, hex(color, Math.round(alpha * (1 - d) ** 0.7)))
    }
}

/** Short light rays on the empty canvas, fading outward. Call it last. */
export function rays(s: Sprite, cx: number, cy: number, r0: number, r1: number, angles: readonly number[], color: string, alpha: number): void {
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180
    for (let r = r0; r <= r1; r += 0.5) {
      const x = Math.round(cx + Math.cos(a) * r - 0.5), y = Math.round(cy + Math.sin(a) * r - 0.5)
      if (open(s, x, y)) s.overlay(x, y, hex(color, Math.round(alpha * (1 - ((r - r0) / (r1 - r0 + 1)) * 0.8))))
    }
  }
}

/** Single bright motes on the empty canvas (not at the legendary glint spots). */
export function motes(s: Sprite, points: readonly (readonly [number, number])[], color: string, alpha = 200): void {
  for (const [x, y] of points) if (open(s, x, y)) s.overlay(x, y, hex(color, alpha))
}

// ---------------------------------------------------------------------------------------------------------------
// Shared materials

export const GLASS = ramp('#b7d2db', { lift: 0.42, drop: 0.3, hueShift: 6 })
export const TWINE = ramp('#c9a46a', { lift: 0.3, drop: 0.28 })
export const PAPER = ramp('#efe3c4', { lift: 0.4, drop: 0.2, hueShift: 6 })
export const WOOD = ramp('#a8743f', { lift: 0.3, drop: 0.26 })
export const GOLD = ramp('#efbd25', { lift: 0.5, drop: 0.34, hueShift: 12, satShift: 0.08 })
export const SILVER = ramp('#b9c2cc', { lift: 0.5, drop: 0.32 })
export const CORK = ramp('#b9875a', { lift: 0.28, drop: 0.25 })

// ---------------------------------------------------------------------------------------------------------------
// Containers

export interface Glass {
  /** The whole glass silhouette (body plus neck). */
  shell: Mask
  /** Where the contents show. */
  contents: Mask
  contentsId: number
  glassId: number
}

/**
 * A glass vessel: the body below `fill` shows its contents (cylinder-shaded), the empty glass above stays pale.
 * The contents' top row catches the light, like a liquid or jam surface.
 */
export function glassVessel(s: Sprite, o: { body: Mask; neck?: Mask; fill: number; contents: Tones; glass?: Tones; bias?: number; surface?: boolean }): Glass {
  const glassId = s.addRamp(o.glass ?? GLASS)
  const contentsId = s.addRamp(o.contents)
  const shell = copy(o.body).union(o.neck ?? new Mask())
  const contents = new Mask()
  o.body.each((x, y) => {
    if (y >= o.fill) contents.set(x, y)
  })
  const head = copy(shell).subtract(contents)
  shadeCylinder(s, head, glassId, { bias: 0.12, frame: shell })
  shadeCylinder(s, contents, contentsId, { bias: o.bias ?? 0, frame: o.body })
  if (o.surface ?? true) {
    const top = spans(contents).get(o.fill)
    if (top) for (let x = top[0] + 1; x < top[1]; x++) s.shift(x, o.fill, 1)
  }
  const b = bounds(o.body)
  const last = spans(o.body).get(b.y1)
  if (last) for (let x = last[0]; x <= last[1]; x++) s.shift(x, b.y1, -1)
  return { shell, contents, contentsId, glassId }
}

/** A screw or press lid: a short cylinder with a lit top row and optional vertical ridges. */
export function lid(s: Sprite, x0: number, y0: number, x1: number, y1: number, tones: Tones, o: { ridges?: boolean; bias?: number } = {}): number {
  const id = s.addRamp(tones)
  const m = roundBox(x0, y0, x1, y1, 1)
  shadeCylinder(s, m, id, { bias: o.bias ?? 0.12 })
  for (let x = x0 + 1; x < x1; x++) s.shift(x, y0, 1)
  for (let x = x0; x <= x1; x++) s.shift(x, y1, -1)
  if (o.ridges) for (let x = x0 + 1; x < x1; x += 2) for (let y = y0 + 1; y < y1; y++) s.shift(x, y, -1)
  return id
}

/** A wrapping label band (rows y0..y1 of `frame`, inset by `inset` px each side), shaded with the vessel. */
export function band(s: Sprite, frame: Mask, y0: number, y1: number, tones: Tones, o: { inset?: number; bias?: number } = {}): { mask: Mask; id: number } {
  const id = s.addRamp(tones)
  const m = new Mask()
  const sp = spans(frame)
  for (let y = y0; y <= y1; y++) {
    const r = sp.get(y)
    if (r) for (let x = r[0] + (o.inset ?? 0); x <= r[1] - (o.inset ?? 0); x++) m.set(x, y)
  }
  shadeCylinder(s, m, id, { frame, bias: o.bias ?? 0.18 })
  return { mask: m, id }
}

export type ClothPattern = 'plain' | 'gingham' | 'dots' | 'stripes'

/**
 * A cloth cover over a jar's lid, tied with twine at `tie`: a puffed top above, a zig-zag skirt below.
 * Pixel columns x0..x1 span the puff; the skirt flares one pixel wider each side.
 */
export function clothTop(
  s: Sprite,
  x0: number,
  x1: number,
  top: number,
  tie: number,
  hem: number,
  cloth: Tones,
  o: { pattern?: ClothPattern; accent?: Tones; twine?: Tones; bow?: boolean } = {},
): void {
  const clothId = s.addRamp(cloth)
  const accentId = s.addRamp(o.accent ?? ramp('#f4efe6', { lift: 0.3, drop: 0.2 }))
  const puff = roundBox(x0, top, x1, tie - 1, 2)
  const skirt = new Mask()
  for (let y = tie; y <= hem; y++)
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (y === tie && (x < x0 || x > x1)) continue
      if (y === hem && (x - x0) % 2 !== 0) continue
      skirt.set(x, y)
    }
  const pattern = o.pattern ?? 'gingham'
  const choose = (x: number, y: number): number => {
    if (pattern === 'plain') return clothId
    if (pattern === 'stripes') return x % 2 === 0 ? clothId : accentId
    if (pattern === 'dots') return (x + 2 * y) % 4 === 0 ? accentId : clothId
    return x % 2 === 0 || y % 2 === 0 ? clothId : accentId
  }
  shadeDome(s, copy(puff).union(skirt), choose, { bias: 0.12, relief: 0.8 })
  const twineId = s.addRamp(o.twine ?? TWINE)
  for (let x = x0; x <= x1; x++) s.paint(x, tie, twineId, x % 2 === 0 ? 4 : 3)
  if (o.bow ?? true) {
    s.paint(x1, tie - 1, twineId, 4)
    s.paint(x1 + 1, tie + 1, twineId, 3)
    s.paint(x1 + 1, tie + 2, twineId, 2)
  }
}

export interface BowlSpec {
  /** Rim center and half extents. */
  cx: number
  rim: number
  rx: number
  ry: number
  /** How far the bowl hangs below the rim. */
  depth: number
  bowl: Tones
  /** A heaped mound above the rim (height in px), or 0 for a liquid surface. */
  mound: number
  contents: Tones | ((x: number, y: number) => number)
  /** Contents bias (brightness). */
  bias?: number
  foot?: boolean
}

/** A bowl seen from a little above, with heaped contents or a flat surface. Returns the contents and body masks. */
export function bowl(s: Sprite, o: BowlSpec): { contents: Mask; body: Mask; bowlId: number } {
  const bowlId = s.addRamp(o.bowl)
  const outer = Mask.ellipse(o.cx, o.rim, o.rx, o.depth)
  const body = Mask.from((px, py) => py >= o.rim && outer.get(Math.floor(px), Math.floor(py))).union(Mask.ellipse(o.cx, o.rim, o.rx, o.ry))
  if (o.foot) {
    const b = bounds(body)
    body.union(box(Math.round(o.cx - o.rx * 0.45), b.y1 - 1, Math.round(o.cx + o.rx * 0.45) - 1, b.y1 + 1))
  }
  shadeDome(s, body, bowlId, { relief: 0.9 })
  const opening = Mask.ellipse(o.cx, o.rim, o.rx - 1.2, o.ry - 0.9)
  opening.each((x, y) => s.paint(x, y, bowlId, 1))
  let contents: Mask
  if (o.mound > 0) {
    const heap = Mask.ellipse(o.cx, o.rim, o.rx - 1.6, o.ry - 1 + o.mound)
    contents = Mask.from((px, py) => py < o.rim && heap.get(Math.floor(px), Math.floor(py))).union(intersect(opening, Mask.ellipse(o.cx, o.rim - 0.4, o.rx - 1.6, o.ry - 1)))
  } else contents = Mask.ellipse(o.cx, o.rim + 0.3, o.rx - 1.6, o.ry - 1.2)
  const id = typeof o.contents === 'function' ? o.contents : s.addRamp(o.contents)
  shadeDome(s, contents, id, { contact: false, bias: o.bias ?? 0.05, relief: o.mound > 0 ? 0.8 : 0.4 })
  // The front lip catches the light: bright on the left, falling off to the right.
  Mask.ellipse(o.cx, o.rim, o.rx, o.ry).each((x, y) => {
    if (y + 0.5 < o.rim || contents.get(x, y) || opening.get(x, y)) return
    const t = (x + 0.5 - (o.cx - o.rx)) / (2 * o.rx)
    s.paint(x, y, bowlId, t < 0.45 ? 5 : t < 0.8 ? 4 : 3)
  })
  return { contents, body, bowlId }
}

/**
 * An open cloth sack with its top rolled down into a cuff, showing a heap of its contents. Returns the heap (to
 * texture) and the sack's front below the cuff (to print a band and mark on).
 */
export function sack(s: Sprite, o: { cloth: Tones; contents: Tones; bias?: number; heap?: number }): { heap: Mask; front: Mask; heapId: number } {
  const clothId = s.addRamp(o.cloth)
  // A sitting sack: straight sides flaring a little, a soft rounded bottom.
  const body = Mask.polygon([[9.4, 12.5], [22.6, 12.5], [23.8, 22.5], [23.2, 25.4], [21.6, 26.9], [10.4, 26.9], [8.8, 25.4], [8.2, 22.5]])
  shadeDome(s, body, clothId, { relief: 0.7 })
  // Folds: darker creases running down from the cuff.
  for (const [x, y0, y1, dx] of [[12, 16, 21, -1], [20, 16, 20, 1]] as const) for (let y = y0; y <= y1; y++) s.shift(x + (y > y0 + 2 ? dx : 0), y, -1)
  // The heap of product, rising out of the open top.
  const heapId = s.addRamp(o.contents)
  const dome = Mask.ellipse(16, 12.5, 7, o.heap ?? 5.2)
  const heap = Mask.from((px, py) => py < 12.5 && dome.get(Math.floor(px), Math.floor(py)))
  shadeDome(s, heap, heapId, { contact: false, bias: o.bias ?? 0.08 })
  // The rolled-down cuff: a horizontal roll, lit along its top, overhanging the sack by a pixel each side.
  const cuffId = s.addRamp(o.cloth)
  const cuff = roundBox(8, 11, 24, 13, 1)
  cuff.each((x, y) => {
    const side = x < 11 ? 0 : x > 20 ? -1 : 0
    s.paint(x, y, cuffId, (y === 11 ? 4 : y === 12 ? 3 : 2) + side)
  })
  s.paint(9, 11, cuffId, 5)
  s.paint(10, 11, cuffId, 5)
  for (let x = 9; x <= 23; x++) if (s.toneAt(x, 14) > 1) s.shift(x, 14, -1)
  const front = copy(body).subtract(cuff)
  front.each((x, y) => {
    if (y < 14) front.set(x, y, false)
  })
  return { heap, front, heapId }
}

/** A wooden cutting board seen from a little above, its front edge showing. Returns its top face. */
export function board(s: Sprite, tones: Tones = WOOD): Mask {
  const id = s.addRamp(tones)
  const top = roundBox(6, 15, 25, 24, 2)
  const side = box(7, 25, 24, 25).union(box(8, 26, 23, 26))
  side.each((x, y) => s.paint(x, y, id, y === 25 ? 2 : 1))
  top.each((x, y) => s.paint(x, y, id, 3))
  // Lit near edges on the top left, shadowed far right edge, grain lines.
  for (let x = 8; x <= 23; x++) s.paint(x, 15, id, 4)
  for (let y = 17; y <= 22; y++) s.paint(6, y, id, 4)
  s.paint(7, 16, id, 4)
  for (let y = 17; y <= 22; y++) s.paint(25, y, id, 2)
  s.paint(24, 16, id, 2)
  s.paint(24, 23, id, 2)
  for (const [y, x0, x1] of [[17, 9, 15], [19, 13, 22], [21, 8, 12], [22, 16, 22], [18, 18, 23]] as const) for (let x = x0; x <= x1; x++) s.paint(x, y, id, 2)
  return top
}

/** A broad green leaf lying at an angle, its midrib running along the long axis. */
export function leafPlate(s: Sprite, tones: Tones, o: { cx?: number; cy?: number; rx?: number; ry?: number; rot?: number } = {}): Mask {
  const cx = o.cx ?? 16, cy = o.cy ?? 20.5, rx = o.rx ?? 11, ry = o.ry ?? 5.2, rot = o.rot ?? -14
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const m = Mask.from((px, py) => {
    const dx = px - cx, dy = py - cy
    const u = (dx * c + dy * sn) / rx
    const v = (-dx * sn + dy * c) / ry
    const w = 1 - Math.abs(u) ** 1.6
    return Math.abs(u) <= 1 && Math.abs(v) <= Math.max(0, w) ** 0.6
  })
  const id = s.addRamp(tones)
  shadeDome(s, m, id, { relief: 0.5, bias: 0.04 })
  for (let t = -rx + 1; t <= rx - 1.5; t += 0.5) {
    const x = Math.floor(cx + t * c), y = Math.floor(cy + t * sn)
    if (m.get(x, y)) s.paint(x, y, id, 4)
  }
  // A few side veins, slanting toward the tip.
  for (const t of [-5, 0, 5]) {
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 2; k++) {
        const x = Math.floor(cx + (t + k * 0.9) * c - side * k * sn), y = Math.floor(cy + (t + k * 0.9) * sn + side * k * c)
        if (m.get(x, y) && s.toneAt(x, y) < 5) s.shift(x, y, 1)
      }
    }
  }
  return m
}
