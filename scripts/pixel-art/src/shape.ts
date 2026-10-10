// Shape masks and lighting. Rounded objects are shaded as domes from a distance transform, so any
// silhouette gets sphere-like light; cut objects (stones, ore, gems) are shaded facet by facet.
import type { Sprite } from './sprite.ts'

export type Vec3 = [number, number, number]
export type Point = readonly [number, number]

export function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** Light from the top left, slightly in front. */
export const LIGHT: Vec3 = normalize([-0.55, -0.65, 0.6])

export function pointInPolygon(px: number, py: number, pts: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i] ?? [0, 0]
    const [xj, yj] = pts[j] ?? [0, 0]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export class Mask {
  readonly w: number
  readonly h: number
  readonly data: Uint8Array

  constructor(w = 32, h = 32) {
    this.w = w
    this.h = h
    this.data = new Uint8Array(w * h)
  }

  get(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.data[y * this.w + x] === 1
  }

  set(x: number, y: number, on = true): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[y * this.w + x] = on ? 1 : 0
  }

  union(...others: Mask[]): this {
    for (const o of others) for (let i = 0; i < this.data.length; i++) if (o.data[i]) this.data[i] = 1
    return this
  }

  subtract(...others: Mask[]): this {
    for (const o of others) for (let i = 0; i < this.data.length; i++) if (o.data[i]) this.data[i] = 0
    return this
  }

  each(fn: (x: number, y: number) => void): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.data[y * this.w + x]) fn(x, y)
  }

  /** Pixels whose centers pass `test`. */
  static from(test: (px: number, py: number) => boolean, w = 32, h = 32): Mask {
    const m = new Mask(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (test(x + 0.5, y + 0.5)) m.set(x, y)
    return m
  }

  /** An ellipse; `rot` in degrees turns its long axis clockwise on screen. */
  static ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Mask {
    const r = (rot * Math.PI) / 180
    const c = Math.cos(r), s = Math.sin(r)
    return Mask.from((px, py) => {
      const dx = px - cx, dy = py - cy
      const u = dx * c + dy * s
      const v = -dx * s + dy * c
      return (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1
    })
  }

  static circle(cx: number, cy: number, r: number): Mask {
    return Mask.ellipse(cx, cy, r, r)
  }

  static polygon(points: readonly Point[]): Mask {
    return Mask.from((px, py) => pointInPolygon(px, py, points))
  }
}

/** Light value → tone (1 deep shadow … 5 highlight). */
export function toneFor(light: number): number {
  if (light < 0.14) return 1
  if (light < 0.42) return 2
  if (light < 0.72) return 3
  if (light < 0.9) return 4
  return 5
}

export interface DomeOptions {
  /** Added to every light value: positive brightens the whole object. */
  bias?: number
  /** Flattens (< 1) or deepens (> 1) the dome. */
  relief?: number
  /** Edge pixels touching an object painted earlier get a deep-shadow contact line. Default on. */
  contact?: boolean
}

/** Shades a mask as a rounded dome. `ramp` is a ramp id, or a function choosing one per pixel. */
export function shadeDome(sprite: Sprite, mask: Mask, ramp: number | ((x: number, y: number) => number), o: DomeOptions = {}): void {
  const { w, h } = mask
  const outside: [number, number][] = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!mask.get(x, y)) outside.push([x, y])
  const dist = new Float32Array(w * h)
  let radius = 1
  mask.each((x, y) => {
    let best = Math.min(x + 1, y + 1, w - x, h - y)
    for (const [ox, oy] of outside) {
      const d = Math.hypot(ox - x, oy - y)
      if (d < best) best = d
    }
    dist[y * w + x] = best
    if (best > radius) radius = best
  })
  const relief = o.relief ?? 1
  const z = (x: number, y: number) => {
    if (!mask.get(x, y)) return 0
    const t = (dist[y * w + x] ?? 0) / radius
    return radius * relief * Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)))
  }
  const contactOn = o.contact ?? true
  const touches: [number, number][] = [[0, -1], [-1, 0], [1, 0], [0, 1]]
  const painted: [number, number, number, number][] = []
  mask.each((x, y) => {
    const n = normalize([-(z(x + 1, y) - z(x - 1, y)) / 2, -(z(x, y + 1) - z(x, y - 1)) / 2, 1])
    let tone = toneFor(dot(n, LIGHT) + (o.bias ?? 0))
    if (contactOn && touches.some(([dx, dy]) => !mask.get(x + dx, y + dy) && sprite.filled(x + dx, y + dy))) tone = 1
    painted.push([x, y, typeof ramp === 'number' ? ramp : ramp(x, y), tone])
  })
  for (const [x, y, id, tone] of painted) sprite.paint(x, y, id, tone)
}

export interface Facet {
  poly: Point[]
  normal: Vec3
}

/**
 * A cut stone: an outer ring at height 0 and a smaller inner ring (the top face) at `height`.
 * Each side is the quad between the rings; its normal comes from the quad's diagonals.
 */
export function cutStone(outer: readonly Point[], inner: readonly Point[], height: number, topTilt: Vec3 = [-0.18, -0.24, 1]): Facet[] {
  const facets: Facet[] = []
  const n = outer.length
  for (let i = 0; i < n; i++) {
    const a = outer[i] ?? [0, 0], b = outer[(i + 1) % n] ?? [0, 0]
    const c = inner[(i + 1) % n] ?? [0, 0], d = inner[i] ?? [0, 0]
    const ac: Vec3 = [c[0] - a[0], c[1] - a[1], height]
    const bd: Vec3 = [d[0] - b[0], d[1] - b[1], height]
    let normal = normalize([ac[1] * bd[2] - ac[2] * bd[1], ac[2] * bd[0] - ac[0] * bd[2], ac[0] * bd[1] - ac[1] * bd[0]])
    if (normal[2] < 0) normal = [-normal[0], -normal[1], -normal[2]]
    facets.push({ poly: [a, b, c, d], normal })
  }
  facets.push({ poly: [...inner], normal: normalize(topTilt) })
  return facets
}

/**
 * Fills the outer silhouette, then shades each facet flat. Sides are toned by rank (best lit first), so every
 * cut object shows a full light → dark spread whatever its shape; the top face (the last facet) stays light.
 */
export function shadeFacets(sprite: Sprite, outer: readonly Point[], facets: readonly Facet[], ramp: number): void {
  Mask.polygon(outer).each((x, y) => sprite.paint(x, y, ramp, 3))
  const sides = facets.slice(0, -1).map((f) => ({ f, light: dot(f.normal, LIGHT) })).sort((a, b) => b.light - a.light)
  const ladder = [4, 4, 3, 3, 2, 2, 1, 1, 1]
  sides.forEach(({ f }, i) => {
    const tone = ladder[Math.round((i * (ladder.length - 1)) / Math.max(1, sides.length - 1))] ?? 2
    Mask.polygon(f.poly).each((x, y) => sprite.paint(x, y, ramp, tone))
  })
  const top = facets[facets.length - 1]
  if (top) Mask.polygon(top.poly).each((x, y) => sprite.paint(x, y, ramp, 4))
}
