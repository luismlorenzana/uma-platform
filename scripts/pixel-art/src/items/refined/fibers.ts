// Cloth (Workbench, refined Fibers): uma-rpg docs/design/items.md#fibers. Folded cloth stacked in soft layers: each
// cloth has its own weave, and ties, fringes, a draped corner or a pattern set the stacks apart.
import { ramp, type RampOptions } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { bloom, frustum, halo, oblique, paintSolid, type PaintedFace, type View } from './workbench-kit.ts'

type Weave = 'fine' | 'coarse' | 'ribbed' | 'soft' | 'knit' | 'fuzzy' | 'smooth' | 'sheen' | 'moon' | 'cloud'
type Extra = 'none' | 'hem' | 'twine' | 'ribbon' | 'fringe' | 'flap' | 'moon'

interface ClothSpec {
  id: string
  name: string
  grade: number
  cloth: string
  clothRamp?: RampOptions
  /** Layer thicknesses, bottom first. */
  layers: number[]
  weave: Weave
  extra: Extra
  /** Second color: tie, pattern or trim. */
  accent?: string
  glow?: string
}

interface Layer {
  top: PaintedFace | undefined
  front: PaintedFace | undefined
  side: PaintedFace | undefined
  mask: Mask
}

const K = 0.45

function rows(m: Mask): [number, number[]][] {
  const out = new Map<number, number[]>()
  m.each((x, y) => out.set(y, [...(out.get(y) ?? []), x]))
  return [...out.entries()].sort((a, b) => a[0] - b[0])
}

function layer(s: Sprite, v: View, id: number, z: number, h: number, L: number, D: number, dx: number): Layer {
  const faces = paintSolid(s, v, frustum(L, D, L, D, h, [dx, 0, z]), id, { tones: { top: 4, '-y': 3, '+x': 2, '-x': 3 } })
  const mask = new Mask()
  for (const f of faces) mask.union(f.mask)
  const front = faces.find((f) => f.tag === '-y')
  const side = faces.find((f) => f.tag === '-x')
  if (front) {
    // The fold: a rounded edge, lit on top and shadowed underneath.
    const fr = rows(front.mask)
    fr.forEach(([y, xs], i) => {
      const t = fr.length <= 2 ? (i === 0 ? 4 : 2) : i === 0 ? 4 : i === fr.length - 1 ? 2 : 3
      for (const x of xs) s.paint(x, y, id, t)
    })
    // Rounded outer ends of the fold.
    const first = fr[0], last = fr[fr.length - 1]
    if (first && last) {
      const xa = first[1][first[1].length - 1] ?? 0, xb = last[1][last[1].length - 1] ?? 0
      s.mat[first[0] * s.w + xa] = -1
      s.mat[last[0] * s.w + xb] = -1
      mask.set(xa, first[0], false)
      mask.set(xb, last[0], false)
    }
  }
  if (side) {
    // The lit side: soft folds, with a dark crease at the foot.
    const sr = rows(side.mask)
    sr.forEach(([y, xs], i) => {
      for (const x of xs) s.paint(x, y, id, i >= sr.length - 1 ? 2 : 3)
    })
  }
  return { top: faces.find((f) => f.tag === 'top'), front, side, mask }
}

function weave(s: Sprite, spec: ClothSpec, layers: Layer[], id: number, accentId: number): void {
  const r = rng(`${spec.id}-weave`)
  const own = (x: number, y: number) => s.mat[y * s.w + x] === id
  for (const [li, l] of layers.entries()) {
    const faces = [l.top, l.front].filter((f): f is PaintedFace => !!f)
    for (const f of faces) {
      const isTop = f === l.top
      f.mask.each((x, y) => {
        if (!own(x, y)) return
        const t = s.toneAt(x, y)
        switch (spec.weave) {
          case 'fine':
            if (isTop && (x + y * 2) % 5 === 0) s.paint(x, y, id, t - 1)
            break
          case 'coarse':
            if ((x + y) % 2 === 0) s.paint(x, y, id, isTop ? t - 1 : Math.max(1, t - 1))
            break
          case 'ribbed':
            // Canvas twill: fine diagonal lines.
            if ((x + y) % 3 === 0) s.paint(x, y, id, Math.max(2, t - 1))
            break
          case 'soft':
            if (isTop && r() < 0.06) s.paint(x, y, id, 5)
            break
          case 'knit': {
            // Rows of little V stitches on top, knit columns on the folds.
            const m = (((x + (y % 2 === 0 ? 0 : 1)) % 4) + 4) % 4
            if (isTop ? m === 0 || m === 3 : x % 2 === 0 && t === 3) s.paint(x, y, id, t - 1)
            break
          }
          case 'fuzzy':
            if (r() < 0.16) s.paint(x, y, id, Math.min(5, t + 1))
            break
          case 'smooth':
            break
          case 'sheen':
          case 'moon':
          case 'cloud':
            break
        }
      })
    }
    if (spec.weave === 'sheen' || spec.weave === 'moon') {
      // A bright diagonal sheen across the top and each fold.
      l.top?.mask.each((x, y) => {
        const k = (x - y + 32) % 11
        if (k === 0 || k === 1) s.paint(x, y, id, 5)
      })
      l.front?.mask.each((x, y) => {
        if ((x + li * 4) % 11 === 3 && s.toneAt(x, y) === 3) s.paint(x, y, id, 4)
      })
    }
    if (spec.weave === 'cloud') {
      // White cloud puffs drifting across.
      for (const f of [l.top, l.front]) {
        if (!f) continue
        const rs = rows(f.mask)
        const pick = rs[Math.floor(rs.length / 2)]
        if (!pick) continue
        const [y, xs] = pick
        const start = (xs[0] ?? 0) + 2 + Math.floor(r() * 4) + li * 3
        for (const [ddx, ddy] of [[0, 0], [1, 0], [2, 0], [3, 0], [1, -1], [2, -1]] as const)
          if (f.mask.get(start + ddx, y + ddy)) s.paint(start + ddx, y + ddy, accentId, f === l.top ? 5 : 4)
      }
    }
  }
}

function paintCloth(spec: ClothSpec): (s: Sprite) => void {
  return (s) => {
    const id = s.addRamp(ramp(spec.cloth, spec.clothRamp ?? { hueShift: 8, satShift: 0.04, lift: 0.3, drop: 0.24 }))
    const accentId = s.addRamp(ramp(spec.accent ?? spec.cloth, { lift: 0.4, drop: 0.25 }))
    const legendary = spec.grade >= 9
    const L = legendary ? 15 : 18
    const D = 11
    const v = oblique(legendary ? 17.6 : 16, 26.4 - (D * K) / 2, -K, K)
    const layers: Layer[] = []
    let z = 0
    spec.layers.forEach((h, i) => {
      const below = new Mask().union(...layers.map((l) => l.mask))
      const shift = i % 2 === 0 ? 0 : 0.8
      const l = layer(s, v, id, z, h, L - i * 0.6, D - i * 0.4, shift)
      // Each fold presses into the one below.
      l.mask.each((x, y) => {
        if (!l.mask.get(x, y + 1) && below.get(x, y + 1)) s.paint(x, y + 1, s.mat[(y + 1) * s.w + x] ?? id, 1)
      })
      layers.push(l)
      z += h
    })
    weave(s, spec, layers, id, accentId)
    const topLayer = layers[layers.length - 1]
    if (!topLayer) return
    const all = new Mask().union(...layers.map((l) => l.mask))
    if (spec.extra === 'hem' && topLayer.front) {
      // A running stitch along the top fold.
      const rs = rows(topLayer.front.mask)
      const row = rs[Math.min(1, rs.length - 1)]
      if (row) row[1].forEach((x, i) => i % 2 === 1 && i < row[1].length - 1 && s.paint(x, row[0], accentId, 4))
    }
    if (spec.extra === 'twine' || spec.extra === 'ribbon') {
      // A band up the front and back across the top, following the depth.
      const bx = 17
      let frontTopY = 99
      all.each((x, y) => {
        if (x === bx && topLayer.front?.mask.get(x, y)) frontTopY = Math.min(frontTopY, y)
      })
      all.each((x, y) => {
        const onTop = topLayer.top?.mask.get(x, y) ?? false
        const hit = onTop ? bx - x === frontTopY - 1 - y || bx - x === frontTopY - y : x === bx || (spec.extra === 'ribbon' && x === bx + 1)
        if (!hit) return
        const t = onTop ? 4 : layers.some((l) => l.side?.mask.get(x, y)) ? 2 : 3
        s.paint(x, y, accentId, t)
      })
      if (spec.extra === 'ribbon' && topLayer.front) {
        // A bow on the top fold, its tails hanging over the folds below.
        const rs = rows(topLayer.front.mask)
        const y0 = (rs[0]?.[0] ?? frontTopY) + 1
        const bow: [number, number, number][] = [
          [-3, -1, 4], [-2, -1, 4], [-3, 0, 3], [-1, 0, 4], [-3, 1, 2], [-2, 1, 2],
          [0, 0, 5], [1, 0, 4],
          [3, -1, 4], [4, -1, 4], [2, 0, 4], [4, 0, 3], [3, 1, 2], [4, 1, 2],
          [-1, 2, 3], [-1, 3, 2], [2, 2, 3], [2, 3, 2],
        ]
        for (const [dx, dy, t] of bow) s.paint(bx + dx, y0 + dy, accentId, t)
      }
    }
    if (spec.extra === 'fringe' && topLayer.front) {
      // Tassels hanging from the top fold.
      const rs = rows(topLayer.front.mask)
      const last = rs[rs.length - 1]
      if (last)
        last[1].forEach((x, i) => {
          if (i % 2 === 1 && i < last[1].length - 1) {
            s.paint(x, last[0] + 1, accentId, 4)
            s.paint(x, last[0] + 2, accentId, 3)
            if (i % 4 === 1) s.paint(x, last[0] + 3, accentId, 2)
          }
        })
    }
    if (spec.extra === 'flap' && topLayer.front) {
      // A loose corner draped over the folds below: a hanging triangle, lit along its left fold.
      const rs = rows(topLayer.front.mask)
      const firstRow = rs[0]
      if (firstRow) {
        const y0 = firstRow[0]
        const xr = (firstRow[1][firstRow[1].length - 1] ?? 22) - 1
        const flap = Mask.polygon([[xr - 9, y0], [xr + 1, y0], [xr - 2.5, y0 + 8.5]])
        flap.each((x, y) => {
          if (!flap.get(x, y + 1) && s.filled(x, y + 1)) s.paint(x, y + 1, s.mat[(y + 1) * s.w + x] ?? id, 1)
        })
        // Hanging, the flap faces us like the folds: lit along the fold at the top and its left edge.
        flap.each((x, y) => {
          const t = y === y0 ? 5 : !flap.get(x - 1, y) ? 4 : !flap.get(x + 1, y) || !flap.get(x, y + 1) ? 2 : 3
          s.paint(x, y, id, t)
        })
      }
    }
    if (spec.extra === 'moon' && topLayer.front) {
      // A crescent moon embroidered on the top fold, stars on the folds below.
      const rs = rows(topLayer.front.mask)
      const y0 = rs[0]?.[0] ?? 15
      const xs = rs[0]?.[1] ?? [10, 20]
      const cx = Math.round(((xs[0] ?? 10) + (xs[xs.length - 1] ?? 20)) / 2) - 1
      for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]] as const) s.paint(cx + dx, y0 + dy, accentId, 5)
      layers.slice(0, -1).forEach((l, i) => {
        const fr = rows(l.front?.mask ?? new Mask())
        const row = fr[1]
        if (!row) return
        for (const k of [0.25 + i * 0.3, 0.7 - i * 0.2]) {
          const x = row[1][Math.floor(row[1].length * k)]
          if (x !== undefined) s.paint(x, row[0], accentId, 5)
        }
      })
    }
    if (spec.glow) {
      bloom(s, 15, 15, 7, spec.glow, 50)
      halo(s, spec.glow, 60, 2)
    }
  }
}

const SPECS: ClothSpec[] = [
  { id: 'linen', name: 'Linen', grade: 1, cloth: '#d5c9a8', layers: [4, 4, 4], weave: 'fine', extra: 'hem', accent: '#8a7a5a' },
  { id: 'burlap', name: 'Burlap', grade: 2, cloth: '#b58a55', layers: [5, 5], weave: 'coarse', extra: 'twine', accent: '#e2cf9a' },
  { id: 'hemp-cloth', name: 'Hemp Cloth', grade: 3, cloth: '#a6a272', layers: [4, 4, 4], weave: 'ribbed', extra: 'none' },
  { id: 'cotton-cloth', name: 'Cotton Cloth', grade: 4, cloth: '#eeeff2', clothRamp: { hueShift: 10, satShift: 0.03, lift: 0.4, drop: 0.16 }, layers: [4, 4, 4], weave: 'soft', extra: 'ribbon', accent: '#5f8fe0' },
  { id: 'wool-cloth', name: 'Wool Cloth', grade: 5, cloth: '#e3d8bd', layers: [6, 6], weave: 'knit', extra: 'none' },
  { id: 'alpaca-cloth', name: 'Alpaca Cloth', grade: 6, cloth: '#b98256', layers: [5, 5, 4], weave: 'fuzzy', extra: 'none' },
  { id: 'cashmere-cloth', name: 'Cashmere Cloth', grade: 7, cloth: '#c9a3a6', layers: [5, 5], weave: 'smooth', extra: 'fringe', accent: '#e8d2c4' },
  { id: 'silk', name: 'Silk', grade: 8, cloth: '#d24f72', clothRamp: { hueShift: 10, satShift: 0.03, lift: 0.4, drop: 0.28 }, layers: [3, 3, 3], weave: 'sheen', extra: 'flap' },
  { id: 'moonsilk', name: 'Moonsilk', grade: 9, cloth: '#ad98ec', clothRamp: { hueShift: 10, satShift: 0.03, lift: 0.42, drop: 0.26 }, layers: [4, 4, 4], weave: 'moon', extra: 'moon', accent: '#fff6c8', glow: '#d9ccff' },
  { id: 'cloudweave', name: 'Cloudweave', grade: 10, cloth: '#7fc4f5', clothRamp: { hueShift: 8, satShift: 0.03, lift: 0.4, drop: 0.24 }, layers: [4, 4, 4], weave: 'cloud', extra: 'none', accent: '#ffffff', glow: '#cdeeff' },
]

export const FIBERS_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintCloth(spec) }))
