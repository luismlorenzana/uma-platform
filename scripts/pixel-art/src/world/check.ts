import { autotileSeams, cornerAutotileSeams, groundSeams } from '../tiles/check.ts'
import { Img } from '../tiles/image.ts'
import { type WorldFrame } from './atlas.ts'
import { oceanGround } from './ground-rest.ts'
import { biomeGround } from './ground.ts'
import { liquidTiles } from './liquids.ts'
import { roadTiles } from './roads.ts'
import { LIQUIDS, PHASE_ONE_BIOMES, ROADS, worldFrameSpecs, type Biome } from './spec.ts'

export function checkWorldFrames(frames: readonly WorldFrame[], biomes: readonly Biome[] = PHASE_ONE_BIOMES, ocean = false): string[] {
  const wanted = new Map(worldFrameSpecs(biomes, ocean).map((s) => [s.id, s]))
  const seen = new Set<string>(), bad: string[] = []
  for (const frame of frames) {
    const spec = wanted.get(frame.id)
    if (!spec) bad.push(`Unexpected world frame ${frame.id}`)
    if (seen.has(frame.id)) bad.push(`Duplicate world frame ${frame.id}`)
    seen.add(frame.id)
    if (frame.w !== spec?.w || frame.h !== spec.h || frame.img.w !== frame.w || frame.img.h !== frame.h) bad.push(`${frame.id}: wrong size`)
    if (frame.group !== spec?.group || frame.biome !== spec.biome || frame.anchorY !== spec.anchorY) bad.push(`${frame.id}: wrong metadata`)
    if (frame.anchorY !== undefined) {
      let grounded = false
      for (let y = 0; y < frame.h; y++)
        for (let x = 0; x < frame.w; x++) {
          if (frame.img.get(x, y)[3] !== 255) continue
          if (y > frame.anchorY + 1) bad.push(`${frame.id}: ink below ground line`)
          if (y >= frame.anchorY - 2 && y <= frame.anchorY + 1) grounded = true
        }
      if (!grounded) bad.push(`${frame.id}: no grounded footprint`)
    }
  }
  for (const id of wanted.keys()) if (!seen.has(id)) bad.push(`Missing world frame ${id}`)
  for (const biome of biomes) bad.push(...groundSeams(biome, [0, 1, 2, 3].map((v) => biomeGround(biome, v))))
  if (ocean) bad.push(...groundSeams('ocean', [0, 1, 2, 3].map(oceanGround)))
  for (const liquid of LIQUIDS) bad.push(...cornerAutotileSeams(`liquid/${liquid}`, liquidTiles(liquid)))
  for (const road of ROADS) bad.push(...autotileSeams(`road/${road}`, roadTiles(road), new Img(16, 16)))
  return bad
}
