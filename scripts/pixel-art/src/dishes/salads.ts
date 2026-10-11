// Vegetables → salads (DEF). A bowl heaped with leafy greens, the grade's vegetable on top in its own cut: carrot
// shreds, a creamy potato salad, coleslaw, red onion rings, tomato wedges, three-colour pepper rings, grilled eggplant in
// a glass bowl, asparagus spears, golden carrot ribbons, and finally a salad served in an emperor pumpkin.
import { ramp } from '../color.ts'
import { GLASS, halo, motes, pix, rays, scatter, shine } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CELADON, CLAY, COBALT, CREAMWARE, GOLD, PORCELAIN, SILVER, WOOD, type Bowl, type Dish, type Tones, blob, bowlBody, fillBowl } from './kit.ts'

const LETTUCE = ramp('#7cc04a', { lift: 0.38, hueShift: 8 })
const DARK_LEAF = ramp('#3f8f3a', { lift: 0.34, hueShift: 8 })

const bowlAt = (s: Sprite, tones: Tones, o: Partial<Parameters<typeof bowlBody>[1]> = {}): Bowl => bowlBody(s, { rim: 17, rx: 10.6, ry: 4.6, depth: 8, tones, ...o })

/** A heap of torn leaves: two greens in irregular patches, with frilly leaf tips breaking the outline. */
function greens(s: Sprite, b: Bowl, o: { mound?: number; light?: Tones; dark?: Tones } = {}): Mask {
  const light = s.addRamp(o.light ?? LETTUCE), dark = s.addRamp(o.dark ?? DARK_LEAF)
  const heap = fillBowl(s, b, (x, y) => ((Math.floor(x / 3) * 5 + Math.floor((y + x) / 2) * 3) % 4 === 0 ? dark : light), { mound: o.mound ?? 3.2, bias: 0.14, relief: 0.9 })
  // Leaf edges: darker veins between patches.
  heap.each((x, y) => {
    if ((x * 7 + y * 13) % 11 === 0 && s.toneAt(x, y) > 2) s.shift(x, y, -1)
  })
  // Frilly tips poking out over the rim.
  for (const [dx, dy, rot] of [[-9, -0.6, 30], [8.8, -1, -30], [-5, -4, 10], [4.6, -4.2, -15]] as const)
    blob(s, b.cx + dx, b.rim + dy, 2, 1.1, rot, (dx + dy) % 2 === 0 ? dark : light, { bias: 0.1 })
  return heap
}

/** A ring slice (onion, pepper): a band around a hole. */
function ringSlice(s: Sprite, cx: number, cy: number, rx: number, ry: number, id: number, inner?: number): void {
  const outer = Mask.ellipse(cx, cy, rx, ry)
  const hole = Mask.ellipse(cx, cy, rx * 0.5, ry * 0.45)
  outer.subtract(hole)
  outer.each((x, y) => {
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    const touchesHole = hole.get(x - 1, y) || hole.get(x + 1, y) || hole.get(x, y - 1) || hole.get(x, y + 1)
    const rim = !outer.get(x - 1, y) || !outer.get(x + 1, y) || !outer.get(x, y - 1) || !outer.get(x, y + 1)
    s.paint(x, y, touchesHole && inner !== undefined ? inner : id, touchesHole ? 4 : rim && lit > 0 ? 2 : lit < -0.4 ? 4 : 3)
  })
}

export const SALADS: Dish[] = [
  {
    id: 'dish-vegetables-1',
    name: 'Carrot Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 1,
    paint: (s) => {
      // Greens heaped in a plain wooden bowl, topped with a tangle of bright carrot shreds.
      const b = bowlAt(s, WOOD)
      greens(s, b)
      const carrot = s.addRamp(ramp('#f07a1f', { lift: 0.38, hueShift: 8 }))
      const core = s.addRamp(ramp('#f9a640', { lift: 0.42 }))
      for (const [cx, cy] of [[12, 14], [17.4, 13], [20.6, 15.4], [14.8, 16.2], [10, 16.6]] as const) {
        const m = Mask.ellipse(cx, cy, 2.2, 1.5)
        m.each((x, y) => {
          const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
          s.paint(x, y, edge ? carrot : core, edge ? (y + 0.5 < cy ? 4 : 3) : 4)
        })
        s.paint(Math.floor(cx) - 1, Math.floor(cy) - 1, carrot, 5)
      }
      // A few shreds tucked between the coins.
      for (const [x, y] of [[15, 12], [19, 17], [9, 14]] as const) {
        s.paint(x, y, carrot, 4)
        s.paint(x + 1, y + 1, carrot, 3)
      }
    },
  },
  {
    id: 'dish-vegetables-2',
    name: 'Potato Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 2,
    paint: (s) => {
      // A creamy potato salad of pale chunks flecked with chives, in a clay bowl, a lettuce leaf tucked at the side.
      const b = bowlAt(s, CLAY)
      const potato = s.addRamp(ramp('#efd890', { lift: 0.42, hueShift: 6 }))
      const heap = fillBowl(s, b, potato, { mound: 3.6, bias: 0.16, relief: 0.9 })
      // Chunky cubes: lit tops and shaded right faces.
      for (const [x, y] of [[11, 14], [14, 13], [17, 13], [20, 14], [12, 17], [15, 16], [18, 16], [21, 17], [9, 17]] as const) {
        if (!heap.get(x, y)) continue
        pix(s, x, y, ['ab', 'bc'], { a: [potato, 5], b: [potato, 4], c: [potato, 2] })
      }
      const chive = s.addRamp(ramp('#4f9a3a', { lift: 0.3 }))
      for (const [x, y] of scatter('chive', heap, 7)) s.paint(x, y, chive, 4)
      blob(s, 6.8, 16.2, 2.2, 1.2, 30, s.addRamp(LETTUCE), { bias: 0.1 })
    },
  },
  {
    id: 'dish-vegetables-3',
    name: 'Cabbage Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 3,
    paint: (s) => {
      // A crunchy slaw of finely shredded pale green and purple cabbage, in a creamware bowl.
      const b = bowlAt(s, CREAMWARE)
      const green = s.addRamp(ramp('#b9db78', { lift: 0.42, hueShift: 6 }))
      const purple = s.addRamp(ramp('#8a3a8a', { lift: 0.4 }))
      const heap = fillBowl(s, b, green, { mound: 3.2, bias: 0.16, relief: 0.8 })
      heap.each((x, y) => {
        const k = (x * 2 + y * 3) % 7
        if (k === 0) s.shift(x, y, -1)
        if (k === 3 && (x + y) % 2 === 0) s.paint(x, y, purple, s.toneAt(x, y))
      })
      const carrot = s.addRamp(ramp('#f07a1f', { lift: 0.38 }))
      for (const [x, y] of scatter('slaw-carrot', heap, 5)) s.paint(x, y, carrot, 4)
    },
  },
  {
    id: 'dish-vegetables-4',
    name: 'Onion Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 4,
    paint: (s) => {
      // Greens under rings of red onion, in a white enamel bowl with a blue rim.
      const b = bowlAt(s, ramp('#e8ecef', { lift: 0.5, drop: 0.22 }), { gilt: ramp('#3a64b0', { lift: 0.36 }) })
      greens(s, b)
      const onion = s.addRamp(ramp('#9a2f78', { lift: 0.42 }))
      const pale = s.addRamp(ramp('#efe4f0', { lift: 0.4, drop: 0.2 }))
      ringSlice(s, 12.4, 14.2, 3.6, 2.4, onion, pale)
      ringSlice(s, 19, 13.6, 3.6, 2.4, onion, pale)
      ringSlice(s, 15.8, 16.8, 3.6, 2.4, onion, pale)
    },
  },
  {
    id: 'dish-vegetables-5',
    name: 'Tomato Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 5,
    paint: (s) => {
      // Juicy tomato wedges and basil over greens, in a porcelain bowl with cobalt bands.
      const b = bowlAt(s, PORCELAIN, { bands: [[COBALT, 2, 3], [COBALT, 5, 5]] })
      greens(s, b, { mound: 2.6 })
      const tomato = s.addRamp(ramp('#e0402f', { lift: 0.4 }))
      const seed = s.addRamp(ramp('#f2c46a', { lift: 0.4 }))
      for (const [cx, cy, rot] of [[12, 14.4, 20], [17, 13.2, -10], [20.6, 15.6, -30], [14.6, 16.8, 10]] as const) {
        const m = Mask.ellipse(cx, cy, 2.8, 1.8, rot)
        shadeDome(s, m, tomato, { bias: 0.14, contact: true })
        s.paint(Math.floor(cx), Math.floor(cy), seed, 4)
      }
      const basil = s.addRamp(ramp('#3aa845', { lift: 0.34, hueShift: 10 }))
      blob(s, 18, 11.6, 1.8, 1, -30, basil, { bias: 0.14, contact: true })
    },
  },
  {
    id: 'dish-vegetables-6',
    name: 'Bell Pepper Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 6,
    paint: (s) => {
      // Rings of red, yellow and green bell pepper over greens, in a celadon bowl.
      const b = bowlAt(s, CELADON, { bands: [[ramp('#4f8a72', { lift: 0.3 }), 3, 3]] })
      greens(s, b)
      ringSlice(s, 12.2, 14.4, 3.6, 2.4, s.addRamp(ramp('#d8302a', { lift: 0.36 })))
      ringSlice(s, 19, 13.6, 3.6, 2.4, s.addRamp(ramp('#f2c22a', { lift: 0.38 })))
      ringSlice(s, 15.6, 16.8, 3.6, 2.4, s.addRamp(ramp('#2f8a30', { lift: 0.4 })))
    },
  },
  {
    id: 'dish-vegetables-7',
    name: 'Eggplant Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 7,
    paint: (s) => {
      // Grilled eggplant rounds, striped with char, over greens in a clear glass bowl.
      const b = bowlAt(s, GLASS)
      // The salad shows through the glass.
      const light = s.addRamp(ramp('#9fd070', { lift: 0.4 }))
      b.body.each((x, y) => {
        if (y > b.rim + 1 && y < b.rim + 6 && b.body.get(x - 1, y) && b.body.get(x + 1, y)) s.paint(x, y, light, (x + y) % 3 === 0 ? 3 : 4)
      })
      greens(s, b, { mound: 2.6 })
      const skin = s.addRamp(ramp('#5b2b78', { lift: 0.38, hueShift: 6 }))
      const flesh = s.addRamp(ramp('#ece0b8', { lift: 0.36, drop: 0.24 }))
      for (const [cx, cy] of [[12.2, 14.6], [18.6, 13.8], [15.6, 16.8]] as const) {
        const m = Mask.ellipse(cx, cy, 3.2, 2.2)
        m.each((x, y) => {
          const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
          s.paint(x, y, edge ? skin : flesh, edge ? 3 : (x - y) % 3 === 0 ? 2 : x + 0.5 < cx ? 5 : 4)
        })
      }
      shine(s, b.body, { from: Math.round(b.rim) + 2, alpha: 130 })
    },
  },
  {
    id: 'dish-vegetables-8',
    name: 'Asparagus Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 8,
    paint: (s) => {
      // Asparagus spears laid in a fan over greens, shaved cheese and a plum dressing, in a footed silver-rimmed bowl.
      const b = bowlAt(s, PORCELAIN, { gilt: SILVER, foot: 2, bands: [[ramp('#7d3b94', { lift: 0.36 }), 3, 4]] })
      greens(s, b, { mound: 2.4, light: ramp('#4f9a3a', { lift: 0.3 }), dark: ramp('#2f6a34', { lift: 0.3 }) })
      const spear = s.addRamp(ramp('#9ccf4a', { lift: 0.4, hueShift: 8 }))
      const tip = s.addRamp(ramp('#9a62c0', { hueShift: 8, lift: 0.36 }))
      for (const [x0, y0, x1, y1] of [[7, 15, 19, 9], [9, 17.4, 22, 11.6], [11, 19, 24.6, 14.6]] as const) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let i = 0; i <= n; i++) {
          const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n)
          const end = i >= n - 2
          s.paint(x, y - 1, end ? tip : spear, end ? 4 : 5)
          s.paint(x, y, end ? tip : spear, end ? 3 : 3)
          s.paint(x, y + 1, end ? tip : spear, 1)
        }
        s.paint(x1 + 1, y1 - 1, tip, 4)
      }
      const cheese = s.addRamp(ramp('#f4ecd0', { lift: 0.4 }))
      for (const [x, y] of [[14, 12], [18, 14], [11, 15]] as const) s.paint(x, y, cheese, 5)
    },
  },
  {
    id: 'dish-vegetables-9',
    name: 'Golden Carrot Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 9,
    paint: (s) => {
      // Curls of golden carrot ribbon heaped on greens, in a footed bowl with a gold lip.
      const b = bowlAt(s, PORCELAIN, { gilt: GOLD, foot: 2, rx: 9.8, bands: [[GOLD, 4, 4]] })
      greens(s, b, { mound: 2.4 })
      const gold = s.addRamp(ramp('#eda81c', { lift: 0.42, drop: 0.34, hueShift: 12, satShift: 0.02 }))
      for (const [cx, cy] of [[12.6, 13.8], [17.6, 12.8], [15.4, 15.6], [20.2, 15]] as const) {
        const ring = Mask.ellipse(cx, cy, 2.4, 1.6).subtract(Mask.ellipse(cx + 0.3, cy + 0.2, 1, 0.6))
        ring.each((x, y) => s.paint(x, y, gold, y + 0.5 < cy ? 5 : x + 0.5 < cx ? 4 : 3))
      }
      const leaf = s.addRamp(ramp('#a9c43c', { lift: 0.36 }))
      pix(s, 17, 9, ['a.a', '.a.'], { a: [leaf, 4] })
      halo(s, 16, 16, 12.5, 10, '#ffd34d', 80)
      motes(s, [[11, 8], [22, 7], [25, 17]], '#fff1a6', 200)
    },
  },
  {
    id: 'dish-vegetables-10',
    name: 'Emperor Pumpkin Salad',
    kind: 'planet',
    family: 'vegetables',
    grade: 10,
    paint: (s) => {
      // A salad served in a hollowed emperor pumpkin, its ribs glowing orange, a little gold crown at its rim.
      const pumpkin = s.addRamp(ramp('#ea7a1c', { hueShift: 18, drop: 0.28, lift: 0.36 }))
      const cx = 16, rim = 16.4, rx = 8.8, ry = 4.4
      const body = Mask.ellipse(cx, rim + 1.6, rx, 8).subtract(Mask.from((_px, py) => py < rim))
      body.union(Mask.ellipse(cx, rim, rx, ry))
      shadeDome(s, body, pumpkin, { relief: 1 })
      // Ribs: darker grooves curving down the body.
      for (const k of [-0.62, -0.25, 0.12, 0.5]) for (let y = Math.ceil(rim + 1); y < rim + 9; y++) {
        const t = (y - rim) / 9
        const x = Math.round(cx + k * rx * Math.sqrt(Math.max(0, 1 - t * t * 0.6)))
        if (body.get(x, y)) s.shift(x, y, -1)
      }
      const b: Bowl = { body, opening: Mask.ellipse(cx, rim, rx - 1.2, ry - 0.9), id: pumpkin, cx, rim, rx, ry }
      Mask.ellipse(cx, rim, rx, ry).each((x, y) => s.paint(x, y, pumpkin, y + 0.5 < rim ? 3 : 4))
      b.opening.each((x, y) => s.paint(x, y, pumpkin, 1))
      const heap = greens(s, b, { mound: 2.6 })
      const cube = s.addRamp(ramp('#f2861e', { lift: 0.42 }))
      for (const [x, y] of [[12, 14], [17, 13], [20, 15], [14, 16]] as const) if (heap.get(x, y)) pix(s, x, y, ['ab', 'bc'], { a: [cube, 5], b: [cube, 4], c: [cube, 2] })
      const crown = s.addRamp(ramp('#f2b51e', { lift: 0.42, drop: 0.34, hueShift: 12, satShift: 0.04 }))
      const ruby = s.addRamp(ramp('#d42a4a', { lift: 0.45 }))
      pix(s, 19, 8, ['a.a.a', 'abcba', 'bbbbb'], { a: [crown, 5], b: [crown, 3], c: [ruby, 4] })
      halo(s, 16, 16, 12.5, 10, '#ffb84d', 85)
      rays(s, 16, 14, 9, 12, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
