// Fibers (Meadow, M.DEF family): uma-rpg docs/design/items.md#fibers. The raw fiber as gathered: plant stalk bundles,
// a cotton boll, fleeces and tufts told apart by silhouette and texture, and silk cocoons.
import { hex, ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { LIGHT, Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

type Pt = readonly [number, number]

const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const

function quad(p0: Pt, p1: Pt, p2: Pt, t: number): [number, number] {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]
}

/** A tube along a curve: union of discs of radius `width(t)`, plus each pixel's nearest t and signed offset (lit side positive). */
interface Tube {
  mask: Mask
  at: (x: number, y: number) => { t: number; d: number; w: number }
}

function fiberTube(curve: (t: number) => Pt, width: (t: number) => number, n = 160): Tube {
  const samples: { t: number; x: number; y: number; nx: number; ny: number; w: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const [x, y] = curve(t)
    const [ax, ay] = curve(Math.max(0, t - 0.01)), [bx, by] = curve(Math.min(1, t + 0.01))
    const l = Math.hypot(bx - ax, by - ay) || 1
    let nx = -(by - ay) / l, ny = (bx - ax) / l
    if (nx * LIGHT[0] + ny * LIGHT[1] < 0) {
      nx = -nx
      ny = -ny
    }
    samples.push({ t, x, y, nx, ny, w: width(t) })
  }
  const nearest = (px: number, py: number) => {
    let best = samples[0], bd = Infinity
    for (const sm of samples) {
      const d = Math.hypot(px - sm.x, py - sm.y) - sm.w
      if (d < bd) {
        bd = d
        best = sm
      }
    }
    return { sm: best ?? samples[0], bd }
  }
  const mask = Mask.from((px, py) => nearest(px, py).bd <= 0)
  return {
    mask,
    at: (x, y) => {
      const { sm } = nearest(x + 0.5, y + 0.5)
      if (!sm) return { t: 0, d: 0, w: 1 }
      return { t: sm.t, d: (x + 0.5 - sm.x) * sm.nx + (y + 0.5 - sm.y) * sm.ny, w: sm.w }
    },
  }
}

/** Paints a 1 px strand through the points (straight runs between them). */
function strand(s: Sprite, id: number, pts: readonly Pt[], tone: number | ((i: number, n: number) => number)): [number, number][] {
  const cells: [number, number][] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i] ?? [0, 0], [x1, y1] = pts[i + 1] ?? [0, 0]
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2))
    for (let k = 0; k <= steps; k++) {
      const x = Math.floor(x0 + ((x1 - x0) * k) / steps), y = Math.floor(y0 + ((y1 - y0) * k) / steps)
      const last = cells[cells.length - 1]
      if (!last || last[0] !== x || last[1] !== y) cells.push([x, y])
    }
  }
  cells.forEach(([x, y], i) => s.paint(x, y, id, typeof tone === 'number' ? tone : tone(i, cells.length)))
  return cells
}

/** Domes each puff in turn, back to front; later puffs overlap earlier ones (clouds, bolls, fleece lumps). `seam` > 0 darkens
 * a puff's edge where it overlaps earlier puffs to that tone. */
function puffs(s: Sprite, circles: readonly (readonly [number, number, number])[], id: number | ((x: number, y: number) => number), seam = 0, clip?: Mask): Mask {
  const all = new Mask()
  for (const [cx, cy, r] of circles) {
    const m = Mask.circle(cx, cy, r)
    if (clip) m.subtract(clip)
    const touching: [number, number][] = []
    if (seam > 0) m.each((x, y) => {
      if (N4.some(([dx, dy]) => !m.get(x + dx, y + dy) && all.get(x + dx, y + dy))) touching.push([x, y])
    })
    shadeDome(s, m, id, { contact: false, bias: 0.06 })
    for (const [x, y] of touching) s.paint(x, y, typeof id === 'number' ? id : id(x, y), Math.min(seam, s.toneAt(x, y)))
    all.union(m)
  }
  return all
}

/** Translucent glow on a set of cells and a fainter halo around them. */
function fiberGlow(s: Sprite, m: Mask, color: string, inner: number, outer: number, reach = 1): void {
  if (inner > 0) m.each((x, y) => s.overlay(x, y, hex(color, inner)))
  let ring = new Mask().union(m)
  for (let r = 1; r <= reach; r++) {
    const next = new Mask().union(ring)
    ring.each((x, y) => {
      for (const [dx, dy] of N4) if (!ring.get(x + dx, y + dy)) next.set(x + dx, y + dy)
    })
    const alpha = Math.round(outer / r)
    next.each((x, y) => {
      if (!ring.get(x, y)) s.overlay(x, y, hex(color, alpha))
    })
    ring = next
  }
}

/** Small C-shaped curls pressed into a lit surface: wool crimp. */
function curls(s: Sprite, m: Mask, seed: string, spacing: number): void {
  const r = rng(seed)
  for (let y = 0; y < 32; y += spacing)
    for (let x = (y / spacing) % 2 === 0 ? 0 : Math.floor(spacing / 2); x < 32; x += spacing) {
      const cx = x + Math.floor(r() * 2), cy = y + Math.floor(r() * 2)
      const cells: Pt[] = [[cx, cy], [cx + 1, cy - 1], [cx + 1, cy + 1]]
      if (!cells.every(([px, py]) => m.get(px, py) && N4.every(([dx, dy]) => m.get(px + dx, py + dy)))) continue
      for (const [px, py] of cells) s.shift(px, py, -1)
    }
}

/** A sheaf of flax stalks tied at the waist, fanning out to small blue flowers and seed bolls. */
function flax(s: Sprite): void {
  const stalk = s.addRamp(ramp('#bdb35e', { hueShift: 8 }))
  const tie = s.addRamp(ramp('#9a6a3a'))
  const petal = s.addRamp(ramp('#5b8de8', { lift: 0.42 }))
  const boll = s.addRamp(ramp('#c6a65a'))
  const n = 7
  const tops: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const u = (i - (n - 1) / 2) / ((n - 1) / 2)
    const top: Pt = [16.3 + u * 8.4, 6.2 + Math.abs(u) * 2.6 + ((i * 5) % 3) * 1.2]
    const waist: Pt = [16.3 + u * 1.4, 17.5], bottom: Pt = [16.3 + u * 6, 26.2]
    const base = u < -0.3 ? 4 : u > 0.3 ? 2 : 3
    strand(s, stalk, [bottom, waist], (k) => (k === 0 ? 5 : base))
    strand(s, stalk, [waist, top], (k, len) => (k > len * 0.55 ? Math.min(4, base + 1) : base))
    tops.push([Math.floor(top[0]), Math.floor(top[1])])
  }
  for (let y = 16; y <= 18; y++) for (let x = 10; x <= 22; x++) if (s.filled(x, y) && y !== 17) s.paint(x, y, tie, x < 15 ? 4 : x < 17 ? 3 : 2)
  tops.forEach(([x, y], i) => {
    if (i % 2 === 0) {
      for (const [dx, dy] of N4) s.paint(x + dx, y + dy, petal, dx < 0 || dy < 0 ? 4 : 3)
      s.paint(x, y, petal, 5)
    } else {
      s.paint(x, y, boll, 4)
      s.paint(x, y - 1, boll, 3)
    }
  })
}

function jute(s: Sprite): void {
  const fiber = s.addRamp(ramp('#cf9f4f', { hueShift: 8, lift: 0.36 }))
  const tie = s.addRamp(ramp('#7d4a2a', { lift: 0.3 }))
  const cx = 16, cy = 15.5, rot = -14
  const a = (rot * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
  const local = (px: number, py: number): [number, number] => {
    const dx = px - cx, dy = py - cy
    return [(dx * c + dy * sn) / 9.6, (-dx * sn + dy * c) / 7.4]
  }
  const ring = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    const q = Math.hypot(u, v)
    return q <= 1 && q >= 0.52
  })
  shadeDome(s, ring, fiber, { bias: 0.1 })
  ring.each((x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    const q = Math.hypot(u, v)
    const lane = Math.floor((q - 0.52) / 0.096)
    const ang = Math.atan2(v, u)
    if (lane % 2 === 1 && Math.sin(ang * 3 + lane) > -0.6) s.shift(x, y, -1)
  })
  ring.each((x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    const ang = (Math.atan2(v, u) * 180) / Math.PI
    if (ang > 112 && ang < 140) s.paint(x, y, tie, (x + y) % 2 === 0 ? 4 : 2)
  })
  const ends: Pt[][] = [
    [[9, 21], [8, 23], [8.5, 25], [8, 26.5]],
    [[10, 21.5], [10, 24], [11, 26]],
  ]
  for (const e of ends) strand(s, fiber, e, (i, n) => (i < n / 2 ? 4 : 3))
}

function hemp(s: Sprite): void {
  const stalk = s.addRamp(ramp('#93ad4c', { hueShift: 8 }))
  const leaf = s.addRamp(ramp('#3f8f3a', { hueShift: 10, lift: 0.3 }))
  const tie = s.addRamp(ramp('#b38a52'))
  for (const [a, b] of [[[12.5, 26.5], [15.2, 14]], [[16.5, 26.8], [16.5, 14]], [[20.5, 26.5], [17.8, 14]]] as const) {
    const tube = fiberTube((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], () => 1.35)
    shadeDome(s, tube.mask, stalk, { bias: 0.12 })
  }
  const cx = 16.5, cy = 14.5
  const fan = [[0, 1], [-32, 0.92], [32, 0.92], [-64, 0.76], [64, 0.76], [-98, 0.5], [98, 0.5]] as const
  for (const [da, k] of [...fan].reverse()) {
    const a = ((-90 + da) * Math.PI) / 180
    const len = 11.6 * k
    const tube = fiberTube((t) => [cx + Math.cos(a) * len * t, cy + Math.sin(a) * len * t], (t) => (len > 6 ? 2.1 : 1.5) * Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.95)) ** 0.75)
    shadeDome(s, tube.mask, leaf, { bias: 0.08 })
    tube.mask.each((x, y) => {
      const { t, d } = tube.at(x, y)
      if (Math.abs(d) < 0.5 && t > 0.15 && t < 0.85) s.paint(x, y, leaf, 2)
    })
  }
  for (let y = 20; y <= 21; y++) for (let x = 9; x <= 23; x++) if (s.filled(x, y)) s.paint(x, y, tie, x < 15 ? 4 : x < 18 ? 3 : 2)
}

function cotton(s: Sprite): void {
  const husk = s.addRamp(ramp('#74502f'))
  const fluff = s.addRamp(ramp('#f2efea', { lift: 0.5, drop: 0.15, hueShift: 14 }))
  const stem = s.addRamp(ramp('#5e4026'))
  const bract = (deg: number, len: number) => {
    const a = (deg * Math.PI) / 180
    const tube = fiberTube((t) => [16 + Math.cos(a) * len * t, 17 + Math.sin(a) * len * t], (t) => 2.6 * (1 - t) + 0.3)
    shadeDome(s, tube.mask, husk, { bias: 0.05 })
  }
  for (const deg of [-126, -54, 18, 162, 90]) bract(deg, 11.5)
  s.paint(16, 27, stem, 2)
  puffs(s, [[16, 11.6, 4.2], [11.2, 15.4, 4.3], [20.8, 15.4, 4.3], [13, 20, 4.3], [19.2, 20, 4.3]], fluff, 1)
}

function wool(s: Sprite): void {
  const id = s.addRamp(ramp('#efebe0', { lift: 0.5, drop: 0.18, hueShift: 6, satShift: 0.03 }))
  const lumps: [number, number, number][] = [
    [15.5, 9.5, 3.8], [10.5, 12.5, 3.8], [21, 12, 4], [7.8, 18, 3.4], [24.2, 17.5, 3.4],
    [15.5, 15, 5], [20.5, 16.5, 4], [10.5, 20.5, 4.2], [21.5, 21, 4], [16, 21.5, 4.6],
  ]
  const m = puffs(s, lumps, id, 3)
  for (const [cx, cy, rad] of lumps) {
    for (let k = -1; k <= 1; k++) {
      const x = Math.floor(cx + k), y = Math.floor(cy + rad * 0.35 + Math.abs(k) * -0.6)
      if (m.get(x, y) && s.toneAt(x, y) >= 3) s.shift(x, y, -1)
    }
  }
}

/** A shorn fleece gathered into a bundle and cinched with a cord, lying on its side: puffs of tight curls either side of the tie. */
function alpaca(s: Sprite): void {
  const id = s.addRamp(ramp('#c99c69', { hueShift: 8, lift: 0.38 }))
  const cord = s.addRamp(ramp('#a8423a', { lift: 0.34 }))
  const m = puffs(s, [
    [19.5, 8.8, 3.4], [23.6, 11.4, 3.4], [18, 12.6, 3.6], [22, 15.4, 3.2],
    [7.6, 19.4, 3.4], [11.2, 16.8, 3.4], [9.4, 23, 3.6], [13.4, 20.6, 3.8], [14, 24.2, 3],
  ], id, 2)
  const waist = Mask.ellipse(16, 16.6, 2.6, 3.4, -38)
  waist.each((x, y) => {
    if (!m.get(x, y)) s.paint(x, y, id, x + y < 32 ? 3 : 2)
  })
  m.union(waist)
  curls(s, m, 'alpaca', 3)
  const cordMask = Mask.from((px, py) => {
    const u = (px - 15.4) * 0.66 + (py - 16.8) * 0.75
    const v = -(px - 15.4) * 0.75 + (py - 16.8) * 0.66
    return Math.abs(v) <= 1 && Math.abs(u) <= 4.6
  })
  cordMask.each((x, y) => {
    if (!m.get(x, y)) return
    const u = (x + 0.5 - 15.4) * 0.66 + (y + 0.5 - 16.8) * 0.75
    s.paint(x, y, cord, u < -1.8 ? 5 : u < 0.8 ? 4 : u < 2.6 ? 3 : 2)
  })
  s.paint(18, 20, cord, 3)
  s.paint(19, 20, cord, 2)
  strand(s, cord, [[19, 21], [19.5, 23], [18.5, 24.5]], 2)
  strand(s, cord, [[20, 20.5], [21.5, 22]], 3)
}

/** A soft round tuft of very fine fiber: smooth, a short fuzzy fringe, a faint halo and a loose wisp. */
function cashmere(s: Sprite): void {
  const id = s.addRamp(ramp('#bdb6bf', { lift: 0.46, drop: 0.2, satShift: 0.02, hueShift: 10 }))
  const cx = 16, cy = 17.6, rx = 8.4, ry = 7.4
  const body = Mask.ellipse(cx, cy, rx, ry).subtract(Mask.from((_, py) => py > 25))
  const fringe = new Mask()
  body.each((x, y) => {
    for (const [dx, dy] of N4) {
      const nx = x + dx, ny = y + dy
      if (!body.get(nx, ny) && (nx * 3 + ny * 5) % 4 === 0 && ny < 23) fringe.set(nx, ny)
    }
  })
  const all = new Mask().union(body, fringe)
  shadeDome(s, all, id, { bias: 0.16, relief: 0.9 })
  body.each((x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy
    const swirl = (Math.atan2(dy, dx) * 4) / Math.PI + Math.hypot(dx / rx, dy / ry) * 3.2
    if (N4.every(([nx, ny]) => body.get(x + nx, y + ny)) && swirl - Math.floor(swirl) < 0.2 && s.toneAt(x, y) >= 4) s.shift(x, y, -1)
  })
  strand(s, id, [[21, 11], [22.5, 8.5], [24.5, 7.5]], 4)
  strand(s, id, [[23, 13], [25, 12]], 3)
  fiberGlow(s, all, '#efe9f2', 0, 50, 1)
}

function silkCocoon(s: Sprite): void {
  const leaf = s.addRamp(ramp('#4f9a3a', { hueShift: 10 }))
  const id = s.addRamp(ramp('#eef0f2', { lift: 0.55, drop: 0.17, hueShift: 8 }))
  const thread = s.addRamp(ramp('#e8eaee', { lift: 0.45 }))
  const leafMask = fiberTube((t) => quad([6.5, 25], [14, 24.5], [25, 19], t), (t) => 4.2 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.04)) ** 0.8)
  shadeDome(s, leafMask.mask, leaf, { bias: 0.05 })
  leafMask.mask.each((x, y) => {
    const { t, d } = leafMask.at(x, y)
    if (Math.abs(d) < 0.5 && t > 0.08 && t < 0.9) s.paint(x, y, leaf, 2)
  })
  const rot = -22
  const body = Mask.ellipse(12.6, 17.6, 5.2, 4.6, rot).union(Mask.ellipse(19, 14.8, 5.2, 4.6, rot), Mask.ellipse(15.8, 16.2, 6.6, 4.2, rot))
  shadeDome(s, body, id, { bias: 0.1 })
  body.each((x, y) => {
    if ((x * 2 + y * 3) % 7 === 0 && s.toneAt(x, y) >= 3 && N4.every(([nx, ny]) => body.get(x + nx, y + ny))) s.shift(x, y, -1)
  })
  strand(s, thread, [[23, 11], [24.5, 9.5], [26, 10], [26, 12], [25, 13], [24.5, 15], [25.5, 17.5]], (i) => (i < 5 ? 4 : 3))
  fiberGlow(s, body, '#f6f8ff', 0, 40, 1)
}

function moonsilk(s: Sprite): void {
  const id = s.addRamp(ramp('#d6cbf4', { lift: 0.5, drop: 0.17, hueShift: 4, satShift: 0 }))
  const thread = s.addRamp(ramp('#ebe4ff', { lift: 0.5 }))
  const moon = s.addRamp(ramp('#fff1b8', { lift: 0.55 }))
  strand(s, thread, [[16.5, 3], [16.5, 7]], (i) => (i < 2 ? 5 : 4))
  const body = Mask.ellipse(16.5, 16.5, 6.4, 9.4).union(Mask.ellipse(16.5, 8.8, 2.6, 2))
  shadeDome(s, body, id, { bias: 0.16 })
  body.each((x, y) => {
    const h1 = (y + (x - 16) * 0.9) / 2.8, h2 = (y - (x - 16) * 0.9) / 2.8
    const on = h1 - Math.floor(h1) < 0.24 || h2 - Math.floor(h2) < 0.24
    if (on && s.toneAt(x, y) >= 3 && y > 9 && N4.every(([nx, ny]) => body.get(x + nx, y + ny))) s.shift(x, y, -1)
  })
  const crescent = Mask.circle(15.2, 16.2, 3.4).subtract(Mask.circle(16.9, 15, 3))
  crescent.each((x, y) => s.paint(x, y, moon, y < 16 ? 5 : 4))
  fiberGlow(s, crescent, '#fff6d0', 90, 0)
  fiberGlow(s, body, '#e0d2ff', 0, 90, 2)
  for (const [x, y] of [[9, 12], [24, 20], [23, 6]] as const) s.overlay(x, y, hex('#fff6d8', 210))
}

function cloudfleece(s: Sprite): void {
  const white = s.addRamp(ramp('#f6f9ff', { lift: 0.5, drop: 0.13, hueShift: 4 }))
  const sky = s.addRamp(ramp('#c4e0fb', { lift: 0.45, drop: 0.15, satShift: 0 }))
  const floor = Mask.from((_, py) => py > 24)
  const pick = (_: number, y: number) => (y >= 21 ? sky : white)
  const m = puffs(s, [[11.4, 19.4, 4.2], [16, 13.5, 5.6], [21.6, 16.6, 4.6], [14.8, 20, 4.6], [20, 20.5, 4.4]], pick, 0, floor)
  curls(s, m, 'cloud', 4)
  strand(s, white, [[25.5, 21], [26.5, 20], [26, 18.5]], 3)
  fiberGlow(s, m, '#bfe4ff', 0, 80, 2)
}


export const FIBERS: ItemIcon[] = [
  { id: 'flax', name: 'Flax', grade: 1, paint: flax },
  { id: 'jute', name: 'Jute', grade: 2, paint: jute },
  { id: 'hemp', name: 'Hemp', grade: 3, paint: hemp },
  { id: 'cotton', name: 'Cotton', grade: 4, paint: cotton },
  { id: 'wool', name: 'Wool', grade: 5, paint: wool },
  { id: 'alpaca-fleece', name: 'Alpaca Fleece', grade: 6, paint: alpaca },
  { id: 'cashmere-fleece', name: 'Cashmere Fleece', grade: 7, paint: cashmere },
  { id: 'silk-cocoon', name: 'Silk Cocoon', grade: 8, paint: silkCocoon },
  { id: 'moonsilk-cocoon', name: 'Moonsilk Cocoon', grade: 9, paint: moonsilk },
  { id: 'cloudfleece', name: 'Cloudfleece', grade: 10, paint: cloudfleece },
]
