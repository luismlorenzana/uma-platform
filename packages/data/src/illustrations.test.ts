import { describe, expect, it } from 'vitest'
import { artPaths, parseArtIndex } from './art.js'
import { createReleaseClient } from './client.js'
import { ILLUSTRATION_MOMENTS, illustrationById, illustrationFor, illustrationPaths, parseIllustrations } from './illustrations.js'
import { buildMemoryRelease, createMemorySource, syntheticIllustrations } from './testing.js'

const ills = () => structuredClone(syntheticIllustrations(1068)) as unknown as Record<string, unknown> & { scenes: Record<string, unknown>[] }

describe('the illustrations format', () => {
  it('parses a character’s scenes in order, each with its moment', () => {
    const p = parseIllustrations(ills(), 'i')
    expect(p.scenes.map((s) => [s.id, s.moment])).toEqual([['meeting', 'meeting'], ['confession', 'confession'], ['confession-yes', 'confession-yes']])
    expect(illustrationPaths(p)).toHaveLength(3)
    expect(ILLUSTRATION_MOMENTS).toContain('wedding-night-end')
  })
  it('refuses no scenes, an id used twice, a name that isn’t kebab case and a path outside the family', () => {
    expect(() => parseIllustrations({ ...ills(), scenes: [] }, 'i')).toThrow(/at least one scene/)
    const twice = ills(); twice.scenes[1]!.id = 'meeting'
    expect(() => parseIllustrations(twice, 'i')).toThrow(/not used before/)
    const shouty = ills(); shouty.scenes[0]!.moment = 'Meeting'
    expect(() => parseIllustrations(shouty, 'i')).toThrow(/lowercase/)
    const away = ills(); away.scenes[0]!.path = 'art/dialogue-portraits/1068-x.0000000000000000.webp'
    expect(() => parseIllustrations(away, 'i')).toThrow(/art\/illustrations/)
  })
  it('accepts a moment and an outfit it doesn’t know: the names are open', () => {
    const open = ills(); open.scenes[0]!.moment = 'harvest-festival'; open.scenes[0]!.outfit = 'yukata'
    expect(parseIllustrations(open, 'i').scenes[0]).toMatchObject({ moment: 'harvest-festival', outfit: 'yukata' })
  })
  it('finds her scene for a moment, the first in her order, and by id; null when she has none', () => {
    const two = ills(); two.scenes.push({ ...two.scenes[0]!, id: 'meeting-again' })
    const p = parseIllustrations(two, 'i')
    expect(illustrationFor(p, 'meeting')?.id).toBe('meeting')
    expect(illustrationFor(p, 'wedding')).toBeNull()
    expect(illustrationById(p, 'meeting-again')?.moment).toBe('meeting')
    expect(illustrationById(p, 'nowhere')).toBeNull()
  })
})

describe('reading a character’s illustrations through a release', () => {
  it('finds her by character id, checks every picture against the manifest, and is null for one without', async () => {
    const release = await buildMemoryRelease(undefined, { illustrations: [syntheticIllustrations(1068), syntheticIllustrations(1129, ['beach'])] })
    const client = createReleaseClient({ source: createMemorySource(release.objects) })
    const manifest = await client.manifest()
    const art = (await client.art(manifest))!
    expect(Object.keys(art.illustrations ?? {}).sort()).toEqual(['1068', '1129'])
    expect(artPaths(art)).toEqual(expect.arrayContaining(Object.values(art.illustrations!)))
    const p = (await client.illustrations(manifest, art, 1068))!
    const listed = new Map(manifest.files.map((f) => [f.path, f]))
    for (const s of p.scenes) expect(listed.get(s.path)?.sha256).toBe(s.sha256)
    expect((await client.illustrations(manifest, art, 1129))!.scenes.map((s) => s.moment)).toEqual(['beach'])
    expect(await client.illustrations(manifest, art, 1002)).toBeNull()
  })
  it('refuses a scene whose bytes aren’t the manifest’s', async () => {
    const release = await buildMemoryRelease(undefined, { illustrations: [syntheticIllustrations(1068)] })
    const client = createReleaseClient({ source: createMemorySource(release.objects) })
    const manifest = await client.manifest()
    const art = (await client.art(manifest))!
    const scene = manifest.files.find((f) => f.path.startsWith('art/illustrations/1068-meeting'))!
    scene.sha256 = 'f'.repeat(64)
    await expect(client.illustrations(manifest, art, 1068)).rejects.toThrow(/bytes and SHA-256/)
  })
  it('an older index without the map parses as before', () => {
    expect(parseArtIndex({ atlases: {}, images: {} }, 'a').illustrations).toBeUndefined()
  })
})
