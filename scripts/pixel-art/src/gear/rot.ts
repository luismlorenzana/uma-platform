// A rotated frame for staves standing at a slant (steeper than the 45° diagonal). For a pixel center p:
//   u = (p − O) · û   along the staff toward its head (O is the head's center),
//   v = (p − O) · v̂   across it, negative on the upper-left side that faces the light.
import type { Sprite } from '../sprite.ts'

export interface Rot {
  ox: number
  oy: number
  /** Unit vector from the foot toward the head. */
  ux: number
  uy: number
}

/** A frame whose staff climbs `rise` pixels for every pixel it moves right. */
export function slant(ox: number, oy: number, rise: number): Rot {
  const l = Math.hypot(1, rise)
  return { ox, oy, ux: 1 / l, uy: -rise / l }
}

export function uv(r: Rot, x: number, y: number): [number, number] {
  const px = x + 0.5 - r.ox, py = y + 0.5 - r.oy
  return [px * r.ux + py * r.uy, px * -r.uy + py * r.ux]
}

/** The screen point at (u, v). */
export function at(r: Rot, u: number, v: number): [number, number] {
  return [r.ox + u * r.ux - v * r.uy, r.oy + u * r.uy + v * r.ux]
}

export function rotPaint(s: Sprite, r: Rot, ramp: number, fn: (u: number, v: number) => number | [number, number] | null): void {
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const [u, v] = uv(r, x, y)
      const t = fn(u, v)
      if (t === null) continue
      if (typeof t === 'number') s.paint(x, y, ramp, t)
      else s.paint(x, y, t[0], t[1])
    }
}
