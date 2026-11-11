import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hex } from './color.ts'
import { encodePng } from './png.ts'
import { Sprite } from './sprite.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-a05-2.20.0.json'
import { drawUi, packUi, uiFrames } from './ui/atlas.ts'
import { FRAME_SPECS, YARD_MARKS } from './ui/spec.ts'
import { cardTicket, yardMark } from './ui/yard.ts'
import { YARD_PREVIEW_ROWS, yardPreview } from './ui/yard-preview.ts'

const root = new URL('../../../', import.meta.url)
const ids = ['currency/card-ticket', 'yard/fatigue', 'yard/rest']
const frames = uiFrames().filter(f => ids.includes(f.id))
const silhouette = (px: Uint8Array) => Array.from({ length: px.length / 4 }, (_, i) => px[i * 4 + 3] === 255)
const luminance = (rgb: readonly number[]) => rgb.slice(0, 3).map(c => {
  const v = c / 255
  return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4
}).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i]!, 0)
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [lo, hi] = [luminance(a), luminance(b)].sort((a, b) => a - b)
  return (hi! + .05) / (lo! + .05)
}

describe('A05 Card Ticket and Training Yard marks', () => {
  it('freezes all 58 published records, cutouts and pixels, including the gaps', () => {
    const saved = savedAtlas('ui'), generated = packUi(uiFrames()), old = baseline.ui
    expect(FRAME_SPECS.slice(0, 58).map(f => f.id)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(saved.index.frames[id], id).toEqual(record)
      expect(generated.index[id], id).toEqual(record)
      for (const img of [saved.img, generated.atlas]) expect(hash(img.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    for (const img of [saved.img, generated.atlas]) expect(hash(img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('keeps all 18 other atlas files and 94 older preview PNGs byte-identical', () => {
    expect(Object.keys(baseline.artFiles)).toHaveLength(18)
    expect(Object.keys(baseline.previews)).toHaveLength(94)
    // F25 part A's fresh 2.24.0 baseline owns the buildings sheet and its two general previews, which grew by one row.
    const f25 = ['buildings/atlas.png', 'buildings/atlas.json', 'buildings.png', 'buildings-contact-3x.png']
    for (const [file, sha] of Object.entries(baseline.artFiles)) if (!f25.includes(file)) expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.previews)) if (!f25.includes(file)) expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
  })

  it('appends exactly the requested native cells without overlapping earlier frames', () => {
    const { index } = savedAtlas('ui')
    // F25 part A (P126) appends ten farm marks and F55 sixteen romance marks: the UI sheet now 120×380 with 87 frames.
    expect([index.width, index.height, Object.keys(index.frames).length]).toEqual([120, 380, 87])
    expect(FRAME_SPECS.slice(58, 61).map(f => f.id)).toEqual(ids) // F25 part A appends ten after them.
    expect(YARD_MARKS).toEqual(['fatigue', 'rest'])
    expect(ids.map(id => index.frames[id])).toEqual([
      { x: 0, y: 220, w: 16, h: 16, group: 'currency', key: 'card-ticket' },
      { x: 16, y: 220, w: 24, h: 24, group: 'yard', key: 'fatigue' },
      { x: 40, y: 220, w: 24, h: 24, group: 'yard', key: 'rest' },
    ])
  })

  it('draws deterministic native RGBA/PNG bytes with a clear border and real shading', () => {
    const saved = savedAtlas('ui')
    for (const f of frames) {
      const again = drawUi(f), record = saved.index.frames[f.id]!
      expect(encodePng(f.w, f.h, f.img.px)).toEqual(encodePng(f.w, f.h, again.px))
      expect(hash(saved.img.crop(record.x, record.y, f.w, f.h).px)).toBe(hash(f.img.px))
      const colors = new Set<string>()
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const pixel = f.img.get(x, y)
        if (x === 0 || y === 0 || x === f.w - 1 || y === f.h - 1) expect(pixel[3], `${f.id}: edge ${x},${y}`).toBe(0)
        if (pixel[3] === 255) colors.add(pixel.join())
      }
      expect(colors.size, f.id).toBeGreaterThanOrEqual(5)
    }
  })

  it('distinguishes the violet fanned cards from the gold punched Uma Ticket without colour alone', () => {
    const card = frames[0]!.img, uma = uiFrames().find(f => f.id === 'currency/uma-ticket')!.img
    const a = silhouette(card.px), b = silhouette(uma.px)
    expect(a.filter((v, i) => v !== b[i]).length / a.filter((v, i) => v || b[i]).length).toBeGreaterThan(.25)
    const s = new Sprite(16, 16); cardTicket(s)
    // A tilted rear card, pale front border, violet inset and a separate star stamp.
    expect([s.filled(7, 2), s.filled(12, 5), s.filled(3, 12)]).toEqual([true, true, true])
    expect(card.get(6, 6).slice(0, 3).every(c => c > 200)).toBe(true)
    const violet = Array.from({ length: 256 }, (_, i) => card.get(i % 16, Math.floor(i / 16)))
      .filter(([r, g, b, a]) => a === 255 && b > r + 15 && b > g + 20)
    expect(violet.length).toBeGreaterThan(35)
  })

  it('keeps the sweat drop pointed, rounded at the foot and highlighted against the stage', () => {
    const s = new Sprite(24, 24); yardMark(s, 'fatigue')
    const widthAt = (y: number) => Array.from({ length: 24 }, (_, x) => s.filled(x, y)).filter(Boolean).length
    expect(widthAt(5)).toBeLessThan(widthAt(14))
    expect([s.filled(10, 18), s.filled(15, 18), s.filled(6, 19)]).toEqual([true, true, false])
    const img = frames[1]!.img
    expect(img.get(8, 14).slice(0, 3).every(c => c > 230)).toBe(true)
    expect(contrast(img.get(11, 14), hex('#101a24'))).toBeGreaterThan(4.5)
  })

  it('gives the towel two blue woven stripes, folded layers, and contrast on both sunken tiles', () => {
    const s = new Sprite(24, 24); yardMark(s, 'rest')
    const stripe = s.ramps.findIndex(r => r[3]!.join() === hex('#5c9dcc').join())
    expect(stripe).toBeGreaterThanOrEqual(0)
    expect([...s.mat].filter(m => m === stripe).length).toBeGreaterThan(12)
    expect(s.mat[8 * 24 + 9]).toBe(stripe)
    expect(s.mat[8 * 24 + 12]).toBe(stripe)
    const img = frames[2]!.img
    expect(luminance(img.get(10, 7))).toBeGreaterThan(luminance(img.get(10, 14)))
    expect(contrast(img.get(10, 7), hex('#0b1118'))).toBeGreaterThan(7)
    expect(contrast(img.get(10, 20), hex('#e4eaf2'))).toBeGreaterThan(3)
  })

  it('reproduces native/2×/4× comparisons on the exact account-bar and tile backgrounds', () => {
    expect(YARD_PREVIEW_ROWS.map(row => row.color)).toEqual(['#ffffff', '#101a24', '#101a24', '#e4eaf2', '#0b1118'])
    expect(YARD_PREVIEW_ROWS[0].ids.slice(2, 4)).toEqual(['currency/uma-ticket', 'currency/card-ticket'])
    for (const scale of [1, 2, 4]) {
      const saved = decodePng(readFileSync(new URL(`assets/previews/racer-yard-marks-${scale}x.png`, root)))
      const generated = yardPreview(scale)
      expect([saved.w, saved.h, hash(saved.px)]).toEqual([generated.w, generated.h, hash(generated.px)])
    }
  })
})
