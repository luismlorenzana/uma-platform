// A diagonal frame for weapons lying corner to corner, hilt bottom-left and tip top-right. For pixel (x, y):
//   a = x − y      grows along the weapon toward the tip (two units per diagonal pixel step);
//   b = x + y − c  grows across it toward the bottom-right (b < 0 is the side facing the light).
// Parts are tests on (a, b), so every edge is an exact 45° or axis-aligned pixel staircase.
import { Mask } from '../shape.ts'
import type { Sprite } from '../sprite.ts'

export interface Frame {
  /** The axis is the diagonal x + y = c. */
  c: number
  /** Added to a, to slide the whole weapon along its axis. */
  da?: number
}

export function ab(f: Frame, x: number, y: number): [number, number] {
  return [x - y - (f.da ?? 0), x + y - f.c]
}

/** The pixel at (a, b); a and b must share the parity of a + b + c being even to land on a pixel center. */
export function xy(f: Frame, a: number, b: number): [number, number] {
  const A = a + (f.da ?? 0)
  return [Math.floor((A + b + f.c) / 2), Math.floor((f.c + b - A) / 2)]
}

export function diagMask(f: Frame, test: (a: number, b: number) => boolean): Mask {
  const m = new Mask()
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const [a, b] = ab(f, x, y)
      if (test(a, b)) m.set(x, y)
    }
  return m
}

/** Paints every pixel whose (a, b) maps to a tone (or [ramp, tone]); null leaves it untouched. */
export function diagPaint(s: Sprite, f: Frame, ramp: number, fn: (a: number, b: number) => number | [number, number] | null): void {
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const [a, b] = ab(f, x, y)
      const r = fn(a, b)
      if (r === null) continue
      if (typeof r === 'number') s.paint(x, y, ramp, r)
      else s.paint(x, y, r[0], r[1])
    }
}

/** A polygon given in (a, b), as a screen mask. */
export function abPolygon(f: Frame, pts: readonly (readonly [number, number])[]): Mask {
  const da = f.da ?? 0
  return Mask.polygon(pts.map(([a, b]) => [(a + da + b + f.c) / 2 + 0.5, (b + f.c - a - da) / 2 + 0.5] as const))
}
