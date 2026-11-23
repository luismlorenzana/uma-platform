import { describe, expect, it } from 'vitest'
import { artPaths, parseArtIndex } from './art.js'
import { parseCharacterSprites } from './character-sprites.js'

const points = { front: { x: 0, y: 2 }, left: { x: 2, y: 2 }, right: { x: 4, y: 2 }, back: { x: 6, y: 2 } }
const walking = Object.fromEntries(Object.entries(points).map(([key, point]) => [key, [{ ...point, durationMs: 85 }]]))
const variant = { page: { path: 'art/synthetic.webp', width: 8, height: 6 }, cell: { width: 2, height: 3 },
  foot: { x: 1, y: 2 }, standing: points, walking }

describe('character sprite releases', () => {
  it('loads an additive family with distinct character and outfit identities', () => {
    const index = parseArtIndex({ images: {}, atlases: {}, sprites: { '42': 'art/legacy.json' },
      characterSprites: { '23': 'art/original.json', 'outfit:42': 'art/sister.json' } }, 'art')
    expect(artPaths(index)).toEqual(['art/legacy.json', 'art/original.json', 'art/sister.json'])
    expect(parseCharacterSprites({ characterId: 23, outfitId: 42, variants: { trail: variant } }, 'set').variants.trail)
      .toEqual(variant)
    expect(parseArtIndex({ images: {}, atlases: {} }, 'old').characterSprites).toBeUndefined()
  })

  it('rejects invalid anchors, frame bounds and empty walks', () => {
    const parse = (v: unknown) => parseCharacterSprites({ characterId: 23, variants: { trail: v } }, 'set')
    expect(() => parse({ ...variant, foot: { x: 2, y: 2 } })).toThrow('inside the cell')
    expect(() => parse({ ...variant, walking: { ...walking, right: [{ x: 7, y: 2, durationMs: 80 }] } })).toThrow('inside the page')
    expect(() => parse({ ...variant, walking: { ...walking, right: [] } })).toThrow('at least one timed frame')
  })
})
