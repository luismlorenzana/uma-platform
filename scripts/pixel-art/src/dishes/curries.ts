// Herbs & Spices → curries (M.ATK). A bowl of curry with a mound of white rice at the back, the sauce coloured by the
// grade's herb or spice and garnished with it (basil and mint leaves, rosemary and thyme sprigs, ginger coins,
// peppercorns, cinnamon quills, saffron threads and crocus, a mandrake root, a flaming phoenix pepper). The bowls go
// from clay and wood to banded porcelain, then gilded and footed for the legendary grades.
import { ramp } from '../color.ts'
import { halo, motes, pix, rays, scatter } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CELADON, CLAY, COBALT, CREAMWARE, GOLD, PORCELAIN, RICE, SILVER, TEAL, WOOD, type Bowl, type Dish, type Tones, blob, bowlBody, fillBowl } from './kit.ts'

const CARROT = ramp('#ef7d22', { lift: 0.34 })
const POTATO = ramp('#ecd48a', { lift: 0.36 })

interface CurrySpec {
  bowl: Bowl
  sauce: Tones
  /** Chunks in the sauce: [ramp, x, y]. */
  chunks?: boolean
}

/** Fills a bowl with curry sauce and heaps rice at the back left. Returns the sauce surface. */
function curry(s: Sprite, o: CurrySpec): Mask {
  const sauce = s.addRamp(o.sauce)
  const b = o.bowl
  const surface = fillBowl(s, b, sauce, { mound: 0.8, bias: 0.1, relief: 0.5 })
  const rice = s.addRamp(RICE)
  const mound = Mask.ellipse(b.cx - b.rx * 0.36, b.rim - 1.4, b.rx * 0.44, 3.8)
  const m = Mask.from((px, py) => py <= b.rim + 0.2 && mound.get(Math.floor(px), Math.floor(py)))
  shadeDome(s, m, rice, { bias: 0.12 })
  // Grain texture: a few darker grains.
  for (const [x, y] of scatter(`rice-${b.cx}-${b.rim}`, m, 6)) if (s.toneAt(x, y) >= 3) s.shift(x, y, -1)
  if (o.chunks ?? true) {
    const carrot = s.addRamp(CARROT), potato = s.addRamp(POTATO)
    for (const [id, dx, dy] of [[carrot, 2.4, 0.2], [potato, 5.2, -1], [carrot, 0.4, 1.8], [potato, -2.4, 2]] as const) {
      const x = Math.round(b.cx + dx), y = Math.round(b.rim + dy)
      if (!surface.get(x, y)) continue
      pix(s, x, y, ['ab', 'bc'], { a: [id, 5], b: [id, 4], c: [id, 2] })
    }
  }
  return surface
}

function leaf(s: Sprite, id: number, x: number, y: number, rx: number, ry: number, rot: number): void {
  blob(s, x, y, rx, ry, rot, id, { bias: 0.14, contact: true })
}

const bowlAt = (s: Sprite, tones: Tones, o: Partial<Parameters<typeof bowlBody>[1]> = {}): Bowl => bowlBody(s, { rim: 16.4, rx: 10.4, ry: 5, depth: 8.6, tones, ...o })

export const CURRIES: Dish[] = [
  {
    id: 'dish-herbs-spices-1',
    name: 'Basil Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 1,
    paint: (s) => {
      // A green curry with fresh basil leaves, in a plain clay bowl.
      const b = bowlAt(s, CLAY)
      curry(s, { bowl: b, sauce: ramp('#7fae3a', { lift: 0.36 }) })
      const basil = s.addRamp(ramp('#3aa845', { lift: 0.34, hueShift: 10 }))
      leaf(s, basil, 20.4, 15.2, 2.4, 1.3, -30)
      leaf(s, basil, 22.6, 16.6, 2.2, 1.2, 20)
    },
  },
  {
    id: 'dish-herbs-spices-2',
    name: 'Mint Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 2,
    paint: (s) => {
      // A creamy pale curry scattered with mint leaves, in a turned wooden bowl.
      const b = bowlAt(s, WOOD)
      curry(s, { bowl: b, sauce: ramp('#d2c76a', { lift: 0.4 }) })
      const mint = s.addRamp(ramp('#3fb08a', { hueShift: 12, lift: 0.32 }))
      leaf(s, mint, 20, 15.4, 2, 1.2, -40)
      leaf(s, mint, 22.8, 15.6, 2, 1.2, 35)
      leaf(s, mint, 21.4, 17.4, 1.8, 1.1, 0)
    },
  },
  {
    id: 'dish-herbs-spices-3',
    name: 'Rosemary Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 3,
    paint: (s) => {
      // An amber curry with a sprig of rosemary laid across it, in a creamware bowl with a brown band.
      const b = bowlAt(s, CREAMWARE, { bands: [[ramp('#8a5a32', { lift: 0.3 }), 3, 4]] })
      curry(s, { bowl: b, sauce: ramp('#c07a2e', { lift: 0.4 }) })
      const stem = s.addRamp(ramp('#7a5a3a'))
      const needle = s.addRamp(ramp('#3f7350', { hueShift: 10, lift: 0.36 }))
      for (let i = 0; i < 9; i++) {
        const x = 16 + i, y = 18 - Math.round(i * 0.5)
        s.paint(x, y, stem, 3)
        s.paint(x, y - 1, needle, i % 2 === 0 ? 4 : 3)
        if (i % 2 === 0) s.paint(x, y + 1, needle, 2)
      }
    },
  },
  {
    id: 'dish-herbs-spices-4',
    name: 'Thyme Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 4,
    paint: (s) => {
      // A golden curry under a little bundle of thyme, in a white enamel bowl with a blue rim.
      const b = bowlAt(s, ramp('#e8ecef', { lift: 0.5, drop: 0.22 }), { gilt: ramp('#3a64b0', { lift: 0.36 }) })
      curry(s, { bowl: b, sauce: ramp('#a8a83a', { lift: 0.4 }) })
      const stem = s.addRamp(ramp('#8a6a4a'))
      const leafId = s.addRamp(ramp('#78a85a', { hueShift: 8, lift: 0.36 }))
      const tie = s.addRamp(ramp('#d9c27a'))
      pix(s, 18, 12, ['a.a.a.', '.bab.a', 'a.bab.', '.a.cb.', '...ab.', '....b.'], { a: [leafId, 4], b: [stem, 3], c: [tie, 4] })
      pix(s, 18, 13, ['......', '......', '......', '.....a', '......', '.....a'], { a: [leafId, 3] })
    },
  },
  {
    id: 'dish-herbs-spices-5',
    name: 'Ginger Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 5,
    paint: (s) => {
      // A bright turmeric-gold curry topped with coins and slivers of ginger, in a cobalt-banded porcelain bowl.
      const b = bowlAt(s, PORCELAIN, { bands: [[COBALT, 2, 2], [COBALT, 4, 5]] })
      curry(s, { bowl: b, sauce: ramp('#eaa422', { lift: 0.42 }), chunks: false })
      const ginger = s.addRamp(ramp('#e8cf9a', { lift: 0.4, drop: 0.28 }))
      const skin = s.addRamp(ramp('#c99a5e'))
      for (const [x, y] of [[19.6, 16.4], [23, 16.8], [21.2, 18.4]] as const) {
        const m = Mask.ellipse(x, y, 1.9, 1.2)
        m.each((px, py) => s.paint(px, py, !m.get(px, py - 1) || !m.get(px + 1, py) ? skin : ginger, !m.get(px, py - 1) ? 4 : 4))
        s.paint(Math.floor(x) - 1, Math.floor(y), ginger, 5)
      }
      const green = s.addRamp(ramp('#5fae3c'))
      pix(s, 16, 15, ['a.', '.a'], { a: [green, 4] })
    },
  },
  {
    id: 'dish-herbs-spices-6',
    name: 'Peppercorn Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 6,
    paint: (s) => {
      // A dark, peppery red curry showered with black and red peppercorns, in a celadon bowl.
      const b = bowlAt(s, CELADON, { bands: [[ramp('#4f8a72', { lift: 0.3 }), 3, 3]] })
      const surface = curry(s, { bowl: b, sauce: ramp('#9a3c24', { lift: 0.42 }), chunks: false })
      const black = s.addRamp(ramp('#3a2a24', { lift: 0.4 }))
      const red = s.addRamp(ramp('#d23a3a', { lift: 0.4 }))
      for (const [i, [x, y]] of scatter('pepper', surface, 14).entries()) {
        if (s.mat[y * 32 + x] === s.ramps.length - 3) continue
        s.paint(x, y, i % 3 === 0 ? red : black, 4)
      }
      for (const [x, y, id] of [[13, 13, black], [11, 14, red], [14, 15, black]] as const) s.paint(x, y, id, 4)
    },
  },
  {
    id: 'dish-herbs-spices-7',
    name: 'Cinnamon Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 7,
    paint: (s) => {
      // A warm brick-red curry with two cinnamon quills, in a teal-glazed bowl with handles.
      const b = bowlAt(s, TEAL, { handles: true, foot: 2 })
      curry(s, { bowl: b, sauce: ramp('#b4502a', { lift: 0.42 }) })
      const bark = s.addRamp(ramp('#a8582c', { hueShift: 8, lift: 0.34 }))
      for (const [x0, y0] of [[17, 14], [19, 16]] as const) {
        for (let i = 0; i < 7; i++) {
          s.paint(x0 + i, y0 - Math.round(i * 0.4) , bark, 4)
          s.paint(x0 + i, y0 - Math.round(i * 0.4) + 1, bark, 2)
        }
        s.paint(x0 + 6, y0 - 2, bark, 5)
      }
    },
  },
  {
    id: 'dish-herbs-spices-8',
    name: 'Saffron Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 8,
    paint: (s) => {
      // A saffron-gold curry strewn with red threads, crowned with a crocus, in a footed gilt bowl with cobalt bands.
      const b = bowlAt(s, PORCELAIN, { bands: [[COBALT, 3, 4]], gilt: GOLD, foot: 2 })
      const surface = curry(s, { bowl: b, sauce: ramp('#f2a018', { lift: 0.45 }), chunks: false })
      const thread = s.addRamp(ramp('#e0401f', { lift: 0.35 }))
      for (const [x, y] of [[18, 16], [21, 15], [23, 17], [19, 18], [16, 17]] as const) {
        if (!surface.get(x, y)) continue
        s.paint(x, y, thread, 4)
        if (surface.get(x + 1, y - 1)) s.paint(x + 1, y - 1, thread, 3)
      }
      const petal = s.addRamp(ramp('#9b6fd0', { hueShift: 8, lift: 0.36 }))
      const stamen = s.addRamp(ramp('#f2c230'))
      pix(s, 10, 9, ['.a.a.', 'abcba', '.bab.', '..b..'], { a: [petal, 5], b: [petal, 3], c: [stamen, 5] })
      const leafId = s.addRamp(ramp('#5f9a3a'))
      pix(s, 12, 13, ['a', 'a'], { a: [leafId, 3] })
    },
  },
  {
    id: 'dish-herbs-spices-9',
    name: 'Mandrake Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 9,
    paint: (s) => {
      // A violet arcane curry with a little mandrake root peeking out, leaves and all, in a footed silver-lipped bowl.
      const b = bowlAt(s, ramp('#4a2a7a', { lift: 0.36, drop: 0.3 }), { gilt: SILVER, foot: 2, rx: 9.6 })
      curry(s, { bowl: b, sauce: ramp('#9a4aa8', { lift: 0.42, hueShift: 6 }), chunks: false })
      const root = s.addRamp(ramp('#dcc3a6', { hueShift: 18, lift: 0.3 }))
      const face = s.addRamp(ramp('#5a2f62'))
      const leafId = s.addRamp(ramp('#3f7a52', { hueShift: 16, lift: 0.34 }))
      const head = Mask.ellipse(20.6, 14.2, 2.8, 2.6)
      shadeDome(s, head, root, { bias: 0.12 })
      pix(s, 19, 14, ['a.a', '.b.'], { a: [face, 1], b: [face, 2] })
      leaf(s, leafId, 19, 10.4, 1.2, 2.2, -25)
      leaf(s, leafId, 22, 10.2, 1.2, 2.2, 25)
      pix(s, 20, 11, ['a'], { a: [leafId, 3] })
      halo(s, 16, 16, 12.5, 10, '#c48aff', 80)
      motes(s, [[12, 8], [23, 6], [9, 13]], '#f0dcff', 200)
    },
  },
  {
    id: 'dish-herbs-spices-10',
    name: 'Phoenix Pepper Curry',
    kind: 'planet',
    family: 'herbs-spices',
    grade: 10,
    paint: (s) => {
      // A blazing red curry with a flaming phoenix pepper on top, in a footed gold bowl.
      const b = bowlAt(s, GOLD, { foot: 2, rx: 9.6 })
      curry(s, { bowl: b, sauce: ramp('#e6361c', { lift: 0.48, hueShift: 14 }), chunks: false })
      const pepper = s.addRamp(ramp('#e6361c', { lift: 0.48, hueShift: 14 }))
      const outer = s.addRamp(ramp('#ff7a1a', { lift: 0.55, hueShift: 10 }))
      const inner = s.addRamp(ramp('#ffd84a', { lift: 0.6, hueShift: 6 }))
      const body = Mask.ellipse(19.6, 15.6, 4, 1.7, -20)
      shadeDome(s, body, pepper, { bias: 0.1, contact: true })
      const flame = Mask.polygon([[16, 13.5], [16.6, 9], [18, 11], [19.4, 6.5], [20.6, 10.4], [22.6, 8.4], [23, 13.4]])
      shadeDome(s, flame, outer, { bias: 0.15 })
      shadeDome(s, Mask.polygon([[18, 13.6], [19.4, 9.4], [20.6, 12], [21.6, 10.6], [21.8, 13.6]]), inner, { bias: 0.2 })
      halo(s, 16, 15, 13, 10.5, '#ff9a3a', 90)
      rays(s, 16, 14, 10, 13, [-90, -55, -125], '#ffcf6a', 130)
    },
  },
]
