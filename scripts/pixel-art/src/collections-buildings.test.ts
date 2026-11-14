import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLLECTIONS } from './buildings/collections.ts'
import { COLLECTION_COMPARISON, collectionsPreview } from './buildings/collections-preview.ts'
import { BASE, GROUND, SIZE } from './buildings/kit.ts'
import { PLACES } from './buildings/places.ts'
import type { Place } from './buildings/types.ts'
import { hex } from './color.ts'
import { Sprite } from './sprite.ts'
import { F83_ITEMS, decodePng, hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h156-2.19.0.json'
import { Img } from './tiles/image.ts'

const root = new URL('../../../', import.meta.url)
const positions = [[144, 384], [192, 384], [240, 384]] as const
function paint(place: Place) {
  const s = new Sprite(SIZE, SIZE)
  s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
  const extras = place.paint(s)
  return { s, extras, img: new Img(SIZE, SIZE, s.render()) }
}
const opaque = (img: Img) => Array.from({ length: SIZE * SIZE }, (_, i) => img.px[i * 4 + 3] === 255)
function colored(s: Sprite, color: string, box: readonly [number, number, number, number]) {
  const id = s.ramps.findIndex(tones => tones[3]!.join() === hex(color).join())
  if (id < 0) return 0
  return [...s.mat].filter((value, i) => value === id && i % SIZE >= box[0] && i % SIZE < box[2] && Math.floor(i / SIZE) >= box[1] && Math.floor(i / SIZE) < box[3]).length
}

describe('H156 appended collections buildings', () => {
  it('freezes every published record and cutout, and every pixel outside the three previously empty cells', () => {
    const { index, img } = savedAtlas('buildings'), old = baseline.buildings
    expect(Object.keys(old.frames)).toHaveLength(51)
    expect(Object.keys(index.frames).slice(0, 51)).toEqual(Object.keys(old.frames))
    for (const [id, { rgba, ...record }] of Object.entries(old.frames)) {
      expect(index.frames[id], id).toEqual(record)
      expect(hash(img.crop(record.x, record.y, record.w, record.h).px), id).toBe(rgba)
    }
    const retained = img.crop(0, 0, old.width, old.height)
    for (const [x, y] of positions) retained.copy(new Img(SIZE, SIZE), x, y)
    expect(hash(retained.px)).toBe(old.rgba)
  })

  it('keeps every other atlas and all earlier dedicated preview PNGs byte-identical', () => {
    // A05's fresh 2.20.0 baseline guards the UI sheet while allowing three frames below the old region.
    for (const [file, sha] of Object.entries(baseline.artFiles)) if (![...F83_ITEMS, 'ui/atlas.png', 'ui/atlas.json'].includes(file)) expect(hash(readFileSync(new URL(`packages/art/${file}`, root))), file).toBe(sha)
    for (const [file, sha] of Object.entries(baseline.previews)) if (!F83_ITEMS.includes(file)) expect(hash(readFileSync(new URL(`assets/previews/${file}`, root))), file).toBe(sha)
  })

  it('fills the last three cells on the same sheet, in order, at ground line 44 without smoke', () => {
    const { index, img } = savedAtlas('buildings')
    // F25 part A (P126) appends the Dorm and the shipping bin on a new row (288×480); F55 adds two places to that row.
    expect([index.width, index.height, Object.keys(index.frames).length]).toEqual([288, 480, 58])
    expect(PLACES.slice(51, 54)).toEqual(COLLECTIONS) // F25 part A appends two after them.
    expect(COLLECTIONS.map(p => p.id)).toEqual(['gallery', 'trials', 'drill-yard'])
    expect(COLLECTIONS.map(p => p.at)).toEqual([{ x: .5, y: .84 }, { x: .2, y: .52 }, { x: .8, y: .52 }])
    COLLECTIONS.forEach((p, i) => {
      const [x, y] = positions[i]!, a = paint(p)
      expect(index.frames[p.id]).toEqual({ x, y, w: SIZE, h: SIZE, page: p.page, anchorY: GROUND })
      expect(a.extras, p.id).toBeUndefined()
      expect(hash(a.img.px), p.id).toBe(hash(paint(p).img.px))
      expect(hash(img.crop(x, y, SIZE, SIZE).px), p.id).toBe(hash(a.img.px))
      expect([...a.s.mat].some((id, j) => id >= 0 && Math.floor(j / SIZE) === BASE), p.id).toBe(true)
      for (let k = 0; k < SIZE; k++) for (const [xx, yy] of [[0, k], [47, k], [k, 0], [k, 47]] as const) expect(a.img.get(xx, yy)[3], `${p.id}: ${xx},${yy}`).toBe(0)
      for (const o of a.s.overlays) {
        expect(o.color[3], p.id).toBeLessThanOrEqual(65)
        expect(o.x >= 2 && o.x <= 45 && o.y >= 2 && o.y <= 45, p.id).toBe(true)
      }
    })
  })

  it('differs by at least 25% of its opaque silhouette from its neighbours and the other additions', () => {
    const neighbours = ['healer-sanctum', 'scenario-gate', 'rift', 'cleric-chapel', 'knights-bastion', 'gym']
    for (const place of COLLECTIONS) {
      const a = opaque(paint(place).img)
      for (const id of [...neighbours, ...COLLECTIONS.filter(p => p !== place).map(p => p.id)]) {
        const b = opaque(paint(PLACES.find(p => p.id === id)!).img)
        expect(a.filter((v, i) => v !== b[i]).length / a.filter((v, i) => v || b[i]).length, `${place.id}/${id}`).toBeGreaterThanOrEqual(.25)
      }
    }
  })

  it('places four jewel hues high above the Gallery’s open doorway', () => {
    const { s, img } = paint(COLLECTIONS[0]!)
    for (const c of ['#d94179', '#387bdc', '#edb949', '#9153c2']) expect(colored(s, c, [18, 15, 30, 28]), c).toBeGreaterThan(0)
    expect(img.get(23, 36).slice(0, 3).reduce((a, b) => a + b, 0)).toBeLessThan(img.get(23, 21).slice(0, 3).reduce((a, b) => a + b, 0))
  })

  it('keeps the proving ring open above its court, with two banners and a gate beside the weapon rack', () => {
    const { s } = paint(COLLECTIONS[1]!)
    expect(s.filled(24, 15)).toBe(false)
    expect(colored(s, '#bc596d', [7, 10, 14, 24])).toBeGreaterThan(20)
    expect(colored(s, '#628dc7', [34, 10, 41, 24])).toBeGreaterThan(20)
    expect(colored(s, '#b9a17b', [21, 38, 27, 44])).toBe(36)
    expect(colored(s, '#b8cad8', [30, 24, 41, 36])).toBeGreaterThan(10)
  })

  it('gives the shed two straw heads, wooden log ends and a hanging brass bell', () => {
    const { s } = paint(COLLECTIONS[2]!)
    for (const x of [15, 36]) expect(colored(s, '#d8b66b', [x - 3, 26, x + 4, 32])).toBeGreaterThan(12)
    expect(colored(s, '#d2a36a', [10, 35, 21, 44])).toBeGreaterThan(10)
    expect(colored(s, '#e2b658', [27, 24, 34, 32])).toBeGreaterThan(12)
    expect(s.filled(30, 31)).toBe(true)
  })

  it('reproduces native and 2× comparisons of the three additions with the Sanctum, Gate and Rift', () => {
    expect(COLLECTION_COMPARISON).toEqual(['gallery', 'trials', 'drill-yard', 'healer-sanctum', 'scenario-gate', 'rift'])
    for (const scale of [1, 2]) {
      const saved = decodePng(readFileSync(new URL(`assets/previews/collections-buildings-${scale}x.png`, root)))
      expect([saved.w, saved.h]).toEqual([3 * (48 * scale + 8) + 8, 2 * (48 * scale + 8) + 8])
      expect(hash(saved.px)).toBe(hash(collectionsPreview(scale).px))
    }
  })
})
