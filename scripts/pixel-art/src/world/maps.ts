import { ramp } from '../color.ts'
import { rng } from '../rng.ts'
import { Mask, shadeDome } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { maskAt, variantAt } from '../tiles/compose.ts'
import { Img } from '../tiles/image.ts'
import { TILE } from '../tiles/noise.ts'
import { drawWorldProp, worldProp } from './props.ts'
import { BIOMES, type CalibrationBiome } from './spec.ts'

export const REGION_COLS = 16
export const REGION_ROWS = 28

type Cells = Set<string>
const key = (x: number, y: number) => `${x},${y}`
const has = (cells: Cells, x: number, y: number) => cells.has(key(x, y))
const mark = (cells: Cells, x: number, y: number) => {
  if (x >= 0 && y >= 0 && x < REGION_COLS && y < REGION_ROWS) cells.add(key(x, y))
}

function roadAndMarkers(biome: CalibrationBiome): { road: Cells; markers: readonly (readonly [number, number])[] } {
  const r = rng(`calibration:${biome}:road`)
  const road: Cells = new Set()
  const atY: number[] = []
  let x = 7 + Math.floor(r() * 2)
  const jogs = new Set([23, 19, 15, 11, 7, 3])
  for (let y = REGION_ROWS - 1; y >= 0; y--) {
    mark(road, x, y)
    if (jogs.has(y)) {
      const to = Math.max(5, Math.min(10, x + (r() < 0.5 ? -2 : 2)))
      for (let xx = Math.min(x, to); xx <= Math.max(x, to); xx++) mark(road, xx, y)
      x = to
    }
    atY[y] = x
  }
  const markers: [number, number][] = []
  const ys = [26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 3]
  ys.forEach((y, i) => {
    const side = Math.floor(i / 2) % 2 === 0 ? -1 : 1
    const trunk = atY[y] ?? 8
    const mx = Math.max(1, Math.min(14, trunk + side * 3))
    for (let xx = Math.min(trunk, mx); xx <= Math.max(trunk, mx); xx++) mark(road, xx, y)
    markers.push([mx, y])
  })
  return { road, markers }
}

function liquidPatches(biome: CalibrationBiome, road: Cells, markers: readonly (readonly [number, number])[]): Cells {
  const r = rng(`calibration:${biome}:liquid`)
  const cells: Cells = new Set()
  const blocked = (x: number, y: number) => has(road, x, y) || markers.some(([mx, my]) => Math.abs(mx - x) <= 1 && Math.abs(my - y) <= 1)
  let patches = 0
  for (let attempt = 0; attempt < 300 && patches < 3; attempt++) {
    const x = 1 + Math.floor(r() * 13), y = 2 + Math.floor(r() * 23)
    const sx = r() < 0.5 ? -1 : 1, sy = r() < 0.5 ? -1 : 1
    const shape = [[x, y], [x + sx, y], [x, y + sy]] as const
    if (shape.some(([px, py]) => px < 0 || px >= REGION_COLS || py < 0 || py >= REGION_ROWS || blocked(px, py) || has(cells, px, py))) continue
    shape.forEach(([px, py]) => mark(cells, px, py))
    patches++
  }
  return cells
}

function markerDisc(): Img {
  const s = new Sprite(TILE, TILE)
  s.shadow = { cx: 8, cy: 13.4, rx: 4.7, ry: 1.3, alpha: 80 }
  const metal = s.addRamp(ramp('#d7c9aa', { lift: 0.42, drop: 0.28 }))
  shadeDome(s, Mask.ellipse(8, 8.5, 4.3, 3.4, 0, TILE, TILE), metal, { bias: 0.08, relief: 0.55, contact: false })
  for (let x = 5; x <= 9; x++) s.paint(x, 7, metal, x <= 7 ? 5 : 4)
  return new Img(TILE, TILE, s.render())
}

export function sampleRegionMap(
  biome: CalibrationBiome,
  ground: readonly Img[],
  roads: readonly Img[],
  liquids: readonly Img[],
): Img {
  const spec = BIOMES[biome]
  const { road, markers } = roadAndMarkers(biome)
  const wet = liquidPatches(biome, road, markers)
  const out = new Img(REGION_COLS * TILE, REGION_ROWS * TILE)
  for (let y = 0; y < REGION_ROWS; y++)
    for (let x = 0; x < REGION_COLS; x++) {
      const tile = ground[variantAt(`calibration:${biome}`, x, y)] ?? ground[0]
      if (tile) out.copy(tile, x * TILE, y * TILE)
    }
  for (let y = 0; y < REGION_ROWS; y++)
    for (let x = 0; x < REGION_COLS; x++) {
      if (has(wet, x, y)) {
        const tile = liquids[maskAt((cx, cy) => has(wet, cx, cy), x, y)]
        if (tile) out.draw(tile, x * TILE, y * TILE)
      }
      if (has(road, x, y)) {
        const tile = roads[maskAt((cx, cy) => has(road, cx, cy), x, y)]
        if (tile) out.draw(tile, x * TILE, y * TILE)
      }
    }

  const r = rng(`calibration:${biome}:props`)
  const placed: { x: number; y: number; img: Img }[] = []
  const occupied: Cells = new Set()
  for (let attempt = 0; attempt < 500 && placed.length < 30; attempt++) {
    const edge = r() < 0.65
    const x = edge ? (r() < 0.5 ? Math.floor(r() * 3) : 13 + Math.floor(r() * 3)) : Math.floor(r() * REGION_COLS)
    const y = 1 + Math.floor(r() * (REGION_ROWS - 1))
    const id = spec.props[Math.floor(r() * spec.props.length)]
    if (!id) continue
    const prop = worldProp(id), img = drawWorldProp(prop)
    const tooClose = markers.some(([mx, my]) => Math.abs(mx - x) <= 1 && Math.abs(my - y) <= 1)
    if (has(road, x, y) || has(wet, x, y) || tooClose || has(occupied, x, y)) continue
    if (img.h > TILE && (y < 1 || has(road, x, y - 1) || has(wet, x, y - 1) || has(occupied, x, y - 1))) continue
    placed.push({ x, y, img })
    mark(occupied, x, y)
    if (img.h > TILE) mark(occupied, x, y - 1)
  }
  placed.sort((a, b) => a.y - b.y || a.x - b.x)
  for (const p of placed) out.draw(p.img, p.x * TILE, (p.y + 1) * TILE - p.img.h)
  const disc = markerDisc()
  for (const [x, y] of markers) out.draw(disc, x * TILE, y * TILE)
  return out
}
