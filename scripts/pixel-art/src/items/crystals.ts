// Crystals (Crystal Cavern, M.ATK family): uma-rpg docs/design/items.md#crystals. Rough, uncut crystals (cut gems are
// the refined forms): point clusters on a rock base, a geode, nodules, flat-topped columns, spindles, a spray,
// an octahedron in its host rock, and a glowing stone.
import { hex, ramp, type RGBA } from '../color.ts'
import { rng } from '../rng.ts'
import { cutStone, LIGHT, Mask, normalize, shadeDome, shadeFacets, type Point, type Vec3 } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import type { ItemIcon } from './types.ts'

/** One crystal prism. `lean` in degrees (positive leans right); `w` is the half width. */
interface Prism {
  x: number
  y: number
  lean: number
  w: number
  len: number
  /** Length of the pointed termination. */
  tip: number
  /** Length of a pointed bottom end (a double-terminated or spindle crystal). */
  foot?: number
  /** Flat hexagonal top (emerald) instead of a point. */
  flat?: boolean
}

interface PrismLook {
  /** Every n-th pixel row along the axis is darkened: growth striations. */
  striae?: number
  /** Edge pixels touching earlier crystals get a deep-shadow seam. Default on. */
  seam?: boolean
}

function axes(p: Prism): { d: Point; n: Point } {
  const a = (p.lean * Math.PI) / 180
  return { d: [Math.sin(a), -Math.cos(a)], n: [Math.cos(a), Math.sin(a)] }
}

/** Paints one prism with three visible faces (lit left, base middle, shaded right) and lighter termination facets. */
function prism(s: Sprite, id: number, p: Prism, look: PrismLook = {}): Mask {
  const { d, n } = axes(p)
  const at = (v: number, u: number): Point => [p.x + d[0] * v + n[0] * u, p.y + d[1] * v + n[1] * u]
  const foot = p.foot ?? 0
  const capH = p.flat ? p.w * 0.55 : 0
  const poly: Point[] = foot > 0 ? [at(-foot, 0)] : [at(0, -p.w), at(0, p.w)]
  if (foot > 0) poly.push(at(0, p.w))
  if (p.flat) poly.push(at(p.len, p.w), at(p.len + capH, p.w * 0.5), at(p.len + capH, -p.w * 0.5), at(p.len, -p.w))
  else poly.push(at(p.len, p.w), at(p.len + p.tip, 0), at(p.len, -p.w))
  if (foot > 0) poly.push(at(0, -p.w))
  const m = Mask.polygon(poly)
  const cells: [number, number, number][] = []
  m.each((x, y) => {
    const px = x + 0.5 - p.x, py = y + 0.5 - p.y
    const v = px * d[0] + py * d[1], u = px * n[0] + py * n[1]
    let half = p.w
    if (!p.flat && v > p.len) half = p.w * (1 - (v - p.len) / p.tip)
    if (v < 0 && foot > 0) half = p.w * (1 + v / foot)
    const r = u / Math.max(0.35, half)
    let tone = r < -0.42 ? 4 : r < 0.42 ? 3 : 2
    if (p.flat && v > p.len - 0.6) tone = r < 0.2 ? 5 : 4
    else if (v > p.len - 0.2) tone += 1
    if (v < 0 || (foot === 0 && !p.flat && v < 1.5) || (p.flat && v < 1.2)) tone -= 1
    if (look.striae && v > 1 && v < p.len - 1 && Math.round(v) % look.striae === 0 && tone > 2) tone -= 1
    cells.push([x, y, tone])
  })
  const seam = look.seam ?? true
  for (const [x, y, tone] of cells) {
    let t = tone
    if (seam && [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => !m.get(x + (dx ?? 0), y + (dy ?? 0)) && s.filled(x + (dx ?? 0), y + (dy ?? 0)))) t = 1
    s.paint(x, y, id, t)
  }
  return m
}

/** A bright line along the edge between the lit and middle faces, from foot to tip. */
function ridge(s: Sprite, id: number, p: Prism): void {
  const { d, n } = axes(p)
  const from = -(p.foot ?? 0) + 1, to = p.len + p.tip - 1
  for (let v = from; v <= to; v += 0.5) {
    let half = p.w
    if (v > p.len) half = p.w * (1 - (v - p.len) / p.tip)
    if (v < 0) half = p.w * (1 + v / (p.foot ?? 1))
    const u = -half * 0.42
    s.paint(Math.floor(p.x + d[0] * v + n[0] * u), Math.floor(p.y + d[1] * v + n[1] * u), id, 5)
  }
}

/** A low faceted rock the crystals grow from. Paint it first; crystals painted after it stand in its top face. */
function rockBase(s: Sprite, id: number, seed: string, cx: number, top: number, halfW: number, bottom = 26.5): Mask {
  const r = rng(seed)
  const j = () => (r() - 0.5) * 1.2
  const outer: Point[] = [
    [cx - halfW, bottom - 2.5 + j()],
    [cx - halfW + 1.5 + j(), top + 2.5],
    [cx - 3 + j(), top],
    [cx + 2.5 + j(), top - 0.5],
    [cx + halfW - 1 + j(), top + 2],
    [cx + halfW, bottom - 3 + j()],
    [cx + halfW - 3, bottom],
    [cx - halfW + 2.5, bottom],
  ]
  const inner = outer.map(([x, y]) => [cx - 1.4 + (x - cx) * 0.6, top + 1.5 + (y - top) * 0.32] as const)
  shadeFacets(s, outer, cutStone(outer, inner, 4), id)
  return Mask.polygon(outer)
}

/** A small rock chip painted over a crystal's foot, so it reads as grown into the rock. */
function chip(s: Sprite, id: number, cx: number, cy: number, rx: number, ry: number): void {
  const outer: Point[] = [[cx - rx, cy + ry * 0.4], [cx - rx * 0.5, cy - ry], [cx + rx * 0.6, cy - ry * 0.8], [cx + rx, cy + ry * 0.3], [cx + rx * 0.4, cy + ry], [cx - rx * 0.6, cy + ry]]
  const inner = outer.map(([x, y]) => [cx - 0.6 + (x - cx) * 0.5, cy - 0.8 + (y - cy) * 0.5] as const)
  shadeFacets(s, outer, cutStone(outer, inner, 2), id)
}

/** Lightens a few seeded pixels: glints and inclusions. */
function sprinkle(s: Sprite, seed: string, m: Mask, count: number, delta: number, minTone = 2): void {
  const r = rng(seed)
  const cells: [number, number][] = []
  m.each((x, y) => {
    if (s.toneAt(x, y) >= minTone) cells.push([x, y])
  })
  for (let i = 0; i < count && cells.length > 0; i++) {
    const [x, y] = cells.splice(Math.floor(r() * cells.length), 1)[0] ?? [0, 0]
    s.shift(x, y, delta)
  }
}

/** Soft translucent halo in the two rings just outside the outline. */
function crystalHalo(s: Sprite, m: Mask, color: string, alphas: readonly number[] = [70, 30]): void {
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (s.filled(x, y)) continue
      let best = 99
      m.each((mx, my) => {
        best = Math.min(best, Math.abs(mx - x) + Math.abs(my - y))
      })
      const a = alphas[best - 2]
      if (best >= 2 && a) s.overlay(x, y, hex(color, a))
    }
}

/** Shades flat polygons by their normals against the light. */
function facet(s: Sprite, id: number, poly: readonly Point[], normal: Vec3, bias = 0): void {
  const l = Math.max(0, normal[0] * LIGHT[0] + normal[1] * LIGHT[1] + normal[2] * LIGHT[2]) + bias
  const tone = l < 0.2 ? 1 : l < 0.45 ? 2 : l < 0.7 ? 3 : l < 0.88 ? 4 : 5
  Mask.polygon(poly).each((x, y) => s.paint(x, y, id, tone))
}

const MATRIX = ramp('#6c6470', { satShift: 0.02, lift: 0.3 })

function cluster(s: Sprite, crystal: RGBA[], points: Prism[], seed: string, look: PrismLook = {}, base: RGBA[] = MATRIX, halfW = 9.5): Mask {
  rockBase(s, s.addRamp(base), seed, 16, 18.5, halfW)
  const id = s.addRamp(crystal)
  const all = new Mask()
  for (const p of points) all.union(prism(s, id, p, look))
  return all
}

export const CRYSTALS: ItemIcon[] = [
  {
    id: 'quartz',
    name: 'Quartz',
    grade: 1,
    paint: (s) => {
      // Clear points fanning up from the rock, a few glinting.
      const m = cluster(s, ramp('#cfdbe6', { lift: 0.55, drop: 0.3, hueShift: 10 }), [
        { x: 16, y: 21.5, lean: 4, w: 3, len: 11, tip: 4.5 },
        { x: 11.5, y: 21.5, lean: -26, w: 2.5, len: 7, tip: 3.2 },
        { x: 20.5, y: 21.5, lean: 24, w: 2.6, len: 8, tip: 3.4 },
        { x: 22.5, y: 22.5, lean: 56, w: 1.5, len: 2.5, tip: 2 },
      ], 'quartz')
      sprinkle(s, 'quartz', m, 4, 1, 3)
    },
  },
  {
    id: 'amethyst',
    name: 'Amethyst',
    grade: 2,
    paint: (s) => {
      // A half geode: rough shell, a pale agate band, then a cavity lined with purple points.
      const shellId = s.addRamp(ramp('#7d7064', { satShift: 0.02 }))
      const bandId = s.addRamp(ramp('#d9d2e6', { lift: 0.4 }))
      const gemId = s.addRamp(ramp('#8a4fc4', { hueShift: 6, lift: 0.4 }))
      const shell = Mask.ellipse(16, 17.5, 10.5, 8.8)
      shadeDome(s, shell, shellId)
      const band = Mask.ellipse(16.4, 17.2, 8.2, 6.6)
      band.each((x, y) => s.paint(x, y, bandId, 4))
      const cavity = Mask.ellipse(16.6, 17.2, 7, 5.5)
      const r = rng('amethyst')
      cavity.each((x, y) => {
        // Concave: the far (bottom-right) wall faces the light, the near (top-left) wall is in shadow.
        const t = (x + 0.5 - 16.6) / 7 + (y + 0.5 - 17.2) / 5.5
        let tone = t < -0.7 ? 1 : t < 0 ? 2 : t < 0.7 ? 3 : 4
        if (r() < 0.22) tone += 1
        s.paint(x, y, gemId, tone)
      })
      for (const [x, y] of [[13, 15], [18, 14], [20, 19], [15, 20], [12, 18], [17, 17]] as const) {
        s.paint(x, y, gemId, 5)
        s.paint(x + 1, y + 1, gemId, 1)
      }
    },
  },
  {
    id: 'citrine',
    name: 'Citrine',
    grade: 3,
    paint: (s) => {
      // One big chunky point with a ridge catching the light, and two small ones at its foot.
      rockBase(s, s.addRamp(MATRIX), 'citrine', 16, 19, 8.5)
      const id = s.addRamp(ramp('#efc02c', { lift: 0.48, drop: 0.32, hueShift: 10 }))
      prism(s, id, { x: 11, y: 22, lean: -30, w: 2.4, len: 4, tip: 3 })
      const big: Prism = { x: 15.5, y: 22, lean: 14, w: 4.6, len: 8.5, tip: 6 }
      const m = prism(s, id, big)
      ridge(s, id, big)
      prism(s, id, { x: 21.2, y: 22.5, lean: 36, w: 2, len: 3, tip: 2.6 })
      sprinkle(s, 'citrine', m, 3, -1, 3)
    },
  },
  {
    id: 'garnet',
    name: 'Garnet',
    grade: 4,
    paint: (s) => {
      // Rounded dodecahedral crystals sitting on rock: each a hexagon of facets around a lit core face.
      rockBase(s, s.addRamp(MATRIX), 'garnet', 16, 18.5, 9.5)
      const id = s.addRamp(ramp('#9e1f2e', { lift: 0.4, drop: 0.32, hueShift: 6 }))
      const nodule = (cx: number, cy: number, r: number) => {
        const hexPts: Point[] = []
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6
          hexPts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
        }
        const core: Point[] = [[cx - r * 0.5, cy], [cx, cy - r * 0.55], [cx + r * 0.5, cy], [cx, cy + r * 0.55]]
        for (let i = 0; i < 6; i++) {
          const a = hexPts[i] ?? [0, 0], b = hexPts[(i + 1) % 6] ?? [0, 0]
          const mid: Point = [(a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy]
          facet(s, id, [[cx, cy], a, b], normalize([mid[0], mid[1], r * 0.9]))
        }
        facet(s, id, core, normalize([-0.15, -0.2, 1]), 0.05)
      }
      nodule(12, 16.5, 5)
      nodule(20.5, 15.5, 5.6)
      nodule(15.5, 21.5, 4.2)
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    grade: 5,
    paint: (s) => {
      // Flat-topped hexagonal columns in pale host rock.
      rockBase(s, s.addRamp(ramp('#b9b2a4', { lift: 0.3, satShift: 0.02 })), 'emerald', 16, 19, 9)
      const id = s.addRamp(ramp('#21a35a', { lift: 0.4, drop: 0.3 }))
      for (const p of [
        { x: 12.5, y: 22, lean: -14, w: 2.8, len: 9, tip: 0, flat: true },
        { x: 19.5, y: 22, lean: 14, w: 3, len: 11, tip: 0, flat: true },
        { x: 16, y: 23, lean: 0, w: 3.4, len: 13, tip: 0, flat: true },
      ])
        prism(s, id, p, { striae: 4 })
    },
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    grade: 6,
    paint: (s) => {
      // Barrel-shaped bipyramids with horizontal growth bands.
      rockBase(s, s.addRamp(MATRIX), 'sapphire', 16, 19, 8.5)
      const id = s.addRamp(ramp('#2652c9', { lift: 0.42, drop: 0.32 }))
      prism(s, id, { x: 11, y: 18.5, lean: -40, w: 2.6, len: 2, tip: 4, foot: 3 }, { striae: 2 })
      const big: Prism = { x: 17, y: 15, lean: 10, w: 4.6, len: 5, tip: 7, foot: 6 }
      prism(s, id, big, { striae: 2 })
      ridge(s, id, big)
    },
  },
  {
    id: 'ruby',
    name: 'Ruby',
    grade: 7,
    paint: (s) => {
      // A spray of slim points fanning out from the rock.
      const points: Prism[] = []
      for (const [lean, len, w] of [[-58, 7, 1.6], [-36, 9, 1.8], [-14, 11, 2], [6, 12, 2.1], [26, 10, 1.9], [46, 8, 1.7], [64, 6, 1.5]] as const)
        points.push({ x: 16 + lean / 22, y: 21.5, lean, w, len, tip: 2.6 })
      cluster(s, ramp('#e0284f', { lift: 0.42, drop: 0.3, hueShift: 6 }), points, 'ruby')
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    grade: 8,
    paint: (s) => {
      // A rough octahedron half sunk in dark kimberlite, frosted rather than polished.
      const id = s.addRamp(ramp('#c4effa', { lift: 0.6, drop: 0.28, hueShift: 10 }))
      const top: Point = [16.5, 4.5], bottom: Point = [16, 24], left: Point = [8.5, 14], right: Point = [24.5, 13.5], front: Point = [14.5, 15]
      facet(s, id, [top, left, front], normalize([-0.8, -0.5, 0.9]))
      facet(s, id, [top, front, right], normalize([0.6, -0.6, 0.9]))
      facet(s, id, [left, bottom, front], normalize([-0.6, 0.6, 0.9]))
      facet(s, id, [front, bottom, right], normalize([0.6, 0.7, 0.8]))
      const gem = Mask.polygon([top, right, bottom, left])
      sprinkle(s, 'diamond-frost', gem, 10, -1, 3)
      // Craggy kimberlite closing around the crystal's lower half.
      const rockId = s.addRamp(ramp('#4c5568', { lift: 0.32, satShift: 0.02 }))
      chip(s, rockId, 10.5, 21, 4.4, 4.2)
      chip(s, rockId, 22, 20.5, 4, 4.4)
      chip(s, rockId, 15.5, 23.4, 7.2, 3)
    },
  },
  {
    id: 'starstone',
    name: 'Starstone',
    grade: 9,
    paint: (s) => {
      // Deep blue points with starlight caught inside them: two four-pointed stars and a scatter of single motes.
      const m = cluster(s, ramp('#2536a0', { lift: 0.5, drop: 0.4, hueShift: 16 }), [
        { x: 16, y: 21.5, lean: 2, w: 3.6, len: 12, tip: 5.5 },
        { x: 11.5, y: 21.5, lean: -22, w: 2.6, len: 6, tip: 3.2 },
        { x: 20.5, y: 21.5, lean: 24, w: 2.6, len: 7, tip: 3.4 },
      ], 'starstone', {}, ramp('#3b3550'), 8)
      for (const [x, y, big] of [[16, 11, true], [12, 17, false], [20, 16, false], [17, 18, true], [15, 7, false], [14, 14, false]] as const) {
        if (!m.get(x, y)) continue
        s.overlay(x, y, hex('#ffffff'))
        if (big) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) if (m.get(x + dx, y + dy)) s.overlay(x + dx, y + dy, hex('#bcd0ff', 200))
      }
      crystalHalo(s, m, '#7a8cff')
    },
  },
  {
    id: 'philosophers-stone',
    name: "Philosopher's Stone",
    grade: 10,
    paint: (s) => {
      // A rough red stone lit from within: crimson facets around a glowing heart.
      const shell = s.addRamp(ramp('#c8182e', { lift: 0.42, drop: 0.36, hueShift: 10 }))
      const heart = s.addRamp(ramp('#ff5a3a', { lift: 0.62, drop: 0.25, hueShift: 18 }))
      const outer: Point[] = [[16, 5], [22.5, 9], [24.5, 16], [21.5, 24.5], [14, 26], [8.5, 20.5], [9, 11]]
      const inner: Point[] = [[15.5, 9.5], [19.5, 11.5], [20.5, 16], [18.5, 20.5], [14, 21], [11.5, 17.5], [12, 12.5]]
      const m = Mask.polygon(outer)
      shadeFacets(s, outer, cutStone(outer, inner, 6), shell)
      const cx = 16, cy = 16
      m.each((x, y) => {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
        const checker = (x + y) % 2 === 0
        if (d < 1.6) s.paint(x, y, heart, 5)
        else if (d < 3) s.paint(x, y, heart, 4)
        else if (d < 4.2 || (d < 5.2 && checker)) s.paint(x, y, heart, 3)
        else if (d < 6.5 && s.toneAt(x, y) < 4) s.shift(x, y, 1)
      })
      crystalHalo(s, m, '#ff4d3a', [55, 22])
    },
  },
]
