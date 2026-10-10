import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ART_FAMILIES, bustCrop, encodeArt, encodeBust } from './art'
import { artSources, outfitIconUrl, outfitPortraitUrl, scenarioIconUrl, supportCardArtUrl, supportCardIconUrl } from './sources'

describe('art sources', () => {
  it('derives each family URL from the original ids', () => {
    const outfit = { id: 900101, characterId: 9001 }
    expect(outfitIconUrl(outfit)).toBe('https://gametora.com/images/umamusume/characters/thumb/chara_stand_9001_900101.png')
    expect(outfitPortraitUrl(outfit)).toBe('https://gametora.com/images/umamusume/characters/chara_stand_9001_900101.png')
    expect(supportCardIconUrl(99001)).toBe('https://gametora.com/images/umamusume/supports/support_card_s_99001.png')
    expect(supportCardArtUrl(99001)).toBe('https://gametora.com/images/umamusume/supports/tex_support_card_99001.png')
    expect(scenarioIconUrl(99)).toBe('https://media.gametora.com/umamusume/scenarios/hero/thumb/99.png')
  })

  it('lists every skill icon once, Global icons included, and applies scenario overrides', () => {
    const data = syntheticMasterData()
    data.skills[0]!.globalIconId = 77
    const sources = artSources(data, new Map([[99, 'https://example.test/crest.png']]))
    expect(sources.skillIcons.map((source) => source.id)).toEqual(['77', '10001', '10002', '10005', '10006'])
    expect(sources.scenarioIcons).toEqual([{ id: '99', url: 'https://example.test/crest.png' }])
    expect(sources.outfitIcons).toEqual([{ id: '900101', url: outfitIconUrl({ id: 900101, characterId: 9001 }) }])
    expect(sources.supportCardArt).toEqual([{ id: '99001', url: supportCardArtUrl(99001) }])
  })
})

describe('art encoding', () => {
  it('fits inside the family size without cropping, and keeps portrait transparency', async () => {
    const source = await sharp({
      create: { width: 900, height: 1200, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0 } },
    }).png().toBuffer()

    const portrait = await encodeArt(ART_FAMILIES['outfit-portraits'], { id: 'u1', bytes: source, cacheHit: false })
    expect([portrait.width, portrait.height]).toEqual([384, 512])
    expect((await sharp(portrait.bytes).metadata()).hasAlpha).toBe(true)

    const card = await encodeArt(ART_FAMILIES['support-card-art'], { id: 'c1', bytes: source, cacheHit: false })
    expect(card.height).toBe(600)
    // Card art is a full illustration, so it's flattened rather than carrying a useless alpha channel.
    expect((await sharp(card.bytes).metadata()).hasAlpha).toBe(false)
  })

  it('never enlarges a small source', async () => {
    const small = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } }).png().toBuffer()
    const encoded = await encodeArt(ART_FAMILIES['outfit-portraits'], { id: 'u2', bytes: small, cacheHit: false })
    expect(encoded.width).toBe(64)
  })
})

describe('busts', () => {
  // A 100×100 cut-out whose head (rows 10–45) is centred on `headX`.
  const portrait = (headX: number) => {
    const rgba = new Uint8Array(100 * 100 * 4)
    for (let y = 0; y < 100; y += 1) {
      for (let x = 0; x < 100; x += 1) {
        const inHead = y >= 10 && y < 45 && Math.abs(x - headX) <= 12
        const inBody = y >= 45 && x >= 20 && x < 80
        if (inHead || inBody) rgba[(y * 100 + x) * 4 + 3] = 255
      }
    }
    return rgba
  }

  it('centres a 60% square on the head band, just below the top', () => {
    expect(bustCrop(portrait(70), 100, 100)).toEqual({ left: 40, top: 2, size: 60 })
  })

  it('stays inside the portrait when the head sits near an edge', () => {
    expect(bustCrop(portrait(90), 100, 100).left).toBe(40)
    expect(bustCrop(portrait(8), 100, 100).left).toBe(0)
  })

  it('honours a pinned crop for portraits the centroid misreads', () => {
    expect(bustCrop(portrait(70), 100, 100, { cx: 0.5, size: 0.5, top: 0.1 })).toEqual({ left: 25, top: 10, size: 50 })
  })

  it('encodes a square, transparent bust at the family size', async () => {
    const source = await sharp({
      create: { width: 600, height: 600, channels: 4, background: { r: 200, g: 100, b: 50, alpha: 0.5 } },
    }).png().toBuffer()
    const bust = await encodeBust(ART_FAMILIES['outfit-busts'], { id: 'u1', bytes: source, cacheHit: false })
    expect([bust.width, bust.height]).toEqual([256, 256])
    expect((await sharp(bust.bytes).metadata()).hasAlpha).toBe(true)
  })
})
