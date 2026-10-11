// Fruits → tarts (MP). A round tart with a fluted golden crust, filled and topped with the grade's fruit in its own
// arrangement (fanned slices, pear halves, a lattice, orange wheels, a heap of grapes, a mango rose, jewelled seeds),
// served on finer tableware as the grade rises: a wooden board, clay, creamware, banded porcelain, a slate, then stands.
import { ramp } from '../color.ts'
import { halo, motes, pix, rays, speckle } from '../items/refined/pantry-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { CELADON, CLAY, COBALT, CREAM, CREAMWARE, GOLD, PORCELAIN, SILVER, SLATE, TEAL, type Dish, type Tones, blob, castShadow, plate, slab } from './kit.ts'

const CRUST = ramp('#d39a4a', { lift: 0.38, hueShift: 10 })
const LEAF = ramp('#5fae3c')

interface Tart {
  /** The filling's surface. */
  top: Mask
  cx: number
  cy: number
  rx: number
  ry: number
  crust: number
}

/** A round tart in 3/4 view: a short fluted crust wall, a rolled rim lit at the top left, and a filling surface. */
function tart(s: Sprite, o: { cx?: number; cy?: number; rx?: number; ry?: number; wall?: number; crust?: Tones; filling: Tones }): Tart {
  const cx = o.cx ?? 16, cy = o.cy ?? 17, rx = o.rx ?? 10.2, ry = o.ry ?? 5.8, wall = o.wall ?? 2
  const crust = s.addRamp(o.crust ?? CRUST)
  const outer = Mask.ellipse(cx, cy, rx, ry)
  const side = Mask.ellipse(cx, cy + wall, rx, ry).union(Mask.from((px, py) => py >= cy && py <= cy + wall && Math.abs(px - cx) <= rx))
  side.subtract(outer)
  castShadow(s, new Mask().union(side, outer), 1, 1)
  side.each((x, y) => {
    const t = (x + 0.5 - (cx - rx)) / (2 * rx)
    const flute = Math.round(x - cx) % 2 === 0
    s.paint(x, y, crust, (t < 0.3 ? 4 : t < 0.75 ? 3 : 2) - (flute ? 0 : 1))
  })
  outer.each((x, y) => {
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    s.paint(x, y, crust, lit < -0.8 ? 5 : lit < 0.6 ? 4 : 3)
  })
  const top = Mask.ellipse(cx + 0.1, cy + 0.2, rx - 1.4, ry - 1.1)
  const fid = s.addRamp(o.filling)
  top.each((x, y) => {
    const back = !top.get(x, y - 1)
    const lit = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry
    s.paint(x, y, fid, back ? 2 : lit < -0.5 ? 4 : 3)
  })
  return { top, cx, cy, rx: rx - 1.4, ry: ry - 1.1, crust }
}

/**
 * Overlapping fruit slices laid in rings (a rosette): each ring is cut into wedges, lit on the leading edge and shaded
 * where the next slice overlaps, with the coloured skin along the ring's outer edge.
 */
function rosette(s: Sprite, t: Tart, rings: readonly (readonly [number, number, number])[], flesh: Tones, skin?: Tones): void {
  const fid = s.addRamp(flesh)
  const sid = skin ? s.addRamp(skin) : fid
  t.top.each((x, y) => {
    const dx = (x + 0.5 - t.cx) / t.rx, dy = (y + 0.5 - t.cy) / t.ry
    const r = Math.hypot(dx, dy)
    const a = Math.atan2(dy, dx) / (2 * Math.PI) + 0.5
    rings.forEach(([r0, r1, n], i) => {
      if (r < r0 || r >= r1) return
      const f = (a * n + i * 0.5) % 1
      if (skin && r > r1 - 0.22) s.paint(x, y, sid, f < 0.5 ? 4 : 3)
      else s.paint(x, y, fid, f < 0.22 ? 5 : f < 0.7 ? 4 : 3)
    })
  })
}

/** A whole round fruit (berry, grape, cherry): a small shaded sphere with a highlight. */
function ball(s: Sprite, cx: number, cy: number, r: number, id: number): void {
  const m = Mask.circle(cx, cy, r)
  shadeDome(s, m, id, { bias: 0.04 })
}

function leaves(s: Sprite, pts: readonly (readonly [number, number, number])[], tones: Tones = LEAF): void {
  const id = s.addRamp(tones)
  for (const [x, y, rot] of pts) blob(s, x, y, 2.2, 1, rot, id, { bias: 0.12 })
}

export const TARTS: Dish[] = [
  {
    id: 'dish-fruits-1',
    name: 'Apple Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 1,
    paint: (s) => {
      // A homely apple tart on a round wooden board: rings of red-skinned apple slices.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: ramp('#7a5232', { lift: 0.3 }), well: 0, depth: 2 })
      const t = tart(s, { cy: 17.4, filling: ramp('#efd27a', { lift: 0.4 }) })
      rosette(s, t, [[0.5, 1.01, 11], [0.12, 0.5, 6]], ramp('#f4dc96', { lift: 0.4 }), ramp('#d63c39', { lift: 0.3 }))
      blob(s, 16, 17.4, 1.2, 0.8, 0, s.addRamp(ramp('#d63c39')))
    },
  },
  {
    id: 'dish-fruits-2',
    name: 'Pear Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 2,
    paint: (s) => {
      // Pear halves laid like spokes on almond cream, on a clay plate.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: CLAY, well: 0.7 })
      tart(s, { cy: 17.4, filling: ramp('#e8cf96', { lift: 0.4 }) })
      const pear = s.addRamp(ramp('#c9d452', { lift: 0.38, hueShift: 10 }))
      const stem = s.addRamp(ramp('#7b5330'))
      // Teardrop halves pointing to the middle, stems at the tips.
      for (const deg of [-150, -90, -30, 30, 150, 90]) {
        const a = (deg * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a)
        const bx = 16 + c * 5.6, by = 17.4 + sn * 3.1, tx = 16 + c * 2.2, ty = 17.4 + sn * 1.2
        const m = Mask.circle(bx, by, 2).union(Mask.circle((bx + tx) / 2, (by + ty) / 2, 1.4))
        castShadow(s, m, 0, 1)
        shadeDome(s, m, pear, { bias: 0.12 })
        s.paint(Math.floor(tx), Math.floor(ty), stem, 3)
      }
    },
  },
  {
    id: 'dish-fruits-3',
    name: 'Peach Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 3,
    paint: (s) => {
      // A rosette of blushing peach slices on custard, on a creamware plate with a mint leaf.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: CREAMWARE, well: 0.7 })
      const t = tart(s, { cy: 17.4, filling: ramp('#f2cf6a', { lift: 0.4 }) })
      rosette(s, t, [[0.55, 1.01, 9], [0.15, 0.55, 5]], ramp('#f9a86a', { lift: 0.36 }), ramp('#e2506a', { lift: 0.3 }))
      blob(s, 16, 17.4, 1.2, 0.8, 0, s.addRamp(ramp('#e85a6b')))
      leaves(s, [[19.6, 13.6, -25]])
    },
  },
  {
    id: 'dish-fruits-4',
    name: 'Plum Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 4,
    paint: (s) => {
      // A lattice-topped plum pie, deep purple filling bubbling through, on a cobalt-banded plate.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: PORCELAIN, band: COBALT, well: 0.68 })
      const t = tart(s, { cy: 17.4, filling: ramp('#7d3b94', { lift: 0.36, hueShift: 6 }) })
      const lattice = s.addRamp(ramp('#e2ad5a', { lift: 0.38, hueShift: 10 }))
      t.top.each((x, y) => {
        const u = x - 16 + (y - 17) * 1.6, v = x - 16 - (y - 17) * 1.6
        const a = ((Math.round(u) % 4) + 4) % 4 === 0, b = ((Math.round(v) % 4) + 4) % 4 === 0
        if (a || b) s.paint(x, y, lattice, a && b ? 5 : a ? 4 : 3)
      })
      speckle(s, 'plum-glaze', t.top, 4, 2, 2)
    },
  },
  {
    id: 'dish-fruits-5',
    name: 'Orange Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 5,
    paint: (s) => {
      // Candied orange wheels on a bright orange curd, on a teal-banded plate.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: PORCELAIN, band: TEAL, well: 0.68 })
      tart(s, { cy: 17.4, filling: ramp('#f4dc8a', { lift: 0.4 }) })
      const peel = s.addRamp(ramp('#e2661a', { lift: 0.3 }))
      const flesh = s.addRamp(ramp('#f8862a', { lift: 0.32 }))
      const pith = s.addRamp(ramp('#fff0c8', { lift: 0.4 }))
      for (const [wx, wy] of [[12, 16.2], [20, 16.2], [16, 19]] as const) {
        const m = Mask.ellipse(wx, wy, 3.6, 2.5)
        castShadow(s, m, 0, 1)
        const inner = Mask.ellipse(wx, wy, 2.4, 1.5)
        m.each((x, y) => {
          if (inner.get(x, y)) {
            const spoke = Math.abs(x + 0.5 - wx) < 0.6 || Math.abs(y + 0.5 - wy) < 0.5
            s.paint(x, y, spoke ? pith : flesh, spoke ? 4 : (x + y) % 2 === 0 ? 4 : 3)
          } else {
            const outerEdge = !m.get(x - 1, y) || !m.get(x + 1, y) || !m.get(x, y - 1) || !m.get(x, y + 1)
            s.paint(x, y, outerEdge ? peel : pith, outerEdge ? (y + 0.5 < wy ? 4 : 3) : 4)
          }
        })
      }
      leaves(s, [[21.6, 13.2, -20]])
    },
  },
  {
    id: 'dish-fruits-6',
    name: 'Grape Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 6,
    paint: (s) => {
      // A tart heaped with glossy grapes over vanilla cream, on a celadon plate.
      plate(s, { cy: 21.6, rx: 12, ry: 5, tones: CELADON, well: 0.7 })
      tart(s, { cy: 17.6, filling: CREAM })
      const grape = s.addRamp(ramp('#7042ab', { lift: 0.4, hueShift: 6 }))
      const spots = [[10.6, 17.6], [13.4, 18.8], [16.4, 19.2], [19.4, 18.8], [22, 17.6], [12, 16], [15, 16.6], [18, 16.6], [20.8, 15.8], [13.6, 14.4], [16.6, 14.2], [19.2, 13.8], [15, 12.6], [17.8, 12.2]] as const
      for (const [x, y] of [...spots].sort((a, b) => a[1] - b[1])) ball(s, x, y, 1.7, grape)
      const stem = s.addRamp(ramp('#7b5330'))
      pix(s, 16, 9, ['.a', 'a.'], { a: [stem, 3] })
      leaves(s, [[19.2, 10.4, -20]])
    },
  },
  {
    id: 'dish-fruits-7',
    name: 'Mango Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 7,
    paint: (s) => {
      // A mango rose of sunny slices on a long slate board, a mint sprig beside.
      slab(s, 3, 18, 28, 24, SLATE, { corner: 1 })
      const t = tart(s, { cy: 16.8, filling: ramp('#f5b83a', { lift: 0.4 }) })
      rosette(s, t, [[0.62, 1.01, 8], [0.3, 0.62, 6], [0, 0.3, 3]], ramp('#ffb627', { lift: 0.42, hueShift: 8 }), ramp('#f07a2a', { lift: 0.3 }))
      leaves(s, [[25.2, 21, -15], [23.4, 22.4, 20]], ramp('#86b53d'))
    },
  },
  {
    id: 'dish-fruits-8',
    name: 'Pomegranate Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 8,
    paint: (s) => {
      // A glossy ruby tart jewelled with pomegranate seeds and cream rosettes, on a silver cake stand.
      plate(s, { cy: 20.6, rx: 11.6, ry: 4.2, tones: SILVER, well: 0.7, stand: 4 })
      const t = tart(s, { cy: 16, rx: 9.4, ry: 5, filling: ramp('#bb2532', { lift: 0.4 }) })
      const seed = s.addRamp(ramp('#e8344a', { lift: 0.5 }))
      for (const [x, y] of [[12, 15], [14, 14], [17, 14], [19, 15], [13, 17], [16, 16], [18, 17], [21, 16], [11, 16], [15, 18], [20, 18]] as const) {
        if (!t.top.get(x, y)) continue
        s.paint(x, y, seed, 4)
        if ((x + y) % 2 === 0) s.paint(x, y, seed, 5)
      }
      const cream = s.addRamp(CREAM)
      for (const [x, y] of [[9, 15], [23, 15], [16, 12]] as const) pix(s, x - 1, y - 1, ['.a.', 'aba', '.a.'], { a: [cream, 4], b: [cream, 5] })
      const crown = s.addRamp(ramp('#9c1d2a'))
      pix(s, 15, 10, ['a.a', 'aba'], { a: [crown, 3], b: [crown, 4] })
    },
  },
  {
    id: 'dish-fruits-9',
    name: 'Starpeach Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 9,
    paint: (s) => {
      // Star-cut starpeach slices on a pearly tart, on a pale pedestal, glowing pink.
      plate(s, { cy: 20.2, rx: 8.2, ry: 3.4, tones: ramp('#f2e6ee', { lift: 0.5, drop: 0.22, hueShift: 10 }), edge: GOLD, well: 0.66, stand: 5 })
      tart(s, { cy: 15.4, rx: 8.8, ry: 5, filling: ramp('#ff9ab6', { lift: 0.4, hueShift: 4, drop: 0.2 }) })
      const star = s.addRamp(ramp('#ffe08a', { lift: 0.5, drop: 0.3 }))
      for (const [cx, cy] of [[12.5, 15.2], [19.5, 15.2], [16, 17.4], [16, 13]] as const)
        pix(s, Math.floor(cx) - 2, Math.floor(cy) - 1, ['..a..', 'abbba', '.a.a.'], { a: [star, 3], b: [star, 5] })
      halo(s, 16, 15, 12, 10, '#ffb3d0', 80)
      motes(s, [[22, 6], [11, 5], [25, 17]], '#fff1f6', 200)
    },
  },
  {
    id: 'dish-fruits-10',
    name: 'Golden Apple Tart',
    kind: 'planet',
    family: 'fruits',
    grade: 10,
    paint: (s) => {
      // A gilded tart of golden apple slices fanned in a rose, a golden apple on top, on a gold stand.
      plate(s, { cy: 20.6, rx: 7.8, ry: 3.4, tones: GOLD, well: 0.64, stand: 4 })
      const t = tart(s, { cy: 16, rx: 8.6, ry: 4.8, filling: ramp('#f6d36a', { lift: 0.45 }) })
      rosette(s, t, [[0.5, 1.01, 10]], ramp('#fff0b0', { lift: 0.5 }), ramp('#e8a81c', { lift: 0.5, drop: 0.34, hueShift: 12 }))
      const apple = s.addRamp(ramp('#efbd25', { lift: 0.5, drop: 0.34, hueShift: 12, satShift: 0.08 }))
      shadeDome(s, Mask.circle(15.2, 13.2, 3).union(Mask.circle(17, 13.2, 3)), apple, { bias: 0.06 })
      pix(s, 16, 9, ['a'], { a: [s.addRamp(ramp('#7b5330')), 3] })
      blob(s, 18.2, 9.4, 1.6, 0.8, -25, s.addRamp(ramp('#a9c43c')))
      halo(s, 16, 15, 12.5, 10.5, '#ffd34d', 90)
      rays(s, 16, 13, 9, 12, [-90, -55, -125], '#ffe27a', 130)
    },
  },
]
