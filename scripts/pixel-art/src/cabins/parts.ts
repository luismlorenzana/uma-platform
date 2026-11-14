// Small parts the cabin painters share: neon tubes, glowing dots, heart and star shapes, leaves.
import { erode, type Pen, type Pt } from './kit.ts'
import type { Mask } from '../shape.ts'

/** A lit tube along `pts`: the accent with a hot core line, and its halo. */
export function tube(p: Pen, pts: readonly Pt[], id: number, color: string, w = 2.2, power = 1): Mask {
  const m = p.path(pts, w)
  p.fill(m, id, 3)
  p.fill(erode(m), id, 4)
  p.fill(p.path(pts, .4), id, 5)
  p.halo(m, color, power)
  return m
}

/** A small glowing bulb or LED: a hot centre, the accent around it at room size, and its halo. */
export function bulb(p: Pen, x: number, y: number, id: number, color: string, r = .9, power = 1): Mask {
  const m = r * p.k < 1.2 ? p.rect(x - .5, y - .5, x + .5, y + .5) : p.circ(x, y, r)
  p.fill(m, id, 4)
  p.fill(erode(m), id, 5)
  if (r * p.k < 1.2) p.fill(m, id, 5)
  p.halo(m, color, power)
  return m
}

/** A heart, its lobes at `top`, about 2r wide. */
export function heart(p: Pen, cx: number, top: number, r: number): Mask {
  const lobe = r * .55
  return p.test((x, y) => {
    const inLobe = Math.hypot(x - (cx - lobe), y - (top + lobe)) <= lobe + .1 || Math.hypot(x - (cx + lobe), y - (top + lobe)) <= lobe + .1
    const tip = top + lobe + r * 1.3
    const below = y >= top + lobe && y <= tip && Math.abs(x - cx) <= (tip - y) * ((r * 1.1) / (tip - top - lobe))
    return inLobe || below
  })
}

/** A five-pointed star's points. */
export function starPts(cx: number, cy: number, r: number, inner = .45, turn = 0): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + turn + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as const
  })
}

/** A leaf: a pointed ellipse from its stem at (x, y), `len` long, turned `deg` (0 points right). */
export function leaf(p: Pen, x: number, y: number, len: number, wid: number, deg: number): Mask {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  return p.test((ux, uy) => {
    const dx = ux - x, dy = uy - y, u = dx * c + dy * s, v = -dx * s + dy * c
    if (u < 0 || u > len) return false
    const half = wid * Math.sin((Math.PI * u) / len) * (u < len * .5 ? 1 : .9)
    return Math.abs(v) <= half / 2 + .05
  })
}

/** Lights a leaf from the top left: its upper half one tone up, a midrib one tone down. */
export function shadeLeaf(p: Pen, m: Mask, id: number, x: number, y: number, deg: number, base = 3): void {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  p.fill(m, id, (ux, uy) => {
    const v = -(ux - x) * s + (uy - y) * c
    return v < -.3 ? base + 1 : v > .6 ? base - 1 : base
  })
}
