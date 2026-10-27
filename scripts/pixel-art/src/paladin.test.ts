import { describe, expect, it } from 'vitest'
import { PLACES } from './buildings/places.ts'
import { hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h54-2.11.0.json'
import { Img } from './tiles/image.ts'
import { drawUi, uiFrames } from './ui/atlas.ts'
import { CLASSES, FRAME_SPECS } from './ui/spec.ts'

const PALADIN = { x: 24, y: 116, w: 24, h: 24, group: 'class', key: 'paladin' } as const
const opaque = (img: Img) => Array.from({ length: img.w * img.h }, (_, i) => img.px[i * 4 + 3] === 255)

describe('H54 append-only Paladin emblem', () => {
  it('preserves every published 2.11.0 ui frame, its metadata and its pixels', () => {
    const { img, index } = savedAtlas('ui')
    expect([index.width, index.height]).toEqual([baseline.ui.width, baseline.ui.height])
    for (const [id, frame] of Object.entries(baseline.ui.frames)) expect(index.frames[id], id).toEqual(frame)
    // The Paladin's cell was entirely RGBA zero in 2.11.0, checked when the baseline was taken; zero it to compare the rest.
    const rest = img.crop(0, 0, img.w, img.h).copy(new Img(PALADIN.w, PALADIN.h), PALADIN.x, PALADIN.y)
    expect(hash(rest.px)).toBe(baseline.ui.rgba)
  })

  it("keeps the Knight's Bastion, which uma-rpg's Paladin Bastion draws, unchanged", () => {
    const { img, index } = savedAtlas('buildings'), at = PLACES.findIndex(p => p.id === 'knights-bastion')
    expect(Object.keys(index.frames)).toHaveLength(50) // H113 appends eight buildings.
    expect(PLACES[at]).toMatchObject({ id: 'knights-bastion', page: 'learning' })
    for (const [id, frame] of Object.entries(baseline.buildings.frames)) expect(index.frames[id], id).toEqual(frame)
    for (const [id, rgba] of Object.entries(baseline.buildings.cutouts)) {
      const f = index.frames[id]!
      expect(hash(img.crop(f.x, f.y, f.w!, f.h!).px), id).toBe(rgba)
    }
  })

  it('appends class/paladin last in the spec, at (24, 116), 24×24, in the class group, keeping the five', () => {
    const { index } = savedAtlas('ui')
    expect(CLASSES).toEqual(['brawler', 'mage', 'spellblade', 'cleric', 'summoner'])
    expect(FRAME_SPECS.slice(0, -1).map(s => s.id)).toEqual(Object.keys(baseline.ui.frames))
    expect(FRAME_SPECS.at(-1)).toEqual({ id: 'class/paladin', group: 'class', key: 'paladin', w: 24, h: 24 })
    expect(Object.keys(index.frames)).toHaveLength(38)
    expect(index.frames['class/paladin']).toEqual(PALADIN)
  })

  it('draws the same pixels every time, matching the saved atlas, with transparent corners', () => {
    const spec = FRAME_SPECS.at(-1)!, a = drawUi(spec), b = drawUi(spec), { img } = savedAtlas('ui')
    expect(hash(a.px)).toBe(hash(b.px))
    expect(hash(img.crop(PALADIN.x, PALADIN.y, PALADIN.w, PALADIN.h).px)).toBe(hash(a.px))
    expect([[0, 0], [23, 0], [0, 23], [23, 23]].map(([x, y]) => a.get(x!, y!)[3])).toEqual([0, 0, 0, 0])
  })

  it('is a tall upright shape, told apart from each of the five emblems by silhouette', () => {
    const classes = uiFrames().filter(f => f.group === 'class'), paladin = opaque(classes.at(-1)!.img)
    const xs = paladin.flatMap((v, i) => v ? [i % 24] : []), ys = paladin.flatMap((v, i) => v ? [Math.floor(i / 24)] : [])
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(Math.max(...xs) - Math.min(...xs))
    expect(classes.map(f => f.key)).toEqual([...CLASSES, 'paladin'])
    for (const other of classes.slice(0, -1)) {
      const b = opaque(other.img)
      const union = paladin.filter((v, i) => v || b[i]).length, differ = paladin.filter((v, i) => v !== b[i]).length
      expect(differ / union, other.key).toBeGreaterThanOrEqual(.25)
    }
  })
})
