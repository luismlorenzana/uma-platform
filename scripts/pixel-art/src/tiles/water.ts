// A stream with banks, joinable like the paths: water within one half width of the skeleton, a muddy bank around it.
// The bank facing the light (south and east) is lit, the far one is in shade and casts a dark strip on the water.
import { hex } from '../color.ts'
import { bandRegion, N4, outward } from './autotile.ts'
import { Img } from './image.ts'
import { hash2, periodicNoise, seedOf, TILE, wrap } from './noise.ts'
import { dealTorus, drawScatter, type PathPainter, type Scatter } from './paths.ts'

export interface WaterSpec {
  page: string
  half: number
  bank: number
  wobble: number
  water: { deep: string; shade: string; base: string; light: string; glint: string }
  mud: { shade: string; base: string; lit: string }
  fringe: string
  stones: Scatter
}

const LX = -0.55, LY = -0.65

export function waterTile(spec: WaterSpec): PathPainter {
  const edge = periodicNoise(`${spec.page}:water:edge`, 4)
  const bankNoise = periodicNoise(`${spec.page}:water:bank`, 8)
  const glintSeed = seedOf(`${spec.page}:water:glint`)
  const stones = dealTorus(`${spec.page}:water:stones`, spec.stones)
  const w = Object.fromEntries(Object.entries(spec.water).map(([k, v]) => [k, hex(v)])) as Record<keyof WaterSpec['water'], ReturnType<typeof hex>>
  const m = Object.fromEntries(Object.entries(spec.mud).map(([k, v]) => [k, hex(v)])) as Record<keyof WaterSpec['mud'], ReturnType<typeof hex>>
  const fringe = hex(spec.fringe)
  return (mask, ground) => {
    const img = ground.crop(0, 0, TILE, TILE)
    const wet = bandRegion(mask, 'round', spec.half, spec.wobble, edge)
    const outer = bandRegion(mask, 'round', spec.half + spec.bank, spec.wobble * 0.6, (x, y) => 0.5 * edge(x, y) + 0.5 * bankNoise(x, y))
    const bank = (x: number, y: number) => outer(x, y) || wet(x, y)
    // A glint is a 2 px dash along the stream; its anchor pattern repeats every tile.
    const glint = (x: number, y: number) => {
      const [ox, oy] = outward(mask, 'round', x, y)
      const along = Math.abs(ox) > Math.abs(oy) ? [0, 1] : [1, 0]
      const a = hash2(wrap(x), wrap(y), glintSeed) < 0.035
      const b = hash2(wrap(x - (along[0] ?? 0)), wrap(y - (along[1] ?? 0)), glintSeed) < 0.035
      return a || b
    }
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const [ox, oy] = outward(mask, 'round', x, y)
        // > 0 on the stream's north-west side, where the bank slopes away from the light and shades the water below it.
        const facing = ox * LX + oy * LY
        if (wet(x, y)) {
          const nearBank = N4.some(([dx, dy]) => !wet(x + dx, y + dy))
          let c = w.base
          if (nearBank) c = facing > 0.15 ? w.shade : facing < -0.15 ? w.light : w.base
          else if (N4.every(([dx, dy]) => wet(x + dx * 2, y + dy * 2) && wet(x + dx * 3, y + dy * 3))) c = w.deep
          if (!nearBank && glint(x, y)) c = w.glint
          img.set(x, y, c)
        } else if (bank(x, y)) {
          img.set(x, y, facing > 0.15 ? m.shade : facing < -0.15 ? m.lit : m.base)
        } else if (N4.some(([dx, dy]) => bank(x + dx, y + dy))) img.set(x, y, fringe)
      }
    drawScatter(img, stones, spec.stones.ink, (x, y) => bank(x, y) && !wet(x, y), false)
    return img
  }
}
