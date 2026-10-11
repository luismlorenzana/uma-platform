// Nuts & Seeds → cookies (Limit Break charge). A plate of cookies baked with the grade's nut or seed and wearing it on
// top: peanut crosshatch, striped sunflower seeds, sesame, walnut halves, chestnut-shaped bakes, almond crescents,
// green pistachio, white-chocolate macadamia, thunder-iced violet cookies and leaf-shaped worldseed cookies.
import { ramp } from '../color.ts'
import { halo, motes, pix, rays, scatter } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CLAY, COBALT, CREAMWARE, GOLD, LINEN, PORCELAIN, SILVER, WOOD, type Dish, type Tones, castShadow, cloth, plate } from './kit.ts'

/** A round cookie lying flat: an evenly lit top with a baked crackle, a thin darker edge below. Returns its top. */
function cookie(s: Sprite, cx: number, cy: number, id: number, o: { rx?: number; ry?: number; thick?: number; crackle?: number } = {}): Mask {
  const rx = o.rx ?? 4.9, ry = o.ry ?? 2.9, thick = o.thick ?? 1.4
  const top = Mask.ellipse(cx, cy, rx, ry)
  const side = Mask.ellipse(cx, cy + thick, rx, ry).subtract(top)
  castShadow(s, new Mask().union(top, side), 1, 1)
  side.each((x, y) => s.paint(x, y, id, x + 0.5 < cx - rx * 0.4 ? 3 : 2))
  const painted = new Mask()
  top.each((x, y) => {
    if (s.filled(x, y)) painted.set(x, y)
  })
  top.each((x, y) => {
    const ul = !top.get(x, y - 1) || !top.get(x - 1, y)
    const dr = !top.get(x, y + 1) || !top.get(x + 1, y)
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    // Where this cookie's edge lies over another, a dark contact line separates them.
    const over = [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([dx, dy]) => !top.get(x + (dx ?? 0), y + (dy ?? 0)) && painted.get(x + (dx ?? 0), y + (dy ?? 0)))
    s.paint(x, y, id, over && !ul ? 1 : ul && lit < -0.5 ? 5 : ul && lit < 0.3 ? 4 : dr && lit > 0 ? 2 : lit < -0.2 ? 4 : 3)
  })
  const cracks = o.crackle ?? 3
  for (const [x, y] of scatter(`cookie-${cx}-${cy}`, top, cracks)) if (s.toneAt(x, y) > 2) s.shift(x, y, -1)
  return top
}

/** Lays several cookies back to front; `top` decorates each (given its center and top mask). */
function batch(s: Sprite, dough: Tones, spots: readonly (readonly [number, number])[], top?: (cx: number, cy: number, m: Mask, i: number) => void, o: { rx?: number; ry?: number; thick?: number } = {}): void {
  const id = s.addRamp(dough)
  ;[...spots].sort((a, b) => a[1] - b[1]).forEach(([cx, cy], i) => {
    const m = cookie(s, cx, cy, id, o)
    top?.(cx, cy, m, i)
  })
}

/** The usual heap: two cookies at the back, two in front, one leaning on top. */
const HEAP: readonly (readonly [number, number])[] = [[10.6, 16], [21.4, 15.8], [16, 20.4]]

export const COOKIES: Dish[] = [
  {
    id: 'dish-nuts-seeds-1',
    name: 'Peanut Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 1,
    paint: (s) => {
      // Fork-pressed peanut butter cookies, a peanut in the shell beside them, on a clay plate.
      plate(s, { cy: 21.6, rx: 12.4, ry: 5, tones: CLAY, well: 0.7 })
      batch(s, ramp('#d8a45a', { lift: 0.4, hueShift: 8 }), HEAP, (cx, cy, m) => {
        for (const [dx, dy] of [[-3, -1], [-1, -1], [1, -1], [3, -1], [-2, 1], [0, 1], [2, 1]] as const) {
          const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy
          if (m.get(x, y)) s.shift(x, y, -2)
        }
      })
      const shell = s.addRamp(ramp('#d5aa6a', { lift: 0.3, hueShift: 6 }))
      shadeDome(s, Mask.circle(24.4, 23, 1.6).union(Mask.circle(26.2, 22, 1.5)), shell, { bias: 0.1 })
    },
  },
  {
    id: 'dish-nuts-seeds-2',
    name: 'Sunflower Seed Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 2,
    paint: (s) => {
      // Oat-coloured cookies studded with striped sunflower seeds, on a linen napkin.
      cloth(s, [[3.5, 21], [13, 15.5], [28.5, 19.5], [19, 26.5]], LINEN, { pattern: 'plain' })
      const dark = s.addRamp(ramp('#38343a', { lift: 0.32, hueShift: 4 }))
      const stripe = s.addRamp(ramp('#ece6d6', { lift: 0.3, drop: 0.2 }))
      batch(s, ramp('#cf9a52', { lift: 0.4, hueShift: 8 }), HEAP, (cx, cy) => {
        for (const [dx, dy] of [[-3, -1], [1, -1], [-1, 1], [2, 0], [-3, 1]] as const) {
          const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy
          s.paint(x, y, dark, 3)
          s.paint(x + 1, y, stripe, 4)
        }
      })
    },
  },
  {
    id: 'dish-nuts-seeds-3',
    name: 'Sesame Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 3,
    paint: (s) => {
      // Crisp golden cookies rolled in white and black sesame, on a cobalt-banded plate.
      plate(s, { cy: 21.6, rx: 12.4, ry: 5, tones: PORCELAIN, band: COBALT, well: 0.66 })
      const white = s.addRamp(ramp('#f3e6c2', { lift: 0.35, drop: 0.28 }))
      const black = s.addRamp(ramp('#3a3230', { lift: 0.3 }))
      batch(s, ramp('#e0aa50', { lift: 0.42, hueShift: 10 }), HEAP, (cx, _cy, m) => {
        for (const [i, [x, y]] of scatter(`sesame-${cx}`, m, 12).entries()) s.paint(x, y, i % 4 === 0 ? black : white, i % 4 === 0 ? 3 : 5)
      })
    },
  },
  {
    id: 'dish-nuts-seeds-4',
    name: 'Walnut Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 4,
    paint: (s) => {
      // Brown-butter cookies each crowned with a wrinkled walnut half, on a wooden board.
      plate(s, { cy: 21.8, rx: 12.6, ry: 4.8, tones: WOOD, well: 0, depth: 2 })
      const nut = s.addRamp(ramp('#b9884e', { lift: 0.4, hueShift: 6 }))
      batch(s, ramp('#e2b878', { lift: 0.42, hueShift: 8 }), HEAP, (cx, cy) => {
        // A walnut half: two wrinkled lobes either side of a groove.
        const m = Mask.ellipse(cx, cy - 0.8, 2.8, 2)
        shadeDome(s, m, nut, { bias: 0.14, contact: true })
        const x = Math.floor(cx), y = Math.floor(cy - 0.8)
        for (const [px, py] of [[x, y - 1], [x, y], [x, y + 1]] as const) if (m.get(px, py)) s.paint(px, py, nut, 2)
        for (const [px, py] of [[x - 2, y], [x + 1, y - 1], [x + 2, y + 1]] as const) if (m.get(px, py)) s.shift(px, py, -1)
      })
    },
  },
  {
    id: 'dish-nuts-seeds-5',
    name: 'Chestnut Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 5,
    paint: (s) => {
      // Little chestnut-shaped bakes, glossy brown tops dipped in pale crumbs, on a creamware plate.
      plate(s, { cy: 21.6, rx: 12.4, ry: 5, tones: CREAMWARE, well: 0.7 })
      const shell = s.addRamp(ramp('#7a3418', { lift: 0.42, hueShift: 8, satShift: 0.04 }))
      const base = s.addRamp(ramp('#e8cfa0', { lift: 0.32, drop: 0.24 }))
      for (const [cx, cy] of [[11, 16.6], [21, 16.4], [16, 20.4]] as const) {
        const body = Mask.ellipse(cx, cy, 4, 3.4).union(Mask.polygon([[cx - 3.2, cy - 1.4], [cx, cy - 5.4], [cx + 3.2, cy - 1.4]]))
        castShadow(s, body, 1, 1)
        shadeDome(s, body, (_x, y) => (y + 0.5 > cy + 1 ? base : shell), { bias: 0.08, contact: true })
        s.paint(Math.floor(cx) - 1, Math.floor(cy) - 2, shell, 5)
      }
    },
  },
  {
    id: 'dish-nuts-seeds-6',
    name: 'Almond Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 6,
    paint: (s) => {
      // Pale almond cookies, each pressed with a whole almond, on a celadon plate.
      plate(s, { cy: 21.6, rx: 12.4, ry: 5, tones: ramp('#86bfa0', { lift: 0.4, drop: 0.26 }), well: 0.7 })
      const almond = s.addRamp(ramp('#d29a5c', { lift: 0.4, hueShift: 6 }))
      batch(s, ramp('#f0d49a', { lift: 0.45, hueShift: 8 }), HEAP, (cx, cy) => {
        const m = Mask.ellipse(cx + 0.2, cy - 0.4, 2.8, 1.5, -20)
        shadeDome(s, m, almond, { bias: 0.18, contact: true })
      })
    },
  },
  {
    id: 'dish-nuts-seeds-7',
    name: 'Pistachio Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 7,
    paint: (s) => {
      // Soft green pistachio cookies dusted with chopped nuts, on a rose porcelain plate with a gold edge.
      plate(s, { cy: 21.6, rx: 12.4, ry: 5, tones: ramp('#ecc8cc', { lift: 0.45, drop: 0.24 }), edge: GOLD, well: 0.7 })
      const green = s.addRamp(ramp('#86b83e', { lift: 0.4 }))
      const skin = s.addRamp(ramp('#8c4a62'))
      batch(s, ramp('#b8cc72', { lift: 0.42, hueShift: 6 }), HEAP, (cx, _cy, m) => {
        for (const [i, [x, y]] of scatter(`pist-${cx}`, m, 8).entries()) s.paint(x, y, i === 0 ? skin : green, i === 0 ? 3 : 5)
      })
    },
  },
  {
    id: 'dish-nuts-seeds-8',
    name: 'Macadamia Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 8,
    paint: (s) => {
      // A tall stack of golden white-chocolate macadamia cookies on a silver-rimmed plate, more fanned in front.
      plate(s, { cy: 22, rx: 12.4, ry: 4.8, tones: PORCELAIN, edge: SILVER, well: 0.7 })
      const id = s.addRamp(ramp('#e0a650', { lift: 0.42, hueShift: 10 }))
      const nut = s.addRamp(ramp('#f1e2bc', { lift: 0.3, drop: 0.24 }))
      const choc = s.addRamp(ramp('#fbf4e6', { lift: 0.4, drop: 0.2 }))
      const deco = (m: Mask, seed: string) => {
        for (const [i, [x, y]] of scatter(seed, m, 4).entries()) {
          s.paint(x, y, i % 2 === 0 ? nut : choc, 5)
          if (i % 2 === 0 && m.get(x + 1, y)) s.paint(x + 1, y, nut, 3)
        }
      }
      for (const [cx, cy] of [[9.6, 20.6], [22.4, 20.6]] as const) deco(cookie(s, cx, cy, id, { rx: 4.4, ry: 2.6 }), `mac-${cx}`)
      for (let k = 0; k < 4; k++) deco(cookie(s, 16, 20.4 - k * 2.4, id, { rx: 5, ry: 2.6, thick: 1.8 }), `mac-stack-${k}`)
    },
  },
  {
    id: 'dish-nuts-seeds-9',
    name: 'Thundernut Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 9,
    paint: (s) => {
      // Violet thundernut cookies iced with yellow lightning bolts on a dark gilt plate, crackling.
      plate(s, { cy: 21.8, rx: 7.4, ry: 3.4, tones: ramp('#2a2450', { lift: 0.36, drop: 0.3 }), edge: GOLD, well: 0.7, depth: 2 })
      const id = s.addRamp(ramp('#7a44c4', { lift: 0.34, drop: 0.3, hueShift: 6 }))
      const bolt = s.addRamp(ramp('#ffd21a', { lift: 0.4, drop: 0.24, hueShift: 4 }))
      // Three violet cookies, each iced with a yellow lightning bolt.
      for (const [cx, cy] of [[11.2, 16.2], [20.8, 16], [16, 20]] as const) {
        cookie(s, cx, cy, id, { rx: 4.4, ry: 2.7, thick: 1.6 })
        pix(s, Math.floor(cx) - 1, Math.floor(cy) - 2, ['..b', '.ab', 'aa.', 'a..'], { a: [bolt, 3], b: [bolt, 4] })
      }
      halo(s, 16, 16, 12, 10, '#b48aff', 85)
      motes(s, [[11, 9], [21, 8], [24, 14]], '#fff6a0', 220)
    },
  },
  {
    id: 'dish-nuts-seeds-10',
    name: 'Worldseed Cookies',
    kind: 'planet',
    family: 'nuts-seeds',
    grade: 10,
    paint: (s) => {
      // Leaf-shaped worldseed cookies glazed green and gold around a sprouting seed, on a gold plate.
      plate(s, { cy: 23.4, rx: 7.8, ry: 3.2, tones: GOLD, well: 0.7, depth: 2 })
      const leaf = s.addRamp(ramp('#9fd34a', { lift: 0.5, drop: 0.3, hueShift: 10 }))
      const gold = s.addRamp(ramp('#ffd24a', { lift: 0.55, drop: 0.26, hueShift: 6 }))
      for (const [cx, cy, rot] of [[11.6, 19.6, 30], [20.4, 19.6, -30], [12.4, 15.6, -25], [19.6, 15.6, 25]] as const) {
        const m = Mask.ellipse(cx, cy, 3.8, 2.2, rot)
        castShadow(s, m, 1, 1)
        shadeDome(s, m, leaf, { bias: 0.1, contact: true })
        const a = (rot * Math.PI) / 180
        for (let t = -2.6; t <= 2.6; t += 0.5) {
          const x = Math.floor(cx + t * Math.cos(a)), y = Math.floor(cy + t * Math.sin(a))
          if (m.get(x, y)) s.paint(x, y, gold, 4)
        }
      }
      const seed = s.addRamp(ramp('#9fd34a', { lift: 0.5, drop: 0.3, hueShift: 10 }))
      shadeDome(s, Mask.ellipse(16, 18, 2.6, 3), seed, { bias: 0.08, contact: true })
      pix(s, 15, 16, ['a.', '.a', 'a.'], { a: [gold, 5] })
      const sprout = s.addRamp(ramp('#6fdc5a', { lift: 0.4 }))
      pix(s, 15, 11, ['aa.bb', '.aab.', '..c..', '..c..'], { a: [sprout, 4], b: [sprout, 3], c: [sprout, 2] })
      halo(s, 16, 16, 12.5, 10.5, '#d8ff7a', 85)
      rays(s, 16, 13, 7, 10, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
