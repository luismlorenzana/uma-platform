// Deterministic hashing and value noise that repeats every tile (16 px), so anything sampled from it wraps seamlessly.
import { hashString } from '../rng.ts'

export const TILE = 16

/** x mod n, always in [0, n). */
export const wrap = (v: number, n = TILE) => ((v % n) + n) % n

/** A float in [0, 1) for integer lattice point (x, y) under `seed`. */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ seed
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const seedOf = (label: string) => hashString(label)

const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Value noise on a lattice of `cells` × `cells` points spread over one period, smoothly interpolated, in [0, 1].
 * It repeats every `period` pixels in both axes, so a tile and its neighbours read the same field across a seam.
 */
export function periodicNoise(label: string, cells: number, period = TILE): (x: number, y: number) => number {
  const seed = seedOf(label)
  const step = period / cells
  const at = (i: number, j: number) => hash2(wrap(i, cells), wrap(j, cells), seed)
  return (x, y) => {
    const gx = wrap(x, period) / step
    const gy = wrap(y, period) / step
    const i = Math.floor(gx), j = Math.floor(gy)
    const tx = smooth(gx - i), ty = smooth(gy - j)
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * tx
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * tx
    return a + (b - a) * ty
  }
}
