// Seeded, tileable noise for the kit painter (P147): integer hashing, so every run and every machine draws the same.
// Periods are in lattice cells: a texture that's `period` cells across a 128-texel tile repeats seamlessly. Pure.

/** A hash of integer coordinates and a seed, in [0, 1). */
export function hash(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374_761_393) ^ Math.imul(y | 0, 668_265_263) ^ Math.imul(seed | 0, 1_274_126_177)
  h = Math.imul(h ^ (h >>> 13), 1_103_515_245)
  h ^= h >>> 16
  return (h >>> 0) / 4_294_967_296
}
const wrap = (v: number, p: number) => (p > 0 ? ((v % p) + p) % p : v)
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/** Value noise in [0, 1) at (x, y) in cells, repeating every `px` cells across and `py` down (0: never). */
export function value(x: number, y: number, px = 0, seed = 0, py = px): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = fade(x - x0), fy = fade(y - y0)
  const ax = wrap(x0, px), bx = wrap(x0 + 1, px), ay = wrap(y0, py), by = wrap(y0 + 1, py)
  const a = hash(ax, ay, seed), b = hash(bx, ay, seed), c = hash(ax, by, seed), d = hash(bx, by, seed)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}

/** Fractal value noise in [0, 1): `octaves` layers, each twice the cells of the last. `cells` is how many lattice cells
 * span a `tile` (default 128) texels at the first octave, stretched by `sx` across and `sy` down (whole numbers keep it
 * tiling); with `tile` given, it repeats every tile. */
export function fbm(px: number, py: number, o: { cells: number; tile?: number; octaves?: number; seed?: number; sx?: number; sy?: number }): number {
  const tile = o.tile ?? 128, wraps = o.tile !== undefined, octaves = o.octaves ?? 4, sx = o.sx ?? 1, sy = o.sy ?? 1
  let sum = 0, amp = 1, norm = 0, cells = o.cells
  for (let i = 0; i < octaves; i++) {
    const k = cells / tile
    sum += value(px * k * sx, py * k * sy, wraps ? cells * sx : 0, (o.seed ?? 0) * 31 + i * 7, wraps ? cells * sy : 0) * amp
    norm += amp; amp *= 0.5; cells *= 2
  }
  return sum / norm
}

/** Worley cells: the nearest and second-nearest feature distances (texels) and the nearest cell's id, repeating every
 * `n` cells across a `tile`-texel tile. */
export function cells(px: number, py: number, n: number, tile: number, seed = 0, jitter = 0.8): { d1: number; d2: number; id: number; cx: number; cy: number } {
  const size = tile / n, gx = Math.floor(px / size), gy = Math.floor(py / size)
  let d1 = Infinity, d2 = Infinity, id = 0, cx = 0, cy = 0
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const ix = gx + i, iy = gy + j, wx = wrap(ix, n), wy = wrap(iy, n)
    const fx = (ix + 0.5 + (hash(wx, wy, seed) - 0.5) * jitter) * size, fy = (iy + 0.5 + (hash(wx, wy, seed + 1) - 0.5) * jitter) * size
    const d = Math.hypot(px - fx, py - fy)
    if (d < d1) { d2 = d1; d1 = d; id = wy * n + wx; cx = fx; cy = fy } else if (d < d2) d2 = d
  }
  return { d1, d2, id, cx, cy }
}

/** A seeded random stream (for placing strokes), the same every run. */
export function stream(seed: number): () => number {
  let i = 0
  return () => hash(i++, seed, 9_173)
}
