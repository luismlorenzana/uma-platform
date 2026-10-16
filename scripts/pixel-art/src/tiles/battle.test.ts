import { describe, expect, it } from 'vitest'
import { laurelMark } from '../laurel.ts'
import { Sprite } from '../sprite.ts'
import { hash, savedAtlas } from '../testing/atlas.ts'
import baseline from '../testing/legacy-h31-2.8.0.json'
import { uiFrames } from '../ui/atlas.ts'
import { MASKS } from './autotile.ts'
import { battleHubMap, battleLayout, BATTLE_FURNITURE, BATTLE_LOTS } from './battle-map.ts'
import { autotileSeams, groundSeams } from './check.ts'
import { groundTile } from './ground.ts'
import { Img } from './image.ts'
import { closesBlock, MAP_COLS, MAP_ROWS, pathNetwork, type PropSprite } from './maps.ts'
import { BATTLE_PROPS } from './props/battle.ts'
import { GROUND, PAGES, PATH } from './terrain.ts'

const ground = [0, 1, 2, 3].map(v => groundTile(GROUND.battle, v))
const paths = MASKS.map(mask => PATH.battle(mask, ground[0]!))
const props: PropSprite[] = BATTLE_PROPS.map(p => {
  const sprite = new Sprite(p.w, p.h); sprite.shadow = p.shadow; p.paint(sprite)
  return { id: p.id, img: new Img(p.w, p.h, sprite.render()), near: 'open', weight: 1 }
})

describe('H31 append-only Laurel and Battle art', () => {
  it('preserves every published 2.8.0 UI/tile frame and all pixels outside the new empty Laurel slot', () => {
    for (const family of ['ui', 'tiles'] as const) {
      const { img, index } = savedAtlas(family), old = baseline[family]
      expect(index.width).toBe(old.width)
      for (const [id, frame] of Object.entries(old.frames)) expect(index.frames[id], id).toEqual(frame)
      const retained = img.crop(0, 0, old.width, old.height)
      if (family === 'ui') {
        expect(index.frames['currency/laurel']).toEqual({ x: 84, y: 36, w: 16, h: 16, group: 'currency', key: 'laurel' })
        // This rectangle was entirely RGBA zero in 2.8.0, verified when the frozen baseline was captured.
        retained.copy(new Img(16, 16), 84, 36)
      }
      expect(hash(retained.px), family).toBe(old.rgba)
    }
  })

  it('keeps the wreath open, green and recognizable at native size, and paints directly on a larger grid', () => {
    const laurel = uiFrames().find(f => f.id === 'currency/laurel')!.img
    for (const [x, y] of [[7, 3], [8, 3], [7, 7], [8, 7], [7, 9], [8, 9]] as const) expect(laurel.get(x, y)[3]).toBe(0)
    const greenPixels = Array.from({ length: 256 }, (_, i) => laurel.get(i % 16, Math.floor(i / 16)))
      .filter(([r, g, b, a]) => a === 255 && g > r && g > b)
    expect(greenPixels.length).toBeGreaterThan(20)
    for (const size of [16, 32]) {
      const a = new Sprite(size, size), b = new Sprite(size, size)
      laurelMark(a); laurelMark(b)
      expect(hash(a.render())).toBe(hash(b.render()))
      expect(a.mat.some(m => m !== 0)).toBe(true)
      if (size === 32) expect(hash(a.render())).not.toBe(hash(laurel.scaled(2).px))
    }
  })

  it('appends exactly four grounds, sixteen flagstone masks and six native props, with clean seams', () => {
    const { img, index } = savedAtlas('tiles')
    expect(PAGES).toEqual(['farmlands', 'wilds', 'learning', 'town', 'racing', 'battle'])
    expect([img.w, img.h, Object.keys(index.frames).length]).toEqual([256, 304, 170])
    expect(new Set(ground.map(g => hash(g.px))).size).toBe(4)
    expect(groundSeams('battle', ground)).toEqual([])
    expect(autotileSeams('battle/path', paths, ground[0]!)).toEqual([])
    expect(new Set(paths.map(p => hash(p.px))).size).toBe(16)
    expect(BATTLE_PROPS.map(p => [p.id, p.w, p.h])).toEqual([
      ['banner', 16, 32], ['weapon-rack', 16, 16], ['training-dummy', 16, 32],
      ['torch', 16, 32], ['crate', 16, 16], ['shield-stand', 16, 16],
    ])
    const additions: [string, Img][] = [
      ...ground.map((g, v): [string, Img] => [`ground-${v}`, g]),
      ...paths.map((p, m): [string, Img] => [`path-${m}`, p]),
      ...props.map((p): [string, Img] => [p.id, p.img]),
    ]
    expect(Object.keys(index.frames).filter(id => id.startsWith('battle/')).sort()).toEqual(additions.map(([id]) => `battle/${id}`).sort())
    for (const [id, drawn] of additions) {
      const f = index.frames[`battle/${id}`]!
      expect(f).toMatchObject({ w: drawn.w, h: drawn.h, page: 'battle' })
      expect(f.y).toBeGreaterThanOrEqual(256)
      expect(hash(img.crop(f.x, f.y, drawn.w, drawn.h).px), id).toBe(hash(drawn.px))
    }
    expect(new Set(props.map(p => hash(p.img.px))).size).toBe(6)
    for (const { id, img: prop } of props) {
      expect(prop.px.some((v, i) => i % 4 === 3 && v === 255), id).toBe(true)
      for (const [x, y] of [[0, 0], [15, 0], [0, prop.h - 1], [15, prop.h - 1]] as const) expect(prop.get(x, y)[3], id).toBe(0)
    }
  })

  it('composes both doors on one road without 2×2 blocks, and keeps all furniture off roads and buildings', () => {
    const { road, reserved } = battleLayout()
    const occupied = new Set(reserved)
    for (const { col, row } of BATTLE_LOTS) expect(road.has(`${col},${row + 1}`)).toBe(true)
    const seen = new Set<string>(), queue = [[6, 5]]
    while (queue.length) {
      const [x, y] = queue.pop()!, key = `${x},${y}`
      if (seen.has(key) || !road.has(key)) continue
      seen.add(key)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) queue.push([x! + dx, y! + dy])
    }
    expect(seen.size).toBe(road.size)
    for (const network of [road, pathNetwork('battle', () => false)]) for (const cell of network) {
      const [x, y] = cell.split(',').map(Number), without = new Set(network); without.delete(cell)
      expect(closesBlock(without, x!, y!), cell).toBe(false)
    }
    for (const { id, col, row } of BATTLE_FURNITURE) {
      const prop = props.find(p => p.id === id)!
      for (let y = row + 1 - prop.img.h / 16; y <= row; y++) {
        const key = `${col},${y}`
        expect(col >= 0 && col < MAP_COLS && y >= 0 && y < MAP_ROWS).toBe(true)
        expect(road.has(key) || occupied.has(key), `${id}/${key}`).toBe(false)
        occupied.add(key)
      }
    }
    expect(BATTLE_FURNITURE.map(p => p.id).sort()).toEqual(props.map(p => p.id).sort())
    expect(hash(battleHubMap(ground, paths, props).px)).toBe(hash(battleHubMap(ground, paths, props).px))
    expect(() => battleHubMap(ground, paths, props.slice(1))).toThrow('Missing Battle sample prop banner')
  })
})
