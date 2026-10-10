// Planks (Workbench, refined Woods): uma-rpg docs/design/items.md#woods. Small piles of sawn planks seen from the
// front, the depth receding up-left so the lit cut ends show their rings: staggered stacks, pairs, crossed piles and
// tied bundles, with each wood's color and figure.
import { ramp, type RampOptions } from '../../color.ts'
import { rng } from '../../rng.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { frustum, halo, oblique, paintSolid, type PaintedFace, type V3, type View } from './workbench-kit.ts'

type Pile = 'stack' | 'pair' | 'stairs' | 'stairsLeft' | 'thin' | 'bundle'
type Figure = 'plain' | 'knots' | 'lenticels' | 'flame' | 'rays' | 'sheen' | 'glow' | 'sprout'

interface PlankSpec {
  id: string
  name: string
  grade: number
  wood: string
  woodRamp?: RampOptions
  /** Grain line color (defaults to the wood's own ramp). */
  grain?: string
  pile: Pile
  figure: Figure
  /** Band color for tied bundles. */
  tie?: string
  glow?: string
}

const T = 4
const W = 6

interface Plank {
  faces: PaintedFace[]
  mask: Mask
}

const face = (p: Plank, tag: string) => p.faces.find((f) => f.tag === tag)

function plank(s: Sprite, v: View, id: number, at: V3, L: number, thick: number): Plank {
  const faces = paintSolid(s, v, frustum(L, W, L, W, thick, at), id, { tones: { top: 4, '-y': 3, '+y': 3, '-x': 4, '+x': 4 } })
  const mask = new Mask()
  for (const f of faces) mask.union(f.mask)
  return { faces, mask }
}

/** Rows of a face mask, top to bottom, each as its sorted x list. */
function rows(m: Mask): [number, number[]][] {
  const out = new Map<number, number[]>()
  m.each((x, y) => out.set(y, [...(out.get(y) ?? []), x]))
  return [...out.entries()].sort((a, b) => a[0] - b[0])
}

/** A grain line along a row, broken at seeded points. */
function grainRow(s: Sprite, xs: number[], y: number, id: number, tone: number, r: () => number): void {
  const gapA = Math.floor(r() * xs.length * 0.4) + 1, gapB = Math.floor(xs.length * 0.55 + r() * xs.length * 0.3)
  xs.forEach((x, i) => {
    if (i === 0 || i === xs.length - 1) return
    if (Math.abs(i - gapA) <= 1 || Math.abs(i - gapB) <= 0) return
    s.paint(x, y, id, tone)
  })
}

function dressPlank(s: Sprite, spec: PlankSpec, p: Plank, id: number, grainId: number, seed: string): void {
  const r = rng(seed)
  const top = face(p, 'top')
  // The long side faces the viewer; the sawn end shows on the left.
  const front = face(p, '-y')
  const end = face(p, '-x')
  if (front) {
    const fr = rows(front.mask)
    fr.forEach(([y, xs], i) => {
      if (i === fr.length - 1) for (const x of xs) s.paint(x, y, id, 2)
      else if (i === 0) for (const x of xs) s.paint(x, y, id, 4)
      else if (i === Math.floor(fr.length / 2)) grainRow(s, xs, y, grainId, 2, r)
    })
  }
  if (end) endRings(s, end, id, grainId)
  if (top) {
    const tr = rows(top.mask)
    tr.forEach(([y, xs], i) => {
      if (i === tr.length - 1) for (const x of xs) s.paint(x, y, id, 5)
      else if (i === 1) grainRow(s, xs, y, grainId, 3, r)
    })
    figure(s, spec, p, top, front, id, grainId, `${seed}-figure`)
  }
}

/** Growth rings on a sawn end: a lighter face, a ring and a dark pith. */
function endRings(s: Sprite, end: PaintedFace, id: number, grainId: number): void {
  const cells: [number, number][] = []
  end.mask.each((x, y) => cells.push([x, y]))
  for (const [x, y] of cells) s.paint(x, y, id, 4)
  const cx = cells.reduce((n, c) => n + c[0], 0) / Math.max(1, cells.length)
  const cy = cells.reduce((n, c) => n + c[1], 0) / Math.max(1, cells.length)
  for (const [x, y] of cells) {
    const d = Math.hypot(x - cx, y - cy)
    if (d >= 1.1 && d < 2.1) s.paint(x, y, grainId, 3)
  }
  s.paint(Math.round(cx), Math.round(cy), grainId, 2)
  for (const [x, y] of cells) if (!end.mask.get(x, y + 1)) s.paint(x, y, id, 3)
}

function figure(s: Sprite, spec: PlankSpec, p: Plank, top: PaintedFace, front: PaintedFace | undefined, id: number, grainId: number, seed: string): void {
  const r = rng(seed)
  const topCells: [number, number][] = []
  top.mask.each((x, y) => topCells.push([x, y]))
  const frontCells: [number, number][] = []
  front?.mask.each((x, y) => frontCells.push([x, y]))
  const pick = (cells: [number, number][], ok: (x: number, y: number) => boolean) => {
    for (let i = 0; i < 40; i++) {
      const c = cells[Math.floor(r() * cells.length)]
      if (c && ok(c[0], c[1])) return c
    }
    return null
  }
  const interior = (m: Mask) => (x: number, y: number) => m.get(x - 2, y) && m.get(x + 2, y) && m.get(x, y - 1) && m.get(x, y + 1)
  if (spec.figure === 'knots' && front) {
    // Pine: a dark knot on the face and one on the top.
    for (const [cells, m] of [[frontCells, front.mask], [topCells, top.mask]] as const) {
      const c = pick(cells, interior(m))
      if (!c) continue
      const [x, y] = c
      s.paint(x, y, grainId, 1)
      s.paint(x + 1, y, grainId, 2)
      s.paint(x - 1, y, grainId, 3)
    }
  } else if (spec.figure === 'lenticels') {
    // Birch: short dark dashes across the boards.
    for (const [cells, m, n] of [[frontCells, front?.mask, 3], [topCells, top.mask, 2]] as const) {
      if (!m) continue
      for (let k = 0; k < n; k++) {
        const c = pick(cells, (x, y) => m.get(x - 1, y) && m.get(x + 2, y) && s.mat[y * s.w + x] === id)
        if (!c) continue
        s.paint(c[0], c[1], grainId, 2)
        s.paint(c[0] + 1, c[1], grainId, 2)
      }
    }
  } else if (spec.figure === 'flame') {
    // Maple: soft light ripples across the front.
    for (const [x, y] of frontCells) if (x % 3 === 0 && s.mat[y * s.w + x] === id && s.toneAt(x, y) === 3) s.paint(x, y, id, 4)
  } else if (spec.figure === 'rays') {
    // Oak: small bright ray flecks.
    for (const [x, y] of [...topCells, ...frontCells]) if (r() < 0.1 && s.mat[y * s.w + x] === id && s.toneAt(x, y) >= 3) s.paint(x, y, id, s.toneAt(x, y) + 1)
  } else if (spec.figure === 'sheen' && front) {
    // Polished ebony: two slanted shines across the front and top.
    const minX = Math.min(...frontCells.map((c) => c[0]))
    const maxY = Math.max(...frontCells.map((c) => c[1]))
    for (const c0 of [minX + 4 + maxY, minX + 11 + maxY])
      for (const [x, y] of [...frontCells, ...topCells]) {
        const k = x + y - c0
        if (k === 0 || k === 1) s.paint(x, y, id, Math.min(5, s.toneAt(x, y) + 2))
      }
  } else if (spec.figure === 'glow' || spec.figure === 'sprout') {
    // Luminous grain: the grain lines light up.
    for (const f of p.faces)
      f.mask.each((x, y) => {
        if (s.mat[y * s.w + x] === grainId && s.toneAt(x, y) <= 3) s.paint(x, y, grainId, 5)
      })
  }
}

/** Bands around a pile at the given screen columns, with a lit knot on the front. */
function bands(s: Sprite, planks: Plank[], tieId: number, xs: number[]): void {
  const all = new Mask().union(...planks.map((p) => p.mask))
  for (const p of planks) {
    const top = face(p, 'top')
    p.mask.each((x, y) => {
      if (!xs.includes(x)) return
      const onTop = top?.mask.get(x, y) ?? false
      s.paint(x, y, tieId, onTop ? 4 : 3)
    })
  }
  for (const x0 of xs) {
    let lowest = -1
    for (let y = 0; y < 32; y++) if (all.get(x0, y)) lowest = y
    if (lowest > 0) s.paint(x0, lowest - 3, tieId, 5)
  }
}

function paintPlanks(spec: PlankSpec): (s: Sprite) => void {
  return (s) => {
    const id = s.addRamp(ramp(spec.wood, spec.woodRamp ?? { hueShift: 8, satShift: 0.04, lift: 0.3, drop: 0.26 }))
    const grainId = s.addRamp(ramp(spec.grain ?? spec.wood, spec.grain ? { lift: 0.45, drop: 0.25 } : { hueShift: 10, drop: 0.32 }))
    const legendary = spec.grade >= 9
    // Legendary piles sit a little right and shorter, clear of the glints.
    const L = legendary ? 14 : 17
    const v = oblique(legendary ? 17.6 : 16, 25, -0.5, 0.5)
    const planks: Plank[] = []
    const add = (at: V3, len: number, thick = T) => {
      const below = new Mask().union(...planks.map((p) => p.mask))
      const p = plank(s, v, id, at, len, thick)
      p.mask.each((x, y) => {
        if (!p.mask.get(x, y + 1) && below.get(x, y + 1)) s.shift(x, y + 1, -2)
      })
      planks.push(p)
    }
    if (spec.pile === 'stack') {
      add([-0.5, 0, 0], L)
      add([1.5, 0, T], L)
      add([-1.5, 0, 2 * T], L)
    } else if (spec.pile === 'pair') {
      add([-1.5, 0, 0], L)
      add([1.5, 0, T], L)
    } else if (spec.pile === 'stairs') {
      add([-2.5, 0, 0], L - 2)
      add([0, 0, T], L - 2)
      add([2.5, 0, 2 * T], L - 2)
    } else if (spec.pile === 'stairsLeft') {
      add([2.5, 0, 0], L - 2)
      add([0, 0, T], L - 2)
      add([-2.5, 0, 2 * T], L - 2)
    } else if (spec.pile === 'thin') {
      add([-1, 0, 0], L, 3)
      add([1, 0, 3], L, 3)
      add([-0.5, 0, 6], L, 3)
      add([1.5, 0, 9], L, 3)
    } else {
      add([0, 0, 0], L)
      add([0, 0, T], L)
      add([0, 0, 2 * T], L)
    }
    planks.forEach((p, i) => dressPlank(s, spec, p, id, grainId, `${spec.id}-${i}`))
    if (spec.tie) {
      // Bands at a quarter and three quarters along the bottom board's front.
      const front = planks[0]?.faces.find((f) => f.tag === '-y')
      let x0 = 99, x1 = -1
      front?.mask.each((x) => {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      })
      bands(s, planks, s.addRamp(ramp(spec.tie, { lift: 0.35 })), [Math.round(x0 + (x1 - x0) * 0.25), Math.round(x0 + (x1 - x0) * 0.75)])
    }
    if (spec.figure === 'sprout') {
      const leaf = s.addRamp(ramp('#86d150', { lift: 0.4 }))
      // A sprig still growing from the top board.
      const sx = 18, sy = 11
      for (const [dx, dy, t] of [[0, 0, 2], [0, -1, 3], [0, -2, 3], [-1, -3, 4], [-2, -3, 5], [-3, -4, 4], [-2, -4, 4], [1, -3, 4], [2, -4, 5], [3, -4, 4], [2, -5, 4]] as const) s.paint(sx + dx, sy + dy, leaf, t)
    }
    if (spec.glow) halo(s, spec.glow, 55, 2)
  }
}

const SPECS: PlankSpec[] = [
  { id: 'pine-plank', name: 'Pine Plank', grade: 1, wood: '#e0ab5a', pile: 'stack', figure: 'knots' },
  { id: 'birch-plank', name: 'Birch Plank', grade: 2, wood: '#efe0bd', woodRamp: { hueShift: 6, satShift: 0.03, lift: 0.3, drop: 0.2 }, grain: '#6d5a45', pile: 'pair', figure: 'lenticels' },
  { id: 'cedar-plank', name: 'Cedar Plank', grade: 3, wood: '#c46c47', pile: 'bundle', figure: 'plain', tie: '#d8c08a' },
  { id: 'maple-plank', name: 'Maple Plank', grade: 4, wood: '#ecd2a6', pile: 'stairs', figure: 'flame' },
  { id: 'oak-plank', name: 'Oak Plank', grade: 5, wood: '#ad7a45', pile: 'stairsLeft', figure: 'rays' },
  { id: 'cherry-plank', name: 'Cherry Plank', grade: 6, wood: '#b4553c', pile: 'thin', figure: 'plain' },
  { id: 'mahogany-plank', name: 'Mahogany Plank', grade: 7, wood: '#7c3427', woodRamp: { hueShift: 8, satShift: 0.04, lift: 0.34, drop: 0.28 }, pile: 'pair', figure: 'plain', tie: '#d9a548' },
  { id: 'ebony-plank', name: 'Ebony Plank', grade: 8, wood: '#352c2e', woodRamp: { hueShift: 10, satShift: 0.03, lift: 0.3, drop: 0.3 }, pile: 'stack', figure: 'sheen' },
  { id: 'elderwood-plank', name: 'Elderwood Plank', grade: 9, wood: '#5b5168', woodRamp: { hueShift: 8, satShift: 0.03, lift: 0.3, drop: 0.28 }, grain: '#8ff0d8', pile: 'stack', figure: 'glow', glow: '#9ff7e3' },
  { id: 'yggdrasil-plank', name: 'Yggdrasil Plank', grade: 10, wood: '#c9c45a', woodRamp: { hueShift: 10, satShift: 0.04, lift: 0.4, drop: 0.28 }, grain: '#f6ffb0', pile: 'bundle', figure: 'sprout', tie: '#7fbf4a', glow: '#e6ff9a' },
]

export const WOODS_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintPlanks(spec) }))
