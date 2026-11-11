import { buildMemoryRelease, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import type { FileSource } from '@luismlorenzana/uma-server/content'
import { emptyBoard, emptyProfiles } from '@uma-platform/tiers'
import { describe, expect, it } from 'vitest'
import { ArtService } from './art.service'

// Invented records only: uma-data's synthetic release, with a second, invented outfit for character 9001.
const data = () => { const d = syntheticMasterData(); d.outfits = [...d.outfits, { ...d.outfits[0]!, id: 900102, variant: 'summer' }]; return d }
const files = (objects: ReadonlyMap<string, Uint8Array>): FileSource => ({ read: async (path) => objects.get(path) ?? null })
const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))

describe('Character Art’s order (CA1)', () => {
  it('gives every outfit her Uma, her sister’s profile and her place in the Ranker, read fresh each time', async () => {
    const release = await buildMemoryRelease(data())
    const ranker = new Map<string, Uint8Array>()
    const art = new ArtService(files(release.objects), files(ranker))
    // Nothing ranked yet: every outfit, unranked, as her character.
    expect((await art.order()).outfits.map((o) => [o.outfitId, o.identity, o.tier])).toEqual([[900101, '9001', null], [900102, '9001', null]])
    ranker.set('boards/umas.json', json({ ...emptyBoard('umas'), revision: 4, entries: [{ id: '900102', tier: 'T2', note: '' }, { id: '900101', tier: 'F', note: '' }] }))
    ranker.set('profiles.json', json({ ...emptyProfiles(), revision: 2, sisters: [{ outfitId: 900102, characterId: 9001, name: 'Sister 9001', relation: 'twin', age: 'an invented age', profile: 'Invented.' }] }))
    const order = await art.order()
    expect(order).toMatchObject({ rankerRevision: 4, profilesRevision: 2 })
    expect(order.outfits).toEqual([
      expect.objectContaining({ outfitId: 900101, identity: '9001', sister: null, tier: 'F', order: 2 }),
      expect.objectContaining({ outfitId: 900102, identity: 's900102', name: 'Sister 9001', sister: { relation: 'twin', age: 'an invented age', profile: 'Invented.' }, tier: 'T2', order: 1 }),
    ])
  })
})
