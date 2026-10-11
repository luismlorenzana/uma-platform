// Grains → bread (HP). Each grade bakes its grain into a different form, on humbler or finer tableware: a boule on a
// napkin, oat rolls, a slashed batard, steamed rice buns, skillet cornbread, sliced rye, buckwheat galettes, a wild-rice
// crown loaf, a moonrice crescent on a silver stand and a sunwheat sunburst on gold.
import { ramp } from '../color.ts'
import { halo, motes, pix, rays, scatter, speckle } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { BUTTER, CLAY, COBALT, GOLD, LINEN, PORCELAIN, RED_CLOTH, SILVER, type Dish, blob, castShadow, cloth, plate, skillet, slab, steam } from './kit.ts'

const STRAW = ramp('#c79a45', { hueShift: 6 })

/** Pale crumb along a slash, with the crust lip in shadow just below it. */
function score(s: Sprite, loaf: Mask, pts: readonly (readonly [number, number])[], crumb: number, crust: number): void {
  for (const [x, y] of pts) if (loaf.get(x, y + 1) && !pts.some(([a, b]) => a === x && b === y + 1)) s.paint(x, y + 1, crust, 1)
  for (const [x, y] of pts) if (loaf.get(x, y)) s.paint(x, y, crumb, 4)
  const first = pts[0]
  if (first) s.paint(first[0], first[1], crumb, 5)
}

/** A loaf: a dome cut flat at `floor`, shaded like a crust. */
function loaf(s: Sprite, m: Mask, crust: number, o: { bias?: number; contact?: boolean } = {}): Mask {
  castShadow(s, m, 1, 1)
  shadeDome(s, m, crust, { bias: o.bias ?? 0.04, contact: o.contact ?? true })
  return m
}

const flat = (m: Mask, floor: number): Mask => Mask.from((px, py) => py <= floor && m.get(Math.floor(px), Math.floor(py)))

/** A ripe ear of grain lying on its side, from its stalk end (x, y) up and to the right. */
function ear(s: Sprite, x: number, y: number, grain: number, stalk: number, len = 4): void {
  for (let i = 0; i < 3; i++) s.paint(x + i, y - i, stalk, 3)
  for (let i = 0; i < len; i++) {
    const bx = x + 3 + i, by = y - 3 - i
    s.paint(bx, by, grain, 4)
    s.paint(bx - 1, by, grain, 3)
    s.paint(bx, by + 1, grain, 2)
  }
  s.paint(x + 3 + len, y - 3 - len, grain, 5)
}

export const BREADS: Dish[] = [
  {
    id: 'dish-grains-1',
    name: 'Wheat Bread',
    kind: 'planet',
    family: 'grains',
    grade: 1,
    paint: (s) => {
      // A crusty wheat boule with a cross score, on a plain linen napkin, an ear of wheat beside it.
      cloth(s, [[3.5, 21.5], [13, 17.5], [28.5, 20.5], [19, 26.5]], RED_CLOTH, { accent: LINEN, pattern: 'gingham' })
      const crust = s.addRamp(ramp('#c8822c', { lift: 0.34, hueShift: 10 }))
      const crumb = s.addRamp(ramp('#efd8a2', { lift: 0.4, drop: 0.2 }))
      const m = loaf(s, flat(Mask.ellipse(14.5, 16.5, 8.6, 7.6), 21.5), crust)
      score(s, m, [[11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17]], crumb, crust)
      score(s, m, [[17, 11], [16, 12], [15, 13], [13, 15], [12, 16]], crumb, crust)
      speckle(s, 'wheat-flour', Mask.ellipse(12, 11.5, 5, 3), 4, 2, 3)
      const grain = s.addRamp(ramp('#e2b43f', { hueShift: 8 }))
      ear(s, 20, 25, grain, s.addRamp(STRAW), 4)
    },
  },
  {
    id: 'dish-grains-2',
    name: 'Oats Bread',
    kind: 'planet',
    family: 'grains',
    grade: 2,
    paint: (s) => {
      // Two soft oat rolls on a clay plate, their tops rolled in pale oat flakes.
      plate(s, { cy: 22, rx: 11, ry: 4.6, tones: CLAY, well: 0.68 })
      const crust = s.addRamp(ramp('#c6914a', { lift: 0.34, hueShift: 8 }))
      const oat = s.addRamp(ramp('#ead9a0', { lift: 0.45 }))
      for (const [cx, cy] of [[11.5, 17.2], [19.8, 18.6]] as const) {
        const m = loaf(s, flat(Mask.ellipse(cx, cy, 5.6, 4.8), cy + 3.4), crust)
        for (const [x, y] of scatter(`oats-${cx}`, Mask.ellipse(cx - 0.4, cy - 2.2, 4.4, 2.2), 7)) {
          if (!m.get(x, y)) continue
          s.paint(x, y, oat, 5)
          if (m.get(x + 1, y)) s.paint(x + 1, y, oat, 3)
        }
      }
    },
  },
  {
    id: 'dish-grains-3',
    name: 'Barley Bread',
    kind: 'planet',
    family: 'grains',
    grade: 3,
    paint: (s) => {
      // A long barley batard with three deep slashes, in an oval wicker basket; whiskered barley awns at its tip.
      const cane = s.addRamp(ramp('#c9a266', { lift: 0.32, drop: 0.28 }))
      const rimM = Mask.ellipse(16, 21, 12, 5)
      Mask.ellipse(16, 22.4, 11.6, 5).subtract(rimM).each((x, y) => s.paint(x, y, cane, x < 9 ? 2 : 1))
      rimM.each((x, y) => s.paint(x, y, cane, (x + 0.5 - 16) / 12 + (y + 0.5 - 21) / 5 < -0.5 ? 4 : 3))
      const floor = Mask.ellipse(16.2, 21.2, 10.2, 3.6)
      floor.each((x, y) => s.paint(x, y, cane, (Math.floor(x / 2) + y) % 2 === 0 ? 3 : 2))
      const crust = s.addRamp(ramp('#bf7e34', { lift: 0.38, hueShift: 10 }))
      const crumb = s.addRamp(ramp('#f0dca8', { lift: 0.4, drop: 0.2 }))
      const m = loaf(s, flat(Mask.ellipse(15.5, 16.6, 10.6, 5.2, -8), 21), crust)
      for (const x0 of [8, 13, 18]) {
        const y0 = Math.round(17 - (x0 - 8) * 0.18)
        score(s, m, [[x0, y0], [x0 + 1, y0 - 1], [x0 + 2, y0 - 1], [x0 + 3, y0 - 2]], crumb, crust)
      }
      const awn = s.addRamp(ramp('#efe0a6'))
      pix(s, 24, 8, ['....a', '...a.', 'a.a..', '.a..a', 'a.aa.', '.aa..'], { a: [awn, 4] })
    },
  },
  {
    id: 'dish-grains-4',
    name: 'Rice Bread',
    kind: 'planet',
    family: 'grains',
    grade: 4,
    paint: (s) => {
      // Fluffy white rice-flour buns in a bamboo steamer, steam rising.
      const cane = s.addRamp(ramp('#c9a462', { lift: 0.32, drop: 0.26 }))
      const cx = 16, rim = 18.5, rx = 11, ry = 4.2
      const wall = Mask.from((px, py) => py >= rim && py <= rim + 6 && Math.abs(px - cx) <= rx * Math.sqrt(Math.max(0, 1 - ((py - rim - 6) / ry) ** 2 * (py > rim + 6 - ry ? 1 : 0))))
      wall.union(Mask.ellipse(cx, rim + 6 - 0.5, rx, ry - 0.5))
      wall.each((x, y) => {
        const t = (x + 0.5 - (cx - rx)) / (2 * rx)
        s.paint(x, y, cane, t < 0.18 ? 4 : t < 0.7 ? 3 : 2)
      })
      for (const dy of [2, 4]) for (let x = 5; x <= 27; x++) if (wall.get(x, Math.round(rim + dy + ((x - cx) / rx) ** 2 * 2))) s.paint(x, Math.round(rim + dy + ((x - cx) / rx) ** 2 * 2), cane, 2)
      const top = Mask.ellipse(cx, rim, rx, ry)
      top.each((x, y) => s.paint(x, y, cane, litTone(x, y)))
      Mask.ellipse(cx, rim + 0.2, rx - 1.3, ry - 1).each((x, y) => s.paint(x, y, cane, 1))
      const bun = s.addRamp(ramp('#efe8d8', { lift: 0.5, drop: 0.2, hueShift: 4, satShift: 0.02 }))
      for (const [bx, by] of [[11.6, 16.2], [20.4, 16.2], [16, 18.6]] as const) {
        const m = Mask.ellipse(bx, by, 4.4, 3.8)
        shadeDome(s, m, bun, { bias: 0.1 })
        const x = Math.floor(bx), y = Math.floor(by - 1.6)
        pix(s, x - 1, y - 1, ['b.b', '.a.'], { a: [bun, 2], b: [bun, 3] })
      }
      steam(s, [[12, 10, 5], [19, 9, 6]])
      function litTone(x: number, y: number): number {
        const t = (x + 0.5 - cx) / rx + (y + 0.5 - rim) / ry
        return t < -0.8 ? 5 : t < 0.6 ? 4 : 3
      }
    },
  },
  {
    id: 'dish-grains-5',
    name: 'Corn Bread',
    kind: 'planet',
    family: 'grains',
    grade: 5,
    paint: (s) => {
      // Golden cornbread baked in a cast-iron skillet, one wedge already served, a pat of butter melting on top.
      const cx = 14.5, cy = 18.5
      const { inside, id: iron } = skillet(s, cx, cy, 10.2, 5.6)
      const top = s.addRamp(ramp('#d9932e', { lift: 0.42, hueShift: 10 }))
      const crumb = s.addRamp(ramp('#f7cf4a', { lift: 0.4, hueShift: 6 }))
      const gap = Mask.from((px, py) => {
        const a = (Math.atan2((py - cy) / 5, (px - cx) / 9) * 180) / Math.PI
        return a > 18 && a < 78 && Math.hypot((px - cx) / 9, (py - cy) / 5) > 0.12
      })
      const cake = new Mask().union(inside).subtract(gap)
      shadeDome(s, cake, top, { relief: 0.5, bias: 0.16, contact: false })
      inside.each((x, y) => {
        if (!gap.get(x, y)) return
        // Where the gap sits just below the cake, the cut face shows yellow crumb; elsewhere the pan's floor.
        const face = cake.get(x, y - 1) || cake.get(x - 1, y - 1)
        s.paint(x, y, face ? crumb : iron, face ? 4 : 2)
      })
      cake.each((x, y) => {
        if (!cake.get(x, y - 1) || !cake.get(x - 1, y)) s.paint(x, y, top, 2)
      })
      // The other cuts: thin dark lines.
      for (const deg of [140, 220, 290])
        for (let t = 0.2; t < 1; t += 0.06) {
          const x = Math.floor(cx + Math.cos((deg * Math.PI) / 180) * 9 * t), y = Math.floor(cy + Math.sin((deg * Math.PI) / 180) * 5 * t)
          if (cake.get(x, y)) s.paint(x, y, top, 1)
        }
      const butter = s.addRamp(BUTTER)
      pix(s, 11, 16, ['abb', 'bbc'], { a: [butter, 5], b: [butter, 4], c: [butter, 3] })
      speckle(s, 'corn', cake, 7, 1, 3)
    },
  },
  {
    id: 'dish-grains-6',
    name: 'Rye Bread',
    kind: 'planet',
    family: 'grains',
    grade: 6,
    paint: (s) => {
      // A dark rye loaf on a pale birch board, two slices cut and leaning in front.
      slab(s, 4, 19, 27, 25, ramp('#d8b47c', { lift: 0.34 }), { grain: true, corner: 2 })
      const crust = s.addRamp(ramp('#5c3a26', { lift: 0.36, hueShift: 8 }))
      const crumb = s.addRamp(ramp('#8f6a4c', { lift: 0.32, hueShift: 6 }))
      const body = Mask.ellipse(12, 14.5, 7.4, 3.8).union(Mask.polygon([[4.6, 14.5], [19.4, 14.5], [19.4, 21.5], [4.6, 21.5]]))
      loaf(s, body, crust)
      // The cut end of the loaf.
      const face = Mask.ellipse(18.6, 17.6, 1.8, 4.2)
      face.each((x, y) => s.paint(x, y, crumb, y < 16 ? 4 : 3))
      for (const [i, cx] of [[0, 21.6], [1, 24.8]] as const) {
        const cy = 18.6 + i * 0.8
        const m = Mask.ellipse(cx, cy, 3.4, 5.2, 16)
        castShadow(s, m, 1, 1)
        m.each((x, y) => {
          const edge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
          const lit = (x + 0.5 - cx) / 3.4 + (y + 0.5 - cy) / 5.2
          s.paint(x, y, edge ? crust : crumb, edge ? (y < cy - 2 ? 3 : 2) : lit < -0.5 ? 5 : lit < 0.5 ? 4 : 3)
        })
        speckle(s, `rye-crumb-${i}`, m, 4, -2, 4)
      }
      const seed = s.addRamp(ramp('#3a2a1e'))
      for (const [x, y] of scatter('rye-seed', body, 5)) if (s.toneAt(x, y) >= 3) s.paint(x, y, seed, 3)
    },
  },
  {
    id: 'dish-grains-7',
    name: 'Buckwheat Bread',
    kind: 'planet',
    family: 'grains',
    grade: 7,
    paint: (s) => {
      // A stack of speckled buckwheat galettes on a blue-banded plate, crowned with a sprig of buckwheat flowers.
      plate(s, { cy: 22, rx: 11.4, ry: 4.8, tones: PORCELAIN, band: COBALT, well: 0.62 })
      const cake = s.addRamp(ramp('#9a7c68', { lift: 0.36, hueShift: 8 }))
      for (const [i, cy] of [[0, 20.4], [1, 18.4], [2, 16.4]] as const) {
        const rx = 8 - i * 0.4
        Mask.ellipse(16, cy + 1, rx, 3).each((x, y) => s.paint(x, y, cake, x < 14 ? 2 : 1))
        const top = Mask.ellipse(16, cy, rx, 3)
        top.each((x, y) => s.paint(x, y, cake, (x + 0.5 - 16) / rx + (y + 0.5 - cy) / 3 < -0.6 ? 4 : 3))
        speckle(s, `buck-${i}`, top, 6, -1, 3)
      }
      const stem = s.addRamp(ramp('#c0393b'))
      const petal = s.addRamp(ramp('#f7e4ea', { lift: 0.5, drop: 0.2 }))
      const eye = s.addRamp(ramp('#e8768f'))
      pix(s, 13, 10, ['.ab.a..', 'abcba.a', '.ab.bab', '..d.ab.', '..d.d..', '...d...'], { a: [petal, 4], b: [petal, 5], c: [eye, 3], d: [stem, 3] })
      const leaf = s.addRamp(ramp('#6fa83c'))
      blob(s, 19.4, 15, 2, 1, -20, leaf)
    },
  },
  {
    id: 'dish-grains-8',
    name: 'Wild Rice Bread',
    kind: 'planet',
    family: 'grains',
    grade: 8,
    paint: (s) => {
      // A glossy crown loaf of wild rice rolls studded with dark grains, on an oval platter with a cobalt band and gilt edge.
      plate(s, { cy: 22.4, rx: 12.6, ry: 4.6, tones: PORCELAIN, band: COBALT, edge: GOLD, well: 0.66 })
      const crust = s.addRamp(ramp('#b8702c', { lift: 0.26, hueShift: 10 }))
      // A glossy crown loaf: a ring of pull-apart rolls, each parted by a groove, a herb sprig in the middle.
      const cx = 16, cy = 17.6
      const ring = Mask.ellipse(cx, cy, 10.4, 5.4).subtract(Mask.ellipse(cx, cy - 0.8, 4.2, 1.8))
      castShadow(s, ring, 1, 1)
      shadeDome(s, ring, crust, { bias: 0.1 })
      ring.each((x, y) => {
        const a = Math.atan2((y + 0.5 - cy) / 5.2, (x + 0.5 - cx) / 10.4) / (2 * Math.PI) + 0.5
        const f = (a * 8 + 0.06) % 1
        if (f < 0.1) s.paint(x, y, crust, s.toneAt(x, y) >= 4 ? 2 : 1)
      })
      const herb = s.addRamp(ramp('#4f9a3a', { lift: 0.36, hueShift: 10 }))
      pix(s, 15, 14, ['a.a', '.b.'], { a: [herb, 5], b: [herb, 3] })
      const grain = s.addRamp(ramp('#33241c', { lift: 0.4 }))
      for (const [x, y] of [[10, 15], [21, 14], [13, 20], [20, 20], [8, 18], [24, 18]] as const) {
        if (!s.filled(x, y) || s.toneAt(x, y) < 3) continue
        s.paint(x, y, grain, 3)
        if (s.filled(x + 1, y)) s.paint(x + 1, y, grain, 2)
      }
    },
  },
  {
    id: 'dish-grains-9',
    name: 'Moonrice Bread',
    kind: 'planet',
    family: 'grains',
    grade: 9,
    paint: (s) => {
      // A pale moonrice crescent on a silver cake stand, glowing softly.
      plate(s, { cy: 20.5, rx: 8, ry: 3.2, tones: ramp('#2c3c7a', { lift: 0.36, drop: 0.3 }), edge: SILVER, well: 0.6, stand: 4, depth: 1 })
      const moon = s.addRamp(ramp('#c4d0f2', { lift: 0.55, drop: 0.3, hueShift: 10, satShift: 0.02 }))
      const m = Mask.circle(14.6, 12.6, 7.4).subtract(Mask.circle(18.6, 10.8, 6))
      castShadow(s, m, 1, 1)
      shadeDome(s, m, moon, { bias: 0.12 })
      // Scored ridges across the crescent, like a laminated roll.
      for (const [x0, y0, x1, y1] of [[9, 9, 11, 10], [8, 13, 10, 13], [9, 16, 11, 15], [12, 18, 13, 17], [16, 19, 16, 18]] as const)
        for (const [x, y] of [[x0, y0], [x1, y1]] as const) if (m.get(x, y)) s.shift(x, y, -1)
      const star = s.addRamp(ramp('#fff3c4', { lift: 0.5 }))
      for (const [x, y] of [[20, 13], [22, 9], [18, 16]] as const) s.paint(x, y, star, 5)
      halo(s, 15, 13, 12, 10, '#9fc4ff', 80)
      motes(s, [[23, 5], [12, 3]], '#e8f0ff', 210)
    },
  },
  {
    id: 'dish-grains-10',
    name: 'Sunwheat Bread',
    kind: 'planet',
    family: 'grains',
    grade: 10,
    paint: (s) => {
      // A sunburst loaf of sunwheat, eight golden rays around a scored orange heart, on a gold plate.
      plate(s, { cy: 23.6, rx: 7.8, ry: 3, tones: GOLD, well: 0.62, depth: 2 })
      const ray = s.addRamp(ramp('#f2a82a', { lift: 0.5, drop: 0.32, hueShift: 12 }))
      const heart = s.addRamp(ramp('#ff8a1f', { lift: 0.5, hueShift: 12 }))
      const cx = 16, cy = 14.6
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + Math.PI / 8
        const tip: [number, number] = [cx + Math.cos(a) * 9, cy + Math.sin(a) * 7.6]
        const l: [number, number] = [cx + Math.cos(a - 0.42) * 4.6, cy + Math.sin(a - 0.42) * 4]
        const r: [number, number] = [cx + Math.cos(a + 0.42) * 4.6, cy + Math.sin(a + 0.42) * 4]
        shadeDome(s, Mask.polygon([l, tip, r, [cx, cy]]), ray, { bias: 0.1 })
      }
      const core = Mask.ellipse(cx, cy, 5.2, 4.6)
      shadeDome(s, core, heart, { bias: 0.08 })
      for (const [x, y] of [[14, 13], [15, 12], [16, 12], [17, 13], [17, 14], [16, 15], [15, 15]] as const) s.paint(x, y, heart, 5)
      halo(s, 16, 15, 13, 11, '#ffd34d', 90)
      rays(s, 16, 14, 10, 13, [-90, -50, -130], '#ffe27a', 130)
    },
  },
]
