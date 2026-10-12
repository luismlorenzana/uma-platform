import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { backdrop } from './backdrops.ts'
import { packWorld, worldFrames } from './atlas.ts'
import { checkWorldFrames } from './check.ts'
import { BIOME_IDS } from './spec.ts'

describe('H08 battle horizons', () => {
  it.each(BIOME_IDS)('%s: native dimensions, transparent sky, opaque ground foot, exact repeating edges and deterministic bytes', (biome) => {
    const img = backdrop(biome)
    expect([img.w, img.h]).toEqual([128, 48])
    expect(encodePng(img.w, img.h, img.px)).toEqual(encodePng(128, 48, backdrop(biome).px))
    for (let x = 0; x < 128; x++) { expect(img.get(x, 0)[3]).toBe(0); expect(img.get(x, 47)[3]).toBe(255) }
    for (let y = 0; y < 48; y++) expect(img.get(0, y)).toEqual(img.get(127, y))
    const alphas = new Set(Array.from(img.px).filter((_, i) => i % 4 === 3))
    expect(alphas.size).toBeGreaterThan(3)
  })
  it('appends all nineteen backdrops and leaves every original frame position and pixel untouched', () => {
    const legacy = packWorld(worldFrames(BIOME_IDS, true)), frames = worldFrames(BIOME_IDS, true, true), next = packWorld(frames)
    expect(frames).toHaveLength(329); expect(checkWorldFrames(frames, BIOME_IDS, true, true)).toEqual([])
    expect(new Set(BIOME_IDS.map((b) => createHash('sha256').update(backdrop(b).px).digest('hex'))).size).toBe(19)
    for (const [id, f] of Object.entries(legacy.index)) {
      expect(next.index[id]).toEqual(f)
      expect(Buffer.from(next.atlas.crop(f.x, f.y, f.w, f.h).px).equals(Buffer.from(legacy.atlas.crop(f.x, f.y, f.w, f.h).px)), id).toBe(true)
    }
    const broken = frames.map((f) => ({ ...f, img: f.img.crop(0, 0, f.w, f.h) }))
    broken.at(-1)!.img.set(127, 0, [255, 0, 0, 255])
    expect(checkWorldFrames(broken, BIOME_IDS, true, true).some((s) => s.includes('horizontal seam'))).toBe(true)
    expect(checkWorldFrames(frames.filter((f) => f.id !== 'backdrop/meadow'), BIOME_IDS, true, true)).toContain('Missing world frame backdrop/meadow')
  })
})
