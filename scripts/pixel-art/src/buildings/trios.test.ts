import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Sprite } from '../sprite.ts'
import { decodePng, hash, savedAtlas } from '../testing/atlas.ts'
import { closesBlock } from '../tiles/maps.ts'
import { BASE, GROUND, SIZE } from './kit.ts'
import baseline from './legacy-h113-2.13.0.json'
import { PLACES } from './places.ts'
import { TRIOS } from './trios.ts'
import { TILE, TRIO_COLS, TRIO_LOTS, TRIO_MAP_ROWS, TRIO_ROWS, triosLayout, triosMock } from './trios-preview.ts'
import type { Place } from './types.ts'

const IDS = ['mine-workbench', 'fields-workbench', 'forest-workbench', 'fishery-workbench', 'den-workbench', 'weapon-forge', 'tome-forge', 'charm-forge']
const SMOKING = new Set(['mine-workbench', 'weapon-forge', 'tome-forge', 'charm-forge'])
const SMOKE: Readonly<Record<string, { x: number; y: number }>> = {
  'mine-workbench': { x: 6, y: 13 }, 'weapon-forge': { x: 9, y: 2 },
  'tome-forge': { x: 35.5, y: 5 }, 'charm-forge': { x: 31.5, y: 7 },
}
function paint(p: Place) {
  const s = new Sprite(SIZE, SIZE)
  s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
  const extras = p.paint(s)
  return { px: s.render(), extras }
}
const silhouette = (px: Uint8Array) => Uint8Array.from({ length: SIZE * SIZE }, (_, i) => (px[i * 4 + 3] ?? 0) >= 200 ? 1 : 0)

describe('H113 Wilds trios', () => {
  it('freezes all 42 pre-H113 frame records and individual RGBA cutouts, including H29 and H38', () => {
    const { index, img } = savedAtlas('buildings')
    expect([baseline.width, baseline.height]).toEqual([288, 336])
    expect(Object.keys(baseline.frames)).toHaveLength(42)
    expect(Object.keys(index.frames).slice(0, 42)).toEqual(Object.keys(baseline.frames))
    for (const [id, old] of Object.entries(baseline.frames)) {
      const { rgba, ...frame } = old
      expect(index.frames[id], id).toEqual(frame)
      expect(hash(img.crop(frame.x, frame.y, frame.w, frame.h).px), id).toBe(rgba)
    }
  })

  it('appends eight native square frames in exact order with only the four chimney anchors', () => {
    const { index, img } = savedAtlas('buildings')
    expect([index.width, index.height]).toEqual([288, 432])
    expect(Object.keys(index.frames)).toHaveLength(51)
    expect(Object.keys(index.frames).slice(42, 50)).toEqual(IDS)
    expect(PLACES.slice(42, 50).map(p => p.id)).toEqual(IDS)
    expect(TRIOS.map(p => p.id)).toEqual(IDS)
    expect(new Set(PLACES.map(p => p.id)).size).toBe(51)
    for (const [i, place] of TRIOS.entries()) {
      const { px, extras } = paint(place), smoke = extras?.smoke
      expect(index.frames[place.id]).toEqual({ x: (i % 6) * SIZE, y: 336 + Math.floor(i / 6) * SIZE, w: SIZE, h: SIZE, page: 'wilds', anchorY: GROUND, ...(smoke ? { smoke } : {}) })
      expect(Boolean(smoke), place.id).toBe(SMOKING.has(place.id))
      expect(smoke, place.id).toEqual(SMOKE[place.id])
      if (smoke) {
        expect(smoke.x > 0 && smoke.x < 47 && smoke.y > 0 && smoke.y < GROUND).toBe(true)
        expect(px[(smoke.y * SIZE + Math.floor(smoke.x)) * 4 + 3]).toBe(255)
      }
      const f = index.frames[place.id]!
      expect(hash(img.crop(f.x, f.y, SIZE, SIZE).px), place.id).toBe(hash(px))
      expect(hash(paint(place).px), place.id).toBe(hash(px))
      for (let k = 0; k < SIZE; k++) for (const [x, y] of [[k, 0], [k, 47], [0, k], [47, k]] as const)
        expect(px[(y * SIZE + x) * 4 + 3], `${place.id}: ${x},${y}`).toBe(0)
    }
  })

  it('keeps trade props structurally distinct and gives each new forge a new silhouette', () => {
    const newSilhouettes = TRIOS.map(p => hash(silhouette(paint(p).px)))
    expect(new Set(newSilhouettes).size).toBe(8)
    for (const id of ['forge', 'workbench', 'arcane-armory', 'lapidary']) {
      const old = paint(PLACES.find(p => p.id === id)!).px
      expect(newSilhouettes).not.toContain(hash(silhouette(old)))
    }
    for (const row of TRIO_ROWS) {
      const silhouettes = row.map(id => hash(silhouette(paint(PLACES.find(p => p.id === id)!).px)))
      expect(new Set(silhouettes).size, row.join('/')).toBe(3)
    }
  })

  it('shows exactly the five requested trios, with connected roads off every footprint and no 2×2 road blocks', () => {
    expect(TRIO_ROWS).toEqual([
      ['mine', 'mine-workbench', 'weapon-forge'],
      ['vegetable-garden', 'fields-workbench', 'tome-forge'],
      ['forest', 'forest-workbench', 'lancers-barracks'],
      ['fishery', 'fishery-workbench', 'charm-forge'],
      ['monster-den', 'den-workbench', 'lapidary'],
    ])
    expect(TRIO_LOTS).toHaveLength(15)
    expect(new Set(TRIO_LOTS.map(p => p.id)).size).toBe(15)
    const { road, reserved } = triosLayout()
    for (const cell of road) {
      expect(reserved.has(cell), cell).toBe(false)
      const [x, y] = cell.split(',').map(Number), without = new Set(road)
      without.delete(cell)
      expect(closesBlock(without, x!, y!), cell).toBe(false)
    }
    const seen = new Set<string>(), queue = ['8,0']
    while (queue.length) {
      const key = queue.shift()!
      if (seen.has(key) || !road.has(key)) continue
      seen.add(key)
      const [x, y] = key.split(',').map(Number)
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) queue.push(`${x! + dx},${y! + dy}`)
    }
    expect(seen.size).toBe(road.size)
    for (const { col, row } of TRIO_LOTS) {
      expect(road.has(`${col},${row + 1}`)).toBe(true)
      expect(col >= 1 && col < TRIO_COLS - 1 && row >= 2 && row < TRIO_MAP_ROWS - 1).toBe(true)
    }
  })

  it('regenerates the saved native, phone-scale and 3× mockups without moving ground anchors', () => {
    const mock = triosMock()
    expect([mock.w, mock.h]).toEqual([TRIO_COLS * TILE, TRIO_MAP_ROWS * TILE])
    expect(hash(mock.px)).toBe(hash(triosMock().px))
    for (const scale of [1, 1.5, 3]) {
      const saved = decodePng(readFileSync(new URL(`../../../../assets/previews/wilds-trios-${scale}x.png`, import.meta.url)))
      expect([saved.w, saved.h]).toEqual([mock.w * scale, mock.h * scale])
      expect(hash(saved.px)).toBe(hash(mock.scaled(scale).px))
    }
  })
})
