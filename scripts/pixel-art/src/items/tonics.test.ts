import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GLINTS, drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { Sprite } from '../sprite.ts'
import { decodePng, hash, savedAtlas } from '../testing/atlas.ts'
import baseline from './legacy-2.9.0.json'
import { speedTicketItem } from './tickets.ts'
import { TONIC_PREVIEW_SIZES, tonicPreview } from './tonic-previews.ts'
import { TONICS } from './tonics.ts'

const root = new URL('../../../../', import.meta.url)
const names = ['Warm-Up Tonic', 'Practice Tonic', 'Paddock Tonic', 'Gallop Tonic', 'Stride Tonic',
  'Stretch Tonic', 'Spurt Tonic', 'Derby Tonic', "Champion's Tonic", "Legend's Tonic"]

describe('A04 appended tonic items', () => {
  it('retains all 321 preceding frames, their metadata and the complete old RGBA rectangle', () => {
    const { img, index } = savedAtlas('items')
    const retained = Object.fromEntries(Object.entries(index.frames).filter(([id]) => !id.startsWith('tonic-')))
    expect(Object.keys(retained)).toHaveLength(baseline.frames)
    expect(hash(JSON.stringify(retained))).toBe(baseline.metadata)
    expect(hash(img.crop(0, 0, baseline.width, baseline.height).px)).toBe(baseline.rgba)
    expect([index.width, index.height, index.cell]).toEqual([320, 1088, 32])
    expect(Object.keys(index.frames)).toHaveLength(331)
  })

  it('appends exactly ten native frames in grade order, matching each painter and standalone PNG', () => {
    const { img, index } = savedAtlas('items')
    expect(TONICS.map(item => item.id)).toEqual(Array.from({ length: 10 }, (_, i) => `tonic-${i + 1}`))
    expect(Object.keys(index.frames).slice(baseline.frames)).toEqual(TONICS.map(item => item.id))
    TONICS.forEach((item, col) => {
      expect(index.frames[item.id]).toEqual({ x: col * 32, y: 1056, w: 32, h: 32, name: names[col], kind: 'tonic', grade: col + 1 })
      const a = drawIcon(item), b = drawIcon(item)
      expect(hash(a)).toBe(hash(b))
      expect(encodePng(32, 32, a).equals(encodePng(32, 32, b))).toBe(true)
      expect(hash(img.crop(col * 32, 1056, 32, 32).px), item.id).toBe(hash(a))
      const standalone = decodePng(readFileSync(new URL(`assets/items/tonics/${item.id}.png`, root)))
      expect([standalone.w, standalone.h]).toEqual([32, 32])
      expect(hash(standalone.px), item.id).toBe(hash(a))
      for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [31, i], [i, 31]] as const) expect(a[(y * 32 + x) * 4 + 3], item.id).toBe(0)
    })
  })

  it('has ten structural variants independent of colour, a bottle rather than a ticket, and clear legendary glints', () => {
    const structure = new Set<string>()
    const ticket = Uint8Array.from(speedTicketItem().filter((_, i) => i % 4 === 3), alpha => alpha === 255 ? 1 : 0)
    for (const item of TONICS) {
      const s = new Sprite()
      item.paint(s)
      structure.add(hash(JSON.stringify({ material: [...s.mat], tone: [...s.tone] })))
      expect(hash(Uint8Array.from(s.mat, value => value < 0 ? 0 : 1))).not.toBe(hash(ticket))
      // A broad paper label, straight liquid window and stopper survive small chips.
      expect(s.filled(12, 4)).toBe(true)
      expect(s.filled(10, 18)).toBe(true)
      expect(s.filled(16, 25)).toBe(true)
      const px = drawIcon(item)
      if (item.grade >= 9) for (const [gx, gy, size] of GLINTS) {
        expect([...px.subarray((gy * 32 + gx) * 4, (gy * 32 + gx + 1) * 4)]).toEqual([255, 255, 255, 255])
        for (let k = -size; k <= size; k++) for (const [x, y] of [[gx + k, gy], [gx, gy + k]] as const) {
          expect(s.filled(x, y) || s.filled(x - 1, y) || s.filled(x + 1, y) || s.filled(x, y - 1) || s.filled(x, y + 1), item.id).toBe(false)
        }
      }
      if (item.grade < 9) for (const [gx, gy] of GLINTS) expect(px[(gy * 32 + gx) * 4 + 3]).toBe(0)
    }
    expect(structure.size).toBe(10)
  })

  it.each(TONIC_PREVIEW_SIZES)('reproduces the %ipx light/dark comparison sheet with all ten tonics, two dishes and a ticket', (size) => {
    const preview = tonicPreview(size)
    const saved = decodePng(readFileSync(new URL(`assets/previews/racer-tonics-${size}px.png`, root)))
    expect(hash(preview.px)).toBe(hash(saved.px))
    expect([preview.w, preview.h]).toEqual([5 * (size + 8) + 8, 6 * (size + 8) + 8])
    expect(preview.get(8, 8)).toEqual([255, 255, 255, 255])
    expect(preview.get(8, 8 + 3 * (size + 8))).toEqual([23, 32, 43, 255])
  })
})
