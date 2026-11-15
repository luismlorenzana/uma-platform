// uma-farm F88 (P180): the profile picture's square, its corner rule and the override file, on code-drawn numbers.
import { describe, expect, it } from 'vitest'
import { cropProblem, faceExtent, PROFILE_BADGE_SHARE, PROFILE_FACE_SHARE, profileCrop, readProfileOverrides } from './profiles'

const BASE = { width: 525, height: 700 }

describe('the profile square', () => {
  it('puts her face at its centre at a fixed share of its side, clear of every badge corner', () => {
    const face = { left: 189, top: 174, right: 329, bottom: 303 }
    const crop = profileCrop(face, BASE)
    expect(crop.size).toBe(Math.round(141 / PROFILE_FACE_SHARE))
    // Centred to the pixel (a half-pixel centre rounds).
    expect(Math.abs(crop.left + crop.size / 2 - (face.left + face.right + 1) / 2)).toBeLessThanOrEqual(1)
    expect(Math.abs(crop.top + crop.size / 2 - (face.top + face.bottom + 1) / 2)).toBeLessThanOrEqual(1)
    expect(cropProblem(crop, face)).toBeNull()
  })
  it('moves only as far as it must to stay on the base, and never grows past it', () => {
    expect(profileCrop({ left: 0, top: 0, right: 140, bottom: 129 }, BASE)).toMatchObject({ left: 0, top: 0 })
    expect(profileCrop({ left: 0, top: 0, right: 400, bottom: 400 }, BASE).size).toBe(525)
  })
  it('flags a face that runs past the square or reaches a corner a badge may cover', () => {
    const crop = { left: 0, top: 0, size: 300 }
    expect(cropProblem(crop, { left: 100, top: 100, right: 320, bottom: 200 })).toMatch(/runs past/)
    const corner = Math.floor(300 * PROFILE_BADGE_SHARE)
    expect(cropProblem(crop, { left: corner - 1, top: corner - 1, right: 200, bottom: 200 })).toMatch(/corner/)
    expect(cropProblem(crop, { left: corner - 1, top: corner - 1, right: 200, bottom: 200 }, false)).toBeNull()
    // Reaching into a corner's columns without its rows is fine: the badge covers hair or shoulders beside her face.
    expect(cropProblem(crop, { left: 10, top: corner, right: 200, bottom: 300 - corner - 1 })).toBeNull()
  })
})

describe('where her face is', () => {
  it('is the box of every face pixel of every expression, soft edges left out', () => {
    const face = (x0: number, y0: number, x1: number, y1: number, soft = false) => {
      const data = new Uint8Array(32 * 32 * 4)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[(y * 32 + x) * 4 + 3] = 255
      if (soft) data[(0 * 32 + 0) * 4 + 3] = 10
      return { data, width: 32, height: 32 }
    }
    expect(faceExtent([face(4, 5, 20, 22, true), face(6, 3, 24, 18)], { width: 32, height: 32 })).toEqual({ left: 4, top: 3, right: 24, bottom: 22 })
  })
  it('falls back to where Farm Life\'s faces sit when she has no expression faces', () => {
    expect(faceExtent([], { width: 224, height: 224 })).toEqual({ left: 41, top: 34, right: 182, bottom: 164 })
  })
})

describe('the override file', () => {
  it('keys each square by character id and outfit, in whole pixels', () => {
    expect(readProfileOverrides({ universe: 'farm-life', crops: { '1068/spring': { left: 80, top: 60, size: 360 } } }, 'farm-life').crops['1068/spring']).toEqual({ left: 80, top: 60, size: 360 })
    expect(() => readProfileOverrides({ universe: 'farm-life', crops: { 'kitasan/spring': { left: 0, top: 0, size: 300 } } }, 'farm-life')).toThrow(/character id/)
    expect(() => readProfileOverrides({ universe: 'farm-life', crops: { '1068/spring': { left: 0, top: 0, size: 40 } } }, 'farm-life')).toThrow(/at least/)
    expect(() => readProfileOverrides({ universe: 'other', crops: {} }, 'farm-life')).toThrow(/farm-life/)
  })
})

describe('the review copy in the app\'s bucket', async () => {
  const { syntheticDialoguePortraits } = await import('@luismlorenzana/uma-data/testing')
  const { buildProfilesIndex } = await import('./profiles-push')
  it('names each picture by the universe\'s id for her and its hash, in her outfit order, from the release named', () => {
    const p = syntheticDialoguePortraits(1068, ['spring', 'winter'], ['happy'], { profiles: true })
    p.bases.spring!.profile!.sha256 = 'ab'.repeat(32)
    const bare = syntheticDialoguePortraits(1129, ['spring'], [])
    const index = buildProfilesIndex('farm-life', 'c0ffee012345', '2026-11-14T00:00:00.000Z', [
      { key: 'test-uma', name: 'Test Uma', portraits: p, outfits: ['spring', 'winter'] },
      { key: 'no-profiles', name: 'No Profiles', portraits: bare, outfits: ['spring'] },
    ])
    expect(index).toMatchObject({ kind: 'universe-profiles', universe: 'farm-life', release: 'c0ffee012345', size: 192, characters: [{ id: 'test-uma', name: 'Test Uma' }] })
    expect(index.profiles.map((x) => [x.id, x.path])).toEqual([['test-uma-spring', `profiles/test-uma-spring.${'ab'.repeat(8)}.webp`], ['test-uma-winter', `profiles/test-uma-winter.${'0'.repeat(16)}.webp`]])
    expect(index.profiles[0]!.crop).toEqual({ left: 94, top: 84, size: 336 })
  })
})
