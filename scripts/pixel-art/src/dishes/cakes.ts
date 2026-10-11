// Sweets → cakes (Speed). Slices for the humbler grades (a wedge showing its layers) and whole round cakes for the finer
// ones, each sweetened and decorated with its grade's sweet: honey and comb, sugarcane glaze, white beet sugar, maple
// glaze and leaf, chocolate and cacao, vanilla cream with pods and orchid, agave syrup, palm caramel, a pastel fairy
// comb with wings, and a golden ambrosia blossom crowning three tiers.
import { ramp } from '../color.ts'
import { halo, motes, pix, rays, shadeCylinder } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CELADON, COBALT, CREAM, CREAMWARE, GOLD, PORCELAIN, SILVER, type Dish, type Tones, blob, castShadow, plate } from './kit.ts'

const SPONGE = ramp('#f2cf7a', { lift: 0.4, hueShift: 8 })

interface SliceSpec {
  /** Front tip, back corner on the rim, front-right corner. */
  tip?: Point
  back?: Point
  right?: Point
  h?: number
  /** Layers from the top down: [ramp, share of the height]. */
  layers: readonly (readonly [Tones, number])[]
  frosting: Tones
  /** Frosting drips over the front face, at these x positions. */
  drips?: readonly number[]
}

/**
 * A wedge of layer cake in 3/4 view, tip to the left: a frosted top, the cut face showing its layers along the front, and
 * the rounded outside of the cake in shadow at the back right. Returns the top face (for decorations).
 */
function slice(s: Sprite, o: SliceSpec): Mask {
  const tip = o.tip ?? [5, 16.5], back = o.back ?? [18.5, 9.5], right = o.right ?? [26.5, 15], h = o.h ?? 7.5
  const ctrl: Point = [right[0] + 2, back[1] - 1]
  const arc: Point[] = []
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    arc.push([(1 - t) ** 2 * back[0] + 2 * (1 - t) * t * ctrl[0] + t * t * right[0], (1 - t) ** 2 * back[1] + 2 * (1 - t) * t * ctrl[1] + t * t * right[1]])
  }
  const top = Mask.polygon([tip, ...arc])
  const front = Mask.polygon([tip, right, [right[0], right[1] + h], [tip[0], tip[1] + h]])
  const outer = new Mask()
  for (let d = 0; d <= h; d += 0.5) outer.union(Mask.polygon(arc.map(([x, y]) => [x, y + d] as const).concat([[right[0], right[1] + d]])))
  outer.subtract(top).subtract(front)
  const all = new Mask().union(top, front, outer)
  castShadow(s, all, 1, 1)
  const fr = s.addRamp(o.frosting)
  const ids = o.layers.map(([t]) => s.addRamp(t))
  const total = o.layers.reduce((n, [, k]) => n + k, 0)
  const layerAt = (t: number): number => {
    let acc = 0
    for (let i = 0; i < o.layers.length; i++) {
      acc += (o.layers[i]?.[1] ?? 0) / total
      if (t <= acc) return ids[i] ?? fr
    }
    return ids[ids.length - 1] ?? fr
  }
  const yTop = (x: number) => tip[1] + ((right[1] - tip[1]) * (x - tip[0])) / (right[0] - tip[0])
  front.each((x, y) => {
    const t = (y + 0.5 - yTop(x + 0.5)) / h
    const id = t < 0.12 ? fr : layerAt((t - 0.12) / 0.88)
    s.paint(x, y, id, x < tip[0] + 3 ? 4 : 3)
  })
  // Layer seams: a darker line where each layer meets the next.
  outer.each((x, y) => s.paint(x, y, fr, y > right[1] + h - 1 ? 1 : 2))
  top.each((x, y) => {
    const edge = !top.get(x, y - 1) || !top.get(x - 1, y)
    s.paint(x, y, fr, edge ? 5 : 4)
  })
  // The front edge of the top catches the light.
  for (let x = Math.ceil(tip[0]); x <= right[0]; x++) {
    const y = Math.floor(yTop(x + 0.5))
    if (top.get(x, y)) s.paint(x, y, fr, 5)
  }
  for (const x of o.drips ?? []) {
    const y = Math.floor(yTop(x + 0.5)) + 1
    s.paint(x, y, fr, 4)
    s.paint(x, y + 1, fr, 3)
    if (x % 2 === 0) s.paint(x, y + 2, fr, 3)
  }
  return top
}

interface Round {
  top: Mask
  cx: number
  topY: number
  rx: number
  ry: number
}

/** A round cake (or one tier): a cylinder whose side shows `side` tones and whose top is frosted, with drips. */
function round(s: Sprite, o: { cx?: number; base: number; rx: number; ry?: number; h: number; side: Tones; frosting: Tones; drips?: boolean; trim?: Tones }): Round {
  const cx = o.cx ?? 16, ry = o.ry ?? o.rx * 0.34
  const topY = o.base - o.h
  const sideId = s.addRamp(o.side), fr = s.addRamp(o.frosting)
  const body = Mask.ellipse(cx, o.base, o.rx, ry).union(Mask.from((px, py) => py >= topY && py <= o.base && Math.abs(px - cx) <= o.rx))
  castShadow(s, body, 1, 1)
  shadeCylinder(s, body, sideId, { bias: 0.08 })
  const top = Mask.ellipse(cx, topY, o.rx, ry)
  top.each((x, y) => {
    const lit = (x + 0.5 - cx) / o.rx + (y + 0.5 - topY) / ry
    s.paint(x, y, fr, lit < -0.7 ? 5 : lit < 0.6 ? 4 : 3)
  })
  if (o.trim) {
    // A piped or gilded band around the foot of the tier.
    const tid = s.addRamp(o.trim)
    body.each((x, y) => {
      if (!body.get(x, y + 1) || !body.get(x, y + 2)) s.paint(x, y, tid, Math.min(5, s.toneAt(x, y) + (y % 2 === 0 ? 1 : 0)))
    })
  }
  if (o.drips ?? true) {
    // Frosting runs down the side in uneven drips, lit on the left, shaded on the right.
    for (let x = Math.ceil(cx - o.rx); x <= cx + o.rx; x++) {
      const t = (x + 0.5 - (cx - o.rx)) / (2 * o.rx)
      const yEdge = Math.floor(topY + ry * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - cx) / o.rx) ** 2)))
      const len = [1, 2, 1, 3, 1, 2, 2][((x % 7) + 7) % 7] ?? 1
      for (let d = 0; d <= len; d++) if (body.get(x, yEdge + d)) s.paint(x, yEdge + d, fr, t < 0.35 ? 4 : t < 0.75 ? 3 : 2)
    }
  }
  return { top, cx, topY, rx: o.rx, ry }
}

/** A plump berry or cherry. */
function berry(s: Sprite, x: number, y: number, id: number, r = 1.3): void {
  shadeDome(s, Mask.circle(x, y, r), id, { bias: 0.08, contact: true })
}

export const CAKES: Dish[] = [
  {
    id: 'dish-sweets-1',
    name: 'Honeycomb Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 1,
    paint: (s) => {
      // A slice of honey sponge dripping with honey, a nugget of honeycomb on top, on a creamware plate.
      plate(s, { cy: 22.6, rx: 12.4, ry: 4.6, tones: CREAMWARE, well: 0.7 })
      slice(s, { layers: [[SPONGE, 3], [ramp('#e8a530', { lift: 0.4 }), 1], [SPONGE, 3]], frosting: ramp('#f0a81e', { lift: 0.45, hueShift: 10 }), drips: [9, 13, 17, 22] })
      const wax = s.addRamp(ramp('#f4c84e', { lift: 0.38, hueShift: 6 }))
      const cell = s.addRamp(ramp('#b8560c', { lift: 0.45, hueShift: 10 }))
      pix(s, 14, 9, ['.abab.', 'abcbcb', 'bcbcba', '.bab..'], { a: [wax, 5], b: [wax, 4], c: [cell, 3] })
    },
  },
  {
    id: 'dish-sweets-2',
    name: 'Sugarcane Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 2,
    paint: (s) => {
      // A pound-cake slice under a raw-sugar glaze, a stick of purple sugarcane beside it.
      plate(s, { cy: 22.6, rx: 12.4, ry: 4.6, tones: PORCELAIN, well: 0.7 })
      slice(s, { layers: [[ramp('#e8c070', { lift: 0.38 }), 1]], frosting: ramp('#d8a8c8', { lift: 0.42 }), drips: [8, 12, 19] })
      const cane = s.addRamp(ramp('#8a3c6c', { lift: 0.32, hueShift: 8 }))
      const node = s.addRamp(ramp('#d6cf8a', { lift: 0.3 }))
      for (let i = 0; i < 10; i++) {
        const x = 15 + i, y = 25 - Math.round(i * 0.3)
        const isNode = i === 3 || i === 7
        s.paint(x, y, isNode ? node : cane, 4)
        s.paint(x, y + 1, isNode ? node : cane, 2)
      }
    },
  },
  {
    id: 'dish-sweets-3',
    name: 'Sugar Beet Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 3,
    paint: (s) => {
      // A snowy slice frosted with white beet sugar, sugar cubes and a beet leaf on top, on a cobalt-banded plate.
      plate(s, { cy: 22.6, rx: 12.4, ry: 4.6, tones: PORCELAIN, band: COBALT, well: 0.66 })
      slice(s, { layers: [[SPONGE, 2], [CREAM, 1], [SPONGE, 2], [CREAM, 1], [SPONGE, 2]], frosting: ramp('#f2eee8', { lift: 0.5, drop: 0.2, hueShift: 10 }), drips: [8, 14, 20] })
      const cube = s.addRamp(ramp('#f8f6f2', { lift: 0.5, drop: 0.18 }))
      pix(s, 14, 9, ['aab', 'aab', 'ccc'], { a: [cube, 5], b: [cube, 3], c: [cube, 2] })
      blob(s, 19.4, 10, 2.2, 1, -30, s.addRamp(ramp('#4f9e3a', { lift: 0.34 })))
    },
  },
  {
    id: 'dish-sweets-4',
    name: 'Maple Sap Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 4,
    paint: (s) => {
      // A round maple cake running with amber glaze, a red maple leaf on top, on a plain plate.
      plate(s, { cy: 23, rx: 12, ry: 4.4, tones: CREAMWARE, well: 0.7 })
      const r4 = round(s, { base: 21.6, rx: 9, h: 6.6, side: ramp('#ecc070', { lift: 0.38, hueShift: 8 }), frosting: ramp('#c0601a', { lift: 0.24, hueShift: 10 }) })
      const filling = s.addRamp(CREAM)
      for (let x = 7; x <= 25; x++) {
        const y = Math.round(r4.topY + r4.ry * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 16) / 9) ** 2)) + 2.6)
        if (s.filled(x, y) && s.filled(x, y + 1)) s.paint(x, y, filling, x < 12 ? 5 : x < 21 ? 4 : 3)
      }
      const leaf = s.addRamp(ramp('#e2452a', { hueShift: 10, lift: 0.34 }))
      pix(s, 13, 11, ['..a..', 'a.a.a', 'aabaa', '.aaa.', '..b..'], { a: [leaf, 4], b: [leaf, 2] })
    },
  },
  {
    id: 'dish-sweets-5',
    name: 'Cacao Pod Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 5,
    paint: (s) => {
      // A dark chocolate layer slice with a glossy ganache top, shavings and a ripe cacao pod, on a gilt-rimmed plate.
      plate(s, { cy: 22.6, rx: 12.4, ry: 4.6, tones: PORCELAIN, edge: GOLD, well: 0.7 })
      slice(s, { layers: [[ramp('#6a3a22', { lift: 0.36 }), 2], [ramp('#c89060', { lift: 0.36 }), 1], [ramp('#6a3a22', { lift: 0.36 }), 2], [ramp('#c89060', { lift: 0.36 }), 1], [ramp('#6a3a22', { lift: 0.36 }), 2]], frosting: ramp('#4a2616', { lift: 0.4 }), drips: [9, 15, 21] })
      const pod = s.addRamp(ramp('#ec9a26', { lift: 0.32, hueShift: 14, satShift: 0.06 }))
      const m = Mask.ellipse(16, 10.6, 3.4, 1.8, -10)
      shadeDome(s, m, pod, { bias: 0.08, contact: true })
      for (const x of [14, 16, 18]) if (m.get(x, 10)) s.shift(x, 10, -1)
    },
  },
  {
    id: 'dish-sweets-6',
    name: 'Vanilla Pod Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 6,
    paint: (s) => {
      // A round vanilla cream cake on a porcelain stand, crossed with vanilla pods under a pale orchid.
      plate(s, { cy: 21.4, rx: 11.4, ry: 3.8, tones: PORCELAIN, well: 0.7, stand: 4 })
      round(s, { base: 20.4, rx: 8.6, h: 6.4, side: ramp('#f4ead0', { lift: 0.42, drop: 0.22 }), frosting: ramp('#fbf4e2', { lift: 0.5, drop: 0.22 }) })
      const pod = s.addRamp(ramp('#4a2c1c', { lift: 0.32, hueShift: 6 }))
      for (let i = 0; i < 8; i++) {
        s.paint(10 + i, 12 + Math.round(i * 0.35), pod, i % 3 === 0 ? 4 : 3)
        s.paint(12 + i, 15 - Math.round(i * 0.35), pod, i % 3 === 1 ? 4 : 3)
      }
      const petal = s.addRamp(ramp('#f1e9b2', { lift: 0.35, hueShift: 6 }))
      const lip = s.addRamp(ramp('#f2c43a', { lift: 0.3 }))
      pix(s, 18, 9, ['.a.a.', 'aabaa', '.aca.', '..a..'], { a: [petal, 4], b: [lip, 5], c: [lip, 3] })
    },
  },
  {
    id: 'dish-sweets-7',
    name: 'Agave Heart Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 7,
    paint: (s) => {
      // A tall slice layered with pale agave cream and amber syrup, an agave leaf at its side, on a celadon plate.
      plate(s, { cy: 22.6, rx: 12.4, ry: 4.6, tones: CELADON, well: 0.7 })
      const syrup = ramp('#e2952a', { lift: 0.42, hueShift: 8 })
      slice(s, { h: 8.5, layers: [[SPONGE, 2], [syrup, 1], [ramp('#d9d6a4', { lift: 0.4, hueShift: 6 }), 2], [syrup, 1], [SPONGE, 2]], frosting: ramp('#e6e4b4', { lift: 0.45, hueShift: 6 }), drips: [10, 16, 22] })
      const leaf = s.addRamp(ramp('#6fa29a', { lift: 0.32, hueShift: 6 }))
      for (const [x0, y0, len] of [[23, 22, 5], [25, 23, 4]] as const)
        for (let i = 0; i < len; i++) s.paint(x0 + Math.round(i * 0.4), y0 - i, leaf, i === len - 1 ? 5 : 3)
      pix(s, 14, 9, ['.a.', 'aba', '.a.'], { a: [s.addRamp(syrup), 4], b: [s.addRamp(syrup), 5] })
    },
  },
  {
    id: 'dish-sweets-8',
    name: 'Palm Sap Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 8,
    paint: (s) => {
      // A round caramel cake of palm sugar, glossy drips down its side, on a silver stand with a palm frond.
      plate(s, { cy: 21.4, rx: 11.4, ry: 3.8, tones: SILVER, well: 0.7, stand: 4 })
      const r = round(s, { base: 20.4, rx: 8.6, h: 7, side: ramp('#d49a58', { lift: 0.38 }), frosting: ramp('#7a3c16', { lift: 0.42, drop: 0.3 }) })
      // A band of cream around the middle.
      const cream = s.addRamp(CREAM)
      for (let x = 8; x <= 24; x++) for (const y of [16]) if (s.filled(x, y + 1) && s.filled(x, y) && y > r.topY + 2) s.paint(x, y, cream, x < 12 ? 5 : x < 20 ? 4 : 3)
      const frond = s.addRamp(ramp('#4f9c3c', { hueShift: 8, lift: 0.34 }))
      for (let i = 0; i < 8; i++) {
        s.paint(13 + i, 11 - Math.round(i * 0.3), frond, 3)
        if (i % 2 === 0) s.paint(13 + i, 10 - Math.round(i * 0.3), frond, 4)
        else s.paint(13 + i, 12 - Math.round(i * 0.3), frond, 2)
      }
      for (const [x, y] of [[11, 13], [20, 14]] as const) berry(s, x, y, s.addRamp(ramp('#c8342a', { lift: 0.4 })), 1)
    },
  },
  {
    id: 'dish-sweets-9',
    name: 'Fairy Honeycomb Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 9,
    paint: (s) => {
      // Two pastel tiers studded with rainbow fairy comb, gauzy wings rising from the top, on a pearl stand.
      plate(s, { cy: 22.2, rx: 7.4, ry: 3, tones: ramp('#f2e6ee', { lift: 0.5, drop: 0.22, hueShift: 10 }), edge: GOLD, well: 0.66, stand: 4 })
      round(s, { base: 21.2, rx: 7, ry: 2.4, h: 4.6, side: ramp('#f08cb8', { lift: 0.4, drop: 0.26 }), frosting: ramp('#fdf0f6', { lift: 0.5, drop: 0.24 }), trim: ramp('#c49aff', { lift: 0.45 }), drips: false })
      round(s, { base: 16.4, rx: 4.6, ry: 1.7, h: 3.6, side: ramp('#8cb8f4', { lift: 0.4, drop: 0.26 }), frosting: ramp('#f4f6ff', { lift: 0.5, drop: 0.24 }), trim: ramp('#ffd36a', { lift: 0.45 }), drips: false })
      const hues = ['#ff8fb8', '#ffd36a', '#8fe0a0', '#8fc8ff', '#c49aff'].map((h) => s.addRamp(ramp(h, { lift: 0.45 })))
      ;[[10, 19], [13, 20], [16, 20], [19, 20], [22, 19], [13, 15], [16, 15], [19, 15]].forEach(([x, y], i) => s.paint(x ?? 0, y ?? 0, hues[i % 5] ?? 0, 4))
      // A nugget of rainbow fairy comb on top.
      pix(s, 14, 10, ['.abc.', 'abcde', '.cde.'], { a: [hues[0] ?? 0, 4], b: [hues[1] ?? 0, 5], c: [hues[2] ?? 0, 4], d: [hues[3] ?? 0, 4], e: [hues[4] ?? 0, 3] })
      const wing = s.addRamp(ramp('#9ad8ff', { lift: 0.55, drop: 0.24, hueShift: 4 }))
      blob(s, 11.4, 8.4, 2.6, 1.3, 30, wing, { bias: 0.2 })
      blob(s, 20.6, 8.4, 2.6, 1.3, -30, wing, { bias: 0.2 })
      halo(s, 16, 15, 12, 10.5, '#ffb3d0', 80)
      motes(s, [[10, 6], [23, 5], [25, 17]], '#fff1f6', 200)
    },
  },
  {
    id: 'dish-sweets-10',
    name: 'Ambrosia Blossom Cake',
    kind: 'planet',
    family: 'sweets',
    grade: 10,
    paint: (s) => {
      // Three golden tiers on a gold stand, crowned by a radiant ambrosia blossom.
      plate(s, { cy: 23, rx: 7.6, ry: 2.8, tones: GOLD, well: 0.66, stand: 3 })
      const ivory = ramp('#f2e4c8', { lift: 0.45, drop: 0.26, hueShift: 8 })
      const icing = ramp('#fffaf0', { lift: 0.5, drop: 0.22, hueShift: 8 })
      round(s, { base: 22, rx: 7.4, ry: 2.2, h: 4, side: ivory, frosting: icing, trim: GOLD, drips: false })
      round(s, { base: 17.6, rx: 5, ry: 1.6, h: 3.4, side: ivory, frosting: icing, trim: GOLD, drips: false })
      round(s, { base: 13.8, rx: 3, ry: 1.1, h: 2.6, side: ivory, frosting: icing, trim: GOLD, drips: false })
      const petal = s.addRamp(ramp('#f6b21c', { lift: 0.5, drop: 0.3, hueShift: 10 }))
      const heart = s.addRamp(ramp('#fff6d8', { lift: 0.6, drop: 0.2 }))
      pix(s, 13, 6, ['..a.a..', '.aabaa.', 'aabcbaa', '.aabaa.', '..a.a..'], { a: [petal, 4], b: [petal, 5], c: [heart, 5] })
      halo(s, 16, 14, 12.5, 11, '#ffd34d', 90)
      rays(s, 16, 8, 5, 8, [-90, -45, -135], '#ffe27a', 130)
    },
  },
]
