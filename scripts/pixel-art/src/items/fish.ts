// Fish (Fishery, ATK family): uma-rpg docs/design/items.md#fish. One pose for the whole family: a side view,
// facing left with the head raised, so a long body fits the 32 px canvas. Each fish is built in its own body
// coordinates (u runs tail → snout, v runs back → belly) and rasterized at that tilt.
import { ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

type UV = readonly [number, number]

/** One side of the body profile: its greatest depth, where that is (0 tail → 1 snout) and how blunt the head is. */
interface Edge {
  h: number
  peak: number
  /** 2 is an elliptical head; higher is blunter, lower is pointier. */
  nose: number
}

interface FrameSpec {
  /** Body length, tail root to snout. */
  len: number
  /** Tail fin length, only used to center the whole fish. */
  tail: number
  top: Edge
  bot: Edge
  /** Half-depth at the tail root. */
  ped: number
  cx?: number
  cy?: number
  /** Degrees the head is raised. */
  tilt?: number
  /** Canvas pixels per body unit. */
  scale?: number
}

const POSE_TILT = 28
const POSE_SCALE = 1.06

class FishFrame {
  readonly len: number
  readonly top: Edge
  readonly bot: Edge
  readonly ped: number
  private readonly k: number
  private readonly ox: number
  private readonly oy: number
  private readonly dx: number
  private readonly dy: number
  private readonly nx: number
  private readonly ny: number

  constructor(spec: FrameSpec) {
    this.len = spec.len
    this.top = spec.top
    this.bot = spec.bot
    this.ped = spec.ped
    this.k = spec.scale ?? POSE_SCALE
    const a = ((spec.tilt ?? POSE_TILT) * Math.PI) / 180
    this.dx = -Math.cos(a)
    this.dy = -Math.sin(a)
    this.nx = -Math.sin(a)
    this.ny = Math.cos(a)
    const mid = ((spec.len - spec.tail) / 2) * this.k
    this.ox = (spec.cx ?? 16) - mid * this.dx
    this.oy = (spec.cy ?? 17.6) - mid * this.dy
  }

  local(px: number, py: number): UV {
    const x = (px - this.ox) / this.k, y = (py - this.oy) / this.k
    return [x * this.dx + y * this.dy, x * this.nx + y * this.ny]
  }

  at(u: number, v: number): [number, number] {
    return [this.ox + (u * this.dx + v * this.nx) * this.k, this.oy + (u * this.dy + v * this.ny) * this.k]
  }

  pixel(u: number, v: number): [number, number] {
    const [x, y] = this.at(u, v)
    return [Math.floor(x), Math.floor(y)]
  }

  half(e: Edge, u: number): number {
    const t = u / this.len
    if (t < 0 || t > 1) return 0
    if (t < e.peak) {
      const x = t / e.peak
      return this.ped + (e.h - this.ped) * Math.pow((1 - Math.cos(x * Math.PI)) / 2, 0.7)
    }
    const x = (t - e.peak) / (1 - e.peak)
    return e.h * Math.sqrt(Math.max(0, 1 - Math.pow(x, e.nose)))
  }

  /** v of the back (negative) at u, pushed out by `out`. */
  back(u: number, out = 0): UV {
    return [u, -this.half(this.top, u) - out]
  }

  belly(u: number, out = 0): UV {
    return [u, this.half(this.bot, u) + out]
  }

  /** Normalized depth: −1 at the back edge, 0 on the midline, 1 at the belly edge. */
  depth(u: number, v: number): number {
    const h = v < 0 ? this.half(this.top, u) : this.half(this.bot, u)
    return h > 0 ? v / h : 0
  }

  body(): Mask {
    return this.region((u, v) => u >= 0 && u <= this.len && v >= -this.half(this.top, u) && v <= this.half(this.bot, u))
  }

  region(test: (u: number, v: number) => boolean): Mask {
    return Mask.from((px, py) => {
      const [u, v] = this.local(px, py)
      return test(u, v)
    })
  }

  poly(points: readonly UV[]): Mask {
    return Mask.polygon(points.map(([u, v]) => this.at(u, v)))
  }
}

/** Fin membrane with rays fanning out from `root`; `base` is the tone of the lit rays. */
function paintFin(s: Sprite, f: FishFrame, mask: Mask, id: number, root: UV, base = 3, spacing = 0.42): void {
  mask.each((x, y) => {
    const [u, v] = f.local(x + 0.5, y + 0.5)
    const ang = Math.atan2(v - root[1], u - root[0])
    const ray = ((Math.floor(ang / spacing) % 2) + 2) % 2
    s.paint(x, y, id, ray === 0 ? base : base - 1)
  })
}

/** Body shaded as a dome; `pick` chooses a ramp from body coordinates and normalized depth. */
function paintBody(s: Sprite, f: FishFrame, mask: Mask, pick: (u: number, v: number, depth: number, x: number, y: number) => number, bias = 0): void {
  shadeDome(
    s,
    mask,
    (x, y) => {
      const [u, v] = f.local(x + 0.5, y + 0.5)
      return pick(u, v, f.depth(u, v), x, y)
    },
    { contact: false, bias },
  )
}

/** Slender fish read best with clean lengthwise bands: each stop is [up to depth, ramp, tone], back to belly. */
function paintBands(s: Sprite, f: FishFrame, mask: Mask, stops: readonly (readonly [number, number, number])[]): void {
  mask.each((x, y) => {
    const [u, v] = f.local(x + 0.5, y + 0.5)
    const d = f.depth(u, v)
    const [, id, tone] = stops.find(([max]) => d <= max) ?? stops[stops.length - 1] ?? [1, 0, 3]
    s.paint(x, y, id, tone)
  })
}

const EYE = ramp('#1d1a24')
const EYE_SHINE = ramp('#f4f1e8')

/** A 2 × 2 eye (dark, with a gleam top left), or a single dark pixel for small fish. */
function eye(s: Sprite, f: FishFrame, u: number, v: number, big = true): void {
  const dark = s.addRamp(EYE)
  const [x, y] = f.pixel(u, v)
  if (!big) {
    s.paint(x, y, dark, 1)
    return
  }
  const shine = s.addRamp(EYE_SHINE)
  s.paint(x, y, shine, 5)
  s.paint(x + 1, y, dark, 1)
  s.paint(x, y + 1, dark, 1)
  s.paint(x + 1, y + 1, dark, 2)
}

/** The gill cover's edge: an arc bulging toward the tail, darkened one tone. */
function gill(s: Sprite, f: FishFrame, u0: number, bow: number, from = -0.75, to = 0.8, delta = -1): void {
  const seen = new Set<number>()
  for (let k = 0; k <= 40; k++) {
    const d = from + ((to - from) * k) / 40
    const u = u0 - bow * (1 - d * d)
    const v = d < 0 ? d * f.half(f.top, u0) : d * f.half(f.bot, u0)
    const [x, y] = f.pixel(u, v)
    if (seen.has(y * 32 + x)) continue
    seen.add(y * 32 + x)
    s.shift(x, y, delta)
  }
}

/** A 1 px line through body points, painted with one ramp and tone. */
function line(s: Sprite, f: FishFrame, points: readonly UV[], id: number, tone: number): void {
  for (let i = 0; i + 1 < points.length; i++) {
    const [u0, v0] = points[i] ?? [0, 0]
    const [u1, v1] = points[i + 1] ?? [0, 0]
    const steps = Math.ceil(Math.hypot(u1 - u0, v1 - v0) * 3)
    for (let k = 0; k <= steps; k++) {
      const [x, y] = f.pixel(u0 + ((u1 - u0) * k) / steps, v0 + ((v1 - v0) * k) / steps)
      s.paint(x, y, id, tone)
    }
  }
}

/** Seeded spots on body pixels passing `where`. */
function spots(s: Sprite, f: FishFrame, seed: string, body: Mask, count: number, id: number, tone: number, where: (u: number, v: number, depth: number) => boolean): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  body.each((x, y) => {
    const [u, v] = f.local(x + 0.5, y + 0.5)
    if (where(u, v, f.depth(u, v))) cells.push([x, y])
  })
  const taken = new Set<number>()
  for (let i = 0, placed = 0; placed < count && i < 400 && cells.length > 0; i++) {
    const [x, y] = cells[Math.floor(r() * cells.length)] ?? [0, 0]
    if ([-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => taken.has((y + dy) * 32 + x + dx)))) continue
    taken.add(y * 32 + x)
    s.paint(x, y, id, tone)
    placed++
  }
}

/** Blends two ramps across a depth band with a checker dither. */
function band(depth: number, x: number, y: number, edge: number, upper: number, lower: number, soft = 0.12): number {
  if (depth < edge - soft) return upper
  if (depth > edge + soft) return lower
  return (x + y) % 2 === 0 ? upper : lower
}

/** Scale rows: small darker "v" marks on a staggered grid over the flank. */
function scales(s: Sprite, f: FishFrame, body: Mask, from: number, to: number, maxDepth: number): void {
  const marks = new Set<number>()
  for (let j = 0; j < 11; j++)
    for (let i = 0; i < 9; i++) {
      const gx = 4 * i + 2 * (j % 2) + 1, gy = 3 * j + 1
      for (const [x, y] of [[gx - 1, gy], [gx, gy + 1], [gx + 1, gy]] as const) marks.add(y * 32 + x)
    }
  body.each((x, y) => {
    const [u, v] = f.local(x + 0.5, y + 0.5)
    if (u < from || u > to || f.depth(u, v) > maxDepth || !marks.has(y * 32 + x)) return
    if (body.get(x - 1, y) && body.get(x + 1, y) && body.get(x, y + 1)) s.shift(x, y, -1)
  })
}

function carp(s: Sprite): void {
  const f = new FishFrame({ len: 16, tail: 6, ped: 1.9, top: { h: 5.5, peak: 0.55, nose: 2.3 }, bot: { h: 4.6, peak: 0.5, nose: 2.1 } })
  const finId = s.addRamp(ramp('#a8732e', { hueShift: 6 }))
  const backId = s.addRamp(ramp('#86602a', { hueShift: 6 }))
  const sideId = s.addRamp(ramp('#cf9a3a', { lift: 0.32 }))
  const bellyId = s.addRamp(ramp('#ead08e', { lift: 0.3 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-2.6, -3.6], [-5.8, -4.8], [-4.8, -1.6], [-4.2, 0], [-4.8, 1.6], [-5.8, 4.6], [-2.6, 3.4], [0.8, p + 0.2]]), finId, [1, 0], 3)
  paintFin(s, f, f.poly([f.back(L * 0.66, -1), f.back(L * 0.64, 3.4), f.back(L * 0.5, 2.6), f.back(L * 0.24, 1.4), f.back(L * 0.2, -1)]), finId, f.back(L * 0.2, -2), 3)
  paintFin(s, f, f.poly([f.belly(L * 0.3, -1), f.belly(L * 0.24, 2.4), f.belly(L * 0.16, 1.6), f.belly(L * 0.14, -1)]), finId, f.belly(L * 0.3, -1), 2)
  paintFin(s, f, f.poly([f.belly(L * 0.56, -1), f.belly(L * 0.48, 2.4), f.belly(L * 0.42, 1.2), f.belly(L * 0.44, -1)]), finId, f.belly(L * 0.56, -1), 2)
  const body = f.body()
  paintBody(s, f, body, (_u, _v, d, x, y) => (d < -0.3 ? band(d, x, y, -0.5, backId, sideId, 0.1) : band(d, x, y, 0.55, sideId, bellyId)))
  scales(s, f, body, 1.5, L * 0.7, 0.75)
  gill(s, f, L * 0.75, 1.2)
  paintFin(s, f, f.poly([[L * 0.7, 0.6], [L * 0.52, 3.2], [L * 0.6, 3.6], [L * 0.7, 2.2]]), finId, [L * 0.7, 0.6], 3)
  eye(s, f, L * 0.86, -1.6)
  // A short barbel hanging from the mouth.
  const barbel = s.addRamp(ramp('#d8b06a'))
  const [mx, my] = f.pixel(L - 0.6, 1.4)
  s.paint(mx - 1, my + 1, barbel, 3)
  s.paint(mx - 1, my + 2, barbel, 2)
}

function trout(s: Sprite): void {
  const f = new FishFrame({ len: 17.5, tail: 5, ped: 1.7, top: { h: 4, peak: 0.5, nose: 1.8 }, bot: { h: 3.8, peak: 0.48, nose: 2 } })
  const finId = s.addRamp(ramp('#8c8a58'))
  const backId = s.addRamp(ramp('#6f7c45', { hueShift: 6 }))
  const sideId = s.addRamp(ramp('#c9cdb8', { lift: 0.3 }))
  const pinkId = s.addRamp(ramp('#e8768d', { satShift: 0.03 }))
  const bellyId = s.addRamp(ramp('#ece6dc', { lift: 0.3 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-4.2, -4], [-4.8, -1.5], [-4.6, 0], [-4.8, 1.5], [-4.2, 3.8], [0.8, p + 0.2]]), finId, [1, 0], 3)
  paintFin(s, f, f.poly([f.back(L * 0.58, -1), f.back(L * 0.55, 2.6), f.back(L * 0.4, 1.4), f.back(L * 0.38, -1)]), finId, f.back(L * 0.4, -1), 3)
  paintFin(s, f, f.poly([f.back(L * 0.2, -1), f.back(L * 0.18, 1.2), f.back(L * 0.13, 0.9), f.back(L * 0.12, -1)]), finId, f.back(L * 0.2, -1), 3)
  paintFin(s, f, f.poly([f.belly(L * 0.28, -1), f.belly(L * 0.22, 2.2), f.belly(L * 0.15, 1.2), f.belly(L * 0.15, -1)]), finId, f.belly(L * 0.28, -1), 2)
  const body = f.body()
  paintBody(s, f, body, (_u, _v, d, x, y) => {
    if (d < -0.2) return band(d, x, y, -0.45, backId, sideId, 0.1)
    if (d < 0.32) return d < -0.12 || d > 0.24 ? ((x + y) % 2 === 0 ? pinkId : sideId) : pinkId
    return band(d, x, y, 0.55, sideId, bellyId)
  })
  const spot = s.addRamp(ramp('#2f2a26'))
  spots(s, f, 'trout', body, 13, spot, 2, (u, _v, d) => d < 0.25 && u > 1 && u < L * 0.8)
  spots(s, f, 'trout-tail', f.poly([[-0.5, -2.6], [-3.6, -3.2], [-3.6, 3], [-0.5, 2.4]]), 3, spot, 2, () => true)
  gill(s, f, L * 0.78, 1)
  paintFin(s, f, f.poly([[L * 0.72, 1.2], [L * 0.56, 3], [L * 0.62, 3.4], [L * 0.72, 2.4]]), finId, [L * 0.72, 1.2], 3)
  eye(s, f, L * 0.88, -1.4)
  const [mx, my] = f.pixel(L - 1, 0.6)
  s.shift(mx, my, -2)
}

function sardine(s: Sprite, cx: number, cy: number): void {
  const f = new FishFrame({ len: 14.5, tail: 4.2, ped: 1, top: { h: 2.8, peak: 0.5, nose: 1.7 }, bot: { h: 2.6, peak: 0.5, nose: 1.8 }, cx, cy })
  const finId = s.addRamp(ramp('#7d97b4'))
  const backId = s.addRamp(ramp('#3a68b0', { hueShift: 6 }))
  const bellyId = s.addRamp(ramp('#d3dde6', { lift: 0.45 }))
  const L = f.len
  paintFin(s, f, f.poly([[0.6, -1.2], [-4, -3.2], [-2.6, 0], [-4, 3.2], [0.6, 1.2]]), finId, [0.6, 0], 3, 0.6)
  paintFin(s, f, f.poly([f.back(L * 0.58, -1), f.back(L * 0.55, 1.6), f.back(L * 0.44, 1), f.back(L * 0.42, -1)]), finId, f.back(L * 0.5, -1), 3, 0.6)
  const body = f.body()
  paintBands(s, f, body, [[-0.55, backId, 3], [-0.2, backId, 4], [0.25, bellyId, 5], [0.65, bellyId, 4], [1, bellyId, 3]])
  const spot = s.addRamp(ramp('#22385e'))
  for (let k = 0; k < 4; k++) {
    const [x, y] = f.pixel(L * (0.66 - k * 0.14), 0)
    if (body.get(x, y)) s.paint(x, y, spot, 2)
  }
  gill(s, f, L * 0.8, 0.6, -0.6, 0.7)
  eye(s, f, L * 0.9, -0.5, false)
}

function mackerel(s: Sprite): void {
  const f = new FishFrame({ len: 18, tail: 5.6, ped: 1, top: { h: 3.7, peak: 0.52, nose: 1.5 }, bot: { h: 3.3, peak: 0.5, nose: 1.6 } })
  const finId = s.addRamp(ramp('#4f7a80'))
  const backId = s.addRamp(ramp('#2fae96', { hueShift: 6 }))
  const stripeId = s.addRamp(ramp('#173a4a', { lift: 0.18 }))
  const bellyId = s.addRamp(ramp('#e2eaee', { lift: 0.4 }))
  const sheenId = s.addRamp(ramp('#9ec9c8', { lift: 0.35 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-1.4, -2.4], [-5.4, -5.4], [-4, -1], [-2.8, 0], [-4, 1], [-5.4, 5.2], [-1.4, 2.4], [0.8, p + 0.2]]), finId, [0.6, 0], 3, 0.6)
  paintFin(s, f, f.poly([f.back(L * 0.66, -1), f.back(L * 0.62, 2.8), f.back(L * 0.54, 1.2), f.back(L * 0.5, -1)]), finId, f.back(L * 0.6, -1), 3)
  paintFin(s, f, f.poly([f.back(L * 0.4, -1), f.back(L * 0.37, 1.6), f.back(L * 0.31, 0.8), f.back(L * 0.3, -1)]), finId, f.back(L * 0.4, -1), 3)
  paintFin(s, f, f.poly([f.belly(L * 0.4, -1), f.belly(L * 0.36, 1.4), f.belly(L * 0.3, 0.8), f.belly(L * 0.3, -1)]), finId, f.belly(L * 0.4, -1), 2)
  // Finlets: a row of tiny fins on the back and belly near the tail.
  for (const u of [L * 0.1, L * 0.18, L * 0.25]) {
    const [bx, by] = f.pixel(...f.back(u, 0.7))
    s.paint(bx, by, finId, 3)
    const [lx, ly] = f.pixel(...f.belly(u, 0.7))
    s.paint(lx, ly, finId, 2)
  }
  const body = f.body()
  paintBands(s, f, body, [[-0.6, backId, 3], [-0.05, backId, 4], [0.3, sheenId, 4], [0.7, bellyId, 5], [1, bellyId, 4]])
  // Tiger stripes: dark wavy bars running down from the back.
  for (let k = 0; k < 6; k++) {
    const u = L * (0.18 + k * 0.105)
    line(s, f, [[u, -f.half(f.top, u)], [u - 0.6, -f.half(f.top, u) * 0.55], [u + 0.2, -f.half(f.top, u) * 0.1]], stripeId, 2)
  }
  gill(s, f, L * 0.78, 1)
  paintFin(s, f, f.poly([[L * 0.72, 0.4], [L * 0.56, 1.8], [L * 0.6, 2.4], [L * 0.72, 1.6]]), finId, [L * 0.72, 0.4], 3)
  eye(s, f, L * 0.88, -0.9)
}

function salmon(s: Sprite): void {
  const f = new FishFrame({ len: 18.5, tail: 5.4, ped: 1.8, top: { h: 4.8, peak: 0.55, nose: 1.8 }, bot: { h: 4.3, peak: 0.5, nose: 1.9 } })
  const finId = s.addRamp(ramp('#7a6a74'))
  const backId = s.addRamp(ramp('#5a6a7e', { hueShift: 6 }))
  const sideId = s.addRamp(ramp('#f59a78', { lift: 0.3, drop: 0.17, hueShift: 2, satShift: 0 }))
  const bellyId = s.addRamp(ramp('#fbe0d2', { lift: 0.3, drop: 0.16, hueShift: 2 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-3.4, -4.4], [-5.2, -4.6], [-4, -1.6], [-3.8, 0], [-4, 1.6], [-5.2, 4.4], [-3.4, 4.2], [0.8, p + 0.2]]), finId, [1, 0], 3)
  paintFin(s, f, f.poly([f.back(L * 0.6, -1), f.back(L * 0.57, 2.8), f.back(L * 0.44, 1.4), f.back(L * 0.42, -1)]), finId, f.back(L * 0.44, -1), 3)
  paintFin(s, f, f.poly([f.back(L * 0.2, -1), f.back(L * 0.18, 1.3), f.back(L * 0.12, 1), f.back(L * 0.11, -1)]), finId, f.back(L * 0.2, -1), 3)
  paintFin(s, f, f.poly([f.belly(L * 0.3, -1), f.belly(L * 0.24, 2.2), f.belly(L * 0.16, 1.2), f.belly(L * 0.16, -1)]), finId, f.belly(L * 0.3, -1), 2)
  const body = f.body()
  paintBody(s, f, body, (_u, _v, d, x, y) => (d < -0.35 ? band(d, x, y, -0.6, backId, sideId, 0.12) : band(d, x, y, 0.5, sideId, bellyId)))
  const spot = s.addRamp(ramp('#2a2630'))
  spots(s, f, 'salmon', body, 10, spot, 2, (u, _v, d) => d < -0.3 && u > 1 && u < L * 0.75)
  spots(s, f, 'salmon-tail', f.poly([[-0.5, -2.6], [-3.6, -3.4], [-3.6, 3.2], [-0.5, 2.4]]), 3, spot, 1, () => true)
  gill(s, f, L * 0.76, 1.2)
  paintFin(s, f, f.poly([[L * 0.72, 1.2], [L * 0.55, 3.2], [L * 0.62, 3.8], [L * 0.72, 2.4]]), finId, [L * 0.72, 1.2], 3)
  eye(s, f, L * 0.86, -1.5)
  // The spawning male's long, hooked jaw line.
  line(s, f, [[L - 0.4, 0.4], [L - 2.2, 0.9]], s.addRamp(ramp('#7a3c3a')), 1)
}

function seaBream(s: Sprite): void {
  const f = new FishFrame({ len: 15, tail: 6, ped: 1.4, top: { h: 6.2, peak: 0.55, nose: 2.6 }, bot: { h: 4.4, peak: 0.45, nose: 1.8 }, cy: 18.2 })
  const finId = s.addRamp(ramp('#c23a52'))
  const backId = s.addRamp(ramp('#e2506a', { hueShift: 6 }))
  const bellyId = s.addRamp(ramp('#f7c6c0', { lift: 0.3 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-2.4, -2.4], [-6, -5.4], [-4, -1.4], [-3.2, 0], [-4, 1.4], [-6, 5.2], [-2.4, 2.4], [0.8, p + 0.2]]), finId, [0.6, 0], 3, 0.5)
  // Spiny dorsal fin: a serrated crest along most of the back.
  const crest: UV[] = [f.back(L * 0.72, -1)]
  for (let k = 0; k <= 8; k++) {
    const u = L * (0.7 - k * 0.065)
    crest.push(f.back(u, k % 2 === 0 ? 3 - k * 0.12 : 1.2))
  }
  crest.push(f.back(L * 0.16, 0.6), f.back(L * 0.14, -1))
  paintFin(s, f, f.poly(crest), finId, f.back(L * 0.45, -2), 3, 0.3)
  paintFin(s, f, f.poly([f.belly(L * 0.36, -1), f.belly(L * 0.3, 2.4), f.belly(L * 0.16, 1), f.belly(L * 0.16, -1)]), finId, f.belly(L * 0.36, -1), 2)
  const body = f.body()
  paintBody(s, f, body, (_u, _v, d, x, y) => band(d, x, y, 0.45, backId, bellyId, 0.15))
  const blue = s.addRamp(ramp('#5fd2f0', { lift: 0.4 }))
  spots(s, f, 'sea-bream', body, 7, blue, 4, (u, _v, d) => d < -0.1 && d > -0.85 && u > 2 && u < L * 0.72)
  gill(s, f, L * 0.74, 1.4)
  paintFin(s, f, f.poly([[L * 0.7, 0.6], [L * 0.5, 2.4], [L * 0.56, 3], [L * 0.7, 1.8]]), finId, [L * 0.7, 0.6], 3)
  eye(s, f, L * 0.84, -1.8)
  const [mx, my] = f.pixel(L - 0.5, 0.6)
  s.shift(mx, my, -2)
}

/** A smooth curve through `knots` (Catmull-Rom; the first and last knots only steer the ends), t from 0 to 1. */
function spline(knots: readonly UV[]): (t: number) => [number, number] {
  return (t) => {
    const n = knots.length - 3
    const seg = Math.max(0, Math.min(n - 1, Math.floor(t * n))), k = t * n - seg
    const [a, b, c, d] = [0, 1, 2, 3].map((i) => knots[seg + i] ?? [0, 0]) as [UV, UV, UV, UV]
    const cr = (i: 0 | 1) => 0.5 * (2 * b[i] + (c[i] - a[i]) * k + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * k * k + (3 * b[i] - a[i] - 3 * c[i] + d[i]) * k * k * k)
    return [cr(0), cr(1)]
  }
}

function eel(s: Sprite): void {
  // The eel leaves the family's straight frame: a serpentine tube along a spline, head left, tail curling up.
  const path = spline([[4.2, 15], [6.6, 14.8], [10.4, 12.4], [13.8, 15], [16.2, 20.2], [20, 23.4], [24, 21.6], [25, 17.2], [23.8, 13.8], [22.2, 12.6]])
  const raw: [number, number][] = []
  for (let k = 0; k <= 400; k++) raw.push(path(k / 400))
  const arc = [0]
  for (let i = 1; i < raw.length; i++) {
    const [x0, y0] = raw[i - 1] ?? [0, 0], [x1, y1] = raw[i] ?? [0, 0]
    arc.push((arc[i - 1] ?? 0) + Math.hypot(x1 - x0, y1 - y0))
  }
  const total = arc[arc.length - 1] ?? 1
  const rMax = 2.2
  const radius = (t: number) => (t < 0.06 ? rMax * (0.6 + (t / 0.06) * 0.4) : t < 0.4 ? rMax : rMax * Math.pow(1 - (t - 0.4) / 0.6, 0.8) + 0.2)
  // Each sample: position, radius, arc position t, and the unit normal toward the back.
  const spine = raw.map(([x, y], i) => {
    const [ax, ay] = raw[Math.max(0, i - 1)] ?? [x, y], [bx, by] = raw[Math.min(raw.length - 1, i + 1)] ?? [x, y]
    const l = Math.hypot(bx - ax, by - ay) || 1
    const t = (arc[i] ?? 0) / total
    return { x, y, r: radius(t), t, nx: (by - ay) / l, ny: -(bx - ax) / l }
  })
  const nearest = (qx: number, qy: number) => {
    let best = spine[0] ?? { x: 0, y: 0, r: 1, t: 0, nx: 0, ny: -1 }, bd = 1e9
    for (const p of spine) {
      const d = Math.hypot(qx - p.x, qy - p.y) - p.r
      if (d < bd) {
        bd = d
        best = p
      }
    }
    return { p: best, d: bd }
  }
  const at = (t: number, side: number): [number, number] => {
    const p = spine[Math.round(t * (spine.length - 1))] ?? spine[0] ?? { x: 0, y: 0, r: 1, nx: 0, ny: -1 }
    return [Math.floor(p.x + p.nx * side * p.r), Math.floor(p.y + p.ny * side * p.r)]
  }
  const finId = s.addRamp(ramp('#a8a65e', { lift: 0.3 }))
  const backId = s.addRamp(ramp('#3d4834', { hueShift: 6 }))
  const bellyId = s.addRamp(ramp('#dccb84', { lift: 0.3 }))
  // One continuous fin fringe round the rear half.
  Mask.from((qx, qy) => {
    const { p, d } = nearest(qx, qy)
    return p.t > 0.45 && d > 0 && d < 1.1
  }).each((x, y) => s.paint(x, y, finId, 3))
  // Shaded as a tube: tone from the offset toward the light, dark back above a pale belly.
  Mask.from((qx, qy) => nearest(qx, qy).d <= 0).each((x, y) => {
    const { p } = nearest(x + 0.5, y + 0.5)
    const ox = x + 0.5 - p.x, oy = y + 0.5 - p.y, r = Math.max(0.8, p.r)
    const side = (ox * p.nx + oy * p.ny) / r
    const lit = (-ox * 0.7 - oy * 0.7) / r
    s.paint(x, y, side > -0.4 ? backId : bellyId, lit > 0.55 ? 5 : lit > 0.15 ? 4 : lit > -0.3 ? 3 : lit > -0.7 ? 2 : 1)
  })
  const [ex, ey] = at(0.04, 0.35)
  s.paint(ex, ey, s.addRamp(EYE), 1)
  const [mx, my] = at(0.0, -0.3)
  s.shift(mx, my, -2)
  const [gx, gy] = at(0.1, 0)
  s.shift(gx, gy, -1)
  const [gx2, gy2] = at(0.1, -0.5)
  s.shift(gx2, gy2, -1)
  // Pectoral fin just behind the gill, on the belly side.
  for (const [t, side, tone] of [[0.12, -1.3, 4], [0.135, -1.7, 4], [0.15, -1.3, 3], [0.15, -2.1, 3]] as const) {
    const [fx, fy] = at(t, side)
    if (!s.filled(fx, fy) || side < -1.5) s.paint(fx, fy, finId, tone)
  }
}

function tuna(s: Sprite): void {
  const f = new FishFrame({ len: 17.5, tail: 6.2, ped: 1, top: { h: 5.2, peak: 0.45, nose: 1.5 }, bot: { h: 5, peak: 0.45, nose: 1.6 }, cx: 15.4 })
  const finId = s.addRamp(ramp('#2c3c66'))
  const backId = s.addRamp(ramp('#253f7c', { hueShift: 6 }))
  const sheenId = s.addRamp(ramp('#6f86b8', { lift: 0.3 }))
  const bellyId = s.addRamp(ramp('#d2d9e2', { lift: 0.35 }))
  const yellowId = s.addRamp(ramp('#f2c23a', { lift: 0.3 }))
  const L = f.len, p = f.ped
  // Lunate tail: two thin sickle blades.
  paintFin(s, f, f.poly([[0.8, -p - 0.1], [-1.6, -1.6], [-4, -4.2], [-6, -6.2], [-4.4, -2.8], [-3.4, 0], [-4.4, 2.8], [-6, 6], [-4, 4], [-1.6, 1.6], [0.8, p + 0.1]]), finId, [0.6, 0], 3, 0.5)
  paintFin(s, f, f.poly([f.back(L * 0.4, -1), f.back(L * 0.34, 3.2), f.back(L * 0.27, 0.6), f.back(L * 0.26, -1)]), yellowId, f.back(L * 0.4, -1), 3, 0.5)
  paintFin(s, f, f.poly([f.belly(L * 0.38, -1), f.belly(L * 0.32, 3), f.belly(L * 0.26, 0.6), f.belly(L * 0.25, -1)]), yellowId, f.belly(L * 0.38, -1), 3, 0.5)
  paintFin(s, f, f.poly([f.back(L * 0.72, -1), f.back(L * 0.66, 1.6), f.back(L * 0.5, 0.8), f.back(L * 0.48, -1)]), finId, f.back(L * 0.6, -1), 3)
  for (const u of [L * 0.06, L * 0.12, L * 0.18]) {
    const [bx, by] = f.pixel(...f.back(u, 0.7))
    s.paint(bx, by, yellowId, 4)
    const [lx, ly] = f.pixel(...f.belly(u, 0.7))
    s.paint(lx, ly, yellowId, 3)
  }
  const body = f.body()
  paintBody(s, f, body, (_u, _v, d, x, y) => (d < 0.05 ? band(d, x, y, -0.2, backId, sheenId, 0.1) : band(d, x, y, 0.2, sheenId, bellyId, 0.12)))
  gill(s, f, L * 0.78, 1.4)
  paintFin(s, f, f.poly([[L * 0.72, -0.4], [L * 0.42, 1.2], [L * 0.46, 1.8], [L * 0.72, 1]]), finId, [L * 0.72, 0], 3)
  eye(s, f, L * 0.88, -0.8)
}

function silverfin(s: Sprite): void {
  const f = new FishFrame({ len: 16, tail: 6.5, ped: 1.4, top: { h: 4.1, peak: 0.5, nose: 1.9 }, bot: { h: 3.8, peak: 0.5, nose: 2 } })
  const glowId = s.addRamp(ramp('#6ee7ff', { lift: 0.5, drop: 0.3, hueShift: 4 }))
  const silverId = s.addRamp(ramp('#b8c6dc', { lift: 0.55, drop: 0.32, hueShift: 6 }))
  const L = f.len, p = f.ped
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-3, -3], [-6.4, -5.6], [-4.8, -2], [-6, 0], [-4.8, 2], [-6.4, 5.4], [-3, 3], [0.8, p + 0.2]]), glowId, [1, 0], 5, 0.4)
  // A tall sail-like dorsal fin and long flowing ventral fins.
  paintFin(s, f, f.poly([f.back(L * 0.66, -1), f.back(L * 0.6, 4.2), f.back(L * 0.42, 4), f.back(L * 0.26, 2.2), f.back(L * 0.2, -1)]), glowId, f.back(L * 0.4, -1), 5, 0.36)
  paintFin(s, f, f.poly([f.belly(L * 0.5, -1), f.belly(L * 0.36, 3.6), f.belly(L * 0.2, 3.2), f.belly(L * 0.2, -1)]), glowId, f.belly(L * 0.5, -1), 4, 0.4)
  const body = f.body()
  paintBody(s, f, body, () => silverId, 0.12)
  // A bright shine streak along the flank.
  for (let u = L * 0.2; u < L * 0.75; u += 0.4) {
    const [x, y] = f.pixel(u, -1.2)
    if (body.get(x, y)) s.paint(x, y, silverId, 5)
  }
  gill(s, f, L * 0.76, 1.1)
  paintFin(s, f, f.poly([[L * 0.72, 0.8], [L * 0.5, 3.4], [L * 0.6, 3.6], [L * 0.72, 2]]), glowId, [L * 0.72, 0.8], 5)
  eye(s, f, L * 0.87, -1.3)
}

function rainbowKoi(s: Sprite): void {
  const f = new FishFrame({ len: 16, tail: 6.5, ped: 1.5, top: { h: 4.3, peak: 0.55, nose: 2.4 }, bot: { h: 3.7, peak: 0.5, nose: 2.2 } })
  const finId = s.addRamp(ramp('#ece4f6', { lift: 0.4, drop: 0.22 }))
  const whiteId = s.addRamp(ramp('#f2efe9', { lift: 0.4, drop: 0.2 }))
  const pastels = ['#ffb3c8', '#ffe39a', '#a8f0d0', '#a8d4ff', '#d8b8ff'].map((h) => s.addRamp(ramp(h, { lift: 0.35, drop: 0.2 })))
  const hues = ['#ef4a4a', '#f59a2c', '#f3d23a', '#5ccf6a', '#4aa2f0', '#9a62e8'].map((h) => s.addRamp(ramp(h, { lift: 0.3 })))
  const L = f.len, p = f.ped
  // Butterfly koi: long, rippling fins.
  paintFin(s, f, f.poly([[0.8, -p - 0.2], [-2.6, -3.4], [-6.4, -5], [-5.4, -2.4], [-6.6, 0], [-5.4, 2.6], [-6.4, 5], [-2.6, 3.4], [0.8, p + 0.2]]), finId, [1, 0], 4, 0.4)
  paintFin(s, f, f.poly([f.back(L * 0.64, -1), f.back(L * 0.58, 2.6), f.back(L * 0.4, 2.2), f.back(L * 0.2, 1.6), f.back(L * 0.14, 0.6), f.back(L * 0.16, -1)]), finId, f.back(L * 0.4, -1), 4, 0.4)
  paintFin(s, f, f.poly([f.belly(L * 0.6, -1), f.belly(L * 0.42, 3.4), f.belly(L * 0.3, 3.4), f.belly(L * 0.36, -1)]), finId, f.belly(L * 0.6, -1), 3, 0.4)
  const body = f.body()
  // Rainbow patches: one blob per color along the back, red on the head to violet by the tail, white between.
  const patches = hues.map((id, i) => ({ id, u: L * (0.86 - i * 0.15), ru: 1.5 + (i % 2) * 0.3, dv: -0.55 + (i % 2) * 0.2 }))
  paintBody(s, f, body, (u, _v, d) => {
    for (const pt of patches) {
      const du = (u - pt.u) / pt.ru, dd = (d - pt.dv) / 0.75
      if (du * du + dd * dd <= 1) return pt.id
    }
    return whiteId
  }, 0.08)
  // Iridescent tail: pastel bands across the fin, inside a pale rim.
  f.region((u, v) => u < -0.5 && Math.abs(v) < 6).each((x, y) => {
    if (!s.filled(x, y) || s.mat[y * 32 + x] !== finId) return
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => s.mat[(y + (dy ?? 0)) * 32 + x + (dx ?? 0)] !== finId)) return
    const [u] = f.local(x + 0.5, y + 0.5)
    s.paint(x, y, pastels[Math.min(pastels.length - 1, Math.floor(-u / 1.3))] ?? finId, s.toneAt(x, y))
  })
  gill(s, f, L * 0.76, 1.1, -0.7, 0.8)
  paintFin(s, f, f.poly([[L * 0.72, 1], [L * 0.46, 4.4], [L * 0.56, 4.6], [L * 0.72, 2.2]]), finId, [L * 0.72, 1], 4)
  eye(s, f, L * 0.86, -1.4)
}

export const FISH: ItemIcon[] = [
  { id: 'carp', name: 'Carp', grade: 1, paint: carp },
  { id: 'trout', name: 'Trout', grade: 2, paint: trout },
  {
    id: 'sardine',
    name: 'Sardine',
    grade: 3,
    paint: (s) => {
      sardine(s, 18.2, 14.6)
      sardine(s, 13.8, 19.6)
    },
  },
  { id: 'mackerel', name: 'Mackerel', grade: 4, paint: mackerel },
  { id: 'salmon', name: 'Salmon', grade: 5, paint: salmon },
  { id: 'sea-bream', name: 'Sea Bream', grade: 6, paint: seaBream },
  { id: 'eel', name: 'Eel', grade: 7, paint: eel },
  { id: 'tuna', name: 'Tuna', grade: 8, paint: tuna },
  { id: 'silverfin', name: 'Silverfin', grade: 9, paint: silverfin },
  { id: 'rainbow-koi', name: 'Rainbow Koi', grade: 10, paint: rainbowKoi },
]
