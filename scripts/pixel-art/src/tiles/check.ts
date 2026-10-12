// Seam checks. Two tiles join cleanly when the pixels near their shared edge are exactly what two copies of a single
// periodic tile would show there. So: every ground variant has the same edge strips, every autotile with an edge's bit
// has the same strip along that edge, and every autotile without it shows plain ground-0 there.
import { E, MASKS, N, S, W } from './autotile.ts'
import type { Img } from './image.ts'
import { TILE } from './noise.ts'

/** How deep (px) the strips compared along each edge are. */
const DEPTH = 2

function strip(img: Img, bit: number): string {
  const out: number[] = []
  for (let d = 0; d < DEPTH; d++)
    for (let i = 0; i < TILE; i++) {
      const [x, y] = bit === N ? [i, d] : bit === S ? [i, TILE - 1 - d] : bit === W ? [d, i] : [TILE - 1 - d, i]
      out.push(...img.get(x, y))
    }
  return out.join(',')
}

export function groundSeams(name: string, variants: readonly Img[]): string[] {
  const ref = variants[0]
  if (!ref) return []
  const bad: string[] = []
  variants.forEach((v, i) => {
    for (const bit of [N, E, S, W]) if (strip(v, bit) !== strip(ref, bit)) bad.push(`${name}/ground-${i}: edge ${bit} differs from ground-0`)
  })
  return bad
}

export function autotileSeams(name: string, tiles: readonly Img[], ground0: Img): string[] {
  const bad: string[] = []
  for (const bit of [N, E, S, W]) {
    const ref = tiles.find((_, m) => m & bit)
    for (const m of MASKS) {
      const t = tiles[m]
      if (!t || !ref) continue
      const want = m & bit ? strip(ref, bit) : strip(ground0, bit)
      if (strip(t, bit) !== want) bad.push(`${name}-${m}: edge ${bit} ${m & bit ? 'differs from the other joined tiles' : 'is not plain ground'}`)
    }
  }
  return bad
}

/** Corner-mask areas: each edge depends only on its two endpoint vertices, independent of the other corners. */
export function cornerAutotileSeams(name: string, tiles: readonly Img[]): string[] {
  const bad: string[] = []
  const edges = [[N, 1, 2], [E, 2, 4], [S, 8, 4], [W, 1, 8]] as const
  for (const [edge, a, b] of edges) {
    const refs = new Map<number, string>()
    for (const mask of MASKS) {
      const tile = tiles[mask]
      if (!tile) { bad.push(`${name}-${mask}: missing corner mask`); continue }
      const pair = (mask & a ? 1 : 0) | (mask & b ? 2 : 0)
      const got = strip(tile, edge), want = refs.get(pair)
      if (want !== undefined && got !== want) bad.push(`${name}-${mask}: edge ${edge} differs for corner pair ${pair}`)
      refs.set(pair, got)
    }
  }
  return bad
}
