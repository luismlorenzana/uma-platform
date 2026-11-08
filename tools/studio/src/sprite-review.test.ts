import { expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { atomicJson, buildProgress, type NativeAtlas } from '@uma-platform/sprite-pipeline'
import { spriteReview } from './sprite-review.js'
import type { Catalog } from './model.js'

vi.mock('./prop-art.js', () => ({ propArt: async () => ({ held: {}, emotes: {}, heldSource: { package: 'synthetic', version: '0' } }) }))

it('shows an alternate townsfolk outfit at its assigned gate and in progress without changing the roster', async () => {
  const content = await mkdtemp(resolve(tmpdir(), 'studio-outfit-test-'))
  try {
    const root = resolve(content, 'authoring/sprites'), dir = resolve(root, '900103/r1')
    await mkdir(dir, { recursive: true })
    const rankings = [
      { outfitId: 900101, characterId: 9001, tier: 'B', bucket: 'front' },
      { outfitId: 900103, characterId: 9001, tier: 'F', bucket: 'front' },
    ]
    await atomicJson(resolve(content, 'authoring/uma-art-roster.json'), { revision: 1, rankings })
    await atomicJson(resolve(root, 'queue.json'), { schemaVersion: 1, traveler: [], townsfolk: [900103], townsfolkOutfits: [900103] })
    await atomicJson(resolve(root, 'batches.json'), { traveler: [], townsfolk: [{ batch: 1, outfits: [900103] }] })
    await atomicJson(resolve(root, 'reviews.json'), { schemaVersion: 1, outfits: {} })
    await atomicJson(resolve(root, '900103/current.json'), { revision: 1 })
    const frame = { file: 'key.png', headLocked: false, hold: 'none', hit: { x: 128, y: 161 } }
    const atlas: NativeAtlas = { id: 900103, revision: 1, profile: 'townsfolk', cell: 256, logicalCell: 64,
      foot: { x: 128, y: 240 }, hit: frame.hit, headBox: { x: 80, y: 30, w: 100, h: 100 }, faceBox: { x: 110, y: 90, w: 40, h: 30 }, approvedKey: 'key.png', faces: {},
      actions: { idle: { loop: false, events: {}, frames: [frame] }, turnaround: { loop: false, events: {}, frames: ['front', 'back', 'left', 'right'].map(view => ({ ...frame, view })) } } }
    await atomicJson(resolve(dir, 'atlas.json'), atlas)
    await writeFile(resolve(dir, 'key.png'), 'invented key bytes')
    const catalog: Catalog = { release: 'synthetic', umas: [] }
    const review = await spriteReview(content, catalog, new URLSearchParams('profile=townsfolk&batch=1'))
    expect(review.characters.map(c => c.id)).toEqual([900103])
    expect(review.missing).toEqual([])
    const progress = await buildProgress(content, false)
    expect(progress.entries.map(e => [e.outfitId, e.phase])).toEqual([[900103, 'Key gate']])
    expect(progress.totals.townsfolk).toMatchObject({ total: 1, nextBatch: [900103] })
    await expect(spriteReview(content, catalog, new URLSearchParams('profile=townsfolk&ids=900101'))).rejects.toThrow('selection')
  } finally { await rm(content, { recursive: true, force: true }) }
})
