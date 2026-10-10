// Bones & Horns (Fossil Dig, Limit Break family): uma-rpg docs/design/items.md#bones--horns. Everything is dug up as a
// fossil (no animals are hunted): shells, a trilobite in its slab, bones, tusk, fang, claw, tooth and two legendary finds.
import { hex, ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { cutStone, LIGHT, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

type Pt = readonly [number, number]

const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const

function quadPt(p0: Pt, p1: Pt, p2: Pt, t: number): [number, number] {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t
  return [a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]
}

/** A tapering tube along a curve, plus each pixel's nearest t and signed offset (lit side positive). */
interface BoneTube {
  mask: Mask
  at: (x: number, y: number) => { t: number; d: number; w: number }
}

function boneTube(curve: (t: number) => Pt, width: (t: number) => number, n = 200): BoneTube {
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
    return { sm: best, bd }
  }
  return {
    mask: Mask.from((px, py) => nearest(px, py).bd <= 0),
    at: (x, y) => {
      const { sm } = nearest(x + 0.5, y + 0.5)
      if (!sm) return { t: 0, d: 0, w: 1 }
      return { t: sm.t, d: (x + 0.5 - sm.x) * sm.nx + (y + 0.5 - sm.y) * sm.ny, w: sm.w }
    },
  }
}

/** Translucent glow on a set of cells and a fainter halo `reach` pixels around them. */
function boneGlow(s: Sprite, m: Mask, color: string, inner: number, outer: number, reach = 1): void {
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

/** Darkens a few seeded lit pixels: age stains and pitting on fossil surfaces. */
function pits(s: Sprite, m: Mask, seed: string, count: number, stainId?: number): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (s.toneAt(x, y) >= 3 && N4.every(([dx, dy]) => m.get(x + dx, y + dy))) cells.push([x, y])
  })
  for (let i = 0; i < count && cells.length > 0; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    if (stainId !== undefined) s.paint(x, y, stainId, Math.min(3, s.toneAt(x, y)))
    else s.shift(x, y, -1)
  }
}

/** A classic bone: a shaft between two double-knobbed ends. Returns the silhouette. */
function boneShape(a: Pt, b: Pt, shaft: number, knob: number): Mask {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy)
  const ux = dx / l, uy = dy / l, vx = -uy, vy = ux
  const m = boneTube((t) => [a[0] + dx * t, a[1] + dy * t], () => shaft).mask
  for (const [ex, ey, sgn] of [[a[0], a[1], -1], [b[0], b[1], 1]] as const)
    for (const side of [-1, 1]) m.union(Mask.circle(ex + ux * sgn * 0.6 + vx * side * knob * 0.82, ey + uy * sgn * 0.6 + vy * side * knob * 0.82, knob))
  return m
}

function seashell(s: Sprite): void {
  const shell = s.addRamp(ramp('#f4c8b2', { lift: 0.42, drop: 0.2, hueShift: 4, satShift: 0 }))
  const hinge = s.addRamp(ramp('#e2a486', { lift: 0.3, hueShift: 4 }))
  const hx = 16, hy = 26.4, ribs = 7, span = 54
  const ribW = (span * 2) / ribs
  const polar = (px: number, py: number) => {
    const dx = px - hx, dy = py - hy
    const th = (Math.atan2(dx, -dy) * 180) / Math.PI
    const f = (th + span) / ribW
    return { r: Math.hypot(dx, dy), th, k: f - Math.floor(f) }
  }
  const fan = Mask.from((px, py) => {
    const { th, k } = polar(px, py)
    if (Math.abs(th) > span) return false
    const edge = 10.2 - (1 - Math.sin(Math.PI * k)) * 1.3
    return Math.hypot(px - 16, py - 15) <= edge && py < 25.5
  })
  const ears = Mask.polygon([[10.6, 21.2], [21.4, 21.2], [20.2, 26.2], [11.8, 26.2]])
  shadeDome(s, ears, hinge, { bias: -0.04 })
  shadeDome(s, fan, shell, { bias: 0.1, relief: 0.8 })
  fan.each((x, y) => {
    const { r, k } = polar(x + 0.5, y + 0.5)
    if (r < 2) return
    if (k < 0.15 || k > 0.94) s.shift(x, y, -2)
    else if (k < 0.42) s.shift(x, y, 1)
    else if (k > 0.78) s.shift(x, y, -1)
    if ((Math.abs(r - 9) < 0.5 || Math.abs(r - 13.5) < 0.5) && k > 0.15 && k < 0.94) s.shift(x, y, -1)
  })
}

function ammonite(s: Sprite): void {
  const id = s.addRamp(ramp('#c39e6c', { lift: 0.38, hueShift: 10 }))
  const cx = 15.8, cy = 16.8, R = 10.2, squash = 0.92
  const disk = Mask.ellipse(cx, cy, R, R * squash)
  shadeDome(s, disk, id, { relief: 0.6, bias: 0.08 })
  const growth = Math.log(2.3) / (Math.PI * 2)
  disk.each((x, y) => {
    const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) / squash
    const r = Math.hypot(dx, dy)
    if (r < 1.3) {
      s.paint(x, y, id, 1)
      return
    }
    const th = Math.atan2(dy, dx)
    const w = (Math.log(r / 0.9) / growth - th) / (Math.PI * 2)
    const f = w - Math.floor(w)
    const lit = -(dx * 0.6 + dy * 0.8) / r
    if (f < 0.12) s.paint(x, y, id, 1)
    else if (f < 0.3) s.shift(x, y, -1)
    else if (f > 0.55 && f < 0.82 && lit > -0.3) s.shift(x, y, 1)
    const rib = ((th + f * 0.9) * 14) / (Math.PI * 2)
    if (f > 0.3 && f < 0.95 && rib - Math.floor(rib) < 0.18 && r > 3.5 && s.toneAt(x, y) >= 3) s.shift(x, y, -1)
  })
}

function trilobite(s: Sprite): void {
  const stone = s.addRamp(ramp('#a69d8a', { lift: 0.3, hueShift: 6, satShift: 0.02 }))
  const fossil = s.addRamp(ramp('#7b5d43', { lift: 0.34 }))
  const outer: Point[] = [[5.5, 19], [8.5, 11.5], [15, 8.4], [23, 9.6], [27, 16], [25, 24.6], [16, 26.6], [7.5, 24.8]]
  const inner: Point[] = outer.map(([x, y]) => [16 + (x - 16) * 0.82, 16.6 + (y - 17) * 0.8] as const)
  shadeFacets(s, outer, cutStone(outer, inner, 2.2), stone)
  const tx = 16, top = 9.8
  const body = Mask.ellipse(tx, 17.2, 5.2, 7.2).union(Mask.ellipse(tx, 12.4, 6.2, 3.2))
  body.subtract(Mask.from((_, py) => py < top))
  body.each((x, y) => {
    const dx = x + 0.5 - tx
    const ax = Math.abs(dx)
    let tone = 3
    if (y + 0.5 < 15) tone = ax < 1.6 ? 4 : 3
    else if (y + 0.5 < 21.5) tone = (y % 2 === 0 ? 4 : 2) - (ax > 1.6 && ax < 2.6 ? 1 : 0)
    else tone = ax < 1.4 ? 3 : 2
    if (dx > 1.5 && tone > 2) tone -= 1
    s.paint(x, y, fossil, tone)
  })
  for (const [x, y] of [[13, 12], [18, 12]] as const) {
    s.paint(x, y, fossil, 1)
    s.paint(x, y - 1, fossil, 5)
  }
  for (const side of [-1, 1]) s.paint(Math.floor(tx + side * 6.2), 15, fossil, 2)
}

function fossilBone(s: Sprite): void {
  const id = s.addRamp(ramp('#e3d2a8', { lift: 0.4, hueShift: 10 }))
  const stain = s.addRamp(ramp('#a88456'))
  const m = boneShape([9.6, 22.4], [22.4, 9.6], 2.4, 2.7)
  shadeDome(s, m, id, { bias: 0.06 })
  pits(s, m, 'fossil-bone', 9, stain)
  pits(s, m, 'fossil-bone-pits', 6)
}

function mammothTusk(s: Sprite): void {
  const ivory = s.addRamp(ramp('#ece0c2', { lift: 0.42, drop: 0.22, hueShift: 4, satShift: 0 }))
  const core = s.addRamp(ramp('#c9ad80', { hueShift: 4 }))
  const p0: Pt = [8.4, 20.4], p1: Pt = [20.5, 27.5], p2: Pt = [24.6, 5.8]
  const tube = boneTube((t) => quadPt(p0, p1, p2, t), (t) => 0.5 + 4 * (1 - t) ** 0.7)
  const body = new Mask().union(tube.mask)
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], al = Math.hypot(ax, ay)
  body.subtract(Mask.from((px, py) => ((px - p0[0]) * ax + (py - p0[1]) * ay) / al < -0.6))
  const drop: [number, number][] = []
  body.each((x, y) => {
    if (N4.filter(([dx, dy]) => body.get(x + dx, y + dy)).length < 2) drop.push([x, y])
  })
  for (const [x, y] of drop) body.set(x, y, false)
  shadeDome(s, body, ivory, { bias: 0.08 })
  body.each((x, y) => {
    const { t, d, w } = tube.at(x, y)
    const q = d / Math.max(0.8, w)
    if (q > 0.25 && q < 0.55 && t > 0.12 && t < 0.85) s.paint(x, y, ivory, 5)
    else if (Math.floor(t * 18) % 4 === 0 && Math.abs(q) < 0.85 && t > 0.12 && t < 0.8 && s.toneAt(x, y) <= 3) s.shift(x, y, -1)
  })
  const rot = (Math.atan2(ay, ax) * 180) / Math.PI
  const cx = p0[0] - 0.2, cy = p0[1] + 0.1
  const cap = Mask.ellipse(cx, cy, 1.9, 4.1, rot)
  const a = (rot * Math.PI) / 180
  cap.each((x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy
    const u = (dx * Math.cos(a) + dy * Math.sin(a)) / 1.9, v = (-dx * Math.sin(a) + dy * Math.cos(a)) / 4.1
    const r = Math.hypot(u, v)
    s.paint(x, y, core, r < 0.3 ? 1 : r < 0.62 ? 3 : r < 0.8 ? 4 : 2)
  })
}

function saberFang(s: Sprite): void {
  const enamel = s.addRamp(ramp('#f3eee2', { lift: 0.5, drop: 0.2, hueShift: 10 }))
  const root = s.addRamp(ramp('#c6a173', { lift: 0.3 }))
  const p0: Pt = [19.6, 5.6], p1: Pt = [22.5, 19.4], p2: Pt = [11, 26.2]
  const tube = boneTube(
    (t) => quadPt(p0, p1, p2, t),
    (t) => (t < 0.3 ? 2.4 + t * 4 : 3.6 * ((1 - t) / 0.7) ** 0.9 + 0.3),
  )
  shadeDome(s, tube.mask, (x, y) => (tube.at(x, y).t < 0.32 ? root : enamel), { bias: 0.08 })
  tube.mask.each((x, y) => {
    const { t, d, w } = tube.at(x, y)
    const q = d / Math.max(0.8, w)
    if (t >= 0.32 && t < 0.35) s.paint(x, y, root, 2)
    else if (t >= 0.36 && q > 0.2 && q < 0.6 && t < 0.92) s.paint(x, y, enamel, 5)
    else if (t < 0.3 && Math.floor(t * 30 + q * 2) % 3 === 0) s.shift(x, y, -1)
  })
}

function raptorClaw(s: Sprite): void {
  const sheath = s.addRamp(ramp('#6e5747', { lift: 0.36, hueShift: 8 }))
  const bone = s.addRamp(ramp('#a8927a', { lift: 0.3 }))
  const cx = 16.4, cy = 18.2
  const a0 = (165 * Math.PI) / 180, a1 = (380 * Math.PI) / 180
  const tube = boneTube(
    (t) => {
      const a = a0 + (a1 - a0) * t
      const r = 8.6 - t * 2.8
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
    },
    (t) => 0.35 + 3.9 * (1 - t) ** 1.15,
  )
  const knob = Mask.circle(cx - 8.6, cy + 3.4, 3.2).union(Mask.circle(cx - 5.4, cy + 5.6, 2.3))
  shadeDome(s, knob, bone, { bias: 0 })
  shadeDome(s, tube.mask, sheath, { bias: 0.08 })
  tube.mask.each((x, y) => {
    const { t, d, w } = tube.at(x, y)
    const q = d / Math.max(0.8, w)
    if (t > 0.12 && t < 0.8 && Math.abs(q + 0.2) < 0.12) s.paint(x, y, sheath, 2)
    else if (q > 0.4 && q < 0.75 && t > 0.08 && t < 0.92) s.paint(x, y, sheath, 5)
    if (t > 0.86) s.paint(x, y, bone, q > 0 ? 5 : 4)
  })
}

function tyrantTooth(s: Sprite): void {
  const enamel = s.addRamp(ramp('#94612f', { lift: 0.42, hueShift: 10 }))
  const p0: Pt = [13, 26], p1: Pt = [11.6, 14], p2: Pt = [21, 5.2]
  const width = (t: number) => 5.6 * (1 - t) ** 0.62 + 0.35
  const tube = boneTube((t) => quadPt(p0, p1, p2, t), width)
  const m = new Mask()
  tube.mask.each((x, y) => {
    const { t, d, w } = tube.at(x, y)
    const serrated = t > 0.2 && t < 0.9 && d < 0 && Math.abs(d) > w - 0.9 && (x + y) % 2 === 0
    if (!serrated) m.set(x, y)
  })
  m.subtract(Mask.from((_, py) => py > 25.6))
  shadeDome(s, m, enamel, { bias: 0.06 })
  m.each((x, y) => {
    const { t, d, w } = tube.at(x, y)
    const q = d / Math.max(0.8, w)
    if (y >= 24) s.shift(x, y, (x * 3 + y) % 4 === 0 ? 1 : -1)
    else if (t > 0.1 && t < 0.9 && q > 0.22 && q < 0.48) s.paint(x, y, enamel, 5)
    else if (q < -0.72 && t > 0.2 && t < 0.9) s.shift(x, y, -1)
  })
}

function titanBone(s: Sprite): void {
  const id = s.addRamp(ramp('#cfc2a2', { lift: 0.4, drop: 0.28, hueShift: 10 }))
  const glow = s.addRamp(ramp('#ffc34f', { lift: 0.6 }))
  const a: Pt = [10.2, 12.6], b: Pt = [22.2, 20.4]
  const m = boneShape(a, b, 3.2, 3.5)
  shadeDome(s, m, id, { bias: 0.04 })
  pits(s, m, 'titan', 7)
  const cracks: Pt[][] = [
    [[9.5, 11.5], [11.5, 13.2], [13, 13], [14.6, 15], [16.4, 15.4], [18, 17.4], [19.6, 17.6], [21.6, 19.6], [23, 20.4]],
    [[14.6, 15], [14.4, 16.8], [15.6, 17.8]],
    [[18, 17.4], [17.8, 19.2]],
    [[11.5, 13.2], [11, 15]],
  ]
  const glowMask = new Mask()
  for (const c of cracks)
    for (let i = 0; i + 1 < c.length; i++) {
      const [x0, y0] = c[i] ?? [0, 0], [x1, y1] = c[i + 1] ?? [0, 0]
      const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2)
      for (let k = 0; k <= n; k++) {
        const x = Math.floor(x0 + ((x1 - x0) * k) / n), y = Math.floor(y0 + ((y1 - y0) * k) / n)
        if (m.get(x, y)) glowMask.set(x, y)
      }
    }
  const rim = new Mask()
  glowMask.each((x, y) => {
    for (const [dx, dy] of N4) if (m.get(x + dx, y + dy) && !glowMask.get(x + dx, y + dy)) rim.set(x + dx, y + dy)
  })
  rim.each((x, y) => s.paint(x, y, glow, 3))
  glowMask.each((x, y) => s.paint(x, y, glow, 5))
  boneGlow(s, glowMask, '#fff3c0', 90, 0)
  boneGlow(s, m, '#ffd780', 0, 70, 2)
}

/** A straight spiral horn: a cone of twisted ridges, each ridge a different pastel of pearl, with a soft glow. */
function unicornHorn(s: Sprite): void {
  const tints = ['#e3b8d4', '#c9bdeb', '#b4dfe2'].map((c) => s.addRamp(ramp(c, { lift: 0.62, drop: 0.18, hueShift: 3, satShift: 0 })))
  const base: Pt = [12.8, 24.6], tip: Pt = [23.4, 4.8]
  const L = Math.hypot(tip[0] - base[0], tip[1] - base[1])
  const ux = (tip[0] - base[0]) / L, uy = (tip[1] - base[1]) / L
  let vx = -uy, vy = ux
  if (vx * LIGHT[0] + vy * LIGHT[1] < 0) {
    vx = -vx
    vy = -vy
  }
  const width = (t: number) => 0.45 + 4.3 * (1 - Math.min(1, Math.max(0, t))) ** 0.9
  const frame = (x: number, y: number) => {
    const dx = x + 0.5 - base[0], dy = y + 0.5 - base[1]
    const t = (dx * ux + dy * uy) / L, d = dx * vx + dy * vy
    return { t, d, w: width(t) }
  }
  const horn = Mask.from((px, py) => {
    const { t, d, w } = frame(px - 0.5, py - 0.5)
    if (Math.abs(d) > w) return false
    if (t >= 0 && t <= 1) return true
    return t < 0 && ((t * L) / (w * 0.4)) ** 2 + (d / w) ** 2 <= 1
  })
  const pearl = s.addRamp(ramp('#e2d8ea', { lift: 0.62, drop: 0.2, hueShift: 4, satShift: 0 }))
  const turns = 3.6
  horn.each((x, y) => {
    const { t, d, w } = frame(x, y)
    const q = Math.max(-1, Math.min(1, d / w))
    const k = Math.max(0, t) * turns - (Math.asin(q) / (Math.PI * 2)) * 1.8 + 0.3
    const n = Math.floor(k), f = k - n
    const tint = tints[((n % tints.length) + tints.length) % tints.length] ?? 0
    if (t > 0.9) s.paint(x, y, pearl, q > -0.2 ? 5 : 4)
    else if (f < 0.22) s.paint(x, y, tint, q > 0.2 ? 3 : q > -0.4 ? 2 : 1)
    else if (f < 0.62) s.paint(x, y, pearl, q > 0.3 ? 5 : q > -0.25 ? 4 : q > -0.65 ? 3 : 2)
    else s.paint(x, y, tint, q > 0.4 ? 5 : q > -0.2 ? 4 : 3)
  })
  boneGlow(s, horn, '#fff0fa', 0, 80, 2)
}

export const BONES_HORNS: ItemIcon[] = [
  { id: 'seashell', name: 'Seashell', grade: 1, paint: seashell },
  { id: 'ammonite', name: 'Ammonite', grade: 2, paint: ammonite },
  { id: 'trilobite', name: 'Trilobite', grade: 3, paint: trilobite },
  { id: 'fossil-bone', name: 'Fossil Bone', grade: 4, paint: fossilBone },
  { id: 'mammoth-tusk', name: 'Mammoth Tusk', grade: 5, paint: mammothTusk },
  { id: 'saber-fang', name: 'Saber Fang', grade: 6, paint: saberFang },
  { id: 'raptor-claw', name: 'Raptor Claw', grade: 7, paint: raptorClaw },
  { id: 'tyrant-tooth', name: 'Tyrant Tooth', grade: 8, paint: tyrantTooth },
  { id: 'titan-bone', name: 'Titan Bone', grade: 9, paint: titanBone },
  { id: 'unicorn-horn', name: 'Unicorn Horn', grade: 10, paint: unicornHorn },
]
