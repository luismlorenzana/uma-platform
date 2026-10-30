import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BASE, GROUND, SIZE } from './buildings/kit.ts'
import { PLACES } from './buildings/places.ts'
import { HEALER_SANCTUM } from './buildings/sanctum.ts'
import { sanctumPreview } from './buildings/sanctum-preview.ts'
import { Sprite } from './sprite.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h135-2.16.0.json'
import { Img } from './tiles/image.ts'

function paint(place = HEALER_SANCTUM) {
  const s = new Sprite(SIZE, SIZE)
  s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
  const extras = place.paint(s)
  return { s, extras, img: new Img(SIZE, SIZE, s.render()) }
}
const opaque = (img: Img) => Array.from({ length: SIZE * SIZE }, (_, i) => img.px[i * 4 + 3] === 255)

describe('H135 appended Healer Sanctum', () => {
  it('freezes all fifty published records and every old pixel, including both healer halls and unused cells', () => {
    const { index, img } = savedAtlas('buildings'), old = baseline.buildings
    expect(Object.keys(old.frames)).toHaveLength(50)
    for (const [id, f] of Object.entries(old.frames)) expect(index.frames[id], id).toEqual(f)
    const retained = img.crop(0, 0, old.width, old.height).copy(new Img(SIZE, SIZE), 96, 384)
    expect(hash(retained.px)).toBe(old.rgba)
    for (const [id, rgba] of Object.entries(old.cutouts)) {
      const f = index.frames[id]!
      expect(hash(img.crop(f.x, f.y, SIZE, SIZE).px), id).toBe(rgba)
    }
    for (const [file, sha] of Object.entries(baseline.previews))
      expect(hash(readFileSync(new URL(`../../../assets/previews/${file}`, import.meta.url))), file).toBe(sha)
  })
  it('appends a native 48px Learning temple at (96,384), ground line 44, with no smoke or edge pixels', () => {
    const { index, img } = savedAtlas('buildings'), a = paint()
    expect([index.width, index.height]).toEqual([288, 432])
    expect(Object.keys(index.frames)).toHaveLength(51)
    expect(PLACES[50]).toBe(HEALER_SANCTUM)
    expect(PLACES.at(-1)).toBe(HEALER_SANCTUM)
    expect(HEALER_SANCTUM.at).toEqual({ x: .5, y: .3 })
    expect(index.frames['healer-sanctum']).toEqual({ x: 96, y: 384, w: 48, h: 48, page: 'learning', anchorY: GROUND })
    expect(a.extras).toBeUndefined()
    expect(hash(a.img.px)).toBe(hash(paint().img.px))
    expect(hash(img.crop(96, 384, SIZE, SIZE).px)).toBe(hash(a.img.px))
    for (let i = 0; i < SIZE; i++) for (const [x, y] of [[0, i], [47, i], [i, 0], [i, 47]] as const) expect(a.img.get(x, y)[3]).toBe(0)
  })
  it('keeps both painted brazier glows at most alpha 70, two pixels clear of every edge', () => {
    const { s } = paint()
    expect(s.overlays.length).toBeGreaterThan(0)
    expect(new Set(s.overlays.map(o => o.color.slice(0, 3).join(',')))).toEqual(new Set(['242,193,78', '154,106,216']))
    for (const { x, y, color } of s.overlays) {
      expect(x >= 2 && x <= 45 && y >= 2 && y <= 45, `${x},${y}`).toBe(true)
      expect(color[3]).toBeLessThanOrEqual(70)
    }
  })
  it('differs by at least a quarter of the combined opaque silhouette from all six neighbouring halls', () => {
    const a = opaque(paint().img)
    for (const id of ['cleric-chapel', 'knights-bastion', 'summoner-circle', 'mage-tower', 'spell-blade-salle', 'brawler-dojo']) {
      const b = opaque(paint(PLACES.find(p => p.id === id)!).img)
      expect(a.filter((v, i) => v !== b[i]).length / a.filter((v, i) => v || b[i]).length, id).toBeGreaterThanOrEqual(.25)
    }
  })
  it('reproduces its 2× keep/temple/chapel comparison on Learning ground', () => {
    const saved = decodePng(readFileSync(new URL('../../../assets/previews/healer-sanctum-2x.png', import.meta.url)))
    expect([saved.w, saved.h]).toEqual([320, 112])
    expect(hash(saved.px)).toBe(hash(sanctumPreview().px))
  })
})
