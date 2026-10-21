import { describe, expect, it } from 'vitest'
import { BASE, GROUND, SIZE } from './buildings/kit.ts'
import { PLACES } from './buildings/places.ts'
import { RIFT } from './buildings/rift.ts'
import type { Place } from './buildings/types.ts'
import { Sprite } from './sprite.ts'
import { hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h38-2.10.0.json'
import { MASKS } from './tiles/autotile.ts'
import { BATTLE_LOTS, battleHubMap, RIFT_LOTS } from './tiles/battle-map.ts'
import { groundTile } from './tiles/ground.ts'
import { Img } from './tiles/image.ts'
import type { PropSprite } from './tiles/maps.ts'
import { BATTLE_PROPS } from './tiles/props/battle.ts'
import { GROUND as TERRAIN, PATH } from './tiles/terrain.ts'
import { drawUi, uiFrames } from './ui/atlas.ts'
import { TITLE_PICTOGRAMS } from './ui/rift.ts'
import { ACHIEVEMENTS, FRAME_SPECS, FRONTS } from './ui/spec.ts'

const draw = (place: Place) => {
  const s = new Sprite(SIZE, SIZE)
  s.shadow = { cx: SIZE / 2, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
  const extras = place.paint(s)
  return { px: s.render(), extras }
}
const opaque = (img: Img) => Array.from({ length: img.w * img.h }, (_, i) => img.px[i * 4 + 3] === 255)
const TITLES = ACHIEVEMENTS.slice(5)

describe('H38 append-only Rift art', () => {
  it('preserves every published 2.10.0 ui and buildings frame, its metadata and its pixels', () => {
    const ui = savedAtlas('ui'), b = savedAtlas('buildings')
    expect(ui.index.width).toBe(baseline.ui.width)
    for (const [id, frame] of Object.entries(baseline.ui.frames)) expect(ui.index.frames[id], id).toEqual(frame)
    expect(hash(ui.img.crop(0, 0, baseline.ui.width, baseline.ui.height).px)).toBe(baseline.ui.rgba)
    expect([b.index.width, b.index.height]).toEqual([baseline.buildings.width, baseline.buildings.height])
    for (const [id, frame] of Object.entries(baseline.buildings.frames)) expect(b.index.frames[id], id).toEqual(frame)
    // The Rift's cell was entirely RGBA zero in 2.10.0, checked when the baseline was taken; zero it to compare the rest.
    const rest = b.img.crop(0, 0, b.img.w, b.img.h).copy(new Img(SIZE, SIZE), 240, 288)
    expect(hash(rest.px)).toBe(baseline.buildings.rgba)
    for (const [id, rgba] of Object.entries(baseline.buildings.cutouts)) {
      const f = b.index.frames[id]!
      expect(hash(b.img.crop(f.x, f.y, f.w!, f.h!).px), id).toBe(rgba)
    }
  })

  it('keeps the Tier Finale and Scenario Gate places where they were', () => {
    const at = (id: string) => PLACES.findIndex(p => p.id === id)
    expect(at('tier-finale')).toBe(35)
    expect(at('scenario-gate')).toBe(31)
    expect(PLACES[35]).toMatchObject({ id: 'tier-finale', page: 'town', at: { x: .75, y: .86 } })
  })

  it('appends the Rift as place 41 at (240, 288) on the Battle page, drawn the same every time', () => {
    const { index, img } = savedAtlas('buildings')
    expect(Object.keys(index.frames)).toHaveLength(42)
    expect(PLACES.indexOf(RIFT)).toBe(41)
    expect(PLACES.at(-1)).toBe(RIFT)
    expect(RIFT).toMatchObject({ id: 'rift', name: 'The Rift', page: 'battle', at: { x: .5, y: .72 } })
    expect(index.frames.rift).toEqual({ x: 240, y: 288, w: 48, h: 48, page: 'battle', anchorY: GROUND })
    const a = draw(RIFT), b = draw(RIFT)
    expect(hash(a.px)).toBe(hash(b.px))
    expect(hash(img.crop(240, 288, SIZE, SIZE).px)).toBe(hash(a.px))
  })

  it('keeps the Rift two pixels clear of every edge, static, and unlike the Tier Finale', () => {
    const { px, extras } = draw(RIFT)
    expect(extras).toBeUndefined()
    // Nothing touches the edge; within two pixels of it there's only the plain contact shadow, never the glow.
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const [r, g, b, a] = px.subarray((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4)
        if (x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1) expect(a, `${x},${y}`).toBe(0)
        else if (x < 2 || y < 2 || x > SIZE - 3 || y > SIZE - 3) expect(a === 0 || (r === 12 && g === 10 && b === 24), `${x},${y}`).toBe(true)
      }
    const rift = new Img(SIZE, SIZE, px), finale = new Img(SIZE, SIZE, draw(PLACES[35]!).px)
    expect(hash(rift.px)).not.toBe(baseline.buildings.cutouts['tier-finale'])
    // Tall and spiky in the middle: its highest opaque pixel is in the middle third, above the low oval's pennants,
    // and the two silhouettes differ in over a third of their combined pixels.
    const top = (img: Img) => opaque(img).findIndex(Boolean)
    expect(top(rift) % SIZE).toBeGreaterThanOrEqual(16)
    expect(top(rift) % SIZE).toBeLessThan(32)
    expect(top(rift)).toBeLessThan(top(finale))
    const a = opaque(rift), b = opaque(finale)
    expect(a.filter((v, i) => v !== b[i]).length / a.filter((v, i) => v || b[i]).length).toBeGreaterThan(1 / 3)
  })

  it('appends four 16px front crests at y=52 and eleven 24px achievements from y=68, at the end of the spec', () => {
    const { index, img } = savedAtlas('ui')
    expect([index.width, index.height]).toEqual([120, 140])
    expect(Object.keys(index.frames)).toHaveLength(37)
    expect(FRONTS).toEqual(['iron', 'arcane', 'duel', 'horde'])
    expect(ACHIEVEMENTS).toEqual(['seal-iron', 'seal-arcane', 'seal-duel', 'seal-horde', 'rift-conquered',
      'iron-will', 'arcane-purity', 'untouched', 'swift-convergence', 'bestiary', 'crossover'])
    expect(FRAME_SPECS.slice(0, 22).map(s => s.id)).toEqual(Object.keys(baseline.ui.frames))
    expect(FRAME_SPECS.slice(22).map(s => s.id)).toEqual([...FRONTS.map(f => `front/${f}`), ...ACHIEVEMENTS.map(a => `achievement/${a}`)])
    FRONTS.forEach((key, i) => expect(index.frames[`front/${key}`]).toEqual({ x: i * 16, y: 52, w: 16, h: 16, group: 'front', key }))
    ACHIEVEMENTS.forEach((key, i) => expect(index.frames[`achievement/${key}`])
      .toEqual({ x: (i % 5) * 24, y: 68 + Math.floor(i / 5) * 24, w: 24, h: 24, group: 'achievement', key }))
    for (const spec of FRAME_SPECS.slice(22)) {
      const a = drawUi(spec), b = drawUi(spec), f = index.frames[spec.id]!
      expect(hash(a.px), spec.id).toBe(hash(b.px))
      expect(hash(img.crop(f.x, f.y, spec.w, spec.h).px), spec.id).toBe(hash(a.px))
    }
  })

  it('tells the four crests apart by silhouette', () => {
    const crests = uiFrames().filter(f => f.group === 'front').map(f => opaque(f.img))
    for (let i = 0; i < crests.length; i++)
      for (let j = i + 1; j < crests.length; j++) {
        const a = crests[i]!, b = crests[j]!
        const union = a.filter((v, k) => v || b[k]).length, differ = a.filter((v, k) => v !== b[k]).length
        expect(differ / union, `${FRONTS[i]}/${FRONTS[j]}`).toBeGreaterThanOrEqual(.25)
      }
  })

  it('gives the six titles one shared banner and six different pictograms', () => {
    expect(Object.keys(TITLE_PICTOGRAMS)).toEqual(TITLES)
    expect(new Set(Object.values(TITLE_PICTOGRAMS).map(p => p.rows.join('\n'))).size).toBe(6)
    for (const { rows } of Object.values(TITLE_PICTOGRAMS)) expect(rows.every(r => r.length === 12) && rows.length === 12).toBe(true)
    const badges = uiFrames().filter(f => f.group === 'achievement')
    const silhouette = (key: string) => hash(Uint8Array.from(opaque(badges.find(f => f.key === key)!.img), Number))
    expect(new Set(TITLES.map(silhouette)).size).toBe(1)
    expect(new Set(badges.map(f => hash(f.img.px))).size).toBe(11)
    for (const other of ['seal-iron', 'rift-conquered']) expect(silhouette(other)).not.toBe(silhouette('iron-will'))
  })

  it('composes the Rift into the Tier Finale lot of H31 review page, which keeps its own default', () => {
    const ground = [0, 1, 2, 3].map(v => groundTile(TERRAIN.battle, v))
    const paths = MASKS.map(mask => PATH.battle(mask, ground[0]!))
    const props: PropSprite[] = BATTLE_PROPS.map(p => {
      const sprite = new Sprite(p.w, p.h); sprite.shadow = p.shadow; p.paint(sprite)
      return { id: p.id, img: new Img(p.w, p.h, sprite.render()), near: 'open', weight: 1 }
    })
    expect(RIFT_LOTS.map(l => [l.col, l.row])).toEqual(BATTLE_LOTS.map(l => [l.col, l.row]))
    const old = battleHubMap(ground, paths, props), rift = battleHubMap(ground, paths, props, RIFT_LOTS)
    expect(hash(battleHubMap(ground, paths, props, BATTLE_LOTS).px)).toBe(hash(old.px))
    expect(hash(rift.px)).not.toBe(hash(old.px))
    // Only the second lot's footprint changes.
    const diff = new Set<number>()
    for (let i = 0; i < old.w * old.h; i++) if ([0, 1, 2, 3].some(k => old.px[i * 4 + k] !== rift.px[i * 4 + k])) diff.add(Math.floor(i / old.w))
    expect(Math.min(...diff)).toBeGreaterThanOrEqual(13 * 16)
    expect(() => battleHubMap(ground, paths, props, [{ id: 'rift', col: 5, row: 15 }, RIFT_LOTS[0]])).toThrow('lot cells')
  })
})
