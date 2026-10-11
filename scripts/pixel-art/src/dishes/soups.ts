// Mushrooms → soups (M.DEF). A steaming bowl of soup tinted by the grade's mushroom, with that mushroom floating in it
// (sliced caps, shiitake stars, oyster fans, enoki bundles, chanterelle trumpets, porcini, morels, truffle shavings,
// glowcaps, a reishi shelf). The vessel rises from a clay bowl, a wooden bowl and a bread bowl to an iron pot, a tureen
// with a ladle, gilt porcelain, glowing glass and red lacquer.
import { ramp } from '../color.ts'
import { GLASS, halo, motes, pix, rays, shine } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { COBALT, CLAY, GOLD, IRON, LACQUER, PORCELAIN, SILVER, WOOD, type Bowl, type Dish, type Tones, blob, bowlBody, capsuleLine, fillBowl, steam } from './kit.ts'

const bowlAt = (s: Sprite, tones: Tones, o: Partial<Parameters<typeof bowlBody>[1]> = {}): Bowl => bowlBody(s, { rim: 16.4, rx: 10.6, ry: 5, depth: 8.4, tones, ...o })

/** Fills the bowl with soup: a flat surface, lit at the back left, with a pale swirl of cream if given. */
function soup(s: Sprite, b: Bowl, tones: Tones, o: { swirl?: Tones } = {}): Mask {
  const id = s.addRamp(tones)
  const surface = fillBowl(s, b, id, { bias: 0.12, relief: 0.3 })
  if (o.swirl) {
    const sw = s.addRamp(o.swirl)
    for (const [x, y] of [[12, 16], [13, 15], [14, 15], [15, 15], [16, 16], [15, 17], [14, 17], [13, 17], [17, 17], [18, 17]] as const)
      if (surface.get(x, y)) s.paint(x, y, sw, 4)
  }
  return surface
}

/** A mushroom cut top to bottom, floating: a cap dome over a short stem, pale flesh with a skin edge on the cap. */
function slice(s: Sprite, cx: number, cy: number, flesh: number, skin: number, sc = 1): void {
  const cap = Mask.ellipse(cx, cy, 2.6 * sc, 1.9 * sc).subtract(Mask.from((_px, py) => py > cy + 0.3))
  const stem = Mask.from((px, py) => py > cy && py < cy + 2 * sc && Math.abs(px - cx) < 0.9 * sc)
  const m = new Mask().union(cap, stem)
  shadeDome(s, m, flesh, { relief: 0.5, bias: 0.16, contact: true })
  cap.each((x, y) => {
    if (!cap.get(x, y - 1) || !cap.get(x - 1, y) || !cap.get(x + 1, y)) s.paint(x, y, skin, x + 0.5 < cx ? 4 : 3)
  })
}

/** A whole mushroom bobbing upright in the soup: a domed cap over a short stem, both dome-shaded. */
function whole(s: Sprite, cx: number, cy: number, rx: number, ry: number, stem: number, cap: number, stemId: number): Mask {
  const st = Mask.from((px, py) => py > cy - 0.5 && py < cy + stem && Math.abs(px - cx) < Math.max(0.9, rx * 0.36))
  shadeDome(s, st, stemId, { relief: 0.6, bias: 0.12, contact: true })
  const c = Mask.ellipse(cx, cy, rx, ry).subtract(Mask.from((_px, py) => py > cy + 0.6))
  shadeDome(s, c, cap, { bias: 0.08, contact: true })
  return c
}

export const SOUPS: Dish[] = [
  {
    id: 'dish-mushrooms-1',
    name: 'Button Mushroom Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 1,
    paint: (s) => {
      // A creamy white soup with sliced button mushrooms, in a plain clay bowl.
      const b = bowlAt(s, CLAY)
      soup(s, b, ramp('#e8dcc2', { lift: 0.42, drop: 0.22 }))
      const flesh = s.addRamp(ramp('#f4ecdc', { lift: 0.4, drop: 0.22 }))
      const skin = s.addRamp(ramp('#c8a87a', { lift: 0.3 }))
      whole(s, 18.4, 10.8, 3.4, 2.6, 3.6, s.addRamp(ramp('#efe7da', { lift: 0.35, drop: 0.2, hueShift: 6 })), flesh)
      slice(s, 12.4, 15.6, flesh, skin)
      slice(s, 15.6, 17.8, flesh, skin, 0.9)
      steam(s, [[11, 10, 5], [18, 9, 6]])
    },
  },
  {
    id: 'dish-mushrooms-2',
    name: 'Shiitake Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 2,
    paint: (s) => {
      // A clear amber broth with star-cut shiitake caps and spring onion, in a turned wooden bowl.
      const b = bowlAt(s, WOOD)
      const surface = soup(s, b, ramp('#c48a3e', { lift: 0.42 }))
      const cap = s.addRamp(ramp('#7c4a2a', { lift: 0.32, hueShift: 6 }))
      const cut = s.addRamp(ramp('#efe2c8', { lift: 0.3 }))
      for (const [cx, cy, r] of [[12.4, 15.4, 3], [19.2, 14, 3.4], [16, 17.6, 2.6]] as const) {
        const m = Mask.ellipse(cx, cy, r, r * 0.72)
        shadeDome(s, m, cap, { bias: 0.08, contact: true })
        const x = Math.floor(cx), y = Math.floor(cy)
        pix(s, x - 1, y - 1, ['a.a', '.a.', 'a.a'], { a: [cut, 4] })
      }
      const onion = s.addRamp(ramp('#6fbf4a', { lift: 0.4 }))
      for (const [x, y] of [[15, 14], [22, 17], [10, 17]] as const) if (surface.get(x, y)) pix(s, x, y, ['ab'], { a: [onion, 4], b: [onion, 3] })
      steam(s, [[11, 10, 5], [18, 9, 6]])
    },
  },
  {
    id: 'dish-mushrooms-3',
    name: 'Oyster Mushroom Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 3,
    paint: (s) => {
      // A rustic bread bowl brimming with a pale broth and fans of grey oyster mushrooms.
      const crust = ramp('#c07a34', { lift: 0.38, hueShift: 10 })
      const b = bowlAt(s, crust)
      const lip = s.addRamp(ramp('#efd8a2', { lift: 0.4 }))
      Mask.ellipse(b.cx, b.rim, b.rx, b.ry).subtract(Mask.ellipse(b.cx, b.rim, b.rx - 1.2, b.ry - 0.9)).each((x, y) => s.paint(x, y, lip, y + 0.5 < b.rim ? 3 : 4))
      for (const [x, y] of [[9, 21], [14, 23], [20, 22], [23, 19], [12, 20]] as const) if (b.body.get(x, y)) s.shift(x, y, 1)
      soup(s, b, ramp('#d8cdb4', { lift: 0.42, drop: 0.22 }))
      const cap = s.addRamp(ramp('#8b919b', { lift: 0.36, hueShift: 6, satShift: 0.03 }))
      for (const [cx, cy, rot] of [[12.4, 14.6, -25], [19, 14, 20], [15.8, 17, 0]] as const) {
        const m = Mask.ellipse(cx, cy, 3.6, 2.2, rot).subtract(Mask.ellipse(cx, cy + 2.2, 1.4, 1))
        shadeDome(s, m, cap, { bias: 0.14, contact: true })
        s.paint(Math.round(cx), Math.round(cy + 1), cap, 2)
      }
      steam(s, [[11, 10, 5], [19, 9, 5]])
    },
  },
  {
    id: 'dish-mushrooms-4',
    name: 'Enoki Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 4,
    paint: (s) => {
      // A clear golden broth with a bundle of long white enoki and a slice of egg, in a black iron pot with handles.
      const b = bowlAt(s, IRON, { handles: true })
      soup(s, b, ramp('#e2b44a', { lift: 0.42 }))
      const stem = s.addRamp(ramp('#f1ead6', { lift: 0.36, drop: 0.24 }))
      for (let i = 0; i < 6; i++) {
        const x0 = 10 + i, y0 = 17 + (i % 2)
        for (let k = 0; k < 9; k++) s.paint(x0 + Math.round(k * 0.5), y0 - k, stem, k >= 8 ? 5 : i % 2 === 0 ? 4 : 3)
        s.paint(x0 + 4, y0 - 9, stem, 4)
      }
      const egg = s.addRamp(ramp('#f6f0e2', { lift: 0.4 }))
      const yolk = s.addRamp(ramp('#f2b42a', { lift: 0.4 }))
      shadeDome(s, Mask.ellipse(20.6, 17, 2.4, 1.6), egg, { bias: 0.12, contact: true })
      blob(s, 20.6, 17, 1.2, 0.8, 0, yolk)
      blob(s, 9.6, 17, 1.6, 0.8, 20, s.addRamp(ramp('#5fae3c')))
      steam(s, [[12, 9, 5], [19, 9, 5]])
    },
  },
  {
    id: 'dish-mushrooms-5',
    name: 'Chanterelle Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 5,
    paint: (s) => {
      // A golden chanterelle velouté with a swirl of cream and whole trumpets of chanterelle, in a cobalt-banded bowl.
      const b = bowlAt(s, PORCELAIN, { bands: [[COBALT, 2, 2], [COBALT, 4, 5]] })
      soup(s, b, ramp('#f0a434', { lift: 0.42 }), { swirl: ramp('#fff0d0', { lift: 0.4 }) })
      const chant = s.addRamp(ramp('#f2aa36', { lift: 0.36, hueShift: 8 }))
      for (const [x, y] of [[17, 10], [20, 12], [10, 13]] as const) pix(s, x, y, ['aabbbc', '.bbbc.', '..bc..', '..bc..', '..bc..'], { a: [chant, 5], b: [chant, 4], c: [chant, 2] })
      steam(s, [[12, 10, 5]])
    },
  },
  {
    id: 'dish-mushrooms-6',
    name: 'Porcini Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 6,
    paint: (s) => {
      // A rich brown porcini cream with thick slices of porcini, in a celadon soup bowl with handles.
      const b = bowlAt(s, ramp('#8fbfa8', { lift: 0.4, drop: 0.26 }), { handles: true, foot: 2 })
      soup(s, b, ramp('#9a6a40', { lift: 0.4 }), { swirl: ramp('#e8d2b0', { lift: 0.4 }) })
      const flesh = s.addRamp(ramp('#efe0bc', { lift: 0.36, drop: 0.24 }))
      const capT = s.addRamp(ramp('#8b5230', { lift: 0.3, hueShift: 6 }))
      whole(s, 18.6, 10.2, 3.8, 2.8, 4.4, capT, flesh)
      slice(s, 12.6, 15.8, flesh, capT, 1)
      steam(s, [[11, 10, 5], [17, 9, 5]])
    },
  },
  {
    id: 'dish-mushrooms-7',
    name: 'Morel Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 7,
    paint: (s) => {
      // A pale cream soup with honeycombed morels, served from a lidless tureen with a silver ladle.
      const b = bowlAt(s, PORCELAIN, { handles: true, foot: 2, bands: [[ramp('#8a5aa8', { lift: 0.36 }), 3, 3], [GOLD, 5, 5]] })
      soup(s, b, ramp('#ecdcb4', { lift: 0.42, drop: 0.22 }))
      const ridge = s.addRamp(ramp('#a8814e', { lift: 0.32, hueShift: 6 }))
      const pit = s.addRamp(ramp('#4c3420', { lift: 0.2 }))
      for (const [cx, cy] of [[12.4, 13.6], [16.8, 14.4]] as const) {
        const m = Mask.ellipse(cx, cy, 2.2, 3.6).subtract(Mask.from((_px, py) => py > cy + 2))
        shadeDome(s, m, ridge, { bias: 0.12, contact: true })
        m.each((x, y) => {
          if ((x + y * 2) % 3 === 0 && m.get(x, y - 1) && m.get(x, y + 1)) s.paint(x, y, pit, 2)
        })
      }
      capsuleLine(s, 21, 16.4, 26, 9, 0.7, s.addRamp(SILVER))
      steam(s, [[13, 9, 4]])
    },
  },
  {
    id: 'dish-mushrooms-8',
    name: 'Truffle Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 8,
    paint: (s) => {
      // A velvety ivory soup under fine shavings of black truffle, in a footed porcelain bowl with a gilt lip.
      const b = bowlAt(s, PORCELAIN, { gilt: GOLD, foot: 2, bands: [[ramp('#2c2a3a', { lift: 0.3 }), 3, 4]] })
      soup(s, b, ramp('#efe4c8', { lift: 0.42, drop: 0.22 }))
      const truffle = s.addRamp(ramp('#3a2a26', { lift: 0.36, hueShift: 10 }))
      const vein = s.addRamp(ramp('#ece0cc', { lift: 0.3 }))
      shadeDome(s, Mask.ellipse(19.4, 13.6, 3.2, 2.8), truffle, { bias: 0.04, contact: true })
      for (const [x, y] of [[18, 13], [20, 12], [19, 15], [21, 14]] as const) s.shift(x, y, 1)
      for (const [cx, cy] of [[11.8, 15.2], [15.2, 15], [14, 17.6]] as const) {
        const m = Mask.ellipse(cx, cy, 2.2, 1.4)
        m.each((x, y) => s.paint(x, y, truffle, x + 0.5 < cx ? 4 : 3))
        s.paint(Math.floor(cx), Math.floor(cy), vein, 3)
      }
      const chive = s.addRamp(ramp('#5fae3c'))
      pix(s, 18, 12, ['a.', '.a'], { a: [chive, 4] })
      steam(s, [[11, 10, 5], [18, 9, 5]])
    },
  },
  {
    id: 'dish-mushrooms-9',
    name: 'Glowcap Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 9,
    paint: (s) => {
      // A luminous cyan broth with tiny glowcaps bobbing in it, in a footed bowl of clear glass.
      const b = bowlAt(s, GLASS, { foot: 2, rx: 9.8, gilt: SILVER })
      const glow = ramp('#2fd6ec', { lift: 0.5, drop: 0.3, hueShift: 6 })
      const inner = s.addRamp(glow)
      b.body.each((x, y) => {
        if (y > b.rim + 1 && y < b.rim + 6 && b.body.get(x - 1, y) && b.body.get(x + 1, y)) s.paint(x, y, inner, 4)
      })
      soup(s, b, glow)
      const capId = s.addRamp(ramp('#b8fbff', { lift: 0.5, drop: 0.24 }))
      const stemG = s.addRamp(ramp('#cfeef0', { lift: 0.4, drop: 0.24, hueShift: 4 }))
      whole(s, 18.4, 10.6, 3.2, 2.4, 4, capId, stemG)
      whole(s, 12.8, 12.6, 2.4, 1.8, 3, capId, stemG)
      shine(s, b.body, { from: Math.round(b.rim) + 2, alpha: 120 })
      halo(s, 16, 16, 12.5, 10, '#6ee7ff', 85)
      motes(s, [[12, 8], [20, 6], [24, 9]], '#d8fbff', 200)
    },
  },
  {
    id: 'dish-mushrooms-10',
    name: 'King Reishi Soup',
    kind: 'planet',
    family: 'mushrooms',
    grade: 10,
    paint: (s) => {
      // A deep ruby reishi broth with a lacquered reishi shelf, in a red lacquer bowl with a gold lip and foot.
      const b = bowlAt(s, LACQUER, { gilt: GOLD, foot: 2, rx: 9.8, bands: [[GOLD, 5, 5]] })
      soup(s, b, ramp('#7a2a1e', { lift: 0.42, hueShift: 8 }))
      const lacq = s.addRamp(ramp('#b8341c', { lift: 0.4, hueShift: 8, satShift: 0.04 }))
      const rim = s.addRamp(ramp('#f8cc56', { lift: 0.45, hueShift: 6 }))
      const shelf = Mask.ellipse(17, 14, 5.6, 3.4).subtract(Mask.from((_px, py) => py > 15.4))
      shadeDome(s, shelf, lacq, { bias: 0.1, contact: true })
      shelf.each((x, y) => {
        if (!shelf.get(x, y - 1) || !shelf.get(x - 1, y) || !shelf.get(x + 1, y)) s.paint(x, y, rim, y < 14 ? 5 : 4)
      })
      for (const [y, x0, x1] of [[13, 13, 20], [12, 14, 19]] as const) for (let x = x0; x <= x1; x++) if (shelf.get(x, y) && (x + y) % 2 === 0) s.shift(x, y, -1)
      halo(s, 16, 16, 12.5, 10, '#ffb84d', 85)
      rays(s, 16, 14, 9, 12, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
