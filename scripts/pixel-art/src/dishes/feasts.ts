// Feasts: a small spread of dishes, grander each time. Spring: three dishes on green gingham. Summer: four on a wooden
// tray. Harvest: five on an autumn cloth by candlelight. Grand: a gold tray piled with legendary food under a crowned
// emperor pumpkin, glowing.
import { ramp } from '../color.ts'
import { halo, pix, rays } from '../items/refined/pantry-kit.ts'
import { Mask } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { dome, minnow } from './duos.ts'
import { CELADON, COBALT, GOLD, LINEN, PORCELAIN, RICE, SILVER, SLATE, WOOD, type Dish, type Tones, blob, bowlBody, castShadow, cloth, fillBowl, plate, slab } from './kit.ts'

/** A small bowl heaped with something. */
function smallBowl(s: Sprite, cx: number, rim: number, tones: Tones, contents: Tones, o: { rx?: number; mound?: number; band?: Tones } = {}): Mask {
  const rx = o.rx ?? 4.6
  const b = bowlBody(s, { cx, rim, rx, ry: 2.2, depth: 4, tones, bands: o.band ? [[o.band, 1, 1]] : [] })
  return fillBowl(s, b, s.addRamp(contents), { mound: o.mound ?? 2, inset: 1, bias: 0.12 })
}

/** A tablecloth in 3/4 view: a wide top face narrowing toward the back, with a short drape along the front. */
function tablecloth(s: Sprite, base: Tones, accent: Tones, pattern: 'gingham' | 'check' | 'plain', y0 = 12.5, y1 = 25.5): Mask {
  const top = cloth(s, [[3.5, y0], [28.5, y0], [31.5, y1], [0.5, y1]], base, { accent, pattern })
  const id = s.mat[Math.round(y1 - 1) * 32 + 16] ?? 0
  for (let x = 1; x <= 30; x++) for (let y = Math.ceil(y1); y <= y1 + 1.5; y++) if (!top.get(x, y)) s.paint(x, y, id, y > y1 + 1 ? 1 : 2)
  return top
}

/** A small round fruit. */
function fruit(s: Sprite, cx: number, cy: number, r: number, id: number): void {
  dome(s, Mask.circle(cx, cy, r), id, 0.08)
}

export const FEASTS: Dish[] = [
  {
    id: 'feast-4',
    name: 'Spring Feast',
    kind: 'feast',
    grade: 4,
    paint: (s) => {
      // Green gingham with a rice bowl, a dish of plums and a grilled mackerel; blossom petals on the cloth.
      tablecloth(s, ramp('#5aa84a', { lift: 0.34 }), LINEN, 'gingham', 13, 25)
      smallBowl(s, 8.8, 15.4, PORCELAIN, RICE, { band: COBALT, rx: 4.2, mound: 1.6 })
      plate(s, { cx: 22.6, cy: 16, rx: 5, ry: 2, tones: CELADON, well: 0.66 })
      const plum = s.addRamp(ramp('#7d3b94', { lift: 0.4, hueShift: 6 }))
      fruit(s, 21, 14.6, 1.7, plum)
      fruit(s, 24, 14.6, 1.7, plum)
      fruit(s, 22.6, 16.2, 1.7, plum)
      plate(s, { cx: 15.6, cy: 21.8, rx: 7.4, ry: 2.6, tones: PORCELAIN, well: 0.72 })
      minnow(s, 15.4, 20.6, s.addRamp(ramp('#2fae96', { hueShift: 6, lift: 0.36 })), s.addRamp(ramp('#e2eaee', { lift: 0.4 })), 5.6, 1.9, -4)
      const nut = s.addRamp(ramp('#9a6a3a', { lift: 0.4 }))
      fruit(s, 26, 21.6, 1.3, nut)
      fruit(s, 27.6, 22.8, 1.2, nut)
      const petal = s.addRamp(ramp('#f7b8cc', { lift: 0.4 }))
      for (const [x, y] of [[5, 21], [16, 15], [4, 24]] as const) pix(s, x - 1, y - 1, ['.a.', 'a.a', '.a.'], { a: [petal, 4] })
    },
  },
  {
    id: 'feast-6',
    name: 'Summer Feast',
    kind: 'feast',
    grade: 6,
    paint: (s) => {
      // A wooden tray with rye slices, a bunch of grapes, a rosy sea bream and a bell-pepper salad.
      slab(s, 2, 12, 29, 25, WOOD, { depth: 2, corner: 2, lip: ramp('#7c5232', { lift: 0.3 }) })
      // Rye bread slices, back left.
      const crust = s.addRamp(ramp('#5c3a26', { lift: 0.36 }))
      const crumb = s.addRamp(ramp('#8f6a4c', { lift: 0.32 }))
      for (const [cx, cy] of [[7.4, 15.4], [10, 16]] as const) {
        const m = Mask.ellipse(cx, cy, 2.6, 3.4, 15)
        castShadow(s, m, 1, 1)
        m.each((x, y) => {
          const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
          s.paint(x, y, edge ? crust : crumb, edge ? 3 : x + 0.5 < cx ? 5 : 4)
        })
      }
      // Grapes, back right.
      const grape = s.addRamp(ramp('#7042ab', { lift: 0.4, hueShift: 6 }))
      for (const [x, y] of [[20, 13], [22.6, 13], [25.2, 13.4], [21.2, 15.2], [23.8, 15.4], [22.4, 17.4]] as const) fruit(s, x, y, 1.5, grape)
      blob(s, 19.2, 11.6, 1.6, 0.8, -20, s.addRamp(ramp('#5fae3c')))
      // Sea bream on an oval plate, front left.
      plate(s, { cx: 10, cy: 21.6, rx: 6.6, ry: 2.6, tones: PORCELAIN, well: 0.7 })
      minnow(s, 10, 20.4, s.addRamp(ramp('#e2506a', { hueShift: 6, lift: 0.36 })), s.addRamp(ramp('#f7c6c0', { lift: 0.3 })), 4.6, 2, -6)
      // Bell pepper salad, front right.
      smallBowl(s, 22, 20.2, CELADON, ramp('#7cc04a', { lift: 0.38 }), { rx: 4.6 })
      const red = s.addRamp(ramp('#d8302a', { lift: 0.36 })), yellow = s.addRamp(ramp('#f2c22a', { lift: 0.38 }))
      pix(s, 20, 17, ['.aa.', 'a..a', '.aa.'], { a: [red, 4] })
      pix(s, 22, 18, ['.bb.', 'b..b', '.bb.'], { a: [red, 4], b: [yellow, 4] })
      const pepper = s.addRamp(ramp('#3a2a24'))
      s.paint(16, 23, pepper, 3)
      s.paint(17, 24, pepper, 3)
    },
  },
  {
    id: 'feast-8',
    name: 'Harvest Feast',
    kind: 'feast',
    grade: 8,
    paint: (s) => {
      // An autumn cloth set by candlelight: saffron wild rice, a split pomegranate, seared tuna, a palm-sugar cake.
      tablecloth(s, ramp('#b8482a', { lift: 0.34 }), ramp('#e8a03a', { lift: 0.36 }), 'check', 12.5, 25)
      // A brass candlestick at the back.
      const brass = s.addRamp(GOLD)
      const wax = s.addRamp(ramp('#f4ecd8', { lift: 0.4, drop: 0.2 }))
      const flame = s.addRamp(ramp('#ffb02a', { lift: 0.5 }))
      pix(s, 15, 2, ['.c.', 'cdc', '.c.', '.a.', '.a.', '.a.', '.a.', '.b.', 'bbb'], { a: [wax, 4], b: [brass, 4], c: [flame, 4], d: [flame, 5] })
      // Saffron wild rice, back left.
      const rice = smallBowl(s, 8.4, 15, PORCELAIN, ramp('#f2a818', { lift: 0.45 }), { band: COBALT, rx: 4.2, mound: 1.6 })
      const grain = s.addRamp(ramp('#3e2c22'))
      for (const [x, y] of [[7, 13], [9, 12], [10, 14]] as const) if (rice.get(x, y)) s.paint(x, y, grain, 3)
      // A split pomegranate, back right.
      const skin = s.addRamp(ramp('#bb2532', { lift: 0.4 }))
      const seed = s.addRamp(ramp('#e8344a', { lift: 0.5 }))
      fruit(s, 25, 13.6, 2.6, skin)
      const half = Mask.ellipse(21.6, 16.2, 2.6, 1.8)
      castShadow(s, half, 1, 1)
      half.each((x, y) => {
        const edge = !half.get(x - 1, y) || !half.get(x + 1, y) || !half.get(x, y - 1) || !half.get(x, y + 1)
        s.paint(x, y, edge ? skin : seed, edge ? 3 : (x + y) % 2 === 0 ? 5 : 3)
      })
      // Seared tuna on slate, front left.
      plate(s, { cx: 9.6, cy: 22, rx: 6, ry: 2.4, tones: SLATE, well: 0.7 })
      const seared = s.addRamp(ramp('#8a6a52', { lift: 0.34 }))
      const red = s.addRamp(ramp('#d23848', { lift: 0.42 }))
      const top = Mask.polygon([[6, 20.6], [8, 18.6], [14.4, 19], [13, 21.2]])
      const side = Mask.polygon([[6, 20.6], [13, 21.2], [13, 23], [6, 22.4]]).subtract(top)
      castShadow(s, new Mask().union(top, side), 1, 1)
      side.each((x, y) => s.paint(x, y, red, 4))
      top.each((x, y) => s.paint(x, y, seared, (x + y) % 3 === 0 ? 2 : 4))
      // A palm-sugar cake, front right.
      plate(s, { cx: 22.6, cy: 22.2, rx: 5.4, ry: 2.2, tones: SILVER, well: 0.66 })
      const cake = s.addRamp(ramp('#b07038', { lift: 0.36 }))
      const caramel = s.addRamp(ramp('#7a3c16', { lift: 0.42 }))
      const body = Mask.ellipse(22.6, 21.4, 3.4, 1.4).union(Mask.from((px, py) => py >= 18.4 && py <= 21.4 && Math.abs(px - 22.6) <= 3.4))
      dome(s, body, cake)
      Mask.ellipse(22.6, 18.4, 3.4, 1.4).each((x, y) => s.paint(x, y, caramel, y < 18 ? 5 : 4))
      for (const x of [20, 22, 25]) s.paint(x, 20, caramel, 3)
      // Fallen leaves.
      const leaf = s.addRamp(ramp('#e8902a', { lift: 0.36 }))
      blob(s, 3.6, 17, 1.8, 0.9, 30, leaf)
      blob(s, 15.6, 18.6, 1.8, 0.9, -30, leaf)
      const asparagus = s.addRamp(ramp('#7cb342', { lift: 0.38 }))
      for (const y of [22, 24]) for (let i = 0; i < 5; i++) s.paint(14 + i, y - Math.round(i * 0.3), asparagus, i === 4 ? 2 : 4)
    },
  },
  {
    id: 'feast-10',
    name: 'Grand Feast',
    kind: 'feast',
    grade: 10,
    paint: (s) => {
      // A gold tray heaped with legendary food: a crowned emperor pumpkin, a sunwheat loaf, golden apples, a rainbow koi.
      plate(s, { cy: 23.4, rx: 7.8, ry: 3, tones: GOLD, well: 0.72, depth: 2 })
      // The emperor pumpkin at the back, wearing its crown.
      const pumpkin = s.addRamp(ramp('#ea7a1c', { hueShift: 18, drop: 0.28, lift: 0.38 }))
      const pm = Mask.ellipse(16, 13.6, 5.6, 4.4)
      dome(s, pm, pumpkin, 0.06)
      for (const dx of [-2.6, 0, 2.6]) for (let y = 10; y <= 17; y++) {
        const x = Math.round(16 + dx * Math.sqrt(Math.max(0, 1 - ((y - 13.6) / 5) ** 2)))
        if (pm.get(x, y) && pm.get(x, y - 1) && pm.get(x, y + 1)) s.shift(x, y, -1)
      }
      const crown = s.addRamp(ramp('#f2b51e', { lift: 0.42, drop: 0.34, hueShift: 12, satShift: 0.04 }))
      const ruby = s.addRamp(ramp('#d42a4a', { lift: 0.45 }))
      pix(s, 13, 6, ['a..a..a', 'aa.a.aa', 'abbcbba', 'bbbbbbb'], { a: [crown, 5], b: [crown, 3], c: [ruby, 4] })
      // A sunwheat loaf on the left and golden apples on the right.
      const sun = s.addRamp(ramp('#f2a82a', { lift: 0.5, drop: 0.32, hueShift: 12 }))
      const heart = s.addRamp(ramp('#ff8a1f', { lift: 0.5, hueShift: 12 }))
      const loaf = Mask.circle(10.6, 18, 3.4)
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        loaf.union(Mask.circle(10.6 + Math.cos(a) * 3.4, 18 + Math.sin(a) * 2.8, 1.2))
      }
      dome(s, loaf, sun, 0.1)
      dome(s, Mask.circle(10.6, 18, 1.8), heart, 0.1)
      const gold = s.addRamp(ramp('#efbd25', { lift: 0.5, drop: 0.34, hueShift: 12, satShift: 0.08 }))
      fruit(s, 21.4, 17.6, 2.6, gold)
      fruit(s, 23.6, 19.6, 2.2, gold)
      blob(s, 22.6, 14.6, 1.4, 0.7, -25, s.addRamp(ramp('#a9c43c')))
      // The rainbow koi across the front.
      const koiBack = s.addRamp(ramp('#ff5a4a', { lift: 0.42 }))
      const koiBelly = s.addRamp(ramp('#f2efe9', { lift: 0.4, drop: 0.2 }))
      minnow(s, 15.4, 21.4, koiBack, koiBelly, 5.6, 2, -4)
      const hues = ['#ff5a4a', '#ff9a2a', '#ffd84a', '#5fd36a', '#4aa8ff', '#9b6aff'].map((h) => s.addRamp(ramp(h, { lift: 0.4 })))
      for (let x = 11; x <= 20; x++) for (const y of [20, 21]) if (s.mat[y * 32 + x] === koiBack) s.paint(x, y, hues[Math.min(5, Math.floor((x - 11) / 1.7))] ?? koiBack, s.toneAt(x, y))
      // An ambrosia blossom tucked at the front right.
      const petal = s.addRamp(ramp('#f6b21c', { lift: 0.5, drop: 0.3, hueShift: 10 }))
      pix(s, 21, 21, ['.a.', 'aba', '.a.'], { a: [petal, 4], b: [s.addRamp(ramp('#fff6d8', { lift: 0.5 })), 5] })
      halo(s, 16, 15, 13, 11, '#ffd34d', 90)
      rays(s, 16, 8, 6, 9, [-90, -50, -130], '#ffe27a', 130)
    },
  },
]
