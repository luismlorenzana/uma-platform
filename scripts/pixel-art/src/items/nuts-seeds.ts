// Nuts & Seeds (Nut Grove, Limit Break family): uma-rpg docs/design/items.md#nuts--seeds. Shells, kernels and seeds as gathered.
import { ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

function leaf(s: Sprite, cx: number, cy: number, rx: number, ry: number, rot: number, tones: RGBA[]): void {
  shadeDome(s, Mask.ellipse(cx, cy, rx, ry, rot), s.addRamp(tones), { contact: false, bias: 0.08 })
}

/** A 1 px line between two points. */
function stroke(s: Sprite, a: Point, b: Point, id: number, tone: number, keep?: (x: number, y: number) => boolean): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2))
  for (let k = 0; k <= steps; k++) {
    const x = Math.floor(a[0] + ((b[0] - a[0]) * k) / steps)
    const y = Math.floor(a[1] + ((b[1] - a[1]) * k) / steps)
    if (keep && !keep(x, y)) continue
    s.paint(x, y, id, tone)
  }
}

/** Body coordinates for an elongated shape centered at (cx, cy): u along the long axis (−1…1), v across it. */
function frame(cx: number, cy: number, len: number, wid: number, rot: number): (px: number, py: number) => [number, number] {
  const r = (rot * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r)
  return (px, py) => {
    const dx = px - cx, dy = py - cy
    return [(dx * c + dy * sn) / len, (-dx * sn + dy * c) / wid]
  }
}

/** A teardrop: round at u = −1, pointed at u = 1. */
function teardrop(cx: number, cy: number, len: number, wid: number, rot: number, point = 0.45): Mask {
  const local = frame(cx, cy, len, wid, rot)
  return Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return Math.abs(v) <= Math.sqrt(Math.max(0, 1 - u * u)) * (1 - point * ((u + 1) / 2) ** 2)
  })
}

/** Darkens seeded pixels of `mask` that are lit at least `minTone`, for pitted or wrinkled skins. */
function pits(s: Sprite, seed: string, mask: Mask, count: number, minTone: number, delta = -1): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  mask.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  for (let i = 0; i < count && cells.length > 0; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    s.shift(x, y, delta)
  }
}

function peanut(s: Sprite, a: Point, b: Point, ra: number, rb: number, seed: string): void {
  const id = s.addRamp(ramp('#d5aa6a', { lift: 0.3, hueShift: 6 }))
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
  // Two lobes pinched at a waist.
  const shell = Mask.from((px, py) => {
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2))
    const r = ra + (rb - ra) * t - 1.3 * Math.sin(Math.PI * t) ** 2
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy) <= r
  })
  shadeDome(s, shell, id)
  // The netted shell: ridges along the length crossed by shallow pits.
  const l = Math.sqrt(l2)
  shell.each((x, y) => {
    const px = x + 0.5 - a[0], py = y + 0.5 - a[1]
    const along = (px * dx + py * dy) / l, across = (-px * dy + py * dx) / l
    if (Math.abs(across / 1.9 - Math.round(across / 1.9)) < 0.18 && s.toneAt(x, y) > 1) s.shift(x, y, -1)
    else if (Math.abs(along / 2.2 - Math.round(along / 2.2)) < 0.2 && (x + y) % 2 === 0 && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
  pits(s, seed, shell, 4, 4, 1)
}

function sunflowerSeed(s: Sprite, cx: number, cy: number, rot: number): void {
  const darkId = s.addRamp(ramp('#38343a', { lift: 0.32, hueShift: 4 }))
  const stripeId = s.addRamp(ramp('#ece6d6', { lift: 0.3, drop: 0.2 }))
  const len = 7.4, wid = 3.8
  const m = teardrop(cx, cy, len, wid, rot)
  shadeDome(s, m, darkId)
  // Pale stripes running from the round end to the tip.
  const r = (rot * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r)
  const at = (u: number, v: number): Point => [cx + u * len * c - v * wid * sn, cy + u * len * sn + v * wid * c]
  for (const v of [-0.42, 0.42]) {
    const pts: Point[] = []
    for (let k = 0; k <= 8; k++) {
      const u = -0.8 + k * 0.2
      pts.push(at(u, v * Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.45 * ((u + 1) / 2) ** 2) * 1.4))
    }
    for (let k = 0; k + 1 < pts.length; k++) stroke(s, pts[k] ?? [0, 0], pts[k + 1] ?? [0, 0], stripeId, v < 0 ? 4 : 3, (x, y) => m.get(x, y) && m.get(x + 1, y) && m.get(x - 1, y) && m.get(x, y + 1) && m.get(x, y - 1))
  }
}

function sesame(s: Sprite): void {
  const podId = s.addRamp(ramp('#86ac48', { lift: 0.3, hueShift: 8 }))
  const innerId = s.addRamp(ramp('#4e5a2a'))
  const seedId = s.addRamp(ramp('#f3e6c2', { lift: 0.35, drop: 0.28 }))
  // Two plump ribbed capsules; the front one has split down its face, showing the tiny seeds stacked inside.
  const capsule4 = (cx: number, cy: number, len: number, wid: number, rot: number, open: boolean) => {
    const local = frame(cx, cy, len, wid, rot)
    const pod = Mask.from((px, py) => {
      const [u, v] = local(px, py)
      const hw = Math.pow(Math.max(0, 1 - Math.abs(u) ** 3), 0.5) * (u > 0.75 ? 1 - (u - 0.75) * 2.4 : 1)
      return Math.abs(v) <= hw
    })
    shadeDome(s, pod, podId)
    pod.each((x, y) => {
      const [u, v] = local(x + 0.5, y + 0.5)
      if (Math.abs(u) > 0.8) return
      if (open && Math.abs(v) < 0.46) s.paint(x, y, innerId, 2)
      else if (Math.abs(Math.abs(v) - 0.5) < 0.12 || (!open && Math.abs(v) < 0.1)) s.shift(x, y, -1)
    })
    if (!open) return
    // A row of seeds on every other line of the slit.
    pod.each((x, y) => {
      const [u, v] = local(x + 0.5, y + 0.5)
      if (Math.abs(u) > 0.74 || Math.abs(v) >= 0.46) return
      if (y % 2 === 0) s.paint(x, y, seedId, v < 0 ? 5 : 3)
    })
  }
  capsule4(19.4, 12.6, 7.4, 3.4, -66, false)
  capsule4(13.4, 15.4, 9.4, 4.8, -78, true)
  // A few spilled seeds.
  for (const [x, y] of [[19, 24], [23, 25]] as const) {
    s.paint(x, y, seedId, 5)
    s.paint(x + 1, y, seedId, 3)
  }
}

function walnut(s: Sprite): void {
  const id = s.addRamp(ramp('#b98a52', { lift: 0.3, hueShift: 6 }))
  const shell = Mask.ellipse(16, 16.6, 9, 9.2).union(Mask.circle(16, 8.6, 1.6))
  shadeDome(s, shell, id)
  // The seam: a raised ridge down the middle.
  for (let y = 7; y <= 25; y++) {
    const x = Math.round(16 + Math.sin(y * 0.5) * 0.4)
    if (shell.get(x, y)) {
      s.shift(x, y, 1)
      s.shift(x + 1, y, -1)
    }
  }
  // Deep wrinkles meandering over each half.
  const r = rng('walnut')
  for (let i = 0; i < 18; i++) {
    let x = 8.6 + r() * 15, y = 9 + r() * 15
    if (Math.abs(x - 16) < 1.6) continue
    for (let k = 0; k < 6; k++) {
      const px = Math.floor(x), py = Math.floor(y)
      if (shell.get(px, py) && shell.get(px + 1, py) && shell.get(px - 1, py) && Math.abs(px - 16) > 1 && s.toneAt(px, py) > 1) s.shift(px, py, s.toneAt(px, py) >= 4 ? -2 : -1)
      x += r() < 0.5 ? (x < 16 ? -1 : 1) : 0
      y += r() < 0.6 ? 1 : -1
    }
  }
}

function chestnut(s: Sprite, cx: number, top: number, w: number, h: number): void {
  const shellId = s.addRamp(ramp('#6e2c16', { lift: 0.42, hueShift: 8, satShift: 0.04 }))
  const baseId = s.addRamp(ramp('#dcc49a', { lift: 0.25, drop: 0.24 }))
  // Rounded below, rising to a point; the lower part is the pale, matte scar.
  const m = Mask.from((px, py) => {
    const t = (py - top) / h
    if (t < 0 || t > 1) return false
    const hw = t < 0.55 ? (w / 2) * Math.sin((Math.PI / 2) * Math.pow(t / 0.55, 0.85)) : (w / 2) * Math.pow(Math.max(0, 1 - ((t - 0.55) / 0.45) ** 4), 0.5)
    return Math.abs(px - cx) <= hw
  })
  shadeDome(s, m, (_x, y) => ((y + 0.5 - top) / h > 0.83 ? baseId : shellId), { bias: 0.04 })
  // Glossy streak and the tuft at the tip.
  const tuftId = s.addRamp(ramp('#e2cfa6'))
  s.paint(Math.floor(cx), Math.floor(top) - 1, tuftId, 4)
  s.paint(Math.floor(cx), Math.floor(top), tuftId, 3)
  for (let k = 0; k < 4; k++) {
    const x = Math.floor(cx - w * 0.2 - k * 0.45), y = Math.floor(top + h * 0.3 + k)
    if (m.get(x, y)) s.paint(x, y, shellId, 5)
  }
  // A fine line where the scar meets the shell.
  m.each((x, y) => {
    if (s.mat[y * 32 + x] === shellId && s.mat[(y + 1) * 32 + x] === baseId) s.shift(x, y, -1)
  })
}

function almond(s: Sprite, cx: number, cy: number, rot: number, seed: string): void {
  const id = s.addRamp(ramp('#c0824a', { lift: 0.3, hueShift: 6 }))
  const m = teardrop(cx, cy, 8.6, 4.8, rot, 0.6)
  shadeDome(s, m, id)
  const local = frame(cx, cy, 8.6, 4.8, rot)
  // Lengthwise grain and pitted skin.
  m.each((x, y) => {
    const [, v] = local(x + 0.5, y + 0.5)
    if (Math.abs(v * 2.6 - Math.round(v * 2.6)) < 0.12 && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
  pits(s, seed, m, 7, 3)
}

function pistachio(s: Sprite, cx: number, cy: number, rot: number): void {
  const shellId = s.addRamp(ramp('#e2cca0', { lift: 0.3, drop: 0.24, hueShift: 6 }))
  const kernelId = s.addRamp(ramp('#86b83e', { lift: 0.35 }))
  const skinId = s.addRamp(ramp('#8c4a62'))
  const local = frame(cx, cy, 7.4, 5.2, rot)
  const shell = Mask.from((px, py) => {
    const [u, v] = local(px, py)
    return u * u + v * v <= 1 + 0.25 * Math.max(0, u)
  })
  shadeDome(s, shell, shellId)
  // The split along one side, gaping open on the green kernel.
  shell.each((x, y) => {
    const [u, v] = local(x + 0.5, y + 0.5)
    const gap = 0.32 * Math.sqrt(Math.max(0, 1 - ((u - 0.1) / 0.8) ** 2))
    if (Math.abs(v + 0.05) < gap && u > -0.7) s.paint(x, y, (x * 3 + y) % 7 === 0 ? skinId : kernelId, v < 0 ? 4 : 3)
    else if (Math.abs(v + 0.05) < gap + 0.18 && u > -0.75) s.paint(x, y, shellId, v < 0 ? 5 : 2)
  })
}

function macadamia(s: Sprite): void {
  const shellId = s.addRamp(ramp('#7c4e2c', { lift: 0.36, hueShift: 6 }))
  const kernelId = s.addRamp(ramp('#f1e2bc', { lift: 0.3, drop: 0.24 }))
  // A whole nut: a glossy, nearly perfect sphere with its little seam.
  shadeDome(s, Mask.circle(13.2, 15.4, 7.4), shellId, { bias: 0.04 })
  for (const [x, y] of [[11, 10], [10, 11], [11, 11]] as const) s.paint(x, y, shellId, 5)
  s.paint(15, 9, shellId, 2)
  s.paint(15, 10, shellId, 2)
  // A cracked half shell cradling its round, creamy kernel.
  shadeDome(s, Mask.circle(21.2, 20.2, 4.4), kernelId, { bias: 0.08 })
  const cup = Mask.circle(21.2, 21.2, 5.4).subtract(Mask.from((_x, y) => y < 21.2))
  cup.each((x, y) => {
    const p = (x - 15.8) / 10.8
    s.paint(x, y, shellId, y === 21 ? 4 : p < 0.3 ? 3 : p < 0.7 ? 2 : 1)
  })
  // The cut edge of the shell, pale where it broke.
  for (let x = 16; x <= 26; x++) if (cup.get(x, 21)) s.paint(x, 21, kernelId, 2)
}

function thundernut(s: Sprite): void {
  const shellId = s.addRamp(ramp('#6a36b4', { lift: 0.4, drop: 0.3, hueShift: 6 }))
  const capId = s.addRamp(ramp('#3e2470', { lift: 0.3 }))
  const boltId = s.addRamp(ramp('#ffe23a', { lift: 0.5, drop: 0.24, hueShift: 4 }))
  // An acorn-shaped nut under a scaly cap.
  const nut = teardrop(16, 17.4, 7.6, 6.6, 90, 0.5)
  shadeDome(s, nut, shellId, { bias: 0.05 })
  const cap = Mask.ellipse(16, 11.6, 8.2, 4.4).subtract(Mask.from((_x, y) => y > 12.6))
  shadeDome(s, cap, capId, { contact: false, bias: 0.05 })
  cap.each((x, y) => {
    if ((x + y * 2) % 4 === 0) s.shift(x, y, 1)
  })
  s.paint(16, 6, capId, 3)
  s.paint(17, 5, capId, 4)
  // Crackling: a glowing fracture across the shell, and sparks leaping off it.
  const crack: Point[] = [[11.4, 14.6], [14, 17.4], [12.8, 19.2], [16.4, 21.6], [15.6, 23.2], [19.2, 24.6]]
  for (let k = 0; k + 1 < crack.length; k++) stroke(s, crack[k] ?? [0, 0], crack[k + 1] ?? [0, 0], boltId, 5, (x, y) => nut.get(x, y))
  const bolts: Point[][] = [
    [[7.6, 13], [9.6, 15.4], [8, 16.4], [10.6, 19.4]],
    [[25.6, 15], [23.4, 17.4], [25.2, 18.4], [22.8, 21.6]],
    [[20.6, 3.4], [21.2, 5.6], [19.8, 6.4], [20.6, 8.4]],
  ]
  for (const bolt of bolts) for (let k = 0; k + 1 < bolt.length; k++) stroke(s, bolt[k] ?? [0, 0], bolt[k + 1] ?? [0, 0], boltId, k === 1 ? 5 : 4)
}

function worldseed(s: Sprite): void {
  const seedId = s.addRamp(ramp('#9fd34a', { lift: 0.5, drop: 0.3, hueShift: 10 }))
  const goldId = s.addRamp(ramp('#ffd24a', { lift: 0.55, drop: 0.26, hueShift: 6 }))
  const sproutId = s.addRamp(ramp('#6fdc5a', { lift: 0.4 }))
  // The sprout: a short stem and two bright first leaves.
  stroke(s, [16.4, 10.4], [16.4, 6.6], sproutId, 4)
  s.paint(17, 6, sproutId, 3)
  leaf(s, 12.6, 5.6, 3.6, 1.7, 16, ramp('#7ae05e', { lift: 0.4 }))
  leaf(s, 20.4, 4.8, 3.4, 1.6, -28, ramp('#7ae05e', { lift: 0.4 }))
  // A great luminous seed traced with golden veins like the branches of a tree.
  const seed = teardrop(16, 18, 8.4, 7.2, -90, 0.42)
  shadeDome(s, seed, seedId, { bias: 0.12 })
  const veins: Point[][] = [
    [[16.4, 25], [16.4, 13]],
    [[16.4, 20.6], [12.6, 17.4], [11.6, 14.8]],
    [[16.4, 18], [20, 15.6], [20.6, 13.4]],
    [[16.4, 22.6], [20.4, 20.4]],
    [[16.4, 23], [12.4, 21.4]],
  ]
  for (const vein of veins) for (let k = 0; k + 1 < vein.length; k++) stroke(s, vein[k] ?? [0, 0], vein[k + 1] ?? [0, 0], goldId, 5, (x, y) => seed.get(x, y) && seed.get(x + 1, y) && seed.get(x - 1, y))
}

export const NUTS_SEEDS: ItemIcon[] = [
  {
    id: 'peanut',
    name: 'Peanut',
    grade: 1,
    paint: (s) => {
      peanut(s, [11.6, 20.6], [19.8, 9.6], 4.6, 5, 'peanut-a')
      peanut(s, [17.6, 22.4], [24, 17.6], 3, 3.3, 'peanut-b')
    },
  },
  {
    id: 'sunflower-seed',
    name: 'Sunflower Seed',
    grade: 2,
    paint: (s) => {
      sunflowerSeed(s, 11.6, 15.6, -104)
      sunflowerSeed(s, 19.6, 12.6, -62)
      sunflowerSeed(s, 17.4, 20.8, 4)
    },
  },
  { id: 'sesame', name: 'Sesame', grade: 3, paint: sesame },
  { id: 'walnut', name: 'Walnut', grade: 4, paint: walnut },
  { id: 'chestnut', name: 'Chestnut', grade: 5, paint: (s) => chestnut(s, 16, 7, 19, 18.8) },
  {
    id: 'almond',
    name: 'Almond',
    grade: 6,
    paint: (s) => {
      almond(s, 13.4, 14.4, -70, 'almond-a')
      almond(s, 19, 18.6, -40, 'almond-b')
    },
  },
  {
    id: 'pistachio',
    name: 'Pistachio',
    grade: 7,
    paint: (s) => {
      pistachio(s, 12.2, 15, -70)
      pistachio(s, 20.4, 18.4, -30)
    },
  },
  { id: 'macadamia', name: 'Macadamia', grade: 8, paint: macadamia },
  { id: 'thundernut', name: 'Thundernut', grade: 9, paint: thundernut },
  { id: 'worldseed', name: 'Worldseed', grade: 10, paint: worldseed },
]
