// Network overlays reuse the Hub's edge-mask geometry and toroidal noise. Stone is irregular flagstone, never bricks.
import { hex, ramp, type RGBA } from '../color.ts'
import { bandRegion, N4, outward } from '../tiles/autotile.ts'
import { Img } from '../tiles/image.ts'
import { hash2, periodicNoise, seedOf, TILE, wrap } from '../tiles/noise.ts'
import type { Road } from './spec.ts'

const BASE: Record<Road, string> = { dirt: '#b58a55', stone: '#92928b', boards: '#bd935f' }
const SLABS = [[2, 3], [9, 1], [14, 6], [5, 9], [11, 13], [0, 15]] as const

/** Six uneven slabs dealt on a torus: gaps and slanted boundaries continue through the tile edges. */
function slabAt(x: number, y: number): { joint: boolean; tone: number } {
  const sites = SLABS.map(([sx, sy], i) => {
    const dx = wrap(x - sx + 8) - 8, dy = wrap(y - sy + 8) - 8
    return { i, dx, dy, d: Math.hypot(dx, dy) }
  }).sort((a, b) => a.d - b.d)
  const a = sites[0]!, b = sites[1]!
  return { joint: b.d - a.d < 0.65, tone: a.dx + a.dy < -2 ? 4 : a.dx + a.dy > 3 ? 2 : a.i % 3 === 0 ? 4 : 3 }
}

export function roadTile(kind: Road, mask: number): Img {
  const colors = ramp(BASE[kind], { lift: 0.26, drop: 0.23, hueShift: 8 })
  const noise = periodicNoise(`world:road:${kind}:edge`, kind === 'dirt' ? 8 : 4)
  const seed = seedOf(`world:road:${kind}:detail`)
  const road = bandRegion(mask, 'round', 4.6, kind === 'boards' ? 0.25 : 0.6, noise)
  const img = new Img(TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const h = hash2(wrap(x), wrap(y), seed)
      if (!road(x, y)) {
        // A sparse translucent dust/grain fringe blends into any biome rather than baking in green grass.
        if (N4.some(([dx, dy]) => road(x + dx, y + dy)) && h < 0.4) {
          const c = colors[2]!
          img.set(x, y, [c[0], c[1], c[2], 100])
        }
        continue
      }
      const edge = N4.some(([dx, dy]) => !road(x + dx, y + dy))
      const [ox, oy] = outward(mask, 'round', x, y)
      const facing = ox * -0.55 + oy * -0.65
      let color: RGBA = colors[edge ? (facing > 0.15 ? 2 : 4) : 3]!
      if (kind === 'dirt' && !edge && h < 0.09) color = colors[h < 0.025 ? 4 : 2]!
      if (kind === 'stone') {
        const slab = slabAt(wrap(x), wrap(y))
        color = slab.joint ? hex('#706b5c') : colors[edge ? Math.max(2, slab.tone - 1) : slab.tone]!
      }
      if (kind === 'boards') {
        const joint = wrap(y, 4) === 3
        color = colors[joint ? 1 : wrap(y, 4) === 0 ? 4 : h < 0.16 ? 2 : 3]!
        if (wrap(y, 4) === 1 && wrap(x, 8) === 2) color = hex('#dfcbaa')
      }
      img.set(x, y, color)
    }
  return img
}

export const roadTiles = (kind: Road): Img[] => Array.from({ length: 16 }, (_, mask) => roadTile(kind, mask))
