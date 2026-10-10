// Cut gems (Workbench, refined Crystals): uma-rpg docs/design/items.md#crystals. Faceted stones face up, each in its
// own cut (hexagon, oval, cushion, brilliant, emerald cut, pear, heart, diamond profile, star, trillion).
import { ramp, type RampOptions } from '../../color.ts'
import { cutStone, Mask, shadeFacets, type Point } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bloom, halo } from './workbench-kit.ts'

const CX = 16
const CY = 16.5

function polygon(n: number, rx: number, ry: number, rot = 0, cx = CX, cy = CY): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((i + rot) / n) * Math.PI * 2 - Math.PI / 2
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const
  })
}

function centroid(pts: readonly Point[]): Point {
  return [pts.reduce((n, p) => n + p[0], 0) / pts.length, pts.reduce((n, p) => n + p[1], 0) / pts.length]
}

/** The table: the outline shrunk toward its center and nudged up-left, as if the stone tilts toward the light. */
function table(outer: readonly Point[], k: number, nudge = 0.8): Point[] {
  const [cx, cy] = centroid(outer)
  return outer.map(([x, y]) => [cx - nudge + (x - cx) * k, cy - nudge + (y - cy) * k] as const)
}

/** Glassy finish on the table: a lit upper-left corner, a dark reflection lower right, and a sparkle. */
function tableShine(s: Sprite, id: number, inner: readonly Point[]): void {
  const m = Mask.polygon(inner)
  const [cx, cy] = centroid(inner)
  m.each((x, y) => {
    const u = x + 0.5 - cx, v = y + 0.5 - cy
    if (u + v < -3.2) s.paint(x, y, id, 5)
    else if (u + v > 2.6 && u - v < 2) s.paint(x, y, id, 3)
  })
  // Inner edge of the table: a thin bright rim on the upper left.
  m.each((x, y) => {
    if ((!m.get(x - 1, y) || !m.get(x, y - 1)) && s.toneAt(x, y) === 4) s.paint(x, y, id, 5)
  })
}

function facetedGem(s: Sprite, id: number, outer: Point[], k = 0.55, height = 5, nudge = 0.8): Point[] {
  const inner = table(outer, k, nudge)
  shadeFacets(s, outer, cutStone(outer, inner, height), id)
  tableShine(s, id, inner)
  return inner
}

/** Star facets: lines from each table corner to the girdle, alternating light and dark. */
function starFacets(s: Sprite, outer: readonly Point[], inner: readonly Point[]): void {
  const m = Mask.polygon(outer)
  const n = outer.length
  for (let i = 0; i < n; i += 2) {
    const a = inner[i] ?? [0, 0], b = outer[(i + 1) % n] ?? [0, 0]
    const steps = 8
    for (let t = 0.15; t < 0.95; t += 1 / steps) {
      const x = Math.floor(a[0] + (b[0] - a[0]) * t), y = Math.floor(a[1] + (b[1] - a[1]) * t)
      if (m.get(x, y)) s.shift(x, y, s.toneAt(x, y) >= 3 ? 1 : -1)
    }
  }
}

interface GemSpec {
  id: string
  name: string
  grade: number
  color: string
  colorRamp?: RampOptions
  paint: (s: Sprite, id: number) => void
}

const GEM: RampOptions = { lift: 0.42, drop: 0.3, hueShift: 10, satShift: 0.04 }

function pear(): Point[] {
  const pts: Point[] = [[CX, CY - 10]]
  const cy = CY + 2.6, r = 6.8
  for (let a = -30; a <= 210; a += 24) {
    const t = (a * Math.PI) / 180
    pts.push([CX + Math.cos(t) * r, cy + Math.sin(t) * r * 1.02])
  }
  return pts
}

function heart(): Point[] {
  const pts: Point[] = []
  // Right lobe, bottom point, left lobe, center notch.
  for (let a = -160; a <= 40; a += 25) {
    const t = (a * Math.PI) / 180
    pts.push([CX + 4.6 + Math.cos(t) * 4.8, CY - 3 + Math.sin(t) * 4.8])
  }
  pts.push([CX, CY + 8.5])
  for (let a = 140; a <= 340; a += 25) {
    const t = (a * Math.PI) / 180
    pts.push([CX - 4.6 + Math.cos(t) * 4.8, CY - 3 + Math.sin(t) * 4.8])
  }
  pts.push([CX, CY - 4.2])
  return pts
}

/** A classic gem in profile: a faceted crown over a pointed pavilion. */
function profileGem(s: Sprite, id: number): void {
  const top = 8, girdle = 13, tip = 26
  const xl = 6.5, xr = 25.5, tl = 11, tr = 21
  // Crown facets (left to right) and pavilion facets, with fixed tones for a crisp light-to-dark spread.
  const crown: [Point[], number][] = [
    [[[xl, girdle], [tl, top], [13.5, top], [11, girdle]], 4],
    [[[11, girdle], [13.5, top], [18.5, top], [16, girdle]], 5],
    [[[16, girdle], [18.5, top], [tr, top], [21, girdle]], 4],
    [[[21, girdle], [tr, top], [xr, girdle]], 3],
  ]
  const pavilion: [Point[], number][] = [
    [[[xl, girdle], [11, girdle], [16, tip]], 4],
    [[[11, girdle], [16, girdle], [16, tip]], 3],
    [[[16, girdle], [21, girdle], [16, tip]], 2],
    [[[21, girdle], [xr, girdle], [16, tip]], 1],
  ]
  const outline = Mask.polygon([[xl, girdle], [tl, top], [tr, top], [xr, girdle], [16, tip]])
  outline.each((x, y) => s.paint(x, y, id, 3))
  for (const [poly, tone] of [...crown, ...pavilion]) Mask.polygon(poly).each((x, y) => s.paint(x, y, id, tone))
  // The girdle: a thin bright band.
  for (let x = 7; x <= 25; x++) if (outline.get(x, girdle)) s.paint(x, girdle, id, x < 16 ? 5 : 4)
  // Table edge.
  for (let x = 11; x <= 20; x++) if (outline.get(x, top)) s.paint(x, top, id, 5)
}

function star(): Point[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 10.5 : 5
    return [CX + Math.cos(a) * r, CY + 0.5 + Math.sin(a) * r] as const
  })
}

const SPECS: GemSpec[] = [
  {
    id: 'cut-quartz',
    name: 'Cut Quartz',
    grade: 1,
    color: '#d9d4ea',
    colorRamp: { lift: 0.5, drop: 0.3, hueShift: 12, satShift: 0.03 },
    paint: (s, id) => {
      facetedGem(s, id, polygon(6, 10.4, 9.6, 0.5), 0.55, 5)
    },
  },
  {
    id: 'cut-amethyst',
    name: 'Cut Amethyst',
    grade: 2,
    color: '#9a55d2',
    paint: (s, id) => {
      const outer = polygon(14, 8, 10.2)
      const inner = facetedGem(s, id, outer, 0.5, 5)
      starFacets(s, outer, inner)
    },
  },
  {
    id: 'cut-citrine',
    name: 'Cut Citrine',
    grade: 3,
    color: '#f1ad2c',
    paint: (s, id) => {
      // Cushion: a square with softly cut corners.
      const r = 9.6, c = 3.2
      const outer: Point[] = [
        [CX - r + c, CY - r], [CX + r - c, CY - r], [CX + r, CY - r + c], [CX + r, CY + r - c],
        [CX + r - c, CY + r], [CX - r + c, CY + r], [CX - r, CY + r - c], [CX - r, CY - r + c],
      ]
      facetedGem(s, id, outer, 0.52, 5)
    },
  },
  {
    id: 'cut-garnet',
    name: 'Cut Garnet',
    grade: 4,
    color: '#a51e3a',
    colorRamp: { lift: 0.4, drop: 0.32, hueShift: 8, satShift: 0.04 },
    paint: (s, id) => {
      facetedGem(s, id, polygon(16, 10, 10), 0.5, 5)
    },
  },
  {
    id: 'cut-emerald',
    name: 'Cut Emerald',
    grade: 5,
    color: '#25a95a',
    paint: (s, id) => {
      // Emerald cut: a step-cut octagon, two rings of steps around a long table.
      const w = 7.6, h = 10.4, c = 2.6
      const outer: Point[] = [
        [CX - w + c, CY - h], [CX + w - c, CY - h], [CX + w, CY - h + c], [CX + w, CY + h - c],
        [CX + w - c, CY + h], [CX - w + c, CY + h], [CX - w, CY + h - c], [CX - w, CY - h + c],
      ]
      const mid = table(outer, 0.74, 0.4)
      shadeFacets(s, outer, cutStone(outer, mid, 3), id)
      const inner = table(outer, 0.46, 0.8)
      shadeFacets(s, mid, cutStone(mid, inner, 3), id)
      tableShine(s, id, inner)
    },
  },
  {
    id: 'cut-sapphire',
    name: 'Cut Sapphire',
    grade: 6,
    color: '#2c5bd6',
    paint: (s, id) => {
      const outer = pear()
      const inner = facetedGem(s, id, outer, 0.5, 5)
      starFacets(s, outer, inner)
    },
  },
  {
    id: 'cut-ruby',
    name: 'Cut Ruby',
    grade: 7,
    color: '#e3243f',
    paint: (s, id) => {
      facetedGem(s, id, heart(), 0.5, 5, 0.6)
    },
  },
  {
    id: 'cut-diamond',
    name: 'Cut Diamond',
    grade: 8,
    color: '#cfeefb',
    colorRamp: { lift: 0.6, drop: 0.32, hueShift: 14, satShift: 0.02 },
    paint: (s, id) => {
      profileGem(s, id)
      s.overlay(12, 9, [255, 255, 255, 230])
      s.overlay(9, 13, [255, 255, 255, 160])
    },
  },
  {
    id: 'cut-starstone',
    name: 'Cut Starstone',
    grade: 9,
    color: '#1f3fae',
    colorRamp: { lift: 0.45, drop: 0.34, hueShift: 14, satShift: 0.05 },
    paint: (s, id) => {
      const outer = star()
      facetedGem(s, id, outer, 0.42, 6, 0.4)
      // A starburst of light in the heart of the stone.
      const core = s.addRamp(ramp('#cfe0ff', { lift: 0.6 }))
      const [cx, cy] = [16, 16]
      for (const [dx, dy, t] of [[0, 0, 5], [-1, 0, 4], [1, 0, 4], [0, -1, 4], [0, 1, 4], [-2, 0, 3], [2, 0, 3], [0, -2, 3], [0, 2, 3], [-1, -1, 3], [1, 1, 3], [1, -1, 3], [-1, 1, 3]] as const) s.paint(cx + dx, cy + dy, core, t)
      bloom(s, cx + 0.5, cy + 0.5, 4, '#bcd4ff', 90)
      halo(s, '#7fa6ff', 60, 2)
    },
  },
  {
    id: 'cut-philosophers-stone',
    name: "Cut Philosopher's Stone",
    grade: 10,
    color: '#d8202e',
    colorRamp: { lift: 0.45, drop: 0.3, hueShift: 14, satShift: 0.04 },
    paint: (s, id) => {
      // Trillion cut: a softly curved triangle.
      const outer: Point[] = []
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2
        const b = ((i + 0.5) / 3) * Math.PI * 2 - Math.PI / 2
        outer.push([CX + Math.cos(a) * 9.6, CY + 0.6 + Math.sin(a) * 9.6])
        outer.push([CX + Math.cos(b) * 5.8, CY + 0.6 + Math.sin(b) * 5.8])
      }
      const inner = facetedGem(s, id, outer, 0.5, 6, 0.5)
      starFacets(s, outer, inner)
      bloom(s, 16, 17.5, 4.5, '#ffb070', 120)
      halo(s, '#ff6a4a', 70, 2)
    },
  },
]

export const CRYSTALS_REFINED: ItemIcon[] = SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  grade: spec.grade,
  paint: (s) => spec.paint(s, s.addRamp(ramp(spec.color, spec.colorRamp ?? GEM))),
}))
