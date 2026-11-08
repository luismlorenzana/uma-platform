import { describe, expect, it } from 'vitest'
import { parseSpriteSet, type SpriteSet } from './sprites.js'
import { artPaths, parseArtIndex } from './art.js'
import { createReleaseClient } from './client.js'
import { buildMemoryRelease, createMemorySource, syntheticSpriteSet } from './testing.js'

describe('sprite schema', () => {
  it('keeps open profiles, actions and faces and drops unknown fields', () => {
    const input = { ...syntheticSpriteSet(), future: true }
    expect(parseSpriteSet(input, 'sprite')).toEqual(syntheticSpriteSet())
  })
  const cases: [string, (s: SpriteSet) => void][] = [
    ['page index', s => { s.actions.idle!.frames[0]!.page = 3 }],
    ['page rectangle', s => { s.actions.idle!.frames[0]!.x = 31 }],
    ['trim offset', s => { s.actions.idle!.frames[0]!.dx = 250 }],
    ['event index', s => { s.actions.wave!.events.release = 1 }],
    ['reversed event range', s => { s.actions.wave!.events.hold = [1, 0] }],
    ['anchor', s => { s.foot.x = 256 }],
    ['face placement', s => { s.faces.blink!.place.x = 255 }],
    ['head offset', s => { s.actions.idle!.frames[0]!.headOffset = { x: 130, y: 0 } }],
    ['missing locked offset', s => { delete s.actions.idle!.frames[0]!.headOffset }],
    ['bounds', s => { s.actions.wave!.frames[0]!.bounds.height = 1 }],
    ['path traversal', s => { s.pages[0]!.path = '../secret' }],
    ['nonfinite angle', s => { s.actions.wave!.frames[0]!.grip = { x: 10, y: 10, angle: Infinity } }],
  ]
  it.each(cases)('rejects invalid %s', (_label, mutate) => {
    const input = syntheticSpriteSet(); mutate(input)
    expect(() => parseSpriteSet(input, 'sprite')).toThrow()
  })
  it('reads old art indexes and includes sprite paths only when present', () => {
    expect(parseArtIndex({ atlases: {}, images: {} }, 'art')).toEqual({ atlases: {}, images: {} })
    expect(artPaths(parseArtIndex({ atlases: {}, images: {}, sprites: { '900101': 'art/set.json' } }, 'art'))).toEqual(['art/set.json'])
    // Frozen shape of the 1.3 parser: it selects only the two known keys.
    const oldParser = (value: { atlases: object; images: object }) => ({ atlases: value.atlases, images: value.images })
    expect(oldParser({ ...{ atlases: {}, images: {}, sprites: { '900101': 'art/set.json' } } })).toEqual({ atlases: {}, images: {} })
  })
  it('loads synthetic sets through verified releases and returns null for absent outfits', async () => {
    const memory = await buildMemoryRelease(undefined, { sprites: [syntheticSpriteSet()], extraFiles: { 'atlases/synthetic.webp': new Uint8Array([1, 2]) } })
    const client = createReleaseClient({ source: createMemorySource(memory.objects) })
    const release = await client.load()
    expect(await client.spriteSet(release.manifest, release.art!, 900101)).toEqual(syntheticSpriteSet())
    expect(await client.spriteSet(release.manifest, release.art!, 900102)).toBeNull()
    const path = release.art!.sprites!['900101']!
    memory.objects.set(`files/${path}`, new Uint8Array([0]))
    await expect(client.spriteSet(release.manifest, release.art!, 900101)).rejects.toThrow()
  })
  it('rejects a missing page in the manifest', async () => {
    const memory = await buildMemoryRelease(undefined, { sprites: [syntheticSpriteSet()] })
    const client = createReleaseClient({ source: createMemorySource(memory.objects) })
    const release = await client.load()
    await expect(client.spriteSet(release.manifest, release.art!, 900101)).rejects.toThrow('manifest')
  })
})
