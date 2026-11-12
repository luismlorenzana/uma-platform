// The kit painter (P147): a float RGBA canvas that fills signed-distance shapes with antialiased edges, in layers, the
// way a painter builds a frame: a base, then shading and light only inside what's there (`atop`), then details. Light
// comes from the top front-left (format.md §10). Deterministic: plain arithmetic, no platform rasteriser. Pure.
import { clamp01, type RGB, type RGBA } from './color.js'
import { fbm } from './noise.js'

/** A shape: its signed distance in texels (negative inside) and the box worth visiting. */
export interface Shape { box: [number, number, number, number]; sd: (x: number, y: number) => number }
/** What a shape is filled with, per texel: straight-alpha RGBA. */
export type PaintFn = (x: number, y: number) => RGBA
export type Paint = RGBA | PaintFn
/** How a layer meets what's below: `over`; `atop` (only on what's there, keeping its alpha); `multiply` and `screen`
 * (atop, darkening or lightening); `erase` (cutting alpha away). */
export type Blend = 'over' | 'atop' | 'multiply' | 'screen' | 'erase'

const INF = 1e9
export const ALL: Shape = { box: [-INF, -INF, INF, INF], sd: () => -INF }

// --- Shapes --------------------------------------------------------------------------------------------------------------

export const circle = (cx: number, cy: number, r: number): Shape =>
  ({ box: [cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1], sd: (x, y) => Math.hypot(x - cx, y - cy) - r })
/** An ellipse (an approximate distance, exact enough for edges). */
export const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({
  box: [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1],
  sd: (x, y) => { const k = Math.hypot((x - cx) / rx, (y - cy) / ry); return (k - 1) * Math.min(rx, ry) },
})
/** A rectangle from (x, y), `w × h`, its corners rounded by `r`. */
export function rect(x: number, y: number, w: number, h: number, r = 0): Shape {
  const cx = x + w / 2, cy = y + h / 2, hx = w / 2 - r, hy = h / 2 - r
  return {
    box: [x - 1, y - 1, x + w + 1, y + h + 1],
    sd: (px, py) => {
      const qx = Math.abs(px - cx) - hx, qy = Math.abs(py - cy) - hy
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
    },
  }
}
/** A line segment from a to b, `r` thick each side (a stroke, a stem, a rail). */
export function capsule(ax: number, ay: number, bx: number, by: number, r: number, r2 = r): Shape {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1
  return {
    box: [Math.min(ax, bx) - Math.max(r, r2) - 1, Math.min(ay, by) - Math.max(r, r2) - 1, Math.max(ax, bx) + Math.max(r, r2) + 1, Math.max(ay, by) + Math.max(r, r2) + 1],
    sd: (x, y) => { const t = clamp01(((x - ax) * dx + (y - ay) * dy) / l2); return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (r + (r2 - r) * t) },
  }
}
/** A polygon by its points (any winding). */
export function poly(points: readonly [number, number][]): Shape {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1])
  return {
    box: [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1],
    sd: (x, y) => {
      let d = Infinity, s = 1
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i]!, [bx, by] = points[j]!, ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay
        const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey || 1)), qx = wx - ex * t, qy = wy - ey * t
        d = Math.min(d, qx * qx + qy * qy)
        const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s
      }
      return s * Math.sqrt(d)
    },
  }
}
export const union = (...shapes: Shape[]): Shape => ({
  box: [Math.min(...shapes.map((s) => s.box[0])), Math.min(...shapes.map((s) => s.box[1])), Math.max(...shapes.map((s) => s.box[2])), Math.max(...shapes.map((s) => s.box[3]))],
  sd: (x, y) => Math.min(...shapes.map((s) => s.sd(x, y))),
})
export const intersect = (a: Shape, b: Shape): Shape => ({
  box: [Math.max(a.box[0], b.box[0]), Math.max(a.box[1], b.box[1]), Math.min(a.box[2], b.box[2]), Math.min(a.box[3], b.box[3])],
  sd: (x, y) => Math.max(a.sd(x, y), b.sd(x, y)),
})
export const subtract = (a: Shape, b: Shape): Shape => ({ box: a.box, sd: (x, y) => Math.max(a.sd(x, y), -b.sd(x, y)) })
/** Grows (or with a negative `by`, shrinks) a shape. */
export const grow = (s: Shape, by: number): Shape => ({ box: [s.box[0] - by, s.box[1] - by, s.box[2] + by, s.box[3] + by], sd: (x, y) => s.sd(x, y) - by })
/** A shape's edge roughened by noise: foliage, torn cloth, a dirt patch's rim. */
export function rough(s: Shape, amount: number, cells: number, seed: number): Shape {
  return { box: [s.box[0] - amount, s.box[1] - amount, s.box[2] + amount, s.box[3] + amount],
    sd: (x, y) => s.sd(x, y) + (fbm(x, y, { cells, octaves: 3, seed }) - 0.5) * 2 * amount }
}
/** A shape moved by (dx, dy). */
export const moved = (s: Shape, dx: number, dy: number): Shape =>
  ({ box: [s.box[0] + dx, s.box[1] + dy, s.box[2] + dx, s.box[3] + dy], sd: (x, y) => s.sd(x - dx, y - dy) })

// --- Paints --------------------------------------------------------------------------------------------------------------

export const solid = (c: RGB, a = 1): RGBA => [c[0], c[1], c[2], a]
/** A linear gradient from (x0, y0) to (x1, y1) through colour stops. */
export function linear(x0: number, y0: number, x1: number, y1: number, stops: readonly [number, RGB][], a = 1): PaintFn {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1
  return (x, y) => {
    const t = clamp01(((x - x0) * dx + (y - y0) * dy) / l2)
    let i = 0
    while (i < stops.length - 2 && t > stops[i + 1]![0]) i++
    const [t0, c0] = stops[i]!, [t1, c1] = stops[Math.min(i + 1, stops.length - 1)]!, k = t1 > t0 ? clamp01((t - t0) / (t1 - t0)) : 0
    return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k, a]
  }
}
/** A radial gradient round (cx, cy) out to `r`. */
export function radial(cx: number, cy: number, r: number, inner: RGB, outer: RGB, a = 1, power = 1): PaintFn {
  return (x, y) => {
    const t = clamp01(Math.hypot(x - cx, y - cy) / r) ** power
    return [inner[0] + (outer[0] - inner[0]) * t, inner[1] + (outer[1] - inner[1]) * t, inner[2] + (outer[2] - inner[2]) * t, a]
  }
}
/** A colour whose alpha follows a function (a soft light, a shadow fading out). */
export const fading = (c: RGB, alpha: (x: number, y: number) => number): PaintFn => (x, y) => [c[0], c[1], c[2], clamp01(alpha(x, y))]

// --- The canvas ----------------------------------------------------------------------------------------------------------

export class Canvas {
  /** Premultiplied RGBA, 0–1. */
  readonly px: Float32Array
  constructor(readonly w: number, readonly h: number) { this.px = new Float32Array(w * h * 4) }

  /** Fills a shape with a paint: an antialiased edge (half a texel either side), at `opacity`, by `blend`. */
  fill(shape: Shape, paint: Paint, blend: Blend = 'over', opacity = 1): this {
    const [bx0, by0, bx1, by1] = shape.box
    const x0 = Math.max(0, Math.floor(bx0)), y0 = Math.max(0, Math.floor(by0)), x1 = Math.min(this.w, Math.ceil(bx1)), y1 = Math.min(this.h, Math.ceil(by1))
    const fn = typeof paint === 'function' ? paint : null, flat = fn ? null : (paint as RGBA)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const cx = x + 0.5, cy = y + 0.5, cover = clamp01(0.5 - shape.sd(cx, cy))
      if (cover <= 0) continue
      const c = fn ? fn(cx, cy) : flat!, a = c[3] * cover * opacity
      if (a <= 0) continue
      this.put(x, y, c, a, blend)
    }
    return this
  }

  /** Paints every texel by a function (a texture, a whole-frame light), clipped to `shape`. */
  paint(fn: (x: number, y: number) => RGBA, blend: Blend = 'over', shape: Shape = ALL): this { return this.fill(shape, fn, blend) }

  private put(x: number, y: number, c: RGBA, a: number, blend: Blend): void {
    const i = (y * this.w + x) * 4, p = this.px, da = p[i + 3]!
    if (blend === 'over') {
      for (let k = 0; k < 3; k++) p[i + k] = c[k]! * a + p[i + k]! * (1 - a)
      p[i + 3] = a + da * (1 - a)
      return
    }
    if (blend === 'erase') { for (let k = 0; k < 4; k++) p[i + k] = p[i + k]! * (1 - a); return }
    if (da <= 0) return
    for (let k = 0; k < 3; k++) {
      const d = p[i + k]! / da
      const s = blend === 'atop' ? c[k]! : blend === 'multiply' ? d * c[k]! : 1 - (1 - d) * (1 - c[k]!)
      p[i + k] = (d + (s - d) * a) * da
    }
  }

  /** Copies another canvas over this one at (dx, dy). */
  draw(src: Canvas, dx = 0, dy = 0, blend: Blend = 'over', opacity = 1): this {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const tx = x + dx, ty = y + dy
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue
      const i = (y * src.w + x) * 4, a = src.px[i + 3]! * opacity
      if (a <= 0) continue
      this.put(tx, ty, [src.px[i]! / src.px[i + 3]!, src.px[i + 1]! / src.px[i + 3]!, src.px[i + 2]! / src.px[i + 3]!, 1], a, blend)
    }
    return this
  }

  alpha(x: number, y: number): number { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.px[(y * this.w + x) * 4 + 3]! }

  /** 8-bit straight RGBA, with the colour of each edge bled a few texels into the clear around it (alpha stays 0), so a
   * scaled, mipmapped kit never shows dark fringes. */
  rgba8(bleed = 4): Uint8Array {
    const { w, h, px } = this, out = new Uint8Array(w * h * 4)
    const col = new Float32Array(w * h * 3), known = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const a = px[i * 4 + 3]!
      if (a > 1 / 512) { for (let k = 0; k < 3; k++) col[i * 3 + k] = px[i * 4 + k]! / a; known[i] = 1 }
    }
    for (let pass = 0; pass < bleed; pass++) {
      const add: [number, number, number, number][] = []
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (known[i]) continue
        let r = 0, g = 0, b = 0, n = 0
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
          const nx = x + k, ny = y + j
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const q = ny * w + nx
          if (known[q] === 1) { r += col[q * 3]!; g += col[q * 3 + 1]!; b += col[q * 3 + 2]!; n++ }
        }
        if (n) add.push([i, r / n, g / n, b / n])
      }
      for (const [i, r, g, b] of add) { col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b; known[i] = 2 }
      for (const [i] of add) known[i] = 1
    }
    for (let i = 0; i < w * h; i++) {
      const a = Math.round(clamp01(px[i * 4 + 3]!) * 255)
      for (let k = 0; k < 3; k++) out[i * 4 + k] = known[i] ? Math.round(clamp01(col[i * 3 + k]!) * 255) : 0
      out[i * 4 + 3] = a
    }
    return out
  }
}

/** A tile-repeating copy of a shape: drawn at its place and shifted a tile each way, so strokes cross edges seamlessly.
 * Each copy comes with its shift, to paint it as the original is painted. */
export function tiledAt(s: Shape, tile: number, axes: 'x' | 'xy' = 'xy'): { shape: Shape; dx: number; dy: number }[] {
  const out: { shape: Shape; dx: number; dy: number }[] = []
  const ys = axes === 'xy' ? [-tile, 0, tile] : [0]
  for (const dy of ys) for (const dx of [-tile, 0, tile]) {
    const m = moved(s, dx, dy)
    if (m.box[2] >= 0 && m.box[0] <= tile && (axes === 'x' || (m.box[3] >= 0 && m.box[1] <= tile))) out.push({ shape: m, dx, dy })
  }
  return out
}
/** Fills a shape and its tile-shifted copies, each painted as the original (a stroke crossing a tile's edge). */
export function fillTiled(c: Canvas, s: Shape, paint: Paint, tile: number, axes: 'x' | 'xy' = 'xy', blend: Blend = 'over', opacity = 1): void {
  for (const { shape, dx, dy } of tiledAt(s, tile, axes)) {
    c.fill(shape, typeof paint === 'function' ? (x, y) => paint(x - dx, y - dy) : paint, blend, opacity)
  }
}
