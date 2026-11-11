import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePng } from './png.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import { Img } from './tiles/image.ts'
import baseline from './testing/legacy-f55-2.25.0.json'
import { drawUi, packUi, uiFrames } from './ui/atlas.ts'
import { STAGE_COLORS } from './ui/romance.ts'
import { ROMANCE_MARK_IDS, nineSlice, romancePreview } from './ui/romance-preview.ts'
import { FRAME_SPECS, PLAY_MARKS } from './ui/spec.ts'

const root = new URL('../../../', import.meta.url)
const frames = uiFrames()
const img = (id: string) => frames.find((f) => f.id === id)!.img
const silhouette = (px: Uint8Array) => Array.from({ length: px.length / 4 }, (_, i) => px[i * 4 + 3] === 255)
const apart = (a: Uint8Array, b: Uint8Array) => {
  const x = silhouette(a), y = silhouette(b)
  return x.filter((v, i) => v !== y[i]).length / x.filter((v, i) => v || y[i]).length
}
const GENERAL = ['buildings.png', 'buildings-contact-3x.png']
const STAGES = ['hearts/friendship', 'hearts/romance', 'hearts/spouse'] as const

describe('F55: the romance core\'s marks and places (P126)', () => {
  it('freezes all 71 published UI records, cutouts and pixels, including the gaps', () => {
    const saved = savedAtlas('ui'), generated = packUi(frames), old = baseline.ui
    expect(FRAME_SPECS.slice(0, 71).map((f) => f.id)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(saved.index.frames[id], id).toEqual(record)
      expect(generated.index[id], id).toEqual(record)
      for (const sheet of [saved.img, generated.atlas]) expect(hash(sheet.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    for (const sheet of [saved.img, generated.atlas]) expect(hash(sheet.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('freezes all 56 published places and every pixel outside their row\'s four free cells', () => {
    const saved = savedAtlas('buildings'), old = baseline.buildings
    expect(Object.keys(saved.index.frames).slice(0, 56)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(saved.index.frames[id], id).toEqual(record)
      expect(hash(saved.img.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    // The sheet doesn't grow: the two places take free cells beside the Dorm and the bin. Blank those two cells again and
    // the whole sheet is the published one, gaps included.
    expect([saved.index.width, saved.index.height]).toEqual([old.width, old.height])
    const sheet = saved.img.crop(0, 0, old.width, old.height)
    for (const [x, y] of [[96, 432], [144, 432]] as const) sheet.copy(new Img(48, 48), x, y)
    expect(hash(sheet.px)).toBe(old.rgba)
  })

  it('keeps every other atlas file and every older preview PNG byte-identical', () => {
    expect(Object.keys(baseline.artFiles)).toHaveLength(24)
    expect(Object.keys(baseline.previews)).toHaveLength(108)
    for (const [file, sha] of Object.entries(baseline.artFiles)) expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.previews)) {
      if (!GENERAL.includes(file)) expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
    }
  })

  it('appends the sixteen marks on four new rows and the two places in the Dorm\'s row', () => {
    const ui = savedAtlas('ui').index, buildings = savedAtlas('buildings').index
    expect([ui.width, ui.height, Object.keys(ui.frames).length]).toEqual([120, 380, 87])
    expect(FRAME_SPECS.slice(71).map((f) => f.id)).toEqual([...ROMANCE_MARK_IDS])
    expect(ui.frames['homestead/farmhouse']).toEqual({ x: 0, y: 276, w: 24, h: 24, group: 'homestead', key: 'farmhouse' })
    expect(ui.frames['homestead/house']).toEqual({ x: 24, y: 276, w: 24, h: 24, group: 'homestead', key: 'house' })
    expect(ui.frames['farm/ring-bench']).toEqual({ x: 48, y: 276, w: 24, h: 24, group: 'farm', key: 'ring-bench' })
    expect(ui.frames['hearts/invitation']).toEqual({ x: 96, y: 300, w: 16, h: 16, group: 'hearts', key: 'invitation' })
    expect(ui.frames['hearts/memory-frame']).toEqual({ x: 0, y: 332, w: 48, h: 48, group: 'hearts', key: 'memory-frame' })
    expect(PLAY_MARKS.map((k) => ui.frames[`play/${k}`])).toEqual(PLAY_MARKS.map((key, i) => ({ x: i * 16, y: 316, w: 16, h: 16, group: 'play', key })))
    expect([buildings.width, buildings.height, Object.keys(buildings.frames).length]).toEqual([288, 480, 58])
    expect(buildings.frames.farmhouse).toEqual({ x: 96, y: 432, w: 48, h: 48, page: 'farmlands', anchorY: 44, smoke: { x: 35, y: 2 } })
    expect(buildings.frames['homestead-house']).toEqual({ x: 144, y: 432, w: 48, h: 48, page: 'farmlands', anchorY: 44, smoke: { x: 31, y: 7 } })
  })

  it('draws deterministic marks with clear borders (the frame excepted) and real shading', () => {
    const saved = savedAtlas('ui')
    for (const id of ROMANCE_MARK_IDS) {
      const f = frames.find((x) => x.id === id)!, record = saved.index.frames[id]!
      expect(encodePng(f.w, f.h, f.img.px)).toEqual(encodePng(f.w, f.h, drawUi(f).px))
      expect(hash(saved.img.crop(record.x, record.y, f.w, f.h).px), id).toBe(hash(f.img.px))
      const colors = new Set<string>()
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const pixel = f.img.get(x, y)
        if (id !== 'hearts/memory-frame' && (x === 0 || y === 0 || x === f.w - 1 || y === f.h - 1)) expect(pixel[3], `${id}: edge ${x},${y}`).toBe(0)
        if (pixel[3] === 255) colors.add(pixel.join())
      }
      expect(colors.size, id).toBeGreaterThanOrEqual(5)
    }
  })

  it('gives the three stage hearts one outline, three colours, apart from the bond and affinity hearts', () => {
    const [a, b, c] = STAGES.map((id) => img(id).px)
    expect(apart(a!, b!)).toBe(0)
    expect(apart(a!, c!)).toBe(0)
    expect(new Set(Object.values(STAGE_COLORS)).size).toBe(3)
    expect(new Set(STAGES.map((id) => hash(img(id).px))).size).toBe(3)
    for (const id of STAGES) for (const f25 of ['farm/heart-bond', 'farm/heart-affinity']) expect(apart(img(id).px, img(f25).px), `${id}/${f25}`).toBeGreaterThan(.1)
    // Ready is a heart with a notice dot, not affinity's sparkle.
    expect(apart(img('hearts/ready').px, img('farm/heart-affinity').px)).toBeGreaterThan(.25)
  })

  it('tells the five plays and the Hearts statuses apart by shape', () => {
    const plays = PLAY_MARKS.map((k) => `play/${k}`), statuses = ['hearts/banked', 'hearts/ready', 'hearts/evening', 'hearts/invitation']
    for (const list of [plays, statuses]) for (const a of list) for (const b of list) if (a < b) expect(apart(img(a).px, img(b).px), `${a}/${b}`).toBeGreaterThan(.25)
  })

  it('makes the Memory frame a 12px nine-slice: uniform runs, a clear inside, corners with hearts', () => {
    const frame = img('hearts/memory-frame')
    for (let y = 12; y < 36; y++) for (let x = 12; x < 36; x++) expect(frame.get(x, y)[3], `inside ${x},${y}`).toBe(0)
    for (let k = 13; k < 36; k++) for (let d = 0; d < 12; d++) {
      expect(frame.get(k, d), `top ${k},${d}`).toEqual(frame.get(12, d))
      expect(frame.get(k, 47 - d), `bottom ${k}`).toEqual(frame.get(12, 47 - d))
      expect(frame.get(d, k), `left ${d},${k}`).toEqual(frame.get(d, 12))
      expect(frame.get(47 - d, k), `right ${k}`).toEqual(frame.get(47 - d, 12))
    }
    const stretched = nineSlice(frame, 96, 64)
    expect(hash(stretched.crop(0, 0, 12, 12).px)).toBe(hash(frame.crop(0, 0, 12, 12).px))
    expect(hash(stretched.crop(84, 52, 12, 12).px)).toBe(hash(frame.crop(36, 36, 12, 12).px))
  })

  it('reproduces the review sheets and writes the homestead map row', () => {
    for (const scale of [1, 2, 4]) {
      const saved = decodePng(readFileSync(new URL(`assets/previews/farm-romance-marks-${scale}x.png`, root))), generated = romancePreview(scale)
      expect([saved.w, saved.h, hash(saved.px)]).toEqual([generated.w, generated.h, hash(generated.px)])
    }
    for (const scale of [1, 2]) {
      const sheet = decodePng(readFileSync(new URL(`assets/previews/farm-romance-buildings-${scale}x.png`, root)))
      expect([sheet.w, sheet.h]).toEqual([5 * (48 * scale + 8) + 8, 48 * scale + 16])
    }
    expect(readFileSync(new URL('assets/previews/farm-romance.html', root), 'utf8')).toContain('farm-romance-marks-2x.png')
  })
})
