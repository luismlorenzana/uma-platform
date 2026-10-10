// Woods (Forest, Speed family): uma-rpg docs/design/items.md#woods. Raw logs: a bark-wrapped cylinder lying on a
// diagonal, its sawn end turned to the viewer to show the rings. Species differ by bark, wood color and form.
import { hex, ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { LIGHT, Mask, shadeDome, toneFor } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

/** A log's frame: the sawn end's center, the axis toward the far end (u) and the lit side (v). */
interface Log {
  cx: number
  cy: number
  ux: number
  uy: number
  vx: number
  vy: number
  len: number
  r: number
  /** How round the sawn end looks (0 edge-on … 1 facing the viewer). */
  k: number
  /** Radius lost by the far end, as a fraction (branches taper). */
  taper: number
}

function makeLog(cx: number, cy: number, angle: number, len: number, r: number, k = 0.78, taper = 0): Log {
  const a = (angle * Math.PI) / 180
  const ux = Math.cos(a), uy = Math.sin(a)
  let vx = -uy, vy = ux
  if (vx * LIGHT[0] + vy * LIGHT[1] < 0) {
    vx = -vx
    vy = -vy
  }
  return { cx, cy, ux, uy, vx, vy, len, r, k, taper }
}

/** Pixel center → (t along the axis from the sawn end, s across it, positive on the lit side). */
function logLocal(g: Log, px: number, py: number): [number, number] {
  const dx = px - g.cx, dy = py - g.cy
  return [dx * g.ux + dy * g.uy, dx * g.vx + dy * g.vy]
}

/** Pixel at (t, s) in the log's frame. */
function logPixel(g: Log, t: number, sv: number): [number, number] {
  return [Math.floor(g.cx + t * g.ux + sv * g.vx), Math.floor(g.cy + t * g.uy + sv * g.vy)]
}

const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const

const radiusAt = (g: Log, t: number) => g.r * (1 - g.taper * Math.min(1, Math.max(0, t / g.len)))

/** Drops pixels hanging on by fewer than two side neighbors (single-pixel nubs on rasterized curves). */
function tidyMask(m: Mask): Mask {
  const drop: [number, number][] = []
  m.each((x, y) => {
    if (N4.filter(([dx, dy]) => m.get(x + dx, y + dy)).length < 2) drop.push([x, y])
  })
  for (const [x, y] of drop) m.set(x, y, false)
  return m
}

function logCap(g: Log): Mask {
  return tidyMask(
    Mask.from((px, py) => {
      const [t, s] = logLocal(g, px, py)
      return (t / (g.r * g.k)) ** 2 + (s / g.r) ** 2 <= 1
    }),
  )
}

function logBody(g: Log): Mask {
  return tidyMask(Mask.from((px, py) => {
    const [t, s] = logLocal(g, px, py)
    const r = radiusAt(g, t) * 0.94
    if (Math.abs(s) > r) return false
    if (t >= 0 && t <= g.len) return true
    return t > g.len && ((t - g.len) / (r * g.k)) ** 2 + (s / r) ** 2 <= 1
  }))
}

/** Light on a cylinder's side at offset q (−1 shadow edge … 1 lit edge). */
function cylinderLight(g: Log, q: number): number {
  const c = Math.max(-1, Math.min(1, q))
  return c * (g.vx * LIGHT[0] + g.vy * LIGHT[1]) + Math.sqrt(1 - c * c) * LIGHT[2]
}

/** A bark texture: tone change for a bark pixel at (t, s) on the log, given its lit tone. */
type BarkPattern = (t: number, s: number, tone: number, x: number, y: number) => number

interface BarkOptions {
  bias?: number
  /** < 1 flattens the round so less of the log falls into deep shadow. */
  relief?: number
  /** Edge pixels touching something painted earlier get a deep-shadow contact line. Default on. */
  contact?: boolean
}

function paintBark(s: Sprite, g: Log, barkId: number, pattern: BarkPattern | null, o: BarkOptions = {}): Mask {
  const body = logBody(g)
  const painted: [number, number, number][] = []
  body.each((x, y) => {
    const [t, sv] = logLocal(g, x + 0.5, y + 0.5)
    const base = toneFor(cylinderLight(g, (sv / radiusAt(g, t)) * (o.relief ?? 0.8)) + (o.bias ?? 0.1))
    let tone = base + (pattern ? pattern(t, sv, base, x, y) : 0)
    if ((o.contact ?? true) && N4.some(([dx, dy]) => !body.get(x + dx, y + dy) && s.filled(x + dx, y + dy))) tone = 1
    painted.push([x, y, tone])
  })
  for (const [x, y, tone] of painted) s.paint(x, y, barkId, tone)
  return body
}

interface CapOptions {
  /** Ring radii, as fractions of the radius (default two rings). */
  rings?: readonly number[]
  /** Pale sapwood band inside the bark (its own ramp), in px. */
  sapwood?: { id: number; width: number }
  /** Rays from the pith (oak's medullary rays). */
  rays?: number
  /** A drying crack from the pith toward the rim, at this angle in degrees. */
  crack?: number
  /** Ramp for the rings, when they differ from the face (elderwood's glowing rings). */
  ringId?: number
}

/** The sawn end: a bark rim, a flat face lit from the top left, contour rings and a dark pith. */
function paintCap(s: Sprite, g: Log, barkId: number, woodId: number, o: CapOptions = {}): { cap: Mask; face: Mask } {
  const cap = logCap(g)
  const rim = new Mask()
  cap.each((x, y) => {
    if (N4.some(([dx, dy]) => !cap.get(x + dx, y + dy))) rim.set(x, y)
  })
  const face = new Mask().union(cap).subtract(rim)
  const sapRim = new Mask()
  if (o.sapwood) {
    let ring = new Mask().union(face)
    for (let i = 0; i < o.sapwood.width; i++) {
      const next = new Mask()
      ring.each((x, y) => {
        if (N4.some(([dx, dy]) => !ring.get(x + dx, y + dy))) sapRim.set(x, y)
        else next.set(x, y)
      })
      ring = next
    }
  }
  const rings = o.rings ?? (g.r * g.k >= 4.4 ? [0.52] : [])
  const rho = (x: number, y: number) => {
    const [t, sv] = logLocal(g, x + 0.5, y + 0.5)
    return Math.hypot(t / (g.r * g.k), sv / g.r)
  }
  const band = (x: number, y: number) => {
    const v = rho(x, y)
    return rings.filter((q) => v >= q).length
  }
  rim.each((x, y) => {
    const [, sv] = logLocal(g, x + 0.5, y + 0.5)
    s.paint(x, y, barkId, sv > g.r * 0.3 ? 3 : 2)
  })
  face.each((x, y) => {
    const dx = x + 0.5 - g.cx, dy = y + 0.5 - g.cy
    const lit = -(dx * 0.6 + dy * 0.8) / g.r
    const nearRim = N4.some(([nx, ny]) => rim.get(x + nx, y + ny))
    const tone = nearRim && lit > 0.35 ? 5 : nearRim && lit < -0.35 ? 3 : 4
    if (o.sapwood && sapRim.get(x, y)) {
      s.paint(x, y, o.sapwood.id, tone)
      return
    }
    const b = band(x, y)
    const onRing = N4.some(([nx, ny]) => face.get(x + nx, y + ny) && !sapRim.get(x + nx, y + ny) && band(x + nx, y + ny) > b)
    if (rho(x, y) < 0.12) s.paint(x, y, woodId, 2)
    else if (onRing && o.ringId !== undefined) s.paint(x, y, o.ringId, lit > -0.2 ? 4 : 3)
    else s.paint(x, y, woodId, onRing ? 2 : tone)
  })
  const line = (deg: number, from: number, to: number, tone: (old: number) => number) => {
    const a = (deg * Math.PI) / 180
    for (let d = from; d < to; d += 0.07) {
      const [x, y] = logPixel(g, Math.cos(a) * d * g.r * g.k, Math.sin(a) * d * g.r)
      if (face.get(x, y) && !sapRim.get(x, y)) s.paint(x, y, woodId, tone(s.toneAt(x, y)))
    }
  }
  for (let i = 0; i < (o.rays ?? 0); i++) line((i / (o.rays ?? 1)) * 360 + 20, 0.3, 0.85, (t) => t - 1)
  if (o.crack !== undefined) line(o.crack, 0.1, 1, () => 1)
  return { cap, face }
}

/** Seeded 1-D value noise in [0, 1), smooth between integer knots. */
function woodNoise(seed: string, knots = 64): (u: number) => number {
  const r = rng(seed)
  const v = Array.from({ length: knots }, () => r())
  return (u: number) => {
    const i = Math.floor(u), f = u - i
    const a = v[((i % knots) + knots) % knots] ?? 0, b = v[(((i + 1) % knots) + knots) % knots] ?? 0
    return a + (b - a) * f * f * (3 - 2 * f)
  }
}

/** Plated bark: rows of plates along the axis, split by furrows, staggered row to row; plates catch light on top. */
function platedBark(seed: string, rowWidth: number, plateLen: number, depth = 1): BarkPattern {
  const r = rng(`${seed}-rows`)
  const offsets = Array.from({ length: 24 }, () => r() * plateLen)
  return (t, sv, tone) => {
    const u = (sv + 30) / rowWidth
    const row = Math.floor(u)
    const inRow = u - row
    if (inRow < 1 / rowWidth) return -depth
    const along = (t + (offsets[row % 24] ?? 0)) / plateLen
    if (along - Math.floor(along) < 1 / plateLen) return -depth
    if (inRow > 1 - 1 / rowWidth && tone >= 3) return 1
    return 0
  }
}

/** Long fibers along the axis: lanes of light and dark streaks, broken here and there. */
function stringyBark(seed: string, spacing = 1.5): BarkPattern {
  const n = woodNoise(seed)
  return (t, sv) => {
    const lane = Math.floor((sv + 30) / spacing)
    const v = n(lane * 7.3 + t / 4)
    if (lane % 2 === 0) return v > 0.3 ? -1 : 0
    return v > 0.72 ? 1 : 0
  }
}

/** Deep furrows wandering along the axis between ridges that catch the light on their upper edge. */
function furrowedBark(seed: string, spacing: number, depth = 1): BarkPattern {
  const n = woodNoise(seed)
  return (t, sv, tone) => {
    const lane = (sv + (n(t * 0.35 + 7) - 0.5) * 1.6 + 30) / spacing
    const li = Math.floor(lane), f = lane - li
    if (f < 1 / spacing) return n(li * 9.1 + t * 0.45) > 0.78 ? 0 : -depth
    if (f > 1 - 1 / spacing && tone >= 3) return 1
    return 0
  }
}

/** Stamps a glow: translucent color on a set of pixels and a fainter halo around them. */
function glowAround(s: Sprite, cells: readonly (readonly [number, number])[], color: string, inner: number, outer: number): void {
  const seen = new Set<number>()
  for (const [x, y] of cells) {
    s.overlay(x, y, hex(color, inner))
    seen.add(y * 32 + x)
  }
  for (const [x, y] of cells)
    for (const [dx, dy] of N4) {
      const k = (y + dy) * 32 + x + dx
      if (seen.has(k)) continue
      seen.add(k)
      s.overlay(x + dx, y + dy, hex(color, outer))
    }
}

interface LogLook {
  bark: RGBA[]
  wood: RGBA[]
  pattern: BarkPattern | null
  cap?: CapOptions
  barkOpts?: BarkOptions
  /** Pale sapwood band (ebony). */
  sapwood?: RGBA[]
}

function paintLog(s: Sprite, g: Log, look: LogLook): { barkId: number; woodId: number; body: Mask; face: Mask } {
  const barkId = s.addRamp(look.bark)
  const woodId = s.addRamp(look.wood)
  const body = paintBark(s, g, barkId, look.pattern, look.barkOpts)
  const cap: CapOptions = { ...look.cap }
  if (look.sapwood) cap.sapwood = { id: s.addRamp(look.sapwood), width: 1 }
  const { face } = paintCap(s, g, barkId, woodId, cap)
  return { barkId, woodId, body, face }
}

/** A short stub where a branch was cut off: a small log poking out of the bark. */
function stub(s: Sprite, g: Log, barkId: number, woodId: number): void {
  paintBark(s, g, barkId, null, { contact: false })
  paintCap(s, g, barkId, woodId, { rings: [] })
}

/** A pointed leaf from its base along `angle`, lit as a dome, with a midrib. */
function woodLeaf(s: Sprite, id: number, bx: number, by: number, len: number, wid: number, angle: number): Mask {
  const a = (angle * Math.PI) / 180
  const ux = Math.cos(a), uy = Math.sin(a)
  const m = Mask.from((px, py) => {
    const t = (px - bx) * ux + (py - by) * uy
    const v = -(px - bx) * uy + (py - by) * ux
    if (t < 0 || t > len) return false
    return Math.abs(v) <= wid * Math.sin((Math.PI * t) / len) ** 0.7
  })
  shadeDome(s, m, id, { bias: 0.04 })
  for (let t = 1; t < len - 1.2; t += 0.5) {
    const x = Math.floor(bx + t * ux), y = Math.floor(by + t * uy)
    if (m.get(x, y)) s.paint(x, y, id, Math.min(3, s.toneAt(x, y)))
  }
  return m
}

export const WOODS: ItemIcon[] = [
  {
    id: 'pine-log',
    name: 'Pine Log',
    grade: 1,
    paint: (s) => {
      const g = makeLog(10.8, 19.8, -28, 11, 6.2, 0.82)
      const { barkId, woodId } = paintLog(s, g, { bark: ramp('#8b4a2c', { hueShift: 6 }), wood: ramp('#e9c47e'), pattern: platedBark('pine', 2.6, 4.6) })
      const [x, y] = logPixel(g, 7.5, 5.2)
      stub(s, makeLog(x + 0.5, y - 0.8, 75, 2.2, 1.8, 0.8), barkId, woodId)
    },
  },
  {
    id: 'birch-log',
    name: 'Birch Log',
    grade: 2,
    paint: (s) => {
      const g = makeLog(10, 20.8, -32, 14, 5.2, 0.82)
      const { body } = paintLog(s, g, {
        bark: ramp('#e9e5da', { lift: 0.45, drop: 0.2, hueShift: 12 }),
        wood: ramp('#e6c588'),
        pattern: null,
      })
      const cap = logCap(g)
      const ink = s.addRamp(ramp('#3a3236'))
      const r = rng('birch-marks')
      for (let i = 0; i < 9; i++) {
        const t = 3 + i * 1.45 + r() * 0.6, s0 = (r() - 0.5) * 7, w = 1 + Math.floor(r() * 3)
        for (let k = 0; k < w; k++) {
          const [x, y] = logPixel(g, t, s0 + k)
          if (body.get(x, y) && !cap.get(x, y)) s.paint(x, y, ink, s.toneAt(x, y) >= 4 ? 3 : 2)
        }
      }
    },
  },
  {
    id: 'cedar-log',
    name: 'Cedar Log',
    grade: 3,
    paint: (s) => {
      const bark = ramp('#a3533a', { hueShift: 6 })
      const wood = ramp('#d47650')
      const cap: CapOptions = { rings: [0.55] }
      paintLog(s, makeLog(13.8, 14.4, -24, 9, 4.6, 0.86), { bark, wood, pattern: stringyBark('cedar-back'), cap })
      paintLog(s, makeLog(10.4, 21.8, -24, 10.5, 4.6, 0.86), { bark, wood, pattern: stringyBark('cedar-front'), cap })
    },
  },
  {
    id: 'maple-log',
    name: 'Maple Log',
    grade: 4,
    paint: (s) => {
      paintLog(s, makeLog(11, 19.4, -30, 9.5, 6.6, 0.82), {
        bark: ramp('#8e8a86', { satShift: 0.02 }),
        wood: ramp('#f2e0b8'),
        pattern: stringyBark('maple', 2.4),
        cap: { rings: [0.36, 0.7] },
      })
    },
  },
  {
    id: 'oak-log',
    name: 'Oak Log',
    grade: 5,
    paint: (s) => {
      paintLog(s, makeLog(10.8, 19.6, -26, 11, 6.4, 0.82), {
        bark: ramp('#5e4331', { satShift: 0.03 }),
        wood: ramp('#cc9d5e'),
        pattern: furrowedBark('oak', 2.2, 2),
        cap: { rings: [0.38, 0.72], rays: 6 },
      })
    },
  },
  {
    id: 'cherry-log',
    name: 'Cherry Log',
    grade: 6,
    paint: (s) => {
      const g = makeLog(9.6, 20.2, -22, 14, 5.8, 0.84)
      const { body } = paintLog(s, g, {
        bark: ramp('#82262a', { lift: 0.3, satShift: 0.02, hueShift: 14 }),
        wood: ramp('#b9553a'),
        sapwood: ramp('#efc59c'),
        pattern: (t, sv) => (Math.abs(sv - 2.9) < 0.5 && t > 1.5 ? 2 : 0),
        barkOpts: { bias: -0.08 },
        cap: { rings: [] },
      })
      const cap = logCap(g)
      const lenticel = s.addRamp(ramp('#c4a08c'))
      const r = rng('cherry-lenticels')
      for (let t = 3.4; t < 14.5; t += 2.2) {
        const s0 = -3.4 + r() * 2.2, w = 2 + Math.floor(r() * 3)
        for (let k = 0; k < w; k++) {
          const [x, y] = logPixel(g, t, s0 + k)
          if (body.get(x, y) && !cap.get(x, y) && s.toneAt(x, y) > 1) s.paint(x, y, lenticel, Math.max(2, Math.min(4, s.toneAt(x, y) + 1)))
        }
      }
    },
  },
  {
    id: 'mahogany-log',
    name: 'Mahogany Log',
    grade: 7,
    paint: (s) => {
      const look: LogLook = { bark: ramp('#5c2c22'), wood: ramp('#ac482c'), pattern: platedBark('mahogany', 3, 5), cap: { rings: [0.5] } }
      paintLog(s, makeLog(13.4, 13.6, -22, 8, 4.1, 0.86), look)
      paintLog(s, makeLog(17.8, 21.4, -22, 7, 4.1, 0.86), look)
      paintLog(s, makeLog(9.4, 21.8, -22, 7, 4.1, 0.86), look)
    },
  },
  {
    id: 'ebony-log',
    name: 'Ebony Log',
    grade: 8,
    paint: (s) => {
      paintLog(s, makeLog(10.6, 19.8, -28, 11.5, 6.2, 0.82), {
        bark: ramp('#3f3a37', { lift: 0.28, drop: 0.3 }),
        wood: ramp('#2b2228', { lift: 0.2, drop: 0.3 }),
        pattern: platedBark('ebony', 1.8, 6),
      })
    },
  },
  {
    id: 'elderwood-log',
    name: 'Elderwood Log',
    grade: 9,
    paint: (s) => {
      const g = makeLog(13.6, 19.4, -26, 8.8, 6.4, 0.82)
      const glowId = s.addRamp(ramp('#6fe8c8', { lift: 0.45 }))
      const { body } = paintLog(s, g, {
        bark: ramp('#5b584c', { satShift: 0.02 }),
        wood: ramp('#cbb68c'),
        pattern: furrowedBark('elder', 2.3, 2),
        cap: { rings: [0.3, 0.55, 0.8] },
      })
      const cap = logCap(g)
      const moss = s.addRamp(ramp('#62a03c'))
      const n = woodNoise('elder-moss')
      body.each((x, y) => {
        const [t, sv] = logLocal(g, x + 0.5, y + 0.5)
        if (t < 0.8) return
        if (sv > g.r * (0.34 + n(t * 0.9) * 0.4)) s.paint(x, y, moss, s.toneAt(x, y) >= 4 ? 4 : 3)
      })
      const glow: [number, number][] = []
      const vein = woodNoise('elder-vein')
      for (const [s0, t0, t1] of [[-1.2, 3.5, 11], [-3.6, 5, 10]] as const)
        for (let t = t0; t <= t1; t += 0.5) {
          const [x, y] = logPixel(g, t, s0 + (vein(t * 0.6 + s0 * 3) - 0.5) * 2.2)
          if (!body.get(x, y) || cap.get(x, y) || glow.some(([gx, gy]) => gx === x && gy === y)) continue
          s.paint(x, y, glowId, 4)
          glow.push([x, y])
        }
      glowAround(s, glow, '#8ffff0', 40, 40)
      const heart: [number, number][] = []
      logCap(g).each((x, y) => {
        const [t, sv] = logLocal(g, x + 0.5, y + 0.5)
        if (Math.hypot(t / (g.r * g.k), sv / g.r) < 0.2) {
          s.paint(x, y, glowId, 5)
          heart.push([x, y])
        }
      })
      glowAround(s, heart, '#8ffff0', 60, 50)
      for (const [x, y] of [[17, 7], [24, 8], [21, 5]] as const) s.overlay(x, y, hex('#b8fff0', 190))
    },
  },
  {
    id: 'yggdrasil-branch',
    name: 'Yggdrasil Branch',
    grade: 10,
    paint: (s) => {
      const barkId = s.addRamp(ramp('#cdbf4e', { lift: 0.45, hueShift: 14 }))
      const leafId = s.addRamp(ramp('#7fdc58', { lift: 0.42, hueShift: 10 }))
      const heartId = s.addRamp(ramp('#ffe98a', { lift: 0.55 }))
      const main = makeLog(12.4, 21.8, -42, 12, 4.3, 0.8, 0.5)
      const [fx, fy] = logPixel(main, 5.2, 0.6)
      const fork = makeLog(fx + 0.5, fy + 0.5, -98, 7, 2.8, 0.75, 0.45)
      const tip = (g: Log): [number, number] => [g.cx + g.ux * (g.len + 0.6), g.cy + g.uy * (g.len + 0.6)]
      const [ftx, fty] = tip(fork), [mtx, mty] = tip(main)
      const leaves = [
        woodLeaf(s, leafId, ftx - 0.2, fty + 0.2, 7.2, 2.2, -118),
        woodLeaf(s, leafId, ftx + 0.3, fty, 5.6, 1.8, -46),
        woodLeaf(s, leafId, mtx, mty, 7.2, 2.2, -68),
        woodLeaf(s, leafId, mtx + 0.4, mty + 0.4, 6, 2, 12),
      ]
      paintBark(s, fork, barkId, stringyBark('ygg-fork', 1.4), { contact: false, bias: 0.04 })
      paintBark(s, main, barkId, stringyBark('ygg-main', 1.4), { contact: false, bias: 0.04 })
      const { face } = paintCap(s, main, barkId, heartId, { rings: [0.55] })
      const glow: [number, number][] = []
      face.each((x, y) => glow.push([x, y]))
      glowAround(s, glow, '#fff3b0', 60, 50)
      const halo: [number, number][] = []
      for (const leaf of leaves) leaf.each((x, y) => halo.push([x, y]))
      glowAround(s, halo, '#d8ff9a', 0, 40)
      for (const [x, y] of [[10, 12], [24, 20], [20, 3]] as const) s.overlay(x, y, hex('#fff7c2', 200))
    },
  },
]
