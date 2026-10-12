// H08 horizon strips: two periodic depth layers, biome landmarks and a foot fading into actual ground.
import { hex, ramp, type RGBA } from '../color.ts'
import { Img } from '../tiles/image.ts'
import { biomeGround } from './ground.ts'
import { BIOMES, type Biome } from './spec.ts'
import { drawWorldProp, worldProp } from './props.ts'
export const BACKDROP_W = 128, BACKDROP_H = 48
const MOUNTAINS = new Set<Biome>(['canyon', 'volcano', 'glacier', 'peaks', 'underworld', 'crystal'])
const wave = (x: number, cycles: number, phase = 0) => Math.cos(x / 127 * Math.PI * 2 * cycles + phase)
function silhouette(out: Img, base: RGBA, depth: number, mountain: boolean, seed: number): void {
  for (let x = 0; x < out.w; x++) {
    const shape = mountain ? 1 - Math.abs(Math.sin(x / 127 * Math.PI * (depth + 2) + seed)) : wave(x, depth + 1, seed)
    const top = Math.round((depth === 0 ? 22 : 31) - shape * (mountain ? 12 : 5))
    for (let y = top; y < 48; y++) out.blend(x, y, base)
    out.blend(x, top, [base[0] + 8, base[1] + 8, base[2] + 8, base[3]])
  }
}
function landmark(out: Img, biome: Biome, x: number, bottom: number, far: boolean): void {
  const prop = drawWorldProp(worldProp(BIOMES[biome].props[0]!)), k = far ? 0.5 : 0.75
  const w = Math.round(prop.w * k), h = Math.round(prop.h * k)
  for (let y = 0; y < h; y++) for (let dx = 0; dx < w; dx++) {
    const c = prop.get(Math.floor(dx / k), Math.floor(y / k))
    if (!c[3]) continue
    out.blend(x + dx, bottom - h + y, [Math.round(c[0] * (far ? 0.5 : 0.72)), Math.round(c[1] * (far ? 0.55 : 0.78)), Math.round(c[2] * (far ? 0.65 : 0.85)), Math.round(c[3] * (far ? 0.65 : 0.92))])
  }
}
export function backdrop(biome: Biome): Img {
  const out = new Img(BACKDROP_W, BACKDROP_H), colors = ramp(BIOMES[biome].base, { lift: 0.2, drop: 0.24 })
  const seed = Object.keys(BIOMES).indexOf(biome) * 0.73
  if (biome !== 'sky') {
    const far = colors[1]!, near = colors[2]!
    silhouette(out, [far[0], far[1], far[2], 165], 0, MOUNTAINS.has(biome), seed)
    silhouette(out, [near[0], near[1], near[2], 235], 1, MOUNTAINS.has(biome), seed + 0.5)
  }
  if (biome === 'sky') {
    for (const [cx, cy, wide] of [[28, 15, 18], [87, 25, 23]]) for (let dy = 0; dy < 13; dy++)
      for (let dx = -wide!; dx <= wide!; dx++) if (Math.abs(dx) < wide! * (1 - dy / 14)) out.blend(cx! + dx, cy! + dy, colors[dy < 3 ? 4 : 2]!)
    for (let x = 0; x < 128; x++) for (let y = 35 + Math.round(wave(x, 3) * 3); y < 48; y++) out.blend(x, y, hex('#dce2ea', 220))
  }
  if (biome === 'ruins') {
    for (const [x, top, width] of [[8, 15, 27], [67, 8, 34]]) {
      for (let y = top!; y < 40; y++) for (let dx = 0; dx < width!; dx++)
        if (y < top! + 4 || dx % 10 < 4) out.blend(x! + dx, y, colors[y < top! + 2 ? 4 : 2]!)
    }
  }
  if (biome === 'crystal') {
    for (let x = 0; x < 128; x++) for (let y = 4; y < 9 + Math.round((wave(x, 7) + 1) * 5); y++) out.blend(x, y, hex('#203744', 215))
  }
  if (biome === 'rift') {
    for (let x = 0; x < 128; x++) {
      const light = wave(x, 1) > 0
      for (let y = 9; y < 18 + Math.round(wave(x, 3) * 2); y++) out.blend(x, y, hex(light ? '#d4c5a9' : '#78639d', 70))
    }
  }
  for (const x of [12, 57, 101]) landmark(out, biome, x, 32, true)
  for (const x of [30, 85]) landmark(out, biome, x, biome === 'sky' ? 28 : 41, false)
  if (biome === 'volcano' || biome === 'underworld' || biome === 'geyser' || biome === 'rift') {
    const glow = biome === 'volcano' ? '#f18c3f' : biome === 'geyser' ? '#a9e5ec' : biome === 'rift' ? '#cfb3ef' : '#7dc9c2'
    for (const cx of [25, 72, 105]) for (let y = 32; y < 40; y++) out.blend(cx, y, hex(glow, 65 + (y - 32) * 12))
  }
  const ground = biomeGround(biome, 0)
  for (let y = 40; y < 48; y++) for (let x = 0; x < 128; x++) {
    const c = ground.get(x % 16, y - 32)
    out.blend(x, y, [c[0], c[1], c[2], Math.round((y - 39) / 8 * 255)])
  }
  for (let y = 0; y < 48; y++) out.set(127, y, out.get(0, y))
  return out
}
