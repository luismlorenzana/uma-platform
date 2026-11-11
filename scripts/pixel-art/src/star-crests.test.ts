import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Sprite } from './sprite.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h141-2.18.0.json'
import { drawUi, packUi, uiFrames } from './ui/atlas.ts'
import { FRAME_SPECS, STAR_BODIES, STAT_MARKS } from './ui/spec.ts'
import { starCrest, statMark } from './ui/stars.ts'
import { STAR_PREVIEW_ROWS, starsPreview } from './ui/stars-preview.ts'

const root = new URL('../../../', import.meta.url)
const frames = uiFrames().filter(f => f.group === 'star' || f.group === 'stat')
const silhouette = (px: Uint8Array) => hash(Uint8Array.from(px, (value, i) => i % 4 === 3 && value === 255 ? 1 : 0))

describe('H141 star crests and stat marks', () => {
  it('freezes every 2.18.0 record, cutout and the entire old UI region, including its gaps', () => {
    const { index, img } = savedAtlas('ui'), generated = packUi(uiFrames())
    expect(Object.keys(baseline.ui.frames)).toHaveLength(45)
    expect(FRAME_SPECS.slice(0, 45).map(f => f.id)).toEqual(Object.keys(baseline.ui.frames))
    for (const [id, { rgba, ...record }] of Object.entries(baseline.ui.frames)) {
      expect(index.frames[id], id).toEqual(record)
      expect(generated.index[id], id).toEqual(record)
      expect(hash(img.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
      expect(hash(generated.atlas.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    for (const atlas of [img, generated.atlas]) expect(hash(atlas.crop(0, 0, baseline.ui.width, baseline.ui.height).px)).toBe(baseline.ui.rgba)
  })

  it('keeps earlier previews and other atlas files exact outside H156’s appended buildings', () => {
    // H156 owns a new 2.19.0 building freeze, allowing only its three formerly empty cells and general overviews.
    // A05 owns the fresh 2.20.0 UI freeze; only its three appended frames may change that sheet.
    for (const [file, sha] of Object.entries(baseline.previews)) if (!['buildings.png', 'buildings-contact-3x.png'].includes(file))
      expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.artFiles)) if (!['buildings/atlas.png', 'buildings/atlas.json', 'ui/atlas.png', 'ui/atlas.json'].includes(file))
      expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
  })

  it('retains the thirteen named star/stat frames in their original native cells', () => {
    const { index, img } = savedAtlas('ui')
    // F25 part A (P126) appends ten farm marks: two rows below, the UI sheet now 120×276 with 71 frames.
    expect([img.w, img.h, Object.keys(index.frames).length]).toEqual([120, 276, 71])
    expect(STAR_BODIES).toEqual(['planet', 'prowess', 'vigor', 'guard', 'template'])
    expect(STAT_MARKS).toEqual(['hp', 'mp', 'atk', 'matk', 'def', 'mdef', 'evasion', 'limit'])
    expect(FRAME_SPECS.slice(45, 58).map(f => f.id)).toEqual([...STAR_BODIES.map(key => `star/${key}`), ...STAT_MARKS.map(key => `stat/${key}`)])
    const positions = [[0, 164], [24, 164], [48, 164], [72, 164], [96, 164],
      [0, 188], [16, 188], [32, 188], [48, 188], [64, 188], [80, 188], [96, 188], [0, 204]]
    for (const [i, f] of frames.entries()) expect(index.frames[f.id], f.id).toEqual({ x: positions[i]![0], y: positions[i]![1], w: f.w, h: f.h, group: f.group, key: f.key })
  })

  it('draws thirteen deterministic shaded icons, with clear frame edges and no green', () => {
    expect(new Set(frames.map(f => hash(f.img.px))).size).toBe(13)
    for (const f of frames) {
      expect(hash(f.img.px), f.id).toBe(hash(drawUi(f).px))
      const colors = new Set<string>()
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const [r, g, b, a] = f.img.get(x, y)
        if (x === 0 || y === 0 || x === f.w - 1 || y === f.h - 1) expect(a, `${f.id} clipped at ${x},${y}`).toBe(0)
        if (a === 255) {
          colors.add([r, g, b].join())
          expect(g > r + 8 && g > b + 8, `${f.id}: green ${r},${g},${b}`).toBe(false)
        }
      }
      expect(colors.size, f.id).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps the same shield silhouette for DEF/M.DEF, with a recessed blue-violet spark', () => {
    const plain = frames.find(f => f.id === 'stat/def')!.img, magic = frames.find(f => f.id === 'stat/mdef')!.img
    expect(silhouette(plain.px)).toBe(silhouette(magic.px))
    expect(hash(plain.px)).not.toBe(hash(magic.px))
    const center = magic.get(7, 7)
    expect(center[2]).toBeGreaterThan(center[0])
    expect(center).not.toEqual(plain.get(7, 7))
  })

  it('retains the hearts’ two lobes and cleft, and leaves the crescent open around its separate star', () => {
    const hp = new Sprite(16, 16), moon = new Sprite(24, 24)
    statMark(hp, 'hp'); starCrest(moon, 'template')
    expect([hp.filled(4, 3), hp.filled(11, 3), hp.filled(7, 3), hp.filled(7, 12)]).toEqual([true, true, false, true])
    expect([moon.filled(5, 12), moon.filled(13, 12), moon.filled(17, 14), moon.filled(18, 9)]).toEqual([true, false, false, true])
  })

  it('reproduces the native/2×/4× white, dark and night-sky comparison sheets', () => {
    expect(STAR_PREVIEW_ROWS.map(row => row.color)).toEqual(['#ffffff', '#ffffff', '#17202b', '#17202b', '#101a24'])
    for (const scale of [1, 2, 4]) {
      const saved = decodePng(readFileSync(new URL(`assets/previews/star-crests-${scale}x.png`, root)))
      const generated = starsPreview(scale)
      expect([saved.w, saved.h]).toEqual([generated.w, generated.h])
      expect(hash(saved.px)).toBe(hash(generated.px))
    }
  })
})
