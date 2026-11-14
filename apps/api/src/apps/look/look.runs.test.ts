import { describe, expect, it } from 'vitest'
import { LOOK_PACK_ALLOW, parseRun, runName } from './look.runs'
import { safePackPath } from '@luismlorenzana/uma-server/content'

const run = {
  version: 1, startedAt: '2026-11-13T20:00:00.000Z', scene: 'square', camera: 'front',
  device: { userAgent: 'test', width: 932, height: 430, pixelRatio: 3 },
  load: { ms: 4200, bytes: 12_000_000 },
  tiers: [{ tier: 'high', summary: { fps: 31.2, sustained30: 0.96 }, seconds: [[31, 40.1], [30, 44]], stats: { calls: 900, triangles: 400000, gpuMB: 120, textures: 60 } }],
  heat: 'warm', note: '',
}

describe('a phone run', () => {
  it('keeps a well-formed run', () => {
    expect(parseRun(run)).toEqual(run)
  })
  it('refuses a wrong version, a missing tier list and a bad heat', () => {
    expect(() => parseRun({ ...run, version: 2 })).toThrow(/version 1/)
    expect(() => parseRun({ ...run, tiers: [] })).toThrow(/tiers/)
    expect(() => parseRun({ ...run, heat: 'scorching' })).toThrow(/heat/)
  })
  it('refuses numbers that are not numbers', () => {
    expect(() => parseRun({ ...run, tiers: [{ ...run.tiers[0], seconds: [['x', 1]] }] })).toThrow(/frames/)
  })
  it('names a run by its time, lowercase, safe for the store', () => {
    expect(runName(new Date('2026-11-13T20:01:02.345Z'), 0.5)).toBe('2026-11-13t20-01-02-345z-i000.json')
  })
})

describe('the pack route', () => {
  it('serves the index and a hash-named kit, nothing else', () => {
    expect(safePackPath('index.json', LOOK_PACK_ALLOW)).toEqual({ path: 'index.json', immutable: false })
    expect(safePackPath('kit.6c8c3d46dbc0dfe8.glb', LOOK_PACK_ALLOW)).toEqual({ path: 'kit.6c8c3d46dbc0dfe8.glb', immutable: true })
    expect(safePackPath('kit.c1a2d5209cd22ce6.json', LOOK_PACK_ALLOW)).toEqual({ path: 'kit.c1a2d5209cd22ce6.json', immutable: true })
    expect(safePackPath('cast.json', LOOK_PACK_ALLOW)).toBeNull()
    expect(safePackPath('../runs/x.json', LOOK_PACK_ALLOW)).toBeNull()
  })
})
