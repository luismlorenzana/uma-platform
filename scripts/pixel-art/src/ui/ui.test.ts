import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { checkUi, drawUi, packUi, uiFrames, type UiFrame } from './atlas.ts'
import { CLASSES, FRAME_SPECS, STATUSES } from './spec.ts'
import { GLYPHS } from './statuses.ts'

const frames = uiFrames()
const bytes = (img: Img) => Buffer.from(img.px)

describe('H11 ui atlas', () => {
  it('has the five D86 classes and ten named statuses, at their native sizes', () => {
    expect(CLASSES).toEqual(['brawler', 'mage', 'spellblade', 'cleric', 'summoner'])
    expect(STATUSES).toEqual(['armor-break', 'mind-break', 'enfeeble', 'shatter', 'hex', 'brave', 'faith', 'aegis', 'breaker', 'clarity'])
    expect(frames.map((f) => f.id)).toEqual([...CLASSES.map((c) => `class/${c}`), ...STATUSES.map((s) => `status/${s}`)])
    expect(checkUi(frames)).toEqual([])
    expect(frames.filter((f) => f.w === 24 && f.h === 24)).toHaveLength(5)
    expect(frames.filter((f) => f.w === 12 && f.h === 12)).toHaveLength(10)
  })

  it('gives every status its own eight-pixel glyph, not just a different badge colour', () => {
    expect(new Set(Object.values(GLYPHS).map((g) => g.join('\n'))).size).toBe(10)
    for (const glyph of Object.values(GLYPHS)) {
      expect(glyph).toHaveLength(8)
      expect(glyph.every((r) => r.length === 8 && /^[.#]+$/.test(r))).toBe(true)
    }
  })

  it('renders fifteen distinct icons and transparent corners', () => {
    expect(new Set(frames.map((f) => bytes(f.img).toString('base64'))).size).toBe(15)
    for (const { img } of frames) {
      expect([[0, 0], [img.w - 1, 0], [0, img.h - 1], [img.w - 1, img.h - 1]]
        .map(([x, y]) => img.get(x!, y!)[3])).toEqual([0, 0, 0, 0])
    }
  })

  it('draws the same RGBA and PNG bytes every time', () => {
    for (const spec of FRAME_SPECS) {
      const a = drawUi(spec), b = drawUi(spec)
      expect(bytes(a).equals(bytes(b))).toBe(true)
      expect(encodePng(a.w, a.h, a.px).equals(encodePng(b.w, b.h, b.px))).toBe(true)
    }
  })

  it('packs native pixels without overlap and matches the checked-in index and PNG', () => {
    const { atlas, index } = packUi(frames), occupied = new Set<string>()
    expect([atlas.w, atlas.h]).toEqual([120, 36])
    for (const { id, img, group } of frames) {
      const f = index[id]!
      expect(f.y).toBe(group === 'class' ? 0 : 24)
      expect(bytes(atlas.crop(f.x, f.y, f.w, f.h)).equals(bytes(img))).toBe(true)
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        const key = `${x},${y}`
        expect(occupied.has(key)).toBe(false)
        occupied.add(key)
      }
    }
    const root = new URL('../../../../packages/art/ui/', import.meta.url)
    expect(JSON.parse(readFileSync(new URL('atlas.json', root), 'utf8'))).toEqual({ schemaVersion: 1, width: 120, height: 36, frames: index })
    expect(readFileSync(new URL('atlas.png', root)).equals(encodePng(atlas.w, atlas.h, atlas.px))).toBe(true)
  })

  it('rejects missing, duplicate, unexpected and wrongly sized frames', () => {
    const first = frames[0]!
    expect(checkUi(frames.slice(1))).toContain(`Missing ui frame ${first.id}`)
    expect(checkUi([...frames, first])).toContain(`Duplicate ui frame ${first.id}`)
    expect(checkUi([...frames, { ...first, id: 'class/unknown' }])).toContain('Unexpected ui frame class/unknown')
    const wrong = { ...first, img: new Img(12, 12) }
    expect(checkUi([wrong, ...frames.slice(1)])).toContain(`${first.id}: wrong native size`)
    expect(checkUi([{ ...first, key: 'mage' } as UiFrame, ...frames.slice(1)])).toContain(`${first.id}: wrong group/key`)
  })

  it('rejects empty icons', () => {
    const first = frames[0]!
    expect(checkUi([{ ...first, img: new Img(first.w, first.h) }, ...frames.slice(1)])).toContain(`${first.id}: empty icon`)
  })
})
