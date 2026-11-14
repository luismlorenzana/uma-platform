// The cabins' drawing kit (CY14, P164). A Pen draws one piece on a 64-unit box at any cell size, so every piece is native
// pixels at 64 and at room size: parametric geometry, never a resampled image. On top of the shared Sprite (ramps, the
// selective outline, the contact shadow) it adds snapped rectangles and strokes, a fast dome, cylinders, 3/4 boxes,
// emissive halos (a soft ring of the light's colour around a light source) and light washes (beams, floor glow).
import { hex, ramp, type RGBA, type RampOptions } from '../color.ts'
import { LIGHT, Mask, normalize, toneFor } from '../shape.ts'
import { Sprite } from '../sprite.ts'

export type Pt = readonly [number, number]
export const UNITS = 64

// ---- Colour -------------------------------------------------------------------------------------------------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function toHsl(c: string): [number, number, number] {
  const [r, g, b] = hex(c).map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

export function fromHsl(h: number, s: number, l: number): string {
  const hn = (((h % 360) + 360) % 360) / 360
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const ch = (t0: number) => {
    const t = (t0 + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const v = s === 0 ? [l, l, l] : [ch(hn + 1 / 3), ch(hn), ch(hn - 1 / 3)]
  return `#${v.map((x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0')).join('')}`
}

/** `a` → `b` by `t` in RGB. */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a), y = hex(b)
  return `#${[0, 1, 2].map((i) => Math.round((x[i] ?? 0) + ((y[i] ?? 0) - (x[i] ?? 0)) * t).toString(16).padStart(2, '0')).join('')}`
}

/** The same hue and saturation at lightness `l`. */
export const atL = (c: string, l: number): string => { const [h, s] = toHsl(c); return fromHsl(h, s, clamp01(l)) }

/** A style's body: its base colour lifted a little so a dark piece still reads on the night wall, shadows turning cool. */
export function bodyTones(base: string, lift = .08): RGBA[] {
  const [h, s, l] = toHsl(base)
  return ramp(fromHsl(h, Math.min(1, s * 1.05), Math.max(l, .2) + lift), { lift: .2, drop: .25, hueShift: 6 })
}

/** An emissive ramp: 0 a dark rim, 1–2 the light dimmed, 3 the accent itself, 4 hot, 5 a near-white core. */
export function lightTones(accent: string): RGBA[] {
  return [atL(accent, .1), mix(accent, '#140c24', .62), mix(accent, '#140c24', .34), accent, mix(accent, '#ffffff', .42), mix(accent, '#ffffff', .78)].map((c) => hex(c))
}

/** A plain material ramp, a touch cooler in the shadows than the shared default, for the night. */
export const matTones = (c: string, o: RampOptions = {}): RGBA[] => ramp(c, { lift: .28, drop: .26, hueShift: 10, ...o })

// ---- Masks --------------------------------------------------------------------------------------------------------

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

export function dilate(m: Mask, r = 1, diagonal = true): Mask {
  const out = new Mask(m.w, m.h)
  m.each((x, y) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!diagonal && Math.abs(dx) + Math.abs(dy) > r) continue
      out.set(x + dx, y + dy)
    }
  })
  return out
}

/** The mask's rim: pixels with a 4-neighbour outside it. */
export function rim(m: Mask): Mask {
  const out = new Mask(m.w, m.h)
  m.each((x, y) => { if (!m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)) out.set(x, y) })
  return out
}

export const erode = (m: Mask, times = 1): Mask => {
  let out = m
  for (let i = 0; i < times; i++) out = copy(out).subtract(rim(out))
  return out
}

export const copy = (m: Mask): Mask => { const out = new Mask(m.w, m.h); out.data.set(m.data); return out }
export const intersect = (a: Mask, b: Mask): Mask => { const out = new Mask(a.w, a.h); a.each((x, y) => { if (b.get(x, y)) out.set(x, y) }); return out }
export const count = (m: Mask): number => m.data.reduce((n, v) => n + v, 0)

/** Bounds of a mask in pixels, or null when empty. */
export function bounds(m: Mask): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
  m.each((x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) })
  return x1 < 0 ? null : { x0, y0, x1, y1 }
}

// ---- The pen ------------------------------------------------------------------------------------------------------

type ToneFn = (ux: number, uy: number, x: number, y: number) => number
interface Halo { mask: Mask; color: RGBA; power: number }
interface Wash { mask: Mask; color: RGBA; alpha: number | ((ux: number, uy: number) => number); empty: boolean }

export class Pen {
  readonly s: Sprite
  readonly n: number
  readonly k: number
  private readonly halos: Halo[] = []
  private readonly washes: Wash[] = []

  constructor(n: number) {
    this.n = n
    this.k = n / UNITS
    this.s = new Sprite(n, n)
  }

  /** At room size: draw the extra detail a 64 px icon has no room for. */
  get big(): boolean { return this.k > 1.2 }
  /** A unit length in whole pixels, at least `min`. */
  px(u: number, min = 1): number { return Math.max(min, Math.round(u * this.k)) }
  P(u: number): number { return Math.round(u * this.k) }

  add(c: string, o?: RampOptions): number { return this.s.addRamp(matTones(c, o)) }
  tones(t: RGBA[]): number { return this.s.addRamp(t) }

  // Masks, all in units.
  blank(): Mask { return new Mask(this.n, this.n) }
  test(fn: (ux: number, uy: number) => boolean): Mask { const k = this.k; return Mask.from((px, py) => fn(px / k, py / k), this.n, this.n) }

  /** A rectangle [x0, x1) × [y0, y1), snapped so equal widths stay equal in pixels. */
  rect(x0: number, y0: number, x1: number, y1: number): Mask {
    const a = this.P(x0), b = a + this.px(x1 - x0), c = this.P(y0), d = c + this.px(y1 - y0)
    const m = this.blank()
    for (let y = c; y < d; y++) for (let x = a; x < b; x++) m.set(x, y)
    return m
  }

  /** A rounded rectangle, corner radius `r` units. */
  rrect(x0: number, y0: number, x1: number, y1: number, r: number): Mask {
    const a = this.P(x0), b = a + this.px(x1 - x0), c = this.P(y0), d = c + this.px(y1 - y0), rp = r * this.k
    return Mask.from((px, py) => {
      if (px < a || px > b || py < c || py > d) return false
      const cx = Math.min(Math.max(px, a + rp), b - rp), cy = Math.min(Math.max(py, c + rp), d - rp)
      return Math.hypot(px - cx, py - cy) <= rp + .02
    }, this.n, this.n)
  }

  poly(pts: readonly Pt[]): Mask { const k = this.k; return Mask.polygon(pts.map(([x, y]) => [x * k, y * k] as const), this.n, this.n) }
  ell(cx: number, cy: number, rx: number, ry: number, rot = 0): Mask { const k = this.k; return Mask.ellipse(cx * k, cy * k, rx * k, ry * k, rot, this.n, this.n) }
  circ(cx: number, cy: number, r: number): Mask { return this.ell(cx, cy, r, r) }
  ring(cx: number, cy: number, rx: number, ry: number, t: number): Mask { return this.ell(cx, cy, rx, ry).subtract(this.ell(cx, cy, rx - t, ry - t)) }

  /** A one-pixel line at any size (Bresenham). */
  hair(x0: number, y0: number, x1: number, y1: number): Mask {
    const m = this.blank()
    let x = this.P(x0), y = this.P(y0)
    const tx = this.P(x1), ty = this.P(y1), dx = Math.abs(tx - x), dy = -Math.abs(ty - y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1
    let err = dx + dy
    for (;;) {
      m.set(x, y)
      if (x === tx && y === ty) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x += sx }
      if (e2 <= dx) { err += dx; y += sy }
    }
    return m
  }

  /** A stroke `w` units wide with round ends; a hairline when that is under about a pixel and a half. */
  seg(x0: number, y0: number, x1: number, y1: number, w = 1): Mask {
    if (w * this.k < 1.6) return this.hair(x0, y0, x1, y1)
    const k = this.k, r = (w * k) / 2
    return Mask.from((px, py) => segDist(px, py, x0 * k, y0 * k, x1 * k, y1 * k) <= r, this.n, this.n)
  }

  path(pts: readonly Pt[], w = 1): Mask {
    const m = this.blank()
    for (let i = 1; i < pts.length; i++) m.union(this.seg(pts[i - 1]![0], pts[i - 1]![1], pts[i]![0], pts[i]![1], w))
    return m
  }

  /** A sampled curve `f(t)`, t in [0, 1]. */
  curve(f: (t: number) => Pt, w = 1, steps = 24): Mask {
    return this.path(Array.from({ length: steps + 1 }, (_, i) => f(i / steps)), w)
  }

  // Painting.
  fill(m: Mask, id: number, tone: number | ToneFn = 3): Mask {
    const k = this.k
    m.each((x, y) => this.s.paint(x, y, id, typeof tone === 'number' ? tone : tone((x + .5) / k, (y + .5) / k, x, y)))
    return m
  }

  /** Darkens or lightens what is already painted under the mask. */
  shift(m: Mask, d: number): void { m.each((x, y) => this.s.shift(x, y, d)) }

  dot(ux: number, uy: number, id: number, tone: number): void { this.s.paint(this.P(ux), this.P(uy), id, tone) }

  /** A rounded object lit from the top left (the shared shadeDome's light, with a linear-time distance transform). */
  dome(m: Mask, id: number | ((x: number, y: number) => number), o: { bias?: number; relief?: number; contact?: boolean } = {}): Mask {
    const { w, h } = m, INF = 1e9, d = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) d[i] = m.data[i] ? INF : 0
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]!)
    const r2 = Math.SQRT2
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (d[i]! > 0) d[i] = Math.min(d[i]!, at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + r2, at(x + 1, y - 1) + r2)
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (d[i]! > 0) d[i] = Math.min(d[i]!, at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + r2, at(x - 1, y + 1) + r2)
    }
    let radius = 1
    m.each((x, y) => { radius = Math.max(radius, d[y * w + x]!) })
    const relief = o.relief ?? 1
    const z = (x: number, y: number) => {
      if (!m.get(x, y)) return 0
      const t = d[y * w + x]! / radius
      return radius * relief * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)))
    }
    const contact = o.contact ?? false
    const out: [number, number, number, number][] = []
    m.each((x, y) => {
      const nv = normalize([-(z(x + 1, y) - z(x - 1, y)) / 2, -(z(x, y + 1) - z(x, y - 1)) / 2, 1])
      let tone = toneFor(nv[0] * LIGHT[0] + nv[1] * LIGHT[1] + nv[2] * LIGHT[2] + (o.bias ?? 0))
      if (contact && [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => !m.get(x + dx!, y + dy!) && this.s.filled(x + dx!, y + dy!))) tone = 1
      out.push([x, y, typeof id === 'number' ? id : id(x, y), tone])
    })
    for (const [x, y, rid, tone] of out) this.s.paint(x, y, rid, tone)
    return m
  }

  /** A vertical cylinder (posts, legs, jars): each row lit across from the left, shaded at the right. */
  cylV(m: Mask, id: number, o: { lo?: number; hi?: number } = {}): Mask {
    const lo = o.lo ?? 1, hi = o.hi ?? 5
    for (let y = 0; y < m.h; y++) {
      let x = 0
      while (x < m.w) {
        if (!m.get(x, y)) { x++; continue }
        let e = x
        while (e + 1 < m.w && m.get(e + 1, y)) e++
        const n = e - x + 1
        for (let i = x; i <= e; i++) {
          const t = (i - x + .5) / n
          const tone = n <= 2 ? (i === x ? 4 : 2) : t < .12 ? 3 : t < .38 ? (n >= 6 && t > .2 && t < .3 ? 5 : 4) : t < .62 ? 3 : t < .86 ? 2 : 1
          this.s.paint(i, y, id, Math.min(hi, Math.max(lo, tone)))
        }
        x = e + 1
      }
    }
    return m
  }

  /** A horizontal cylinder (tubes, rails, rolls): lit along the top, shaded underneath. */
  cylH(m: Mask, id: number, o: { lo?: number; hi?: number } = {}): Mask {
    const lo = o.lo ?? 1, hi = o.hi ?? 5
    for (let x = 0; x < m.w; x++) {
      let y = 0
      while (y < m.h) {
        if (!m.get(x, y)) { y++; continue }
        let e = y
        while (e + 1 < m.h && m.get(x, e + 1)) e++
        const n = e - y + 1
        for (let i = y; i <= e; i++) {
          const t = (i - y + .5) / n
          const tone = n <= 2 ? (i === y ? 4 : 2) : t < .15 ? 4 : t < .4 ? (n >= 5 && t < .3 ? 5 : 4) : t < .7 ? 3 : t < .88 ? 2 : 1
          this.s.paint(x, i, id, Math.min(hi, Math.max(lo, tone)))
        }
        y = e + 1
      }
    }
    return m
  }

  /**
   * A box seen from the front and a little above: the top face (`top` units deep) lit, its front edge catching the
   * light; the front face falling off toward the floor, its left edge lit and right edge shaded.
   */
  box(x0: number, y0: number, x1: number, y1: number, top: number, id: number, o: { round?: boolean; tones?: readonly [number, number, number] } = {}): Mask {
    const a = this.P(x0), b = a + this.px(x1 - x0), c = this.P(y0), d = c + this.px(y1 - y0), t = top <= 0 ? 0 : this.px(top)
    const [tTop, tFront, tLow] = o.tones ?? [4, 3, 2]
    const m = this.blank()
    for (let y = c; y < d; y++) for (let x = a; x < b; x++) {
      if (o.round && (x === a || x === b - 1) && (y === c || y === d - 1)) continue
      let tone: number
      if (y < c + t) tone = y === c + t - 1 ? Math.min(5, tTop + 1) : tTop
      else {
        const f = (y - c - t + .5) / Math.max(1, d - c - t)
        tone = f > .72 ? tLow : tFront
        if (y === d - 1) tone = Math.max(1, tLow - 1)
        if (x === a) tone = Math.min(5, tone + 1)
        if (x === b - 1) tone = Math.max(1, tone - 1)
      }
      this.s.paint(x, y, id, tone)
      m.set(x, y)
    }
    return m
  }

  /** Paints the mask's rim one tone, e.g. a seam or a rim light inside the silhouette. */
  edge(m: Mask, id: number, tone: number): Mask { return this.fill(rim(m), id, tone) }

  /** Marks a light source: at render a soft ring of its colour falls on what's around it (two rings at room size). */
  halo(m: Mask, color: string, power = 1): void { this.halos.push({ mask: m, color: hex(color), power }) }

  /** A translucent light (a beam, a pool on the floor, a hologram): overlays of `color`, by default only where nothing is painted. */
  wash(m: Mask, color: string, alpha: number | ((ux: number, uy: number) => number), empty = true): void {
    this.washes.push({ mask: m, color: hex(color), alpha, empty })
  }

  /** A soft contact shadow under a standing piece, in units. */
  shadow(cx: number, cy: number, rx: number, ry: number, alpha = 70): void {
    const k = this.k
    this.s.shadow = { cx: cx * k, cy: cy * k, rx: rx * k, ry: ry * k, alpha }
  }

  /** Bakes the washes and halos into overlays and renders the sprite. */
  finish(): Uint8Array {
    const { s, n, k } = this
    // Washes are soft light, never part of a silhouette: they stay off the cell's outer ring so nothing touches its edge.
    for (const wsh of this.washes) wsh.mask.each((x, y) => {
      if (x < 1 || y < 1 || x > n - 2 || y > n - 2) return
      if (wsh.empty && s.filled(x, y)) return
      const a = typeof wsh.alpha === 'number' ? wsh.alpha : wsh.alpha((x + .5) / k, (y + .5) / k)
      if (a > 0) s.overlay(x, y, [wsh.color[0], wsh.color[1], wsh.color[2], Math.min(255, Math.round(a))])
    })
    const lit = new Mask(n, n)
    for (const h of this.halos) lit.union(h.mask)
    const best = new Map<number, [RGBA, number]>()
    const reach = this.big ? 2 : 1
    for (const h of this.halos) h.mask.each((x, y) => {
      for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
        const qx = x + dx, qy = y + dy
        if (!s.inside(qx, qy) || lit.get(qx, qy)) continue
        const d4 = Math.abs(dx) + Math.abs(dy), cheb = Math.max(Math.abs(dx), Math.abs(dy))
        if (d4 === 0) continue
        const filled = s.filled(qx, qy)
        let a: number
        if (cheb === 1) a = d4 === 1 ? (filled ? 62 : 150) : filled ? 34 : 86
        else a = filled ? 0 : d4 <= 2 ? 58 : d4 === 3 ? 32 : 0
        a = Math.round(a * h.power)
        const i = qy * n + qx, cur = best.get(i)
        if (a > 0 && (!cur || cur[1] < a)) best.set(i, [h.color, a])
      }
    })
    for (const [i, [c, a]] of [...best.entries()].sort((p, q) => p[0] - q[0])) s.overlay(i % n, Math.floor(i / n), [c[0], c[1], c[2], Math.min(255, a)])
    return s.render()
  }
}

export type Painter = (p: Pen) => void

/** A seeded list of points inside a mask, for scattered detail (moss, stars, grain) that is the same on every run. */
export function scatter(m: Mask, every: number, seed: number): [number, number][] {
  const out: [number, number][] = []
  let a = seed >>> 0
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  m.each((x, y) => { if (next() < 1 / every) out.push([x, y]) })
  return out
}
