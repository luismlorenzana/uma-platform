import type { ArtIndex } from '@luismlorenzana/uma-data'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Detail, UmaTile } from './ArtScreen'
import type { AlbumEntry, Universe } from './data'
import { imageCountsOf } from './imageCounts'

// Synthetic data includes obsolete cached fields to verify they no longer appear.
const entry: AlbumEntry & { adult: boolean; sprite: boolean } = {
  outfitId: 900101, characterId: 9001, name: 'Rider One', title: 'Test outfit',
  sisterOf: null, sister: null, tier: 'T1', order: 1, adult: true, sprite: true,
}
const data = {
  release: 'synthetic', entries: [entry],
  art: { atlases: {}, images: {
    'outfit-portraits': { 900101: { path: 'portrait.webp', width: 1, height: 1 } },
    'outfit-renders': { 900101: { path: 'render.webp', width: 1, height: 2 } },
  } } as unknown as ArtIndex,
  cards: new Map([[9001, [{ id: 1, title: 'Retired card', rarity: 1, type: 'test', art: 'card.webp' }]]]),
}
const quest: Universe = {
  id: 'high-fantasy', title: 'Excluded world', style: null, revision: null, publishedAt: null,
  looks: [{ id: 'retired', character: 'Rider One', characterId: 9001, outfit: 'test', title: 'Retired look',
    path: 'retired.png', bytes: 1, sha256: '0'.repeat(64), width: 1, height: 1, approvedOn: null, publishedAt: null }],
}

describe('Character Art cleanup', () => {
  it('shows master-data counts without an Adult badge even when old cached fields are present', () => {
    const counts = imageCountsOf(data, [quest], entry)
    const html = renderToStaticMarkup(<UmaTile entry={entry} path={null} counts={counts} onOpen={() => undefined} />)
    expect(counts).toEqual([{ world: 'master-data', count: 2 }])
    expect(html).toContain('master-data')
    expect(html).not.toContain('Adult')
    expect(html).not.toContain('uma-quest')
  })

  it('shows her master-data render and pictures without cards, legacy baselines, keys, sprites or excluded worlds', () => {
    const html = renderToStaticMarkup(<Detail entry={entry} data={data} universes={[quest]} onClose={() => undefined} />)
    expect(html).toContain('Full body')
    expect(html).toContain('Master data')
    expect(html).toContain('Portrait')
    for (const removed of ['Adult', 'Baseline', 'Battle keys', 'Chibi sprites', 'Support cards', 'Retired card', 'Source art', 'Excluded world', 'Retired look']) {
      expect(html).not.toContain(removed)
    }
  })
})
