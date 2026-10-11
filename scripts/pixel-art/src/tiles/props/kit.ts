// Helpers shared by the prop painters: foliage clumps, boxes seen from above and in front, straight strokes.
import { ramp, type RampOptions } from '../../color.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'

export const add = (s: Sprite, base: string, o?: RampOptions) => s.addRamp(ramp(base, o))

/** A union of circles as one mask: [cx, cy, r][]. */
export function circles(s: Sprite, list: readonly (readonly [number, number, number])[]): Mask {
  const m = new Mask(s.w, s.h)
  for (const [cx, cy, r] of list) m.union(Mask.circle(cx, cy, r, s.w, s.h))
  return m
}

/**
 * Foliage: shade the whole crown as a dome, then give every clump its own rim of shade on its lower right and a lit
 * patch on its upper left, so the crown reads as leafy masses rather than one ball.
 */
export function foliage(s: Sprite, m: Mask, id: number, clumps: readonly (readonly [number, number, number])[], bias = 0.05): void {
  shadeDome(s, m, id, { bias, contact: false })
  m.each((x, y) => {
    let best: readonly [number, number, number] | undefined
    let bd = Infinity
    for (const c of clumps) {
      const d = Math.hypot(x + 0.5 - c[0], y + 0.5 - c[1]) / c[2]
      if (d < bd) {
        bd = d
        best = c
      }
    }
    if (!best) return
    const dx = (x + 0.5 - best[0]) / best[2], dy = (y + 0.5 - best[1]) / best[2]
    if (bd > 0.72 && dx + dy > 0.2) s.shift(x, y, -1)
    else if (bd < 0.55 && dx + dy < -0.35) s.shift(x, y, 1)
  })
}

/** A straight stroke (Bresenham) painted with one tone. */
export function stroke(s: Sprite, x0: number, y0: number, x1: number, y1: number, id: number, tone: number | ((t: number) => number)): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1
  let err = dx + dy, x = x0, y = y0
  const n = Math.max(dx, -dy) || 1
  for (let i = 0; ; i++) {
    s.paint(x, y, id, typeof tone === 'number' ? tone : tone(i / n))
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

/**
 * A box seen from above and in front: the top face (rows y0..yTop) lit, the front face (yTop+1..y1) in a top-to-bottom
 * fall-off, the left column lit and the right column shaded. Corners can be rounded off.
 */
export function box(s: Sprite, x0: number, y0: number, x1: number, y1: number, yTop: number, id: number, round = false): void {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (round && (x === x0 || x === x1) && (y === y0 || y === y1)) continue
      let t: number
      if (y <= yTop) t = y === y0 ? 5 : 4
      else t = y === yTop + 1 ? 3 : y >= y1 - 1 ? 2 : 3
      if (x === x0 && y > yTop) t = Math.min(5, t + 1)
      if (x === x1) t = Math.max(1, t - 1)
      s.paint(x, y, id, t)
    }
}
