// Ingots (Workbench, refined Ores): uma-rpg docs/design/items.md#ores. Trapezoid metal bars cast from each ore's
// metal: single bars, pairs, a pyramid and a crossed stack, so the family varies in silhouette as well as color.
import { hex, ramp, type RampOptions } from '../../color.ts'
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import type { ItemIcon } from '../types.ts'
import { frustum, halo, oblique, onQuad, paintSolid, pixelOf, type PaintedFace, type V3, type View } from './workbench-kit.ts'

type Stack = 'single' | 'pair' | 'pyramid' | 'chunk' | 'long'
type Mark = 'none' | 'stamp' | 'dent' | 'rune' | 'molten' | 'star'

interface IngotSpec {
  id: string
  name: string
  grade: number
  metal: string
  metalRamp?: RampOptions
  stack: Stack
  mark?: Mark
  /** Glow color for magic metals. */
  glow?: string
}

interface BarSize {
  L: number
  D: number
  l: number
  d: number
  h: number
}

const FACE_TONES = { top: 4, '-y': 3, '+x': 2, '-x': 4, '+y': 2 }

interface Bar {
  faces: PaintedFace[]
  mask: Mask
  view: View
}

function bar(s: Sprite, id: number, view: View, at: V3, size: BarSize): Bar {
  const faces = paintSolid(s, view, frustum(size.L, size.D, size.l, size.d, size.h, at), id, { tones: FACE_TONES })
  const mask = new Mask()
  for (const f of faces) mask.union(f.mask)
  const top = faces.find((f) => f.tag === 'top')
  const front = faces.find((f) => f.tag === '-y')
  const right = faces.find((f) => f.tag === '+x')
  // Bevel light along the top's front and left edges, a darker foot on the front, and a lit front corner on the end.
  if (top) {
    for (let u = 0; u <= 1; u += 0.03) {
      const [x, y] = pixelOf(view, onQuad(top.pts, u, 0.04))
      if (top.mask.get(x, y)) s.paint(x, y, id, 5)
    }
    for (let w = 0; w <= 1; w += 0.05) {
      const [x, y] = pixelOf(view, onQuad(top.pts, 0.02, w))
      if (top.mask.get(x, y)) s.paint(x, y, id, 5)
    }
  }
  if (front) {
    front.mask.each((x, y) => {
      if (!front.mask.get(x, y + 1) && !s.filled(x, y + 1)) s.paint(x, y, id, 2)
    })
    // A slanted reflection band across the front face.
    for (let w = 0.1; w <= 0.9; w += 0.08) {
      const [x, y] = pixelOf(view, onQuad(front.pts, 0.13 + w * 0.08, w))
      for (const dx of [0, 1]) if (front.mask.get(x + dx, y) && s.toneAt(x + dx, y) === 3) s.paint(x + dx, y, id, 4)
    }
  }
  if (right) {
    right.mask.each((x, y) => {
      if (!right.mask.get(x, y + 1) && !s.filled(x, y + 1)) s.paint(x, y, id, 1)
    })
  }
  return { faces, mask, view }
}

/** Darkens the pixels of earlier bars just under a bar resting on them. */
function restOn(s: Sprite, upper: Mask, lowerMask: Mask): void {
  upper.each((x, y) => {
    if (!upper.get(x, y + 1) && lowerMask.get(x, y + 1)) s.paint(x, y + 1, s.mat[(y + 1) * s.w + x] ?? 0, 1)
  })
}

function paintMark(s: Sprite, b: Bar, id: number, mark: Mark, glowId: number, glow?: string): void {
  const front = b.faces.find((f) => f.tag === '-y')
  if (!front) return
  const at = (u: number, w: number) => pixelOf(b.view, onQuad(front.pts, u, w))
  const [cx, cy] = at(0.5, 0.5)
  if (mark === 'stamp') {
    // A recessed cartouche: dark upper lip, lit lower lip.
    for (let dx = -2; dx <= 2; dx++) {
      s.paint(cx + dx, cy - 1, id, 2)
      s.paint(cx + dx, cy + 1, id, 4)
    }
    s.paint(cx - 2, cy, id, 2)
    s.paint(cx + 2, cy, id, 4)
  } else if (mark === 'dent') {
    // Hammer dents of a forged bar.
    for (const [u, w] of [[0.32, 0.35], [0.5, 0.65], [0.66, 0.3], [0.8, 0.6]] as const) {
      const [x, y] = at(u, w)
      s.paint(x, y, id, 2)
      s.paint(x + 1, y, id, 4)
    }
  } else if (mark === 'star') {
    // An embossed four-point star.
    for (const [dx, dy] of [[1, 1], [2, 0], [0, 2], [1, -1], [-1, 1]] as const) s.paint(cx + dx, cy + dy, id, 2)
    for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0], [0, 1]] as const) s.paint(cx + dx, cy + dy, id, 4)
    s.paint(cx, cy, id, 5)
  } else if (mark === 'rune' || mark === 'molten') {
    // Glowing inlay across the front face.
    const cells: [number, number][] = []
    if (mark === 'rune') {
      for (const u of [0.28, 0.5, 0.72]) {
        const [x, y] = at(u, 0.5)
        cells.push([x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1])
      }
    } else {
      for (let u = 0.08; u <= 0.92; u += 0.03) cells.push(at(u, 0.48 + Math.sin(u * 13) * 0.16))
    }
    for (const [x, y] of cells) if (front.mask.get(x, y)) s.paint(x, y, glowId, 5)
    if (glow) for (const [x, y] of cells) s.overlay(x, y + 1, hex(glow, 70))
  }
}

function paintIngot(spec: IngotSpec): (s: Sprite) => void {
  return (s) => {
    const id = s.addRamp(ramp(spec.metal, spec.metalRamp ?? { lift: 0.4, drop: 0.3 }))
    const glowId = s.addRamp(ramp(spec.glow ?? spec.metal, { lift: 0.55, drop: 0.2 }))
    const bars: Bar[] = []
    const K = [0, 0.7] as const
    if (spec.stack === 'single') {
      const v = oblique(spec.grade >= 9 ? 16.6 : 16, 23, ...K)
      bars.push(bar(s, id, v, [0, 0, 0], { L: spec.grade >= 9 ? 16 : 20, D: 11, l: spec.grade >= 9 ? 11 : 13, d: 6, h: 7.5 }))
    } else if (spec.stack === 'long') {
      const v = oblique(16, 23, ...K)
      bars.push(bar(s, id, v, [0, 0, 0], { L: 22, D: 8, l: 17, d: 4.5, h: 5 }))
    } else if (spec.stack === 'chunk') {
      const v = oblique(16, 23.5, ...K)
      bars.push(bar(s, id, v, [0, 0, 0], { L: 17, D: 11, l: 11, d: 6.5, h: 8.5 }))
    } else if (spec.stack === 'pair') {
      const v = oblique(16, 23.5, ...K)
      const size = { L: spec.grade >= 9 ? 15.5 : 18, D: 8, l: spec.grade >= 9 ? 10.5 : 12, d: 4.5, h: 5.5 }
      const lower = bar(s, id, v, [0.5, 0, 0], size)
      const upper = bar(s, id, v, [-1, 0.5, 5.5], size)
      restOn(s, upper.mask, lower.mask)
      bars.push(lower, upper)
    } else {
      const v = oblique(16, 23.5, ...K)
      const size = { L: 10, D: 7, l: 6.5, d: 4, h: 5.5 }
      const left = bar(s, id, v, [-5.6, 0, 0], size)
      const right = bar(s, id, v, [5.6, 0, 0], size)
      const lowMask = new Mask().union(left.mask, right.mask)
      const top = bar(s, id, v, [0, 0.5, 5.5], size)
      restOn(s, top.mask, lowMask)
      bars.push(left, right, top)
    }
    const last = bars[bars.length - 1]
    if (last && spec.mark && spec.mark !== 'none') paintMark(s, last, id, spec.mark, glowId, spec.glow)
    if (spec.glow) halo(s, spec.glow, 70, 2)
  }
}

const SPECS: IngotSpec[] = [
  { id: 'copper-ingot', name: 'Copper Ingot', grade: 1, metal: '#e07a3a', stack: 'single' },
  { id: 'tin-ingot', name: 'Tin Ingot', grade: 2, metal: '#b3bcc2', metalRamp: { lift: 0.28, drop: 0.24 }, stack: 'pair' },
  { id: 'iron-ingot', name: 'Iron Ingot', grade: 3, metal: '#8a93a0', stack: 'long', mark: 'dent' },
  { id: 'silver-ingot', name: 'Silver Ingot', grade: 4, metal: '#e4e8f1', metalRamp: { lift: 0.55, drop: 0.34 }, stack: 'single', mark: 'stamp' },
  { id: 'cobalt-ingot', name: 'Cobalt Ingot', grade: 5, metal: '#3a6ae0', stack: 'chunk' },
  { id: 'gold-ingot', name: 'Gold Ingot', grade: 6, metal: '#f4c534', metalRamp: { lift: 0.45, drop: 0.3 }, stack: 'pyramid' },
  { id: 'platinum-ingot', name: 'Platinum Ingot', grade: 7, metal: '#d6ecf2', metalRamp: { lift: 0.55, drop: 0.36 }, stack: 'chunk', mark: 'star' },
  { id: 'titanium-ingot', name: 'Titanium Ingot', grade: 8, metal: '#9a96dc', metalRamp: { lift: 0.42, drop: 0.3 }, stack: 'pair', mark: 'stamp' },
  { id: 'mythril-ingot', name: 'Mythril Ingot', grade: 9, metal: '#5ff2c8', metalRamp: { lift: 0.42, drop: 0.32 }, stack: 'single', mark: 'rune', glow: '#9dffe6' },
  { id: 'orichalcum-ingot', name: 'Orichalcum Ingot', grade: 10, metal: '#ff8d2c', metalRamp: { lift: 0.45, drop: 0.3 }, stack: 'pair', mark: 'molten', glow: '#ffc35a' },
]

export const ORES_REFINED: ItemIcon[] = SPECS.map((spec) => ({ id: spec.id, name: spec.name, grade: spec.grade, paint: paintIngot(spec) }))
