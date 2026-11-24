import { describe, expect, it, vi } from 'vitest'

const source = vi.hoisted(() => ({ set: vi.fn(), art: vi.fn(), order: vi.fn() }))
vi.mock('../../content/client', () => ({ CONTENT: {
  release: async () => source, manifest: async () => ({ version: 'synthetic' }),
} }))
vi.mock('../../api/client', () => ({ request: source.order }))
import { loadAlbum } from './data'

describe('Character Art album loading', () => {
  it('loads master-data references and Ranker order without support-card or legacy key data', async () => {
    source.set.mockImplementation(async (_manifest: unknown, family: string) => family === 'outfits'
      ? [{ id: 900101, characterId: 9001, title: { global: '[Test outfit]' } }]
      : [{ id: 9001, name: { global: 'Rider One' } }])
    source.art.mockResolvedValue({ images: { 'outfit-renders': { 900101: { path: 'render.webp', width: 1, height: 2 } } } })
    source.order.mockResolvedValue({ release: 'synthetic', outfits: [] })
    const album = await loadAlbum(true)
    expect(source.set.mock.calls.map(call => call[1])).toEqual(['outfits', 'characters'])
    expect(source.order).toHaveBeenCalledTimes(1)
    expect(source.order).toHaveBeenCalledWith('/api/art/order')
    expect(album.entries).toHaveLength(1)
    expect(album.entries[0]).toMatchObject({ outfitId: 900101, characterId: 9001, name: 'Rider One' })
    expect(album.entries[0]).not.toHaveProperty('adult')
    expect(album.entries[0]).not.toHaveProperty('sprite')
    expect(album).not.toHaveProperty('cards')
  })
})
