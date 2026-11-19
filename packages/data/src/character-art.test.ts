import { describe, expect, it } from 'vitest'
import { characterArtKey } from './character-art.js'
import { createReleaseClient } from './client.js'
import { buildMemoryRelease, createMemorySource, syntheticDialoguePortraits, syntheticIllustrations } from './testing.js'

describe('outfit-specific character art', () => {
  it('keeps original and outfit portraits and scenes separate through the release client', async () => {
    const variantPortrait = { ...syntheticDialoguePortraits(9002, ['summer'], ['happy']), characterId: 9001, outfitId: 900102 }
    const variantScenes = { ...syntheticIllustrations(9002, ['beach']), characterId: 9001, outfitId: 900102 }
    const release = await buildMemoryRelease(undefined, {
      dialoguePortraits: [syntheticDialoguePortraits(9001, ['spring']), variantPortrait],
      illustrations: [syntheticIllustrations(9001, ['meeting']), variantScenes],
    })
    const client = createReleaseClient({ source: createMemorySource(release.objects) })
    const manifest = await client.manifest(), art = (await client.art(manifest))!
    const original = (await client.dialoguePortraits(manifest, art, 9001))!
    const variant = (await client.dialoguePortraits(manifest, art, 9001, 900102))!
    expect(Object.keys(original.bases)).toEqual(['spring'])
    expect(original.outfitId).toBeUndefined()
    expect(Object.keys(variant.bases)).toEqual(['summer'])
    expect(variant.outfitId).toBe(900102)
    expect((await client.illustrations(manifest, art, 9001))!.scenes[0]!.moment).toBe('meeting')
    expect((await client.illustrations(manifest, art, 9001, 900102))!.scenes[0]!.moment).toBe('beach')
    expect(await client.dialoguePortraits(manifest, art, 9001, 900103)).toBeNull()
    expect(await client.illustrations(manifest, art, 9001, 900103)).toBeNull()
    await expect(client.dialoguePortraits(manifest, art, 9002, 900102)).rejects.toThrow(/characterId/)
    await expect(client.illustrations(manifest, art, 9002, 900102)).rejects.toThrow(/characterId/)
    const swapped = { ...art, dialoguePortraits: { ...art.dialoguePortraits, 'outfit:900102': art.dialoguePortraits!['9001']! },
      illustrations: { ...art.illustrations, 'outfit:900102': art.illustrations!['9001']! } }
    await expect(client.dialoguePortraits(manifest, swapped, 9001, 900102)).rejects.toThrow(/outfitId/)
    await expect(client.illustrations(manifest, swapped, 9001, 900102)).rejects.toThrow(/outfitId/)
  })

  it('rejects invalid identities before they become index keys', () => {
    expect(characterArtKey(9001)).toBe('9001')
    expect(characterArtKey(9001, 900102)).toBe('outfit:900102')
    for (const invalid of [0, -1, 1.5, Number.NaN]) expect(() => characterArtKey(9001, invalid)).toThrow()
  })
})
