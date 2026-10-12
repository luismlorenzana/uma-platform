import { describe, expect, it } from 'vitest'
import { worldFrames } from './atlas.ts'
import { BIOME_IDS, worldFrameSpecs } from './spec.ts'
import { closesBlock } from '../tiles/maps.ts'
import { continentBandY, continentComposition, drawComposition, sampleContinent, worldComposition } from './maps-full.ts'
import { regionLayout } from './maps.ts'

describe('world sample compositions (H06 part 3)', () => {
  const c = sampleContinent(), continent = continentComposition(c)
  const world = worldComposition(Array.from({ length: 5 }, (_, n) => sampleContinent('synthetic-continent-' + (n + 1))))
  it('is seeded and deterministic, including input plot order', () => {
    expect(sampleContinent()).toEqual(c)
    expect(continentComposition({ ...c, regions: [...c.regions].reverse() })).toEqual(continent)
    expect(continentComposition(sampleContinent('another-synthetic-continent'))).not.toEqual(continent)
    expect(worldComposition(Array.from({ length: 5 }, (_, n) => sampleContinent('synthetic-continent-' + (n + 1))))).toEqual(world)
    expect(new Set(c.regions.map((r) => r.biome)).size).toBe(19)
    for (const b of BIOME_IDS) expect(c.regions.filter((r) => r.biome === b).length).toBeGreaterThanOrEqual(2)
  })
  it('has forty region plots, five Springs above rows 1/3/5/7/9, capital above all bands, and five islands', () => {
    expect([continent.cols, continent.rows]).toEqual([16, 44])
    expect(continent.spots.filter((s) => s.kind === 'region')).toHaveLength(40)
    expect(continent.spots.filter((s) => s.kind === 'spring').map((s) => s.y)).toEqual([0, 2, 4, 6, 8].map((r) => continentBandY(r) * 16 - 32))
    expect(continent.spots.filter((s) => s.kind === 'capital')).toHaveLength(1)
    expect(continent.spots.find((s) => s.id === c.regions[0]!.id)!.y).toBeGreaterThan(continent.spots.find((s) => s.id === c.regions[36]!.id)!.y)
    expect([world.cols, world.rows]).toEqual([16, 22])
    expect(world.spots).toHaveLength(5)
    expect(world.spots[0]!.y).toBeGreaterThan(world.spots[4]!.y)
    for (const b of BIOME_IDS) {
      const stages = regionLayout(b).stages
      expect(stages).toHaveLength(12)
      expect(stages.filter((s) => s.state === 'open')).toHaveLength(1)
      expect(stages.at(-1)!.kind).toBe('boss')
      expect(stages.at(-1)!.y).toBeLessThan(stages[0]!.y)
    }
  })
  it('has a connected climbing road, no 2×2 loops, and landmarks kept off that road', () => {
    const seen = new Set<string>(), queue = [continent.road.values().next().value!]
    for (const key of queue) {
      if (seen.has(key)) continue
      seen.add(key)
      const [x, y] = key.split(',').map(Number) as [number, number]
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const next = (x + dx!) + ',' + (y + dy!)
        if (continent.road.has(next) && !seen.has(next)) queue.push(next)
      }
      const without = new Set(continent.road); without.delete(key)
      expect(closesBlock(without, x, y)).toBe(false)
    }
    expect(seen.size).toBe(continent.road.size)
    for (const sprite of continent.sprites.filter((s) => s.frame.startsWith('prop/'))) {
      const frame = worldFrameSpecs(BIOME_IDS, true).find((f) => f.id === sprite.frame)!
      expect(continent.road.has(Math.floor(sprite.x / 16) + ',' + Math.floor((sprite.y + frame.h - 1) / 16))).toBe(false)
    }
  })
  it('uses only atlas frames and renders native sizes without escaping the map bounds', () => {
    const frames = new Map(worldFrames(BIOME_IDS, true).map((f) => [f.id, f]))
    for (const layout of [continent, world]) {
      for (const cell of layout.cells) {
        expect(frames.has(cell.frame), cell.frame).toBe(true)
        expect(cell.col).toBeGreaterThanOrEqual(0); expect(cell.col).toBeLessThan(layout.cols)
        expect(cell.row).toBeGreaterThanOrEqual(0); expect(cell.row).toBeLessThan(layout.rows)
      }
      for (const sprite of layout.sprites) {
        const f = frames.get(sprite.frame)!
        expect(f, sprite.frame).toBeDefined()
        expect(sprite.x).toBeGreaterThanOrEqual(0); expect(sprite.y).toBeGreaterThanOrEqual(0)
        expect(sprite.x + f.w).toBeLessThanOrEqual(layout.cols * 16)
        expect(sprite.y + f.h).toBeLessThanOrEqual(layout.rows * 16)
      }
      const a = drawComposition(layout), b = drawComposition(layout)
      expect([a.w, a.h]).toEqual([layout.cols * 16, layout.rows * 16])
      expect(Buffer.from(a.px).equals(Buffer.from(b.px))).toBe(true)
    }
  })
})
