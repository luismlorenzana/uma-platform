// Autotile geometry for paths and water. A tile's mask (1 north, 2 east, 4 south, 8 west) picks arms of a skeleton
// that run from the tile centre past each connected edge. Membership is a distance to that skeleton under a half width
// that wobbles with noise repeating every tile, so a north arm and the south arm of the tile above it agree pixel for
// pixel along the seam, whatever else either tile connects to.
import { TILE, wrap } from './noise.ts'

export const N = 1, E = 2, S = 4, W = 8
export const MASKS = Array.from({ length: 16 }, (_, i) => i)

const C = TILE / 2
/** Each arm's far end, one tile past the edge so the arm is still straight where it crosses it. */
const ARMS: readonly (readonly [number, number, number])[] = [[N, C, C - TILE], [E, C + TILE, C], [S, C, C + TILE], [W, C - TILE, C]]

export type Shape = 'round' | 'square'

function segRound(px: number, py: number, bx: number, by: number): number {
  const dx = bx - C, dy = by - C
  const t = Math.min(1, Math.max(0, ((px - C) * dx + (py - C) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - C - t * dx, py - C - t * dy)
}

/** Chebyshev distance to an axis-aligned arm: square ends and sharp corners. */
function segSquare(px: number, py: number, bx: number, by: number): number {
  if (bx === C) return Math.max(Math.abs(px - C), Math.max(0, Math.min(C, by) - py, py - Math.max(C, by)))
  return Math.max(Math.abs(py - C), Math.max(0, Math.min(C, bx) - px, px - Math.max(C, bx)))
}

/** Polynomial smooth minimum: fillets inside corners; exact when a and b differ by k or more. */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - (h * h * k) / 4
}

/** Distance from a point (in tile pixels, any range) to the mask's skeleton. Mask 0 is the centre point. */
export function skeletonDist(mask: number, shape: Shape, px: number, py: number, fillet = 2): number {
  const arm = (bit: number) => {
    const a = ARMS.find(([b]) => b === bit)
    if (!a || !(mask & bit)) return Infinity
    return shape === 'round' ? segRound(px, py, a[1], a[2]) : segSquare(px, py, a[1], a[2])
  }
  const d = Math.min(arm(N), arm(E), arm(S), arm(W))
  if (d === Infinity) return shape === 'round' ? Math.hypot(px - C, py - C) : Math.max(Math.abs(px - C), Math.abs(py - C))
  if (shape === 'square') return d
  // Inside corners get a fillet: only in a quadrant bounded by two arms (so outer corners and straights stay exact),
  // fading out before the edge strips (so every arm crosses the tile edge exactly as a straight piece does).
  const v = arm(py < C ? N : S), h = arm(px < C ? W : E)
  const k = fillet * Math.min(1, Math.max(0, 5.5 - Math.max(Math.abs(px - C), Math.abs(py - C))))
  return v === Infinity || h === Infinity || k <= 0 ? d : Math.min(d, smin(v, h, k))
}

/** A region test over pixel coordinates, valid a few pixels beyond the tile (neighbour queries at the seams). */
export type Region = (x: number, y: number) => boolean

/** Pixels whose centre lies within `half` (+ `wobble` × noise in [-1, 1]) of the skeleton. */
export function bandRegion(mask: number, shape: Shape, half: number, wobble: number, noise: (x: number, y: number) => number, fillet = 2): Region {
  return (x, y) => skeletonDist(mask, shape, x + 0.5, y + 0.5, fillet) < half + wobble * (2 * noise(wrap(x), wrap(y)) - 1)
}

/** The outward direction of the skeleton distance at a pixel (points away from the path or stream's middle). */
export function outward(mask: number, shape: Shape, x: number, y: number): [number, number] {
  const d = (px: number, py: number) => skeletonDist(mask, shape, px, py)
  const gx = d(x + 1.5, y + 0.5) - d(x - 0.5, y + 0.5)
  const gy = d(x + 0.5, y + 1.5) - d(x + 0.5, y - 0.5)
  const l = Math.hypot(gx, gy) || 1
  return [gx / l, gy / l]
}

export const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]] as const
export const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const
