import { describe, expect, it } from 'vitest'
import { parsePackIndex } from './assets.js'
import { FrameRecorder, gpuEstimate } from './bench.js'
import { PIECES } from './pieces.js'
import { orbit } from './scene.js'

describe('the frame recorder', () => {
  it('counts frames a second and holds 30 fps when every frame is 33 ms', () => {
    const r = new FrameRecorder()
    for (let i = 0; i < 30 * 70; i++) r.push(1000 / 30)
    const s = r.summary()
    expect(s.seconds).toBe(70)
    expect(s.fps).toBe(30)
    expect(s.sustained30).toBe(1)
    expect(s.firstMinuteFps).toBeCloseTo(30, 0)
    expect(s.hitches).toBe(0)
  })
  it('sees a phone that slows as it warms: the last minute below the first, hitches counted', () => {
    const r = new FrameRecorder()
    for (let i = 0; i < 60 * 60; i++) r.push(1000 / 60)
    for (let i = 0; i < 60 * 20; i++) r.push(1000 / 20)
    r.push(80)
    const s = r.summary()
    expect(s.firstMinuteFps).toBeGreaterThan(s.lastMinuteFps)
    expect(s.sustained30).toBeLessThan(1)
    expect(s.worstMs).toBe(80)
    expect(s.hitches).toBeGreaterThan(0)
  })
  it('ignores nonsense frame times', () => {
    const r = new FrameRecorder()
    r.push(-1); r.push(Number.NaN); r.push(10_000)
    expect(r.summary().frames).toBe(0)
  })
})

describe('the GPU estimate', () => {
  it('adds textures (with mipmaps), geometry, the frame and the passes', () => {
    const e = gpuEstimate({ textures: [{ width: 64, height: 64, mipmaps: false }], geometryBytes: 1000, width: 100, height: 100, ao: false, dof: false, bloom: false, shadowMap: 0 })
    expect(e.textureBytes).toBe(64 * 64 * 4)
    expect(e.targetBytes).toBe(100 * 100 * 24)
    expect(e.textures).toBe(1)
  })
})

describe('the camera families', () => {
  it('puts the camera on a sphere about the target: azimuth 0 looks toward −z from +z', () => {
    const [x, y, z] = orbit([0, 0, 0], { elevation: 0, azimuth: 0, distance: 10 })
    expect([x, y, z].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 10])
    const high = orbit([0, 1, 0], { elevation: 90, azimuth: 0, distance: 10 })
    expect(Math.round(high[1])).toBe(11)
  })
})

describe('the pack', () => {
  it('names each piece once', () => {
    for (const names of Object.values(PIECES)) expect(new Set(names).size).toBe(names.length)
  })
  it('reads an index and refuses a malformed cast', () => {
    const index = { version: 1, kit: { path: 'kit.0123456789abcdef.glb', bytes: 10, sha256: 'x' }, cast: { square: [[1, 0, 0]] } }
    expect(parsePackIndex(index).kit.path).toBe('kit.0123456789abcdef.glb')
    expect(() => parsePackIndex({ ...index, version: 2 })).toThrow()
    expect(() => parsePackIndex({ ...index, cast: { square: [['a', 0, 0]] } })).toThrow(/malformed/)
  })
})
