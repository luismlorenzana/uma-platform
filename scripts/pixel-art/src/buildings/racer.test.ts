import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { Sprite } from '../sprite.ts'
import { MASKS } from '../tiles/autotile.ts'
import { autotileSeams, groundSeams } from '../tiles/check.ts'
import { groundTile } from '../tiles/ground.ts'
import { Img } from '../tiles/image.ts'
import { closesBlock, pathNetwork } from '../tiles/maps.ts'
import { RACING_PROPS } from '../tiles/props/racing.ts'
import { racingLayout, RACING_LOTS } from '../tiles/racing-map.ts'
import { GROUND as TERRAIN, PAGES, PATH } from '../tiles/terrain.ts'
import { BASE, GROUND, SIZE } from './kit.ts'
import baseline from './legacy-2.5.0.json'
import { PLACES } from './places.ts'
import { RACER } from './racer.ts'
import type { Place } from './types.ts'

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
interface Frame { x: number; y: number; w: number; h: number; anchorY?: number; page: string; smoke?: { x: number; y: number } }
interface Index { width: number; height: number; frames: Record<string, Frame> }
function atlas(family: string): { index: Index; img: Img } {
  const index = JSON.parse(readFileSync(new URL(`../../../../packages/art/${family}/atlas.json`, import.meta.url), 'utf8')) as Index
  const png = readFileSync(new URL(`../../../../packages/art/${family}/atlas.png`, import.meta.url)), chunks: Buffer[] = []
  expect(png.readUInt32BE(16)).toBe(index.width)
  expect(png.readUInt32BE(20)).toBe(index.height)
  for (let at = 8; at < png.length;) {
    const n = png.readUInt32BE(at)
    if (png.toString('ascii', at + 4, at + 8) === 'IDAT') chunks.push(png.subarray(at + 8, at + 8 + n))
    at += n + 12
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = index.width * 4
  const px = new Uint8Array(stride * index.height)
  for (let y = 0; y < index.height; y++) {
    expect(raw[y * (stride + 1)]).toBe(0)
    px.set(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), y * stride)
  }
  return { index, img: new Img(index.width, index.height, px) }
}
function paint(place: Place): Uint8Array {
  const s = new Sprite(SIZE, SIZE)
  s.shadow = { cx: SIZE / 2, cy: BASE + 0.5, rx: 20, ry: 3.2, alpha: 72 }
  place.paint(s)
  return s.render()
}

describe('A01 append-only Hub art', () => {
  for (const family of ['buildings', 'tiles'] as const) it(`freezes every 2.5.0 ${family} frame and every old pixel`, () => {
    const { index, img } = atlas(family), old = baseline[family]
    expect(index.width).toBe(old.width)
    for (const [id, frame] of Object.entries(old.frames)) expect(index.frames[id], id).toEqual(frame)
    expect(sha(img.crop(0, 0, old.width, old.height).px)).toBe(old.rgba)
    // All frames, including tall props and additions, remain distinct non-overlapping cutouts.
    const frames = Object.entries(index.frames)
    for (const [i, [id, f]] of frames.entries()) {
      expect(f.x >= 0 && f.y >= 0 && f.x + f.w <= index.width && f.y + f.h <= index.height, id).toBe(true)
      for (const [other, g] of frames.slice(i + 1)) expect(f.x < g.x + g.w && g.x < f.x + f.w && f.y < g.y + g.h && g.y < f.y + f.h, `${id}/${other}`).toBe(false)
    }
  })

  it('appends four 48px places at anchorY 44, matches the painters and keeps every edge clear', () => {
    const { index, img } = atlas('buildings')
    expect(PLACES.map(p => p.id).slice(36)).toEqual(['card-library', 'gym', 'racecourse', 'trophy-hall'])
    expect(new Set(PLACES.map(p => p.id)).size).toBe(40)
    expect(GROUND).toBe(44)
    const hashes: string[] = []
    for (const place of RACER) {
      const f = index.frames[place.id]!
      expect(f).toMatchObject({ w: 48, h: 48, anchorY: 44, page: place.page })
      // None of these designs has a chimney, so none asks the Hub to animate smoke.
      expect(f.smoke).toBeUndefined()
      const px = paint(place)
      expect(sha(px)).toBe(sha(paint(place)))
      expect(sha(img.crop(f.x, f.y, f.w, f.h).px)).toBe(sha(px))
      hashes.push(sha(px))
      for (let i = 0; i < SIZE; i++) for (const [x, y] of [[i, 0], [0, i], [47, i], [i, 47]] as const) expect(px[(y * SIZE + x) * 4 + 3], place.id).toBe(0)
    }
    expect(new Set(hashes).size).toBe(4)
  })

  it('appends all 24 Racing tiles at the declared native sizes and matches their painters', () => {
    const { index, img } = atlas('tiles')
    expect(PAGES).toEqual(['farmlands', 'wilds', 'learning', 'town', 'racing'])
    const ground = [0, 1, 2, 3].map(v => groundTile(TERRAIN.racing, v))
    const paths = MASKS.map(m => PATH.racing(m, ground[0]!))
    expect(new Set(ground.map(g => sha(g.px))).size).toBe(4)
    expect(groundSeams('racing', ground)).toEqual([])
    expect(autotileSeams('racing/path', paths, ground[0]!)).toEqual([])
    const additions: [string, Img][] = [...ground.map((g, v): [string, Img] => [`racing/ground-${v}`, g]), ...paths.map((g, m): [string, Img] => [`racing/path-${m}`, g])]
    for (const p of RACING_PROPS) {
      const s = new Sprite(p.w, p.h); s.shadow = p.shadow; p.paint(s)
      additions.push([`racing/${p.id}`, new Img(p.w, p.h, s.render())])
    }
    expect(additions.map(([id]) => id).sort()).toEqual(Object.keys(index.frames).filter(id => id.startsWith('racing/')).sort())
    for (const [id, drawn] of additions) {
      const f = index.frames[id]!
      expect(f).toMatchObject({ w: drawn.w, h: drawn.h, page: 'racing' })
      expect(sha(img.crop(f.x, f.y, f.w, f.h).px), id).toBe(sha(drawn.px))
    }
    for (const id of ['rail', 'flower-box']) expect(index.frames[`racing/${id}`]).toMatchObject({ w: 16, h: 16 })
    for (const id of ['furlong-post', 'pennant']) expect(index.frames[`racing/${id}`]).toMatchObject({ w: 16, h: 32 })
    // A connected arm stays brown in its middle: no white rail closes off the route at a seam.
    expect(paths[5]!.get(8, 0)).not.toEqual(paths[5]!.get(3, 0))
    expect(paths[10]!.get(0, 8)).not.toEqual(paths[10]!.get(0, 3))
  })

  it('keeps review roads free of 2×2 blocks and off all building footprints', () => {
    const layout = racingLayout()
    for (const { col, row } of RACING_LOTS) {
      for (let y = row - 2; y <= row; y++) for (let x = col - 1; x <= col + 1; x++) expect(layout.road.has(`${x},${y}`)).toBe(false)
      expect(layout.road.has(`${col},${row + 1}`)).toBe(true)
    }
    const seen = new Set<string>(), queue = [[6, 5]]
    while (queue.length) {
      const [x, y] = queue.shift()!, key = `${x},${y}`
      if (seen.has(key) || !layout.road.has(key)) continue
      seen.add(key)
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) queue.push([x! + dx, y! + dy])
    }
    expect(seen.size).toBe(layout.road.size)
    for (const road of [layout.road, pathNetwork('racing', () => false)]) for (const cell of road) {
      const [x, y] = cell.split(',').map(Number), without = new Set(road); without.delete(cell)
      expect(closesBlock(without, x!, y!), cell).toBe(false)
    }
  })
})
