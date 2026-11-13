import { buildMemoryRelease, syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { safePackPath, type FileSource } from '@luismlorenzana/uma-server/content'
import { emptyBoard, emptyProfiles } from '@uma-platform/tiers'
import { describe, expect, it } from 'vitest'
import { KEY_PACK_ALLOW } from './art.module'
import { ArtService } from './art.service'
import { sourceReleases } from './art.sources'
import { UNIVERSE_PACK_ALLOW, universes } from './art.universes'

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

describe('the adult sets’ source-art records (CA2)', () => {
  it('reads each batch from its channel, counts her files and the shared ones, and stops at the first missing batch', async () => {
    const root = 'source-art/adult-travelers/batch-1'
    const objects = new Map<string, Uint8Array>([
      [`${root}/channels/latest.json`, json({ manifest: `gs://bucket/${root}/releases/v1/manifest.json`, outfitIds: [900101], version: 'v1' })],
      [`${root}/releases/v1/manifest.json`, json({ version: 'v1', archive: { bytes: 99, sha256: 'ab' }, deliveryCatalog: [{ outfitId: 900101, revision: 'set-r1', personality: 'calm', ownerWord: 'Approve it', recordedAt: '2026-01-01' }] })],
      [`${root}/releases/v1/inventory.json`, json({ files: [{ file: '900101/a.png', bytes: 10 }, { file: '900101/b.png', bytes: 5 }, { file: 'references/r.png', bytes: 7 }] })],
      [`${root}/releases/v1/publication-receipt.json`, json({ publishedAt: '2026-01-02' })],
    ])
    const releases = await sourceReleases(files(objects))
    expect(releases).toEqual([{
      batch: 'batch-1', version: 'v1', publishedAt: '2026-01-02', approvedAt: null, ownerWord: null, archive: { bytes: 99, sha256: 'ab' }, files: 3, bytes: 22,
      shared: { files: 1, bytes: 7 }, outfits: { '900101': { revision: 'set-r1', personality: 'calm', ownerWord: 'Approve it', recordedAt: '2026-01-01', files: 2, bytes: 15 } },
    }])
  })
})

describe('the universe looks (CA4)', () => {
  // The app's `art/` folder as a map; invented looks of an invented rider, never a picture.
  const store = (objects: ReadonlyMap<string, Uint8Array>) => ({
    read: async (path: string) => { const bytes = objects.get(path); return bytes ? { bytes, generation: '1' } : null },
    list: async (prefix: string) => [...objects.keys()].filter((p) => p.startsWith(`${prefix}/`)).sort(),
  })
  const HASH = 'ab'.repeat(32), OTHER = 'cd'.repeat(32)
  const look = (id: string, sha256: string, extra: Record<string, unknown> = {}) => ({
    id, character: 'Rider One', outfit: id.replace('rider-one-', ''), title: 'A look', path: `images/${id}.${sha256.slice(0, 16)}.png`, bytes: 1200, sha256, width: 64, height: 96,
    approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z', ...extra,
  })
  const index = (universe: string, looks: unknown[], extra: Record<string, unknown> = {}) =>
    json({ schemaVersion: 1, kind: 'universe-art', universe, title: 'Sky City', style: 'Invented Style', revision: 2, publishedAt: '2026-01-03T10:00:00.000Z', looks, ...extra })
  const nobody = () => null

  it('lists each published universe by name with its looks in the index’s order, each at her pack path', async () => {
    const objects = new Map<string, Uint8Array>([
      ['universes/sky-city/index.json', index('sky-city', [look('rider-one-street', HASH), look('rider-one-pilot', OTHER)])],
      ['universes/old-road/index.json', index('old-road', [look('rider-one-villager', HASH)], { title: 'Old Road', style: null, revision: null })],
      [`universes/sky-city/images/rider-one-street.${HASH.slice(0, 16)}.png`, json('not an index')],
    ])
    const all = await universes(store(objects), (name) => (name === 'Rider One' ? 9001 : null))
    expect(all.map((u) => [u.id, u.title, u.style, u.revision, u.looks.length])).toEqual([['old-road', 'Old Road', null, null, 1], ['sky-city', 'Sky City', 'Invented Style', 2, 2]])
    expect(all[1]!.looks[0]).toEqual({
      id: 'rider-one-street', character: 'Rider One', characterId: 9001, outfit: 'street', title: 'A look', path: `universes/sky-city/images/rider-one-street.${HASH.slice(0, 16)}.png`,
      bytes: 1200, sha256: HASH, width: 64, height: 96, approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z',
    })
    expect(all[1]!.looks.map((l) => l.id)).toEqual(['rider-one-street', 'rider-one-pilot'])
  })

  it('drops a look whose entry isn’t a hash-named PNG of its own, another universe’s index, and a damaged file', async () => {
    const objects = new Map<string, Uint8Array>([
      ['universes/sky-city/index.json', index('sky-city', [
        look('rider-one-street', HASH), look('rider-one-wrong-hash', HASH, { path: `images/rider-one-wrong-hash.${OTHER.slice(0, 16)}.png` }), look('rider-one-outside', HASH, { path: '../../ranker/profiles.json' }),
        look('rider-one-no-size', HASH, { width: 0 }), look('Rider One', HASH), 'words', null,
      ])],
      ['universes/copied/index.json', index('sky-city', [look('rider-one-street', HASH)])],
      ['universes/broken/index.json', new TextEncoder().encode('{ not json')],
      ['universes/empty/index.json', index('empty', [])],
      ['universes/Not-A-Name/index.json', index('Not-A-Name', [look('rider-one-street', HASH)])],
    ])
    const all = await universes(store(objects), nobody)
    expect(all.map((u) => [u.id, u.looks.map((l) => l.id)])).toEqual([['sky-city', ['rider-one-street']]])
    expect(all[0]!.looks[0]!.characterId).toBeNull()
    expect(await universes(store(new Map()), nobody)).toEqual([])
  })

  it('finds her character by any of her master data names, however the author wrote it', async () => {
    const d = data(); d.characters[0]!.name = { ...d.characters[0]!.name, en: 'Rider One', global: 'Rider One (Global)' }
    const release = await buildMemoryRelease(d)
    const byName = await new ArtService(files(release.objects), files(new Map())).characterByName()
    expect([byName('Rider One'), byName('rider-one'), byName('RIDER ONE (global)'), byName('Rider Two'), byName('')]).toEqual([9001, 9001, 9001, null, null])
  })

  it('serves only a look’s hash-named PNG beside the key pack’s files', () => {
    const allow = [...KEY_PACK_ALLOW, UNIVERSE_PACK_ALLOW]
    expect(safePackPath(`universes/sky-city/images/rider-one-street.${HASH.slice(0, 16)}.png`, allow)).toEqual({ path: `universes/sky-city/images/rider-one-street.${HASH.slice(0, 16)}.png`, immutable: true })
    for (const path of ['universes/sky-city/index.json', 'universes/sky-city/images/rider-one-street.png', `universes/sky-city/prompts/street.${HASH.slice(0, 16)}.txt`, `universes/../ranker/x.${HASH.slice(0, 16)}.png`, 'ranker/profiles.json'])
      expect(safePackPath(path, allow)).toBeNull()
    expect(safePackPath('traveler-keys/index.json', allow)).toEqual({ path: 'traveler-keys/index.json', immutable: false })
  })
})
