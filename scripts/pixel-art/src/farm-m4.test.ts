import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePng } from './png.ts'
import { drawIcon } from './icon.ts'
import { FAMILIES } from './items/index.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-f25-2.24.0.json'
import { drawUi, packUi, uiFrames } from './ui/atlas.ts'
import { FARM_MARK_IDS, FARM_PREVIEW_CROPS, farmPreview, seededCrop } from './ui/farm-preview.ts'
import { FARM_MARKS, FRAME_SPECS, SEASONS } from './ui/spec.ts'

const root = new URL('../../../', import.meta.url)
const frames = uiFrames()
const img = (id: string) => frames.find((f) => f.id === id)!.img
const silhouette = (px: Uint8Array) => Array.from({ length: px.length / 4 }, (_, i) => px[i * 4 + 3] === 255)
/** Share of the union of two opaque silhouettes that only one of them covers. */
const apart = (a: Uint8Array, b: Uint8Array) => {
  const x = silhouette(a), y = silhouette(b)
  return x.filter((v, i) => v !== y[i]).length / x.filter((v, i) => v || y[i]).length
}
// The two general buildings previews show every place, so they grow with each addition (H156's rule).
const GENERAL = ['buildings.png', 'buildings-contact-3x.png']

describe('F25 part A: the farm\'s M4 marks and places (P126)', () => {
  it('freezes all 61 published UI records, cutouts and pixels, including the gaps', () => {
    const saved = savedAtlas('ui'), generated = packUi(frames), old = baseline.ui
    expect(FRAME_SPECS.slice(0, 61).map((f) => f.id)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(saved.index.frames[id], id).toEqual(record)
      expect(generated.index[id], id).toEqual(record)
      for (const sheet of [saved.img, generated.atlas]) expect(hash(sheet.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    for (const sheet of [saved.img, generated.atlas]) expect(hash(sheet.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('freezes all 54 published places, their cutouts and the whole old buildings sheet', () => {
    const saved = savedAtlas('buildings'), old = baseline.buildings
    expect(Object.keys(saved.index.frames).slice(0, 54)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(saved.index.frames[id], id).toEqual(record)
      expect(hash(saved.img.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    expect(hash(saved.img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('keeps every other atlas file and every older preview PNG byte-identical', () => {
    expect(Object.keys(baseline.artFiles)).toHaveLength(24)
    expect(Object.keys(baseline.previews)).toHaveLength(103)
    for (const [file, sha] of Object.entries(baseline.artFiles)) expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.previews)) {
      if (!GENERAL.includes(file)) expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
    }
  })

  it('appends the ten marks on two new rows and the two places on a new row, nothing else', () => {
    const ui = savedAtlas('ui').index, buildings = savedAtlas('buildings').index
    expect([ui.width, ui.height, Object.keys(ui.frames).length]).toEqual([120, 380, 87])
    expect(FRAME_SPECS.slice(61, 71).map((f) => f.id)).toEqual([...FARM_MARK_IDS]) // F55 appends sixteen after them.
    expect(FARM_MARK_IDS.map((id) => ui.frames[id])).toEqual([
      { x: 0, y: 244, w: 16, h: 16, group: 'currency', key: 'gold' },
      ...FARM_MARKS.map((key, i) => ({ x: 16 + i * 16, y: 244, w: 16, h: 16, group: 'farm', key })),
      ...SEASONS.map((key, i) => ({ x: i * 16, y: 260, w: 16, h: 16, group: 'season', key })),
    ])
    expect([buildings.width, buildings.height, Object.keys(buildings.frames).length]).toEqual([288, 480, 58])
    expect(buildings.frames.dorm).toEqual({ x: 0, y: 432, w: 48, h: 48, page: 'farmlands', anchorY: 44, smoke: { x: 38, y: 3 } })
    expect(buildings.frames['shipping-bin']).toEqual({ x: 48, y: 432, w: 48, h: 48, page: 'farmlands', anchorY: 44 })
  })

  it('draws deterministic native marks with clear borders and real shading', () => {
    const saved = savedAtlas('ui')
    for (const id of FARM_MARK_IDS) {
      const f = frames.find((x) => x.id === id)!, again = drawUi(f), record = saved.index.frames[id]!
      expect(encodePng(f.w, f.h, f.img.px)).toEqual(encodePng(f.w, f.h, again.px))
      expect(hash(saved.img.crop(record.x, record.y, f.w, f.h).px), id).toBe(hash(f.img.px))
      const colors = new Set<string>()
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const pixel = f.img.get(x, y)
        if (x === 0 || y === 0 || x === f.w - 1 || y === f.h - 1) expect(pixel[3], `${id}: edge ${x},${y}`).toBe(0)
        if (pixel[3] === 255) colors.add(pixel.join())
      }
      expect(colors.size, id).toBeGreaterThanOrEqual(5)
    }
  })

  it('tells the marks apart by shape, not colour alone', () => {
    // The farm's gold is a stack, not Prize Money's single coin face; the bond is two hearts, affinity one.
    expect(apart(img('currency/gold').px, img('currency/prize-money').px)).toBeGreaterThan(.25)
    expect(apart(img('farm/heart-bond').px, img('farm/heart-affinity').px)).toBeGreaterThan(.25)
    expect(apart(img('farm/heart-affinity').px, img('stat/hp').px)).toBeGreaterThan(.2)
    for (const a of SEASONS) for (const b of SEASONS) if (a < b) expect(apart(img(`season/${a}`).px, img(`season/${b}`).px), `${a}/${b}`).toBeGreaterThan(.25)
    expect(apart(img('farm/star').px, img('farm/rank').px)).toBeGreaterThan(.25)
  })

  it('sets the seed-packet badge on a crop\'s bottom-right quarter only, as a full packet', () => {
    const badge = img('farm/seed-packet'), opaque = silhouette(badge.px).filter(Boolean).length
    expect(opaque).toBeGreaterThanOrEqual(90)
    for (const id of FARM_PREVIEW_CROPS) {
      const item = FAMILIES.flatMap((f) => f.raw).find((i) => i.id === id)!, crop = drawIcon(item), seeded = seededCrop(id)
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        if (x < 16 || y < 16) expect(seeded.get(x, y), `${id} ${x},${y}`).toEqual(Array.from(crop.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)))
      }
    }
  })

  it('reproduces the review sheets at 1×, 2× and 4×, and writes the buildings comparisons', () => {
    for (const scale of [1, 2, 4]) {
      const saved = decodePng(readFileSync(new URL(`assets/previews/farm-m4-marks-${scale}x.png`, root))), generated = farmPreview(scale)
      expect([saved.w, saved.h, hash(saved.px)]).toEqual([generated.w, generated.h, hash(generated.px)])
    }
    for (const scale of [1, 2]) {
      const sheet = decodePng(readFileSync(new URL(`assets/previews/farm-m4-buildings-${scale}x.png`, root)))
      expect([sheet.w, sheet.h]).toEqual([5 * (48 * scale + 8) + 8, 48 * scale + 16])
    }
    expect(readFileSync(new URL('assets/previews/farm-m4.html', root), 'utf8')).toContain('farm-m4-marks-2x.png')
  })
})
