// Transparent road and liquid overlays. Ground is drawn first, then these frames are composited over it; this lets
// one road or liquid family serve every biome without baking a particular ground color into the atlas.
import { hex, type RGBA } from '../color.ts'
import { bandRegion, N4, outward } from '../tiles/autotile.ts'
import { Img } from '../tiles/image.ts'
import { hash2, periodicNoise, seedOf, TILE, wrap } from '../tiles/noise.ts'
import type { Liquid, Road } from './spec.ts'

interface NetworkStyle {
  half: number
  wobble: number
  colors: readonly [string, string, string, string, string]
}

const LIQUID_STYLE: Record<Liquid, NetworkStyle> = {
  water: { half: 5.1, wobble: 0.45, colors: ['#244f79', '#2f6d9c', '#4388b7', '#73b4d8', '#b7e3f3'] },
  lava: { half: 5.2, wobble: 0.55, colors: ['#5a191c', '#a52a20', '#e54920', '#ff8a2b', '#ffd35a'] },
  ice: { half: 5.1, wobble: 0.35, colors: ['#568fb8', '#78b6d8', '#a7d8ed', '#d8f1f8', '#ffffff'] },
}

const ROAD_STYLE: Record<Road, NetworkStyle> = {
  dirt: { half: 4.5, wobble: 0.65, colors: ['#68492f', '#8a6138', '#aa7d49', '#c79b63', '#dfbd88'] },
  stone: { half: 4.8, wobble: 0.3, colors: ['#4c5360', '#68717d', '#858e99', '#a6afb8', '#cbd1d6'] },
}

const rgba = (colors: NetworkStyle['colors']): readonly RGBA[] => colors.map((c) => hex(c))

function liquidTile(kind: Liquid, mask: number): Img {
  const style = LIQUID_STYLE[kind]
  const colors = rgba(style.colors)
  const noise = periodicNoise(`world:liquid:${kind}:edge`, 4)
  const detailSeed = seedOf(`world:liquid:${kind}:detail`)
  const wet = bandRegion(mask, 'round', style.half, style.wobble, noise)
  const img = new Img(TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (!wet(x, y)) continue
      const edge = N4.some(([dx, dy]) => !wet(x + dx, y + dy))
      const [ox, oy] = outward(mask, 'round', x, y)
      const facing = ox * -0.55 + oy * -0.65
      let tone = edge ? (facing > 0.15 ? 0 : facing < -0.15 ? 3 : 1) : 2
      const h = hash2(wrap(x), wrap(y), detailSeed)
      if (!edge && h < 0.055) tone = 4
      else if (!edge && h < 0.14) tone = kind === 'lava' ? 3 : 1
      if (kind === 'ice' && !edge && (wrap(x) + 2 * wrap(y)) % 11 === 0) tone = 4
      img.set(x, y, colors[tone] ?? colors[2] ?? [255, 0, 255, 255])
    }
  return img
}

function roadTile(kind: Road, mask: number): Img {
  const style = ROAD_STYLE[kind]
  const colors = rgba(style.colors)
  const noise = periodicNoise(`world:road:${kind}:edge`, kind === 'dirt' ? 8 : 4)
  const detailSeed = seedOf(`world:road:${kind}:detail`)
  const road = bandRegion(mask, 'round', style.half, style.wobble, noise)
  const img = new Img(TILE, TILE)
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      if (!road(x, y)) continue
      const edge = N4.some(([dx, dy]) => !road(x + dx, y + dy))
      const [ox, oy] = outward(mask, 'round', x, y)
      const facing = ox * -0.55 + oy * -0.65
      let tone = edge ? (facing < -0.15 ? 3 : facing > 0.15 ? 0 : 1) : 2
      const h = hash2(wrap(x), wrap(y), detailSeed)
      if (!edge && kind === 'dirt' && h < 0.07) tone = h < 0.025 ? 4 : 1
      if (!edge && kind === 'stone') {
        const joint = wrap(y, 4) === 3 || wrap(x + (Math.floor(y / 4) % 2) * 3, 7) === 6
        if (joint) tone = 0
        else if (wrap(y, 4) === 0) tone = Math.min(4, tone + 1)
      }
      img.set(x, y, colors[tone] ?? colors[2] ?? [255, 0, 255, 255])
    }
  return img
}

export const liquidTiles = (kind: Liquid): Img[] => Array.from({ length: 16 }, (_, mask) => liquidTile(kind, mask))
export const roadTiles = (kind: Road): Img[] => Array.from({ length: 16 }, (_, mask) => roadTile(kind, mask))
