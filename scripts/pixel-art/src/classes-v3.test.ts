import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Sprite } from './sprite.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h127-2.15.0.json'
import { Img } from './tiles/image.ts'
import { drawUi, uiFrames } from './ui/atlas.ts'
import { classEmblem } from './ui/classes.ts'
import { classesV3Preview } from './ui/classes-v3-preview.ts'
import { FRAME_SPECS, HYBRIDS, TIER0 } from './ui/spec.ts'

const NEW = [...HYBRIDS, ...TIER0]
const positions = [[48, 116], [72, 116], [0, 140], [24, 140], [48, 140], [72, 140], [96, 140]] as const
const opaque = (img: Img) => Array.from({ length: 576 }, (_, i) => img.px[i * 4 + 3] === 255)
const difference = (a: Img, b: Img) => {
  const aa = opaque(a), bb = opaque(b), union = aa.filter((v, i) => v || bb[i]).length
  return aa.filter((v, i) => v !== bb[i]).length / union
}
function flipped(img: Img) {
  const out = new Img(24, 24)
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) out.set(x, y, img.get(23 - x, y))
  return out
}

describe('H127 Classes v3 emblems', () => {
  it('freezes every published frame record and the entire old UI region except the two newly occupied empty cells', () => {
    const { index, img } = savedAtlas('ui')
    expect(Object.keys(baseline.ui.frames)).toHaveLength(38)
    for (const [id, old] of Object.entries(baseline.ui.frames)) expect(index.frames[id], id).toEqual(old)
    const old = img.crop(0, 0, baseline.ui.width, baseline.ui.height)
    for (const x of [48, 72]) old.copy(new Img(24, 24), x, 116)
    expect(hash(old.px)).toBe(baseline.ui.rgba)
    // The final free cell remains completely empty, not merely transparent RGB.
    expect(img.crop(96, 116, 24, 24).px.some(Boolean)).toBe(false)
    for (const [file, rgba] of Object.entries(baseline.previews)) expect(hash(readFileSync(new URL(`../../../assets/previews/${file}`, import.meta.url))), file).toBe(rgba)
  })
  it('appends the seven exact keys, positions and 24px painters, with transparent corners', () => {
    const { index, img } = savedAtlas('ui')
    expect([index.width, index.height]).toEqual([120, 164])
    expect(Object.keys(index.frames)).toHaveLength(45)
    expect(FRAME_SPECS.slice(38).map(f => f.id)).toEqual(NEW.map(k => `class/${k}`))
    NEW.forEach((key, i) => {
      const [x, y] = positions[i]!, spec = FRAME_SPECS.find(f => f.id === `class/${key}`)!
      expect(index.frames[spec.id]).toEqual({ x, y, w: 24, h: 24, group: 'class', key })
      const a = drawUi(spec)
      expect(hash(a.px)).toBe(hash(drawUi(spec).px))
      expect(hash(img.crop(x, y, 24, 24).px)).toBe(hash(a.px))
      for (const [xx, yy] of [[0, 0], [23, 0], [0, 23], [23, 23]] as const) expect(a.get(xx, yy)[3]).toBe(0)
    })
  })
  it('gives each beginner a plain, hollow motif with no painted glow and a silhouette unlike all twelve other classes', () => {
    const classes = uiFrames().filter(f => f.group === 'class')
    for (const key of TIER0) {
      const s = new Sprite(24, 24); classEmblem(s, key)
      expect(s.overlays, key).toHaveLength(0)
      const a = classes.find(f => f.key === key)!.img
      for (const b of classes.filter(f => f.key !== key)) expect(difference(a, b.img), `${key}/${b.key}`).toBeGreaterThanOrEqual(.25)
    }
    const holes = { recruit: [8, 8], acolyte: [10, 8], caller: [8, 17], apprentice: [11, 10] } as const
    for (const [key, [x, y]] of Object.entries(holes)) expect(classes.find(f => f.key === key)!.img.get(x, y)[3], key).toBe(0)
  })
  it('mirrors the two family motifs while changing their channel colours, distinct from every other class', () => {
    const classes = uiFrames().filter(f => f.group === 'class')
    for (const [key, mirror] of [['tomeblade', 'spellblade'], ['armsummoner', 'summoner']] as const) {
      const a = classes.find(f => f.key === key)!.img, b = flipped(classes.find(f => f.key === mirror)!.img)
      expect(1 - difference(a, b), key).toBeGreaterThanOrEqual(.9)
      const painted = opaque(a), changed = painted.filter((v, i) => v && [0, 1, 2].reduce((sum, k) => sum + Math.abs(a.px[i * 4 + k]! - b.px[i * 4 + k]!), 0) >= 60).length
      expect(changed / painted.filter(Boolean).length, key).toBeGreaterThanOrEqual(.6)
      for (const c of classes.filter(f => f.key !== key && f.key !== mirror)) expect(difference(a, c.img), `${key}/${c.key}`).toBeGreaterThanOrEqual(.25)
    }
  })
  it('reproduces the native/2×/4× light and dark tree-order comparison sheets', () => {
    for (const scale of [1, 2, 4]) {
      const saved = decodePng(readFileSync(new URL(`../../../assets/previews/classes-v3-emblems-${scale}x.png`, import.meta.url)))
      expect(hash(saved.px)).toBe(hash(classesV3Preview(scale).px))
    }
  })
})
