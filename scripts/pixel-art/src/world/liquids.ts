// Area autotiles: NW=1, NE=2, SE=4, SW=8 are wet vertices, not road-neighbour bits. Mask 15 is filled liquid.
// Clamp the field in each edge strip so it depends only on that edge's two corners, even for shoreline shading.
import { ramp } from '../color.ts'
import { N4 } from '../tiles/autotile.ts'
import { Img } from '../tiles/image.ts'
import { hash2, seedOf, TILE, wrap } from '../tiles/noise.ts'
import type { Liquid } from './spec.ts'

const STYLE: Record<Liquid, { base: string; glint: string; bank: string }> = {
  water: { base: '#4388b7', glint: '#b7e3f3', bank: '#8b8060' }, lava: { base: '#e54920', glint: '#ffd35a', bank: '#5b4542' },
  marsh: { base: '#64784d', glint: '#b7c58a', bank: '#6a6250' }, ice: { base: '#71b1d0', glint: '#e9fbff', bank: '#638aa2' },
  void: { base: '#55416e', glint: '#b996ed', bank: '#7b6090' }, cloud: { base: '#dce2ea', glint: '#fff6d8', bank: '#beb596' },
}

const smooth = (t: number) => t * t * (3 - 2 * t)
function field(mask: number, x: number, y: number): number {
  const u = smooth(Math.max(0, Math.min(1, (x - 3) / 10)))
  const v = smooth(Math.max(0, Math.min(1, (y - 3) / 10)))
  const nw = mask & 1 ? 1 : 0, ne = mask & 2 ? 1 : 0, se = mask & 4 ? 1 : 0, sw = mask & 8 ? 1 : 0
  return (nw * (1 - u) + ne * u) * (1 - v) + (sw * (1 - u) + se * u) * v
}

/** Marching-square shapes with quarter-circle outer shores and matching concave inlets. */
export function cornerWet(mask: number, x: number, y: number): boolean {
  if (mask === 0) return false
  if (mask === 15) return true
  if (mask === 3) return y < 8
  if (mask === 12) return y >= 8
  if (mask === 9) return x < 8
  if (mask === 6) return x >= 8
  const corners = [[1, 0, 0], [2, 16, 0], [4, 16, 16], [8, 0, 16]] as const
  const count = corners.filter(([bit]) => mask & bit).length
  const circle = (cx: number, cy: number) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < 64
  if (count === 3) {
    const empty = corners.find(([bit]) => !(mask & bit))!
    return !circle(empty[1], empty[2])
  }
  return corners.some(([bit, cx, cy]) => (mask & bit) !== 0 && circle(cx, cy))
}

/** A tile's four wet vertices; mask 0 is an empty overlay and never receives an atlas frame. */
export function cornerMaskAt(on: (x: number, y: number) => boolean, x: number, y: number): number {
  return (on(x, y) ? 1 : 0) | (on(x + 1, y) ? 2 : 0) | (on(x + 1, y + 1) ? 4 : 0) | (on(x, y + 1) ? 8 : 0)
}

/** 1–2 px dry bank, outside the filled wet silhouette. Rounded corners keep the rim from being a rectangle. */
export function bankDepth(mask: number, x: number, y: number): number {
  if (!mask || cornerWet(mask, x, y)) return 0
  for (let d = 1; d <= 2; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++)
    if (dx * dx + dy * dy <= d * d && cornerWet(mask, x + dx, y + dy)) return d
  return 0
}

export function liquidTile(kind: Liquid, mask: number): Img {
  const spec = STYLE[kind], colors = ramp(spec.base, { lift: 0.28, drop: 0.22, hueShift: 8 })
  const glint = ramp(spec.glint, { lift: 0.25, drop: 0.18 })[3]!
  const bank = ramp(spec.bank, { lift: 0.22, drop: 0.18, hueShift: 6 })
  const seed = seedOf(`world:liquid:${kind}:detail`)
  const img = new Img(TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      // Project the 2 px seam strip from its endpoint pair; remote corners cannot alter a bank's second pixel.
      let geometry = mask
      if (y < 2) geometry = (mask & 3) | (mask & 1 ? 8 : 0) | (mask & 2 ? 4 : 0)
      else if (y >= 14) geometry = (mask & 12) | (mask & 8 ? 1 : 0) | (mask & 4 ? 2 : 0)
      else if (x < 2) geometry = (mask & 9) | (mask & 1 ? 2 : 0) | (mask & 8 ? 4 : 0)
      else if (x >= 14) geometry = (mask & 6) | (mask & 2 ? 1 : 0) | (mask & 4 ? 8 : 0)
      if (!cornerWet(geometry, x, y)) {
        const depth = bankDepth(geometry, x, y)
        if (depth === 1 || depth === 2) {
          const lit = cornerWet(geometry, x + 1, y) || cornerWet(geometry, x, y + 1)
          img.set(x, y, bank[lit ? 4 : 2]!)
        }
        continue
      }
      const edge = N4.some(([dx, dy]) => !cornerWet(mask, x + dx, y + dy))
      const nx = field(mask, x - 1, y) - field(mask, x + 1, y)
      const ny = field(mask, x, y - 1) - field(mask, x, y + 1)
      const facing = nx * -0.55 + ny * -0.65
      const h = hash2(wrap(x), wrap(y), seed)
      let tone = edge ? (facing > 0.01 ? 2 : 4) : h < 0.09 ? 2 : 3
      if (!edge && kind === 'lava' && h < 0.22) tone = 4
      if (!edge && kind === 'ice' && (wrap(x) + 2 * wrap(y)) % 11 === 0) tone = 4
      const color = colors[tone]!
      img.set(x, y, kind === 'cloud' && edge ? [color[0], color[1], color[2], 190] : color)
      const shine = h < 0.025 || hash2(wrap(x - 1), wrap(y), seed) < 0.025
      if (!edge && shine) img.set(x, y, glint)
    }
  return img
}

export const liquidTiles = (kind: Liquid): Img[] => Array.from({ length: 16 }, (_, mask) => liquidTile(kind, mask))
