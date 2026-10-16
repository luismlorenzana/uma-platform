import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePng } from '../png.ts'
import { Img } from '../tiles/image.ts'
import { checkUi, drawUi, packUi, uiFrames, type UiFrame } from './atlas.ts'
import { CLASSES, CURRENCIES, FRAME_SPECS, STATUSES, TIERS } from './spec.ts'
import { GLYPHS } from './statuses.ts'
import { hash, savedAtlas } from '../testing/atlas.ts'
import baseline from './legacy-2.6.0.json'
import { Sprite } from '../sprite.ts'
import { tierCrest } from './racer.ts'

const frames = uiFrames()
const bytes = (img: Img) => Buffer.from(img.px)

describe('shared UI atlas (H11, A02)', () => {
  it('has the five D86 classes and ten named statuses, at their native sizes', () => {
    expect(CLASSES).toEqual(['brawler', 'mage', 'spellblade', 'cleric', 'summoner'])
    expect(STATUSES).toEqual(['armor-break', 'mind-break', 'enfeeble', 'shatter', 'hex', 'brave', 'faith', 'aegis', 'breaker', 'clarity'])
    expect(frames.map((f) => f.id)).toEqual([...CLASSES.map((c) => `class/${c}`), ...STATUSES.map((s) => `status/${s}`), ...CURRENCIES.map(c => `currency/${c}`), ...TIERS.map(t => `tier/${t}`)])
    expect(checkUi(frames)).toEqual([])
    expect(frames.filter((f) => f.w === 24 && f.h === 24)).toHaveLength(5)
    expect(frames.filter((f) => f.group === 'status' && f.w === 12 && f.h === 12)).toHaveLength(10)
    expect(frames.filter((f) => f.group === 'currency' && f.w === 16 && f.h === 16)).toHaveLength(3)
    expect(frames.filter((f) => f.group === 'tier' && f.w === 12 && f.h === 12)).toHaveLength(3)
  })

  it('gives every status its own eight-pixel glyph, not just a different badge colour', () => {
    expect(new Set(Object.values(GLYPHS).map((g) => g.join('\n'))).size).toBe(10)
    for (const glyph of Object.values(GLYPHS)) {
      expect(glyph).toHaveLength(8)
      expect(glyph.every((r) => r.length === 8 && /^[.#]+$/.test(r))).toBe(true)
    }
  })

  it('renders twenty-one distinct icons and transparent corners', () => {
    expect(new Set(frames.map((f) => bytes(f.img).toString('base64'))).size).toBe(21)
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
    expect([atlas.w, atlas.h]).toEqual([120, 52])
    for (const { id, img, group } of frames) {
      const f = index[id]!
      expect(f.y).toBe(group === 'class' ? 0 : group === 'status' ? 24 : 36)
      expect(bytes(atlas.crop(f.x, f.y, f.w, f.h)).equals(bytes(img))).toBe(true)
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) {
        const key = `${x},${y}`
        expect(occupied.has(key)).toBe(false)
        occupied.add(key)
      }
    }
    const root = new URL('../../../../packages/art/ui/', import.meta.url)
    expect(JSON.parse(readFileSync(new URL('atlas.json', root), 'utf8'))).toEqual({ schemaVersion: 1, width: 120, height: 52, frames: index })
    // Different Node/zlib builds may compress identical pixels differently. Compare the saved artwork, not deflate.
    expect(bytes(savedAtlas('ui').img).equals(bytes(atlas))).toBe(true)
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

  it('preserves every published 2.6.0 UI position, metadata field and pixel', () => {
    const { img, index } = savedAtlas('ui'), old = baseline.ui
    const retained = Object.fromEntries(Object.keys(old.frames).map(id => [id, index.frames[id]]))
    expect(hash(JSON.stringify(retained))).toBe(old.metadata)
    for (const [id, bounds] of Object.entries(old.frames)) {
      const f = index.frames[id]!
      expect([f.x, f.y, f.w, f.h], id).toEqual(bounds)
    }
    expect(hash(img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
  })

  it('distinguishes currencies by opaque silhouettes and really punches the Uma Ticket', () => {
    const marks = frames.filter(f => f.group === 'currency')
    const silhouettes = marks.map(f => hash(Uint8Array.from({ length: 256 }, (_, i) => f.img.px[i * 4 + 3] === 255 ? 1 : 0)))
    expect(new Set(silhouettes).size).toBe(3)
    const ticket = marks.find(f => f.key === 'uma-ticket')!.img
    for (const [x, y] of [[5, 5], [8, 5], [7, 8]] as const) expect(ticket.get(x, y)).toEqual([0, 0, 0, 0])
    expect(ticket.get(4, 3)[3]).toBe(255)
  })

  it('draws exactly one, two and three separate high-contrast pip clusters', () => {
    for (const tier of TIERS) {
      const sprite = new Sprite(12, 12); tierCrest(sprite, tier)
      // The final ramp is the pips. Count their connected components before the renderer adds the outline/shadow.
      const remaining = new Set([...sprite.mat].flatMap((m, i) => m === 2 ? [i] : []))
      let components = 0
      while (remaining.size) {
        components++
        const queue = [remaining.values().next().value!]
        while (queue.length) {
          const i = queue.pop()!
          if (!remaining.delete(i)) continue
          const x = i % 12, y = Math.floor(i / 12)
          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) if (x + dx >= 0 && x + dx < 12 && y + dy >= 0 && y + dy < 12) queue.push((y + dy) * 12 + x + dx)
        }
      }
      expect(components).toBe(Number(tier))
    }
  })
})
