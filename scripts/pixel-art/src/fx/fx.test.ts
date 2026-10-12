import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Img } from '../tiles/image.ts'
import { checkFx, drawFx, fxFrames, packFx, type FrameIndex } from './atlas.ts'
import { COLORS, FRAME_SPECS, KINDS } from './spec.ts'

const signature = (px: Uint8Array) => Buffer.from(px).toString('base64')

describe('H10 effects atlas', () => {
  it('pins the ten current kinds, five element colours, and all 60 frame ids', () => {
    expect(KINDS).toEqual(['greatsword', 'axe', 'lance', 'bow', 'katana', 'fire', 'ice', 'lightning', 'light', 'dark'])
    expect([COLORS.fire, COLORS.ice, COLORS.lightning, COLORS.light, COLORS.dark]).toEqual(['#ff8a5c', '#8fd3ff', '#ffd84d', '#fff2b0', '#c79bff'])
    expect(FRAME_SPECS).toHaveLength(60)
    expect(new Set(FRAME_SPECS.map((s) => s.id)).size).toBe(60)
    expect(checkFx(fxFrames())).toEqual([])
  })

  for (const kind of KINDS) it(`${kind}: all four impacts and two familiar poses are distinct and deterministic`, () => {
    const specs = FRAME_SPECS.filter((s) => s.kind === kind), poses = specs.map((spec) => {
      const a = drawFx(spec), b = drawFx(spec)
      expect([a.w, a.h]).toEqual([32, 32])
      expect(Buffer.from(a.px).equals(Buffer.from(b.px))).toBe(true)
      return signature(a.px)
    })
    expect(new Set(poses).size).toBe(6)
    for (const spec of specs) expect(drawFx(spec).get(0, 0)[3]).toBe(0)
  })

  it('has distinct silhouettes across kinds, including the static final-hit pose', () => {
    for (let frame = 0; frame < 4; frame++) {
      const poses = KINDS.map((kind) => signature(drawFx({ id: `hit/${kind}-${frame}`, group: 'hit', kind, frame, w: 32, h: 32 }).px.filter((_, i) => i % 4 === 3)))
      expect(new Set(poses).size).toBe(10)
    }
  })

  it('keeps every packed frame centred, unscaled and indexed exactly', () => {
    const frames = fxFrames(), { atlas, index } = packFx(frames)
    expect([atlas.w, atlas.h]).toEqual([192, 320])
    expect(Buffer.from(atlas.px).equals(Buffer.from(packFx(fxFrames()).atlas.px))).toBe(true)
    const saved = JSON.parse(readFileSync(new URL('../../../../packages/art/fx/atlas.json', import.meta.url), 'utf8')) as {
      width: number; height: number; frames: Record<string, Omit<FrameIndex, 'id'>>
    }
    expect(saved.width).toBe(atlas.w); expect(saved.height).toBe(atlas.h); expect(saved.frames).toEqual(index)
    for (const frame of frames) {
      const at = index[frame.id]!
      expect([at.anchorX, at.anchorY]).toEqual([16, 16])
      expect(Buffer.from(atlas.crop(at.x, at.y, 32, 32).px).equals(Buffer.from(frame.img.px)), frame.id).toBe(true)
    }
  })

  it('rejects missing, extra, wrong-size and clipped frames', () => {
    const frames = fxFrames(), first = frames[0]!
    expect(checkFx(frames.slice(1)).some((s) => s.startsWith('Missing'))).toBe(true)
    expect(checkFx([...frames, first]).some((s) => s.startsWith('Duplicate'))).toBe(true)
    expect(checkFx([{ ...first, id: 'hit/retired-kind-0' }, ...frames.slice(1)]).some((s) => s.startsWith('Unexpected'))).toBe(true)
    expect(checkFx([{ ...first, img: new Img(16, 16) }, ...frames.slice(1)]).some((s) => s.includes('32×32'))).toBe(true)
    const img = first.img.crop(0, 0, 32, 32)
    img.set(0, 16, [255, 255, 255, 255])
    expect(checkFx([{ ...first, img }, ...frames.slice(1)]).some((s) => s.includes('clipped'))).toBe(true)
  })
})
