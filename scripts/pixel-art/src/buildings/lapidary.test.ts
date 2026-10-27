import { describe, expect, it } from 'vitest'
import { Sprite } from '../sprite.ts'
import { hash, savedAtlas } from '../testing/atlas.ts'
import { BASE, GROUND, SIZE } from './kit.ts'
import { LAPIDARY } from './lapidary.ts'
import baseline from './legacy-2.7.0.json'
import { PLACES } from './places.ts'

describe('H29 appended Lapidary', () => {
  it('preserves all forty published 2.7.0 frames, metadata and individual RGBA cutouts', () => {
    const { index, img } = savedAtlas('buildings')
    // H38 appends the Rift; H113 appends eight workshops after it.
    expect(Object.keys(index.frames)).toHaveLength(50)
    expect(Object.keys(baseline.frames)).toHaveLength(40)
    for (const [id, old] of Object.entries(baseline.frames)) {
      const { rgba, ...frame } = old
      expect(index.frames[id], id).toEqual(frame)
      expect(hash(img.crop(frame.x, frame.y, frame.w, frame.h).px), id).toBe(rgba)
    }
    expect(PLACES[40]).toBe(LAPIDARY)
  })
  it('matches the dedicated native 48px workshop at ground line 44, without smoke or edge clipping', () => {
    const { index, img } = savedAtlas('buildings'), f = index.frames.lapidary!
    expect(f).toEqual({ x: 192, y: 288, w: 48, h: 48, page: 'wilds', anchorY: GROUND })
    const draw = () => {
      const s = new Sprite(SIZE, SIZE)
      s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
      expect(LAPIDARY.paint(s)).toBeUndefined()
      return s.render()
    }
    const px = draw()
    expect(hash(px)).toBe(hash(draw()))
    expect(hash(img.crop(f.x, f.y, SIZE, SIZE).px)).toBe(hash(px))
    expect(hash(px)).not.toBe(baseline.frames['arcane-armory'].rgba)
    for (let i = 0; i < SIZE; i++) for (const [x, y] of [[i, 0], [0, i], [47, i], [i, 47]] as const) expect(px[(y * SIZE + x) * 4 + 3]).toBe(0)
  })
})
