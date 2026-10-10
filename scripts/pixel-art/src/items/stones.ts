// Stones (Quarry, DEF family): uma-rpg docs/design/items.md#stones. Raw quarry stone in varied forms, so none reads as
// the faceted ore chunks: a block, ledges, plates, a boulder, columns, a chunk, a shard, a pebble, a menhir, a meteorite.
import { hex, ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { cutStone, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

const below = (y: number) => Mask.from((_, py) => py > y)

function paintPoly(s: Sprite, id: number, poly: readonly Point[], tone: number): Mask {
  const m = Mask.polygon(poly)
  m.each((x, y) => s.paint(x, y, id, tone))
  return m
}

/** Seeded cells of `m` that are painted and at least `minTone`. */
function pick(s: Sprite, seed: string, m: Mask, count: number, minTone = 1): [number, number][] {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  const out: [number, number][] = []
  for (let i = 0; i < count && cells.length > 0; i++) out.push(cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0])
  return out
}

/** A small pit: dark hollow with its lit far rim (light from the top left falls on the lower-right wall). */
function pit(s: Sprite, x: number, y: number, wide = false): void {
  const id = s.mat[y * s.w + x] ?? -1
  if (id < 0) return
  s.paint(x, y, id, 1)
  if (wide && s.filled(x + 1, y)) s.paint(x + 1, y, id, 1)
  const rx = wide ? x + 1 : x
  if (s.filled(rx + 1, y + 1)) s.shift(rx + 1, y + 1, 1)
  if (s.filled(x, y + 1)) s.shift(x, y + 1, 1)
}

/** Paints a seeded random walk: veins, cracks. Returns the cells it painted. */
function vein(seed: string, inside: Mask, from: Point, step: Point, length: number, paint: (x: number, y: number, k: number) => void, wobble = 1.1): [number, number][] {
  const r = rng(seed)
  let [x, y] = from
  const cells: [number, number][] = []
  for (let k = 0; k < length; k++) {
    const px = Math.round(x), py = Math.round(y)
    if (inside.get(px, py) && !cells.some(([cx, cy]) => cx === px && cy === py)) {
      paint(px, py, k)
      cells.push([px, py])
    }
    x += step[0] + (r() - 0.5) * wobble
    y += step[1] + (r() - 0.5) * wobble
  }
  return cells
}

/** Soft translucent glow on the pixels around `cells` (object or empty canvas alike). */
function glowAround(s: Sprite, cells: readonly [number, number][], color: string, alpha: number, radius = 1): void {
  const seen = new Set<number>()
  const own = new Set(cells.map(([x, y]) => y * s.w + x))
  for (const [cx, cy] of cells)
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx, y = cy + dy, i = y * s.w + x
        if (!s.inside(x, y) || own.has(i) || seen.has(i) || Math.abs(dx) + Math.abs(dy) > radius + 0.5) continue
        seen.add(i)
        s.overlay(x, y, hex(color, alpha))
      }
}

/** A rough box in three-quarter view: lit top, front face, shaded right side. Returns the whole silhouette. */
function box(s: Sprite, id: number, x0: number, x1: number, yTop: number, yBot: number, dx: number, dy: number): { all: Mask; front: Mask; top: Mask; side: Mask } {
  const front = paintPoly(s, id, [[x0, yTop], [x1, yTop], [x1, yBot], [x0, yBot]], 3)
  const top = paintPoly(s, id, [[x0, yTop], [x0 + dx, yTop - dy], [x1 + dx, yTop - dy], [x1, yTop]], 4)
  const side = paintPoly(s, id, [[x1, yTop], [x1 + dx, yTop - dy], [x1 + dx, yBot - dy], [x1, yBot]], 2)
  return { all: new Mask().union(front, top, side), front, top, side }
}

/**
 * Shades a rough slab-sided silhouette: a lit left band, a mid front, a shaded right band, and lit faces wherever the
 * pixel above is open (tops and ledges).
 */
function shadeSlab(s: Sprite, m: Mask, ramp: (x: number, y: number) => number, lit = 2, dark = 2.5): void {
  const cells: [number, number, number][] = []
  m.each((x, y) => {
    let l = x, r = x
    while (m.get(l - 1, y)) l--
    while (m.get(r + 1, y)) r++
    let tone = x - l < lit ? 4 : r - x < dark ? 2 : 3
    if (!m.get(x, y - 1)) tone = x - l < lit + 1 ? 5 : 4
    else if (!m.get(x, y - 2)) tone = Math.max(tone, 4)
    if (!m.get(x, y + 1)) tone = Math.min(tone, 2)
    cells.push([x, y, tone])
  })
  for (const [x, y, tone] of cells) s.paint(x, y, ramp(x, y), tone)
}

export const STONES: ItemIcon[] = [
  {
    id: 'limestone',
    name: 'Limestone',
    grade: 1,
    paint: (s) => {
      // A quarried block, pale and chalky, pocked all over, with chamfered broken corners.
      const id = s.addRamp(ramp('#d3cdbb', { lift: 0.32, drop: 0.24, hueShift: 10, satShift: 0.02 }))
      const b = box(s, id, 7, 21, 15.5, 26.5, 4, 4.5)
      const cut = Mask.polygon([[6, 15], [9.5, 11], [6, 11]]).union(Mask.polygon([[22.5, 10], [26, 10], [26, 14.5]]), Mask.polygon([[6, 26], [8.5, 27], [6, 22.5]]))
      cut.each((x, y) => {
        s.mat[y * s.w + x] = -1
        b.all.set(x, y, false)
      })
      for (const [x, y] of pick(s, 'limestone-pits', b.all, 10, 2)) pit(s, x, y, (x + y) % 3 === 0)
      for (const [x, y] of pick(s, 'limestone-grain', b.all, 14, 3)) s.shift(x, y, -1)
      for (let x = 8; x < 21; x++) if (x % 4 !== 1) s.paint(x, 21, id, 2)
    },
  },
  {
    id: 'sandstone',
    name: 'Sandstone',
    grade: 2,
    paint: (s) => {
      // A stepped butte of sediment: hard rust bands stand out, soft tan bands weather back between them.
      const rust = s.addRamp(ramp('#c0622f', { lift: 0.3, drop: 0.26 }))
      const tan = s.addRamp(ramp('#eac38c', { lift: 0.28, drop: 0.24 }))
      const bands: [number, number, number, number, number][] = [
        [10, 13, 11.5, 21.5, rust],
        [13, 15, 12, 21, tan],
        [15, 18, 10.5, 22.5, rust],
        [18, 20, 11.5, 22, tan],
        [20, 23, 8.5, 24, rust],
        [23, 24.5, 9.5, 23.5, tan],
        [24.5, 26.5, 7.5, 25, rust],
      ]
      const m = new Mask()
      const which = new Map<number, number>()
      for (const [y0, y1, x0, x1, id] of bands)
        Mask.polygon([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]).each((x, y) => {
          m.set(x, y)
          which.set(y * s.w + x, id)
        })
      shadeSlab(s, m, (x, y) => which.get(y * s.w + x) ?? rust)
      for (const [x, y] of pick(s, 'sandstone', m, 14, 3)) s.shift(x, y, -1)
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    grade: 3,
    paint: (s) => {
      // Three thin cleaved plates stacked off-true: a thin lit top face over a dark edge.
      const id = s.addRamp(ramp('#55606f', { lift: 0.3, drop: 0.26, hueShift: 6 }))
      const plate = (x0: number, x1: number, y: number, depth: number, skew: number, thick: number) => {
        paintPoly(s, id, [[x0, y], [x1, y], [x1, y + thick], [x0, y + thick]], 2)
        paintPoly(s, id, [[x1, y], [x1 + skew, y - depth], [x1 + skew, y - depth + thick], [x1, y + thick]], 1)
        const top = paintPoly(s, id, [[x0, y], [x0 + skew, y - depth], [x1 + skew, y - depth], [x1, y]], 4)
        for (const [x, yy] of pick(s, `slate-${y}`, top, 4, 4)) s.shift(x, yy, -1)
        for (let x = Math.ceil(x0 + 1); x < x1 - 1; x++) if (x % 5 === 0) s.paint(x, Math.floor(y - 1), id, 3)
      }
      plate(6.5, 21.5, 24, 6, 4, 2)
      plate(8.5, 22.5, 20.5, 5, 3.5, 2)
      plate(7.5, 19.5, 17, 5, 4.5, 2)
    },
  },
  {
    id: 'granite',
    name: 'Granite',
    grade: 4,
    paint: (s) => {
      // A broad weathered boulder, speckled pink, black and white.
      const id = s.addRamp(ramp('#b0a8ab', { lift: 0.32, satShift: 0.02 }))
      const pink = s.addRamp(ramp('#dba59b', { lift: 0.3, satShift: 0.02 }))
      const white = s.addRamp(ramp('#f1eeee', { lift: 0.3 }))
      const m = Mask.ellipse(16, 20, 10.5, 7).union(Mask.ellipse(13.5, 16.5, 7, 5.5), Mask.ellipse(20, 17.5, 5.8, 5)).subtract(below(26.5))
      shadeDome(s, m, id, { relief: 0.85 })
      for (const [x, y] of pick(s, 'granite-pink', m, 14, 3)) {
        s.paint(x, y, pink, s.toneAt(x, y))
        if (m.get(x + 1, y) && s.toneAt(x + 1, y) >= 3) s.paint(x + 1, y, pink, s.toneAt(x + 1, y) - 1)
      }
      for (const [x, y] of pick(s, 'granite-black', m, 30)) s.paint(x, y, id, 1)
      for (const [x, y] of pick(s, 'granite-white', m, 10, 2)) s.paint(x, y, white, Math.max(3, s.toneAt(x, y)))
    },
  },
  {
    id: 'basalt',
    name: 'Basalt',
    grade: 5,
    paint: (s) => {
      // Dark hexagonal columns of different heights, a vertex toward the viewer, hexagonal tops toward the light.
      const id = s.addRamp(ramp('#4a4d58', { lift: 0.34, drop: 0.3, hueShift: 6 }))
      const column = (cx: number, top: number, bottom: number, hw: number) => {
        const hh = hw * 0.62
        const body = Mask.polygon([[cx - hw, top + hh / 2], [cx, top + hh], [cx + hw, top + hh / 2], [cx + hw, bottom - hh / 2], [cx, bottom], [cx - hw, bottom - hh / 2]])
        body.each((x, y) => s.paint(x, y, id, x + 0.5 < cx ? 3 : 2))
        for (let y = Math.ceil(top + hh + 3); y < bottom - 2; y += 5) for (let x = Math.ceil(cx - hw); x < cx + hw; x++) if (body.get(x, y) && (x + y) % 3 !== 0) s.shift(x, y, -1)
        const cap = Mask.polygon([[cx, top - hh], [cx + hw, top - hh / 2], [cx + hw, top + hh / 2], [cx, top + hh], [cx - hw, top + hh / 2], [cx - hw, top - hh / 2]])
        cap.each((x, y) => {
          const edgeLit = !cap.get(x - 1, y) || !cap.get(x, y - 1)
          const edgeDark = !cap.get(x + 1, y) || !cap.get(x, y + 1)
          s.paint(x, y, id, edgeLit && !edgeDark ? 5 : edgeDark && !edgeLit ? 3 : 4)
        })
      }
      column(16, 6.5, 22, 3.8)
      column(10.5, 11, 24.5, 3.6)
      column(21.5, 13, 24, 3.6)
      column(15, 18, 27, 3.6)
    },
  },
  {
    id: 'marble',
    name: 'Marble',
    grade: 6,
    paint: (s) => {
      // A tall cleaved chunk of white stone with grey veins running through it.
      const id = s.addRamp(ramp('#e4e7ec', { lift: 0.55, drop: 0.2, hueShift: 6, satShift: 0.03 }))
      const veinId = s.addRamp(ramp('#7d8494', { lift: 0.3 }))
      const outer: Point[] = [[11, 5.5], [19.5, 4.5], [23.5, 9.5], [24, 20.5], [20.5, 26.5], [10.5, 26.5], [8, 18.5], [8.5, 10]]
      const inner: Point[] = [[12.5, 8.5], [17.5, 8], [19, 10.5], [19, 15.5], [16.5, 18.5], [12.5, 18.5], [11, 15], [11, 11]]
      shadeFacets(s, outer, cutStone(outer, inner, 8), id)
      const m = Mask.polygon(outer)
      const mark = (x: number, y: number) => {
        const t = s.toneAt(x, y)
        s.paint(x, y, veinId, t >= 4 ? 3 : 2)
        if (m.get(x + 1, y) && s.mat[y * s.w + x + 1] === id) s.paint(x + 1, y, id, Math.max(1, t - 1))
      }
      vein('marble-a', m, [9, 9], [0.8, 1], 22, mark, 0.7)
      vein('marble-b', m, [15, 5], [0.45, 1], 24, mark, 0.7)
      vein('marble-c', m, [16, 14], [1, 0.5], 9, mark, 0.6)
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    grade: 7,
    paint: (s) => {
      // A sharp volcanic-glass shard: broad conchoidal faces, a hard white shine along one edge.
      const id = s.addRamp(ramp('#2e2a3b', { lift: 0.42, drop: 0.3, hueShift: 14, satShift: 0.06 }))
      const tip: Point = [20.5, 3.5], l: Point = [8.5, 21], b: Point = [15, 26.5], r: Point = [24.5, 22], ridgeTop: Point = [19, 7], mid: Point = [15.5, 18]
      paintPoly(s, id, [tip, l, mid], 3)
      paintPoly(s, id, [tip, mid, r], 2)
      paintPoly(s, id, [l, b, mid], 2)
      paintPoly(s, id, [mid, b, r], 1)
      // Conchoidal ripples: curved bands across the lit face.
      for (let k = 0; k < 3; k++) {
        const cx = 13.5 + k * 1.8, cy = 14 + k * 2.2
        Mask.ellipse(cx, cy, 2.2, 1.1, -55).each((x, y) => {
          if (s.toneAt(x, y) === 3) s.paint(x, y, id, 4)
        })
      }
      for (let t = 0; t <= 1.0001; t += 0.06) {
        const x = Math.floor(ridgeTop[0] + (mid[0] - ridgeTop[0]) * t), y = Math.floor(ridgeTop[1] + (mid[1] - ridgeTop[1]) * t)
        s.paint(x, y, id, t < 0.55 ? 5 : 4)
      }
      s.paint(Math.floor(tip[0]) - 1, Math.floor(tip[1]) + 2, id, 5)
    },
  },
  {
    id: 'jade',
    name: 'Jade',
    grade: 8,
    paint: (s) => {
      // A smooth water-worn pebble: mottled green with a soft glossy highlight.
      const id = s.addRamp(ramp('#3f9e68', { lift: 0.36, drop: 0.3, hueShift: 6 }))
      const pale = s.addRamp(ramp('#7fc493', { lift: 0.36, drop: 0.3 }))
      const m = Mask.ellipse(16, 18.5, 10, 7.2, -14)
      const r = rng('jade')
      const blobs = Array.from({ length: 5 }, () => [9 + r() * 14, 13 + r() * 10, 1.6 + r() * 2] as const)
      shadeDome(s, m, (x, y) => (blobs.some(([bx, by, br]) => Math.hypot(x + 0.5 - bx, y + 0.5 - by) < br) ? pale : id), { relief: 1.1, bias: 0.04 })
      // Jade is translucent: light gathers along the lower edge opposite the highlight.
      m.each((x, y) => {
        const edge = !m.get(x + 1, y) || !m.get(x, y + 1)
        if (edge && x + y > 34 && s.toneAt(x, y) <= 2) s.shift(x, y, 1)
      })
      for (const [x, y] of [[11, 14], [12, 14], [12, 13], [13, 13], [11, 15]] as const) s.paint(x, y, pale, 5)
    },
  },
  {
    id: 'runestone',
    name: 'Runestone',
    grade: 9,
    paint: (s) => {
      // A rough standing stone, tapering to an uneven crown, with a carved glyph glowing from the cut.
      const id = s.addRamp(ramp('#6f7486', { lift: 0.3, drop: 0.28, hueShift: 8 }))
      const glow = s.addRamp(ramp('#4ff0e0', { lift: 0.55, drop: 0.3 }))
      const m = Mask.polygon([[9.5, 26.5], [9, 18], [10.5, 10], [12.5, 5.5], [19.5, 4], [22, 8.5], [23, 17], [23.5, 26.5]])
      shadeDome(s, m, id, { relief: 0.5 })
      for (const [x, y] of pick(s, 'runestone', m, 12, 3)) s.shift(x, y, -1)
      // The glyph: a stave through a diamond, rooted in a forked foot, with a tick at the crown.
      const cells: [number, number][] = []
      for (let y = 8; y <= 19; y++) if (y < 12 || y > 16) cells.push([16, y])
      cells.push([16, 12], [15, 13], [14, 14], [15, 15], [16, 16], [17, 15], [18, 14], [17, 13])
      cells.push([15, 20], [14, 21], [17, 20], [18, 21], [17, 9], [18, 8])
      for (const [x, y] of cells) s.paint(x, y, glow, 4)
      for (const [x, y] of [[16, 8], [14, 14], [16, 12], [15, 13]] as const) s.paint(x, y, glow, 5)
      glowAround(s, cells, '#5ff5e6', 60, 1)
      glowAround(s, cells, '#5ff5e6', 60, 1)
    },
  },
  {
    id: 'meteorite',
    name: 'Meteorite',
    grade: 10,
    paint: (s) => {
      // A dark, pitted iron lump split by cracks still glowing with heat.
      const id = s.addRamp(ramp('#463c3f', { lift: 0.32, drop: 0.3, hueShift: 10 }))
      const hot = s.addRamp(ramp('#ff7a1f', { lift: 0.55, drop: 0.3, hueShift: 14 }))
      const m = Mask.ellipse(16.5, 18.5, 8.8, 7.4, 8).union(Mask.circle(12.5, 14.5, 5), Mask.circle(20.5, 15.5, 4.6), Mask.circle(21.5, 21.5, 4)).subtract(below(26.5))
      shadeDome(s, m, id, { relief: 1.2 })
      const craters: [number, number, number][] = [[13, 14, 1.8], [19.5, 19.5, 2.2], [11, 21, 1.4], [21.5, 13.5, 1.3]]
      for (const [cx, cy, cr] of craters)
        Mask.circle(cx, cy, cr).each((x, y) => {
          if (!m.get(x, y)) return
          const t = (x + 0.5 - cx) + (y + 0.5 - cy)
          s.paint(x, y, id, t < -0.5 ? 1 : t > 0.8 ? 4 : 2)
        })
      const cracks = [
        ...vein('meteor-a', m, [9, 18], [1, -0.2], 9, () => undefined),
        ...vein('meteor-b', m, [16, 12], [0.3, 1], 10, () => undefined),
        ...vein('meteor-c', m, [17, 21], [1, 0.4], 6, () => undefined),
      ]
      for (const [x, y] of cracks) s.paint(x, y, hot, 4)
      for (const [x, y] of pick(s, 'meteor-hot', Mask.from((px, py) => cracks.some(([cx, cy]) => cx === Math.floor(px) && cy === Math.floor(py))), 5)) s.paint(x, y, hot, 5)
      glowAround(s, cracks, '#ff8a2a', 60, 1)
    },
  },
]
