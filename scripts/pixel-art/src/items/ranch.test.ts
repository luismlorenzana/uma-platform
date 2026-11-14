import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GLINTS, drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { decodePng, hash, savedAtlas } from '../testing/atlas.ts'
import baseline from '../testing/legacy-f83-2.29.0.json'
import { RANCH_PREVIEW_SCALES, ranchComparisonIcons, ranchPreview } from './ranch-previews.ts'
import { RANCH_GOODS } from './ranch.ts'

const root = new URL('../../../../', import.meta.url)
const silhouette = (px: Uint8Array) => Array.from({ length: px.length / 4 }, (_, i) => px[i * 4 + 3] === 255)
/** Share of the union of two opaque silhouettes that only one of them covers. */
const apart = (a: Uint8Array, b: Uint8Array) => {
  const x = silhouette(a), y = silhouette(b)
  return x.filter((v, i) => v !== y[i]).length / x.filter((v, i) => v || y[i]).length
}

describe('F83: the ranch goods, egg to goat milk (P178)', () => {
  it('freezes all 362 published item frames, their metadata and the whole old sheet', () => {
    const { img, index } = savedAtlas('items'), old = baseline.items
    const retained = Object.fromEntries(Object.entries(index.frames).slice(0, old.frames))
    expect(hash(JSON.stringify(retained))).toBe(old.metadata)
    expect(hash(img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('keeps every other atlas file and every older preview PNG byte-identical (the items contact sheet grows a row)', () => {
    expect(Object.keys(baseline.artFiles)).toHaveLength(48)
    expect(Object.keys(baseline.previews)).toHaveLength(126)
    for (const [file, sha] of Object.entries(baseline.artFiles)) expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.previews)) expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
  })

  it('appends one raw row at y 1216, G1–G4 from the left, keyed by uma-farm\'s ids', () => {
    const { index } = savedAtlas('items')
    expect([index.width, index.height, index.cell, Object.keys(index.frames).length]).toEqual([320, 1248, 32, 366])
    expect(Object.keys(index.frames).slice(baseline.items.frames)).toEqual(['egg', 'milk', 'duck-egg', 'goat-milk'])
    expect(RANCH_GOODS.map((g) => index.frames[g.id])).toEqual([
      { x: 0, y: 1216, w: 32, h: 32, name: 'Egg', kind: 'ranch', line: 'eggs-milk', grade: 1 },
      { x: 32, y: 1216, w: 32, h: 32, name: 'Milk', kind: 'ranch', line: 'eggs-milk', grade: 2 },
      { x: 64, y: 1216, w: 32, h: 32, name: 'Duck Egg', kind: 'ranch', line: 'eggs-milk', grade: 3 },
      { x: 96, y: 1216, w: 32, h: 32, name: 'Goat Milk', kind: 'ranch', line: 'eggs-milk', grade: 4 },
    ])
    // The rest of the new row stays empty.
    const { img } = savedAtlas('items')
    expect(img.crop(128, 1216, 192, 32).px.every((v) => v === 0)).toBe(true)
  })

  it('matches deterministic painters, the atlas cells and every standalone PNG', () => {
    const { img, index } = savedAtlas('items')
    for (const good of RANCH_GOODS) {
      const frame = index.frames[good.id]!, a = drawIcon(good), b = drawIcon(good)
      expect(encodePng(32, 32, a).equals(encodePng(32, 32, b)), good.id).toBe(true)
      expect(hash(img.crop(frame.x, frame.y, 32, 32).px), good.id).toBe(hash(a))
      const standalone = decodePng(readFileSync(new URL(`assets/items/ranch/${good.id}.png`, root)))
      expect([standalone.w, standalone.h], good.id).toEqual([32, 32])
      expect(hash(standalone.px), good.id).toBe(hash(a))
    }
  })

  it('keeps each icon\'s border clear, has no legendary glints and shades every one with real tones', () => {
    for (const good of RANCH_GOODS) {
      const px = drawIcon(good)
      for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [31, i], [i, 31]] as const) expect(px[(y * 32 + x) * 4 + 3], `${good.id} ${x},${y}`).toBe(0)
      for (const [gx, gy] of GLINTS) expect([...px.subarray((gy * 32 + gx) * 4, (gy * 32 + gx + 1) * 4)], good.id).not.toEqual([255, 255, 255, 255])
      // Shaded, not flat: at least five opaque colours (an outline and four tones of one ramp).
      const colours = new Set<string>()
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] === 255) colours.add(px.subarray(i, i + 3).join())
      expect(colours.size, good.id).toBeGreaterThanOrEqual(5)
    }
  })

  it('keeps the four silhouettes a quarter apart, and apart from their look-alikes: the bottle from a tonic\'s, the eggs from the potato', () => {
    const goods = RANCH_GOODS.map((g) => ({ name: g.id, px: drawIcon(g) }))
    for (const [i, a] of goods.entries()) for (const b of goods.slice(i + 1)) expect(apart(a.px, b.px), `${a.name} vs ${b.name}`).toBeGreaterThanOrEqual(0.25)
    const near = Object.fromEntries(ranchComparisonIcons().map((c) => [c.name, c.px]))
    const px = (id: string) => goods.find((g) => g.name === id)!.px
    for (const [id, other] of [['milk', 'Stride Tonic'], ['egg', 'Potato'], ['duck-egg', 'Potato']] as const) {
      expect(apart(px(id), near[other]!), `${id} vs ${other}`).toBeGreaterThanOrEqual(0.25)
    }
  })

  it.each(RANCH_PREVIEW_SCALES)('reproduces the %i× white/dark review sheet', (scale) => {
    const preview = ranchPreview(scale)
    const saved = decodePng(readFileSync(new URL(`assets/previews/ranch-goods-${scale}x.png`, root)))
    expect(hash(saved.px)).toBe(hash(preview.px))
    expect([preview.w, preview.h]).toEqual([4 * (32 * scale + 8) + 8, 4 * (32 * scale + 8) + 8])
  })
})
