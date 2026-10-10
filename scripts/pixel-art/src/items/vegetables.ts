// Vegetables (Vegetable Garden, DEF family): uma-rpg docs/design/items.md#vegetables.
import { ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { curvePixels, front, stamp, stroke, type Pt } from './grains.ts'
import type { ItemIcon } from './types.ts'

const LEAF = ramp('#5fae3c')

/** A body tapering from A to B: `radius(t)` gives its half-width at t (0 at A, 1 at B); the ends are rounded. */
function taper(a: Pt, b: Pt, radius: (t: number) => number): Mask {
  const [ax, ay] = a, [bx, by] = b
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
  return Mask.from((px, py) => {
    const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2))
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)) <= radius(t)
  })
}

/** Where pixel (x, y) falls along A → B (0 to 1) and across it (signed px, positive to the right of travel). */
function axisCoords(a: Pt, b: Pt, x: number, y: number): [number, number] {
  const [ax, ay] = a, [bx, by] = b
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy)
  const px = x + 0.5 - ax, py = y + 0.5 - ay
  return [(px * dx + py * dy) / (len * len), (px * -dy + py * dx) / len]
}

/** The pixels of a curve that fall inside `m`. */
function curvePixelsIn(ctrl: readonly Pt[], m: Mask): [number, number][] {
  return curvePixels(ctrl).filter(([x, y]) => m.get(x, y))
}

/** Darkens a few seeded pixels inside the lit part of a mask, for skin texture. */
function speckle(s: Sprite, seed: string, mask: Mask, count: number, minTone: number, delta = -1): void {
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

/** A frilly frond: a stem with a bumpy clump of leaflets along its outer part. */
function frond(s: Sprite, id: number, stemId: number, ctrl: readonly Pt[], leaflets: number): void {
  const px = stroke(s, stemId, ctrl, 3)
  // leaflets alternate along the outer half of the stem, getting smaller toward the tip
  for (let i = 0; i < leaflets; i++) {
    const t = 0.35 + (0.65 * i) / Math.max(1, leaflets - 1)
    const [x, y] = px[Math.min(px.length - 1, Math.round(t * (px.length - 1)))] ?? [0, 0]
    const side = i % 2 === 0 ? -1 : 1
    const last = i === leaflets - 1
    const m = Mask.circle(x + 0.5 + (last ? 0 : side * 1.1), y + 0.5 - (last ? 0.6 : 0), last ? 1.7 : 1.45)
    front(s, () => shadeDome(s, m, id, { contact: false, bias: 0.12 }), 2)
  }
}

interface CarrotTones {
  body: RGBA[]
  leaf: RGBA[]
  stem: RGBA[]
}

function carrot(s: Sprite, tones: CarrotTones, shine: boolean): void {
  const bodyId = s.addRamp(tones.body)
  const leafId = s.addRamp(tones.leaf)
  const stemId = s.addRamp(tones.stem)
  frond(s, leafId, stemId, [[20, 10], [17, 7], [14, 5]], 4)
  frond(s, leafId, stemId, [[22, 10], [24, 7], [25, 4]], 4)
  frond(s, leafId, stemId, [[21, 10], [21, 6], [19, 3]], 5)
  const a: Pt = [20.3, 11.6], b: Pt = [8.6, 25.8]
  const body = taper(a, b, (t) => 0.5 + 4.2 * (1 - t) ** 0.8)
  front(s, () => shadeDome(s, body, bodyId, { bias: shine ? -0.06 : 0.04 }))
  // growth rings: short grooves across the body, alternating sides, each with a lit lip above it
  const rings: [number, number][] = [[0.22, -1], [0.36, 1], [0.5, -1], [0.63, 1], [0.76, -1]]
  body.each((x, y) => {
    const [t, u] = axisCoords(a, b, x, y)
    for (const [rt, side] of rings) {
      if (Math.abs(t - rt) < 0.028 && u * side > -0.8) s.shift(x, y, -1)
      else if (Math.abs(t - rt + 0.05) < 0.02 && u * side > 0.2 && s.toneAt(x, y) < 4) s.shift(x, y, 1)
    }
  })
  if (shine)
    body.each((x, y) => {
      const [t, u] = axisCoords(a, b, x, y)
      if (t > 0.1 && t < 0.55 && Math.abs(u + 1.9) < 0.5) s.paint(x, y, bodyId, 5)
    })
}

function potato(s: Sprite): void {
  const id = s.addRamp(ramp('#c79e62', { hueShift: 8 }))
  const body = Mask.ellipse(15.5, 19.5, 9.6, 6.6, -10).union(Mask.circle(20, 16.5, 4.6), Mask.circle(10.5, 20.5, 5))
  shadeDome(s, body, id)
  speckle(s, 'potato', body, 10, 3)
  for (const [x, y] of [[13, 16], [19, 21], [9, 21], [22, 17]] as const) {
    s.paint(x, y, id, 1)
    s.paint(x - 1, y - 1, id, Math.min(5, s.toneAt(x - 1, y - 1) + 1))
    s.paint(x + 1, y, id, 2)
  }
}

function cabbage(s: Sprite): void {
  const headId = s.addRamp(ramp('#b9db78', { hueShift: 6 }))
  const leafId = s.addRamp(ramp('#7fba4c', { hueShift: 8 }))
  const cx = 16, cy = 17.5, r = 9.2
  const head = Mask.circle(cx, cy, r)
  shadeDome(s, head, headId, { bias: 0.06 })
  // wrapper leaves fold up from the base; each has a wavy lit rim and a pale midrib
  const leafMask = (edge: (x: number) => number, side: number) => {
    const m = new Mask()
    head.each((x, y) => {
      if ((x + 0.5 - cx) * side > -1.5 && y + 0.5 > edge(x + 0.5)) m.set(x, y)
    })
    return m
  }
  const left = leafMask((x) => 10 + (x - 6) * 0.9 + Math.sin(x * 1.7) * 0.8, -1)
  const right = leafMask((x) => 10 + (26 - x) * 0.9 + Math.sin(x * 1.7) * 0.8, 1)
  for (const [m, rib] of [
    [left, [[15, 26], [11, 22], [9, 16]]],
    [right, [[17, 26], [21, 22], [23, 16]]],
  ] as const) {
    front(s, () => {
      shadeDome(s, m, leafId, { contact: false, bias: 0.04 })
      m.each((x, y) => {
        if (!m.get(x, y - 1)) s.paint(x, y, leafId, 4)
      })
      for (const [x, y] of curvePixelsIn(rib, m)) s.paint(x, y, headId, 4)
    })
  }
}

function onion(s: Sprite): void {
  const id = s.addRamp(ramp('#d98b3a', { hueShift: 10 }))
  const neckId = s.addRamp(ramp('#c9a46a'))
  const rootId = s.addRamp(ramp('#e8d7b0'))
  stroke(s, rootId, [[14, 25], [13, 27]], 3)
  stroke(s, rootId, [[16, 26], [16, 27]], 3)
  stroke(s, rootId, [[18, 25], [19, 27]], 2)
  const bulb = Mask.circle(16, 18.5, 7.8).union(Mask.polygon([[11.5, 14], [16, 7.5], [20.5, 14]]))
  shadeDome(s, bulb, id)
  bulb.each((x, y) => {
    const half = Math.max(1, Math.sqrt(Math.max(0, 7.8 ** 2 - (y + 0.5 - 18.5) ** 2)))
    const u = (x + 0.5 - 16) / half
    for (const m of [-0.62, -0.2, 0.25, 0.66]) if (Math.abs(u - m) < 0.1 && y > 9) s.shift(x, y, -1)
  })
  stroke(s, neckId, [[16, 8], [16, 6], [17, 4]], (t) => (t < 0.5 ? 3 : 4))
}

function tomato(s: Sprite): void {
  const id = s.addRamp(ramp('#e0402f'))
  const calyxId = s.addRamp(ramp('#4f9a35'))
  const body = Mask.ellipse(16, 18.5, 9.6, 8.2)
  shadeDome(s, body, id)
  body.each((x, y) => {
    const u = (x + 0.5 - 16) / 9.6
    if (y < 17 && Math.abs(Math.abs(u) - 0.42 - (17 - y) * 0.015) < 0.05) s.shift(x, y, -1)
  })
  front(s, () => {
    // a star of pointed sepals, two pixels wide at the root
    for (const [end, lit] of [[[9.5, 12.5], 4], [[12.5, 9], 4], [[20, 9], 3], [[22.5, 12.5], 3], [[15, 14.5], 3], [[18, 14], 2]] as const) {
      const px = stroke(s, calyxId, [[16, 11], end], (t) => (t < 0.5 ? lit : lit - 1))
      px.slice(0, Math.ceil(px.length / 2)).forEach(([x, y]) => s.paint(x, y + 1, calyxId, 2))
    }
    shadeDome(s, Mask.ellipse(16, 11.5, 2.2, 1.4), calyxId, { contact: false })
    stroke(s, calyxId, [[16, 10], [16, 8], [17, 6]], 4)
  })
}

function bellPepper(s: Sprite): void {
  const id = s.addRamp(ramp('#3f9f3a', { lift: 0.36 }))
  const stemId = s.addRamp(ramp('#4a8a2e'))
  // three tall lobes, the middle one in front; the grooves between them run the full height
  const lobes: [number, number, number, number][] = [
    [11.2, 17.6, 4.4, 8.2],
    [20.8, 17.6, 4.4, 8.2],
    [16, 18.4, 4.6, 8.4],
  ]
  for (const [x, y, rx, ry] of lobes) front(s, () => shadeDome(s, Mask.ellipse(x, y, rx, ry), id, { contact: false, relief: 1.3 }), 2)
  for (const [x, y0] of [[10, 13], [15, 14], [19, 14]] as const) for (let y = y0; y < y0 + 5; y++) if (s.toneAt(x, y) >= 3) s.paint(x, y, id, 5)
  front(s, () => {
    shadeDome(s, Mask.ellipse(16, 10.2, 3.6, 1.6), stemId, { contact: false })
    stroke(s, stemId, [[15, 10], [15, 7], [17, 4]], 4)
    stroke(s, stemId, [[16, 10], [16, 7], [18, 4]], 2)
  })
}

function eggplant(s: Sprite): void {
  const id = s.addRamp(ramp('#5b2b78', { lift: 0.38, hueShift: 6 }))
  const capId = s.addRamp(ramp('#5e9a3a'))
  const a: Pt = [12, 20.5], b: Pt = [20, 10.5]
  const body = taper(a, b, (t) => 6.2 - 3 * t)
  shadeDome(s, body, id, { relief: 1.2 })
  body.each((x, y) => {
    const [t, u] = axisCoords(a, b, x, y)
    if (t > 0.15 && t < 0.75 && u > -4.2 + t * 2 && u < -3.2 + t * 2) s.paint(x, y, id, 5)
  })
  front(s, () => {
    shadeDome(s, Mask.polygon([[17, 10], [20, 6.5], [24, 8.5], [23.5, 12], [21, 14.5], [20, 12.5], [17.5, 13.5]]), capId, { contact: false })
    stroke(s, capId, [[21, 7], [22, 5], [24, 3]], 4)
  })
}

function asparagus(s: Sprite): void {
  const spearId = s.addRamp(ramp('#7cb342', { hueShift: 8 }))
  const tipId = s.addRamp(ramp('#8a6aa8', { hueShift: 8 }))
  const bandId = s.addRamp(ramp('#8e44ad', { lift: 0.3 }))
  // spears fan out from the band; each ends in a pointed, scaly, purple-tinged bud
  const spears: [number, number, number][] = [
    [13, 9, 6],
    [19, 23, 6],
    [14, 12, 3],
    [18, 20, 3],
    [16, 16, 2],
  ]
  for (const [bx, tx, ty] of spears) {
    front(s, () => {
      const pts = stroke(s, spearId, [[bx, 26], [(bx + tx) / 2, 18], [tx, ty + 3]], 4)
      for (const [x, y] of pts) s.paint(x + 1, y, spearId, y === 26 ? 4 : 2)
      for (const [x, y] of pts) if (y === 26) s.paint(x, y, spearId, 5)
      for (const [x, y] of pts) if (y > ty + 5 && y < 19 && (y - ty) % 4 === 1) s.paint(x + ((y >> 2) % 2 === 0 ? -1 : 2), y, tipId, 3)
      stamp(s, tipId, tx - 1, ty, ['.4.', '453', '342', '.3.'])
    })
  }
  front(s, () => {
    for (let x = 12; x <= 21; x++) {
      s.paint(x, 20, bandId, x < 16 ? 4 : 3)
      s.paint(x, 21, bandId, x < 16 ? 3 : 2)
    }
  })
}

function emperorPumpkin(s: Sprite): void {
  const id = s.addRamp(ramp('#ea7a1c', { hueShift: 18, drop: 0.28 }))
  const crownId = s.addRamp(ramp('#f2b51e', { lift: 0.42, drop: 0.34, hueShift: 12, satShift: 0.04 }))
  const rubyId = s.addRamp(ramp('#d42a4a', { lift: 0.45 }))
  const amethystId = s.addRamp(ramp('#8e44ad', { lift: 0.45 }))
  const cy = 18
  // a broad pumpkin of deep ribs, the outer ribs foreshortened as they turn away; the middle one in front
  const lobes: [number, number, number][] = [
    [10.8, 3.4, 5.8],
    [21.2, 3.4, 5.8],
    [13.2, 4.2, 7.2],
    [18.8, 4.2, 7.2],
    [16, 4.4, 8],
  ]
  for (const [x, rx, ry] of lobes) front(s, () => shadeDome(s, Mask.ellipse(x, cy, rx, ry), id, { contact: false }), 2)
  // its stem is a crown: five points, a ruby at the front and amethysts at the sides
  front(s, () => {
    const crown = Mask.polygon([[10.5, 13], [10, 7.5], [12.6, 10], [13.8, 6], [16, 9], [18.2, 6], [19.4, 10], [22, 7.5], [21.5, 13]])
    shadeDome(s, crown, crownId, { contact: false, bias: 0.06 })
    for (let x = 11; x <= 21; x++) s.paint(x, 12, crownId, x < 16 ? 3 : 2)
    for (let x = 11; x <= 21; x++) s.paint(x, 11, crownId, x < 16 ? 5 : 4)
    s.paint(16, 10, rubyId, 4)
    s.paint(16, 11, rubyId, 3)
    s.paint(16, 12, rubyId, 2)
    s.paint(13, 11, amethystId, 4)
    s.paint(13, 12, amethystId, 2)
    s.paint(19, 11, amethystId, 3)
    s.paint(19, 12, amethystId, 2)
    for (const [x, y] of [[10, 7], [14, 6], [18, 6], [22, 7]] as const) s.paint(x, y, crownId, 5)
  })
}

export const VEGETABLES: ItemIcon[] = [
  { id: 'carrot', name: 'Carrot', grade: 1, paint: (s) => carrot(s, { body: ramp('#f07a1f', { hueShift: 8 }), leaf: LEAF, stem: ramp('#4f8f2f') }, false) },
  { id: 'potato', name: 'Potato', grade: 2, paint: potato },
  { id: 'cabbage', name: 'Cabbage', grade: 3, paint: cabbage },
  { id: 'onion', name: 'Onion', grade: 4, paint: onion },
  { id: 'tomato', name: 'Tomato', grade: 5, paint: tomato },
  { id: 'bell-pepper', name: 'Bell Pepper', grade: 6, paint: bellPepper },
  { id: 'eggplant', name: 'Eggplant', grade: 7, paint: eggplant },
  { id: 'asparagus', name: 'Asparagus', grade: 8, paint: asparagus },
  {
    id: 'golden-carrot',
    name: 'Golden Carrot',
    grade: 9,
    paint: (s) => carrot(s, { body: ramp('#eda81c', { lift: 0.34, drop: 0.34, hueShift: 12, satShift: 0.02 }), leaf: ramp('#a9c43c', { lift: 0.3 }), stem: ramp('#7f8f2a') }, true),
  },
  { id: 'emperor-pumpkin', name: 'Emperor Pumpkin', grade: 10, paint: emperorPumpkin },
]
