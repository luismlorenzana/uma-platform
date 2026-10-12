import { describe, expect, it } from 'vitest'
import { cornerAutotileSeams } from '../tiles/check.ts'
import { closesBlock } from '../tiles/maps.ts'
import { packWorld, worldFrames } from './atlas.ts'
import { checkWorldFrames } from './check.ts'
import { bankDepth, cornerMaskAt, cornerWet, liquidTiles } from './liquids.ts'
import { continentStripRoad, hasCell, regionLayout, regionPreview, sampleContinentStrip, worldVariantAt } from './maps.ts'
import { stageMarker } from './markers.ts'
import { BIOME_IDS, LIQUIDS, PHASE_ONE_BIOMES, STAGE_KINDS, STAGE_STATES, worldFrameSpecs } from './spec.ts'

const signature = (px: Uint8Array) => Buffer.from(px).toString('base64')
const connected = (cells: ReadonlySet<string>): Set<string> => {
  const start = cells.values().next().value as string, seen = new Set([start]), todo = [start]
  for (const k of todo) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = `${x + dx!},${y + dy!}`
      if (cells.has(next) && !seen.has(next)) { seen.add(next); todo.push(next) }
    }
  }
  return seen
}

describe('world art part 1', () => {
  it('has the exact 194-frame milestone and complete 310-frame future contract', () => {
    const specs = worldFrameSpecs()
    expect(specs).toHaveLength(194)
    expect(new Set(specs.map((f) => f.id)).size).toBe(194)
    expect(worldFrameSpecs(BIOME_IDS, true)).toHaveLength(310)
    expect(specs.filter((f) => f.group === 'liquid')).toHaveLength(90)
    expect(specs.some((f) => /^liquid\/.*-0$/.test(f.id))).toBe(false)
    const frames = worldFrames()
    expect(checkWorldFrames(frames)).toEqual([])
    expect(checkWorldFrames(frames.slice(1)).some((s) => s.startsWith('Missing'))).toBe(true)
    expect(checkWorldFrames([...frames, frames[0]!]).some((s) => s.startsWith('Duplicate'))).toBe(true)
  })

  it('packs native-size frames without overlaps and deterministically', () => {
    const frames = worldFrames(), { atlas, index } = packWorld(frames), taken = new Set<string>()
    expect(Buffer.from(atlas.px).equals(Buffer.from(packWorld(worldFrames()).atlas.px))).toBe(true)
    for (const frame of frames) {
      const at = index[frame.id]!
      expect([at.x % 16, at.y % 16]).toEqual([0, 0])
      let overlap = false
      for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
        const key = `${at.x + x},${at.y + y}`
        if (taken.has(key)) overlap = true
        taken.add(key)
      }
      expect(overlap, frame.id).toBe(false)
      expect(Buffer.from(atlas.crop(at.x, at.y, frame.w, frame.h).px).equals(Buffer.from(frame.img.px)), frame.id).toBe(true)
    }
  })

  for (const liquid of LIQUIDS) it(`${liquid}: every corner mask joins, mask 0 is empty and mask 15 is filled`, () => {
    const tiles = liquidTiles(liquid)
    expect(cornerAutotileSeams(liquid, tiles)).toEqual([])
    expect(tiles[0]!.px.every((v) => v === 0)).toBe(true)
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) expect(tiles[15]!.get(x, y)[3]).toBe(255)
    for (const mask of [1, 2, 4, 8]) {
      expect(tiles[mask]!.get(8, 8)[3]).toBe(0)
      expect(tiles[mask]!.px.some((v) => v !== 0)).toBe(true)
    }
    // Compatible horizontal/vertical tiles have exactly matching wet coverage at their shared edge.
    for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
      if (!!(a & 2) === !!(b & 1) && !!(a & 4) === !!(b & 8))
        for (let i = 0; i < 16; i++) expect(tiles[a]!.get(15, i)[3]).toBe(tiles[b]!.get(0, i)[3])
      if (!!(a & 8) === !!(b & 1) && !!(a & 4) === !!(b & 2))
        for (let i = 0; i < 16; i++) expect(tiles[a]!.get(i, 15)[3]).toBe(tiles[b]!.get(i, 0)[3])
    }
  })

  it('keeps the dry bank 1–2 px wide and makes blue ice distinct from white snow', () => {
    for (const liquid of LIQUIDS) for (let mask = 1; mask < 16; mask++) {
      const tile = liquidTiles(liquid)[mask]!
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (cornerWet(mask, x, y) || !tile.get(x, y)[3]) continue
        expect(bankDepth(mask, x, y)).toBeGreaterThanOrEqual(1)
        expect(bankDepth(mask, x, y)).toBeLessThanOrEqual(2)
      }
    }
    const ice = liquidTiles('ice')[15]!
    const bluePixels = Array.from({ length: 256 }, (_, i) => ice.get(i % 16, Math.floor(i / 16)))
      .filter(([r, g, b]) => b - r > 40 && g - r > 20)
    expect(bluePixels.length).toBeGreaterThan(150)
  })

  it('distinguishes all nine kind/state markers by pixels and silhouette', () => {
    const markers = STAGE_KINDS.flatMap((k) => STAGE_STATES.map((s) => stageMarker(k, s)))
    expect(new Set(markers.map((m) => signature(m.px))).size).toBe(9)
    for (const state of STAGE_STATES) {
      const shape = STAGE_KINDS.map((k) => signature(stageMarker(k, state).px.filter((_, i) => i % 4 === 3)))
      expect(new Set(shape).size).toBe(3)
    }
  })

  it('keeps every road connected and never closes a 2×2 block', () => {
    for (const cells of [continentStripRoad(), ...PHASE_ONE_BIOMES.map((b) => regionLayout(b).road)]) {
      expect(connected(cells).size).toBe(cells.size)
      for (const k of cells) {
        const [x, y] = k.split(',').map(Number) as [number, number], without = new Set(cells)
        without.delete(k); expect(closesBlock(without, x, y)).toBe(false)
      }
    }
  })

  it('grows filled ponds away from roads and stage clear zones for many region seeds', () => {
    for (const biome of PHASE_ONE_BIOMES) for (let seed = 0; seed < 20; seed++) {
      const layout = regionLayout(biome, `synthetic-region:${seed}`)
      expect(connected(layout.road).size).toBe(layout.road.size)
      for (const s of layout.stages) expect(hasCell(layout.road, s.x, s.y)).toBe(true)
      for (const k of layout.road) {
        const [x, y] = k.split(',').map(Number) as [number, number], without = new Set(layout.road)
        without.delete(k); expect(closesBlock(without, x, y)).toBe(false)
      }
      expect(layout.ponds.length).toBeGreaterThanOrEqual(2)
      expect(layout.ponds.length).toBeLessThanOrEqual(4)
      expect(layout.stages).toHaveLength(12)
      for (const pond of layout.ponds) {
        expect(connected(pond).size).toBe(pond.size)
        const points = [...pond].map((k) => k.split(',').map(Number))
        const xs = points.map((p) => p[0]!), ys = points.map((p) => p[1]!)
        expect(pond.size).toBeLessThan((Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1))
        let full = false
        for (let y = 0; y < 28; y++) for (let x = 0; x < 16; x++) {
          const mask = cornerMaskAt((cx, cy) => hasCell(pond, cx, cy), x, y)
          if (mask === 15) full = true
          if (!mask) continue
          expect(hasCell(layout.road, x, y)).toBe(false)
          expect(layout.stages.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1)).toBe(false)
        }
        expect(full).toBe(true)
      }
    }
  })

  it('uses all four ground variants in each 2×2 and 4×4 deal', () => {
    for (const biome of PHASE_ONE_BIOMES) for (let y = 0; y < 28; y += 2) for (let x = 0; x < 16; x += 2)
      expect(new Set([worldVariantAt(biome, x, y), worldVariantAt(biome, x + 1, y), worldVariantAt(biome, x, y + 1), worldVariantAt(biome, x + 1, y + 1)]).size).toBe(4)
  })

  it('renders the required region and continent sizes repeatably', () => {
    const continent = sampleContinentStrip()
    expect([continent.w, continent.h]).toEqual([256, 192])
    for (const biome of PHASE_ONE_BIOMES) {
      const map = regionPreview(biome)
      expect([map.w, map.h]).toEqual([256, 448])
      // Native byte equality checks every pixel without millions of JS-level matcher comparisons on CI runners.
      expect(Buffer.from(map.px).equals(Buffer.from(regionPreview(biome).px)), biome).toBe(true)
    }
  })
})
