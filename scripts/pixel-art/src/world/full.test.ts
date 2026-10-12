import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { encodePng } from '../png.ts'
import { packWorld, worldFrames } from './atlas.ts'
import { checkWorldFrames } from './check.ts'
import { BIOME_IDS, BIOMES } from './spec.ts'
import { biomeGround } from './ground.ts'
import { biomeIcon } from './icons.ts'
import { drawWorldProp, worldProp } from './props.ts'
import { regionLayout, regionPreview } from './maps.ts'
const bytes = (px: Uint8Array) => Buffer.from(px)

describe('world art part 2', () => {
  it('draws the complete 310-frame contract, including every prop, icon and ocean variant', () => {
    const frames = worldFrames(BIOME_IDS, true)
    expect(frames).toHaveLength(310)
    expect(checkWorldFrames(frames, BIOME_IDS, true)).toEqual([])
    expect(frames.filter((f) => f.group === 'ground')).toHaveLength(80)
    expect(frames.filter((f) => f.group === 'prop')).toHaveLength(57)
    expect(frames.filter((f) => f.group === 'icon')).toHaveLength(19)
    expect(frames.every((f) => f.img.px.some((v) => v !== 0))).toBe(true)
  })
  it('keeps every biome recognizable by a distinct ground, landmark and icon', () => {
    const signature = (px: Uint8Array) => bytes(px).toString('base64')
    expect(new Set(BIOME_IDS.map((b) => signature(biomeGround(b, 0).px))).size).toBe(19)
    expect(new Set(BIOME_IDS.map((b) => signature(biomeIcon(b).px))).size).toBe(19)
    for (const biome of BIOME_IDS) {
      const props = BIOMES[biome].props.map((id) => drawWorldProp(worldProp(id)))
      expect(new Set(props.map((p) => signature(p.px))).size).toBe(3)
      for (const p of props) expect(bytes(p.px).equals(bytes(drawWorldProp(worldProp(BIOMES[biome].props[props.indexOf(p)]!)).px))).toBe(true)
    }
  })
  it('renders every region deterministically with filled seeded liquids only where specified', () => {
    for (const biome of BIOME_IDS) {
      const a = regionPreview(biome), b = regionPreview(biome)
      expect([a.w, a.h]).toEqual([256, 448])
      expect(bytes(a.px).equals(bytes(b.px)), biome).toBe(true)
      const ponds = regionLayout(biome).ponds
      expect(ponds.length, biome).toBe(BIOMES[biome].liquid ? 3 : 0)
    }
  })
  it('matches every checked-in atlas frame and index byte-for-byte', () => {
    const { atlas, index } = packWorld(worldFrames(BIOME_IDS, true))
    const root = new URL('../../../../packages/art/world/', import.meta.url)
    expect(JSON.parse(readFileSync(new URL('atlas.json', root), 'utf8'))).toEqual({ schemaVersion: 1, width: atlas.w, height: atlas.h, frames: index })
    expect(readFileSync(new URL('atlas.png', root)).equals(encodePng(atlas.w, atlas.h, atlas.px))).toBe(true)
  })
})
