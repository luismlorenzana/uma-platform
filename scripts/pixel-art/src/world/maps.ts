// Seeded compositions shared by the art previews and documented for H07's runtime map renderer.
import { rng } from '../rng.ts'
import { maskAt } from '../tiles/compose.ts'
import { Img } from '../tiles/image.ts'
import { closesBlock } from '../tiles/maps.ts'
import { TILE } from '../tiles/noise.ts'
import { biomeGround } from './ground.ts'
import { cornerMaskAt, liquidTiles } from './liquids.ts'
import { flag, frontierRing, spring, stageMarker } from './markers.ts'
import { drawWorldProp, worldProp } from './props.ts'
import { roadTiles } from './roads.ts'
import { BIOMES, PHASE_ONE_BIOMES, type Biome, type StageKind, type StageState } from './spec.ts'

export const REGION_COLS = 16, REGION_ROWS = 28
export type Cells = Set<string>
export const cellKey = (x: number, y: number): string => `${x},${y}`
export const hasCell = (cells: ReadonlySet<string>, x: number, y: number): boolean => cells.has(cellKey(x, y))
export interface StageSpot { x: number; y: number; kind: StageKind; state: StageState }
export interface RegionLayout { road: Cells; wet: Cells; stages: StageSpot[]; ponds: Cells[] }

/** Every 2×2 ground deal contains all four variants, shuffled independently so a 4×4 plot has no regular pattern. */
export function worldVariantAt(label: string, x: number, y: number): number {
  const order = [0, 1, 2, 3], r = rng(`${label}:ground:${Math.floor(x / 2)},${Math.floor(y / 2)}`)
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(r() * (i + 1)), v = order[i]!
    order[i] = order[j]!; order[j] = v
  }
  return order[(x % 2) + (y % 2) * 2]!
}

function markRoad(cells: Cells, x: number, y: number, rows: number): void {
  if (x >= 0 && x < REGION_COLS && y >= 0 && y < rows && !closesBlock(cells, x, y)) cells.add(cellKey(x, y))
}

/** Grow a filled blob from a 2×2 seed, adding overlapping 2×2 lobes, never stamping an ellipse.
 * Every vertex remains in a full core; bounded growth keeps the narrow map's roads/markers clear. */
export function growPond(random: () => number, px: number, py: number): Cells {
  const block = (x: number, y: number): string[] => [cellKey(x, y), cellKey(x + 1, y), cellKey(x, y + 1), cellKey(x + 1, y + 1)]
  const cells = new Set(block(px, py)), target = 7 + Math.floor(random() * 3)
  for (let step = 0; step < 20 && cells.size < target; step++) {
    const choices: string[][] = []
    for (let y = py - 2; y <= py + 2; y++) for (let x = px - 2; x <= px + 2; x++) {
      const lobe = block(x, y), overlap = lobe.filter((k) => cells.has(k)).length
      if (overlap < 2 || overlap === 4) continue
      const points = [...cells, ...lobe].map((k) => k.split(',').map(Number))
      const xs = points.map((p) => p[0]!), ys = points.map((p) => p[1]!)
      if (Math.max(...xs) - Math.min(...xs) > 3 || Math.max(...ys) - Math.min(...ys) > 4) continue
      choices.push(lobe)
    }
    if (!choices.length) break
    for (const k of choices[Math.floor(random() * choices.length)]!) cells.add(k)
  }
  return cells
}

export function regionLayout(biome: Biome, label = `world:${biome}`): RegionLayout {
  const road: Cells = new Set(), atY: number[] = []
  const rRoad = rng(`${label}:road`), offset = Math.floor(rRoad() * 3) - 1
  let x = 7 + offset
  // Each jog points away from the previous pair's branch and towards the next trunk. Adjacent rows share one cell.
  const jogs = new Map([[23, 9 + offset], [19, 7 + offset], [15, 9 + offset], [11, 7 + offset], [7, 9 + offset], [3, 8]])
  for (let y = REGION_ROWS - 1; y >= 0; y--) {
    markRoad(road, x, y, REGION_ROWS)
    const to = jogs.get(y)
    if (to !== undefined) {
      for (let xx = Math.min(x, to); xx <= Math.max(x, to); xx++) markRoad(road, xx, y, REGION_ROWS)
      x = to
    }
    atY[y] = x
  }
  const stages: StageSpot[] = []
  for (let i = 0; i < 12; i++) {
    const y = i === 11 ? 2 : 26 - i * 2, trunk = atY[y]!
    const sx = i === 11 ? 8 : trunk + (Math.floor(i / 2) % 2 === 0 ? -3 : 3)
    for (let xx = Math.min(trunk, sx); xx <= Math.max(trunk, sx); xx++) markRoad(road, xx, y, REGION_ROWS)
    stages.push({ x: sx, y, kind: i === 11 ? 'boss' : i === 10 ? 'elite' : 'fight', state: i < 4 ? 'cleared' : i === 4 ? 'open' : 'locked' })
  }
  const wet: Cells = new Set(), ponds: Cells[] = []
  if (BIOMES[biome].liquid) {
    const r = rng(`${label}:liquid`)
    for (let attempt = 0; attempt < 500 && ponds.length < 3; attempt++) {
      const px = 1 + Math.floor(r() * (REGION_COLS - 2)), py = 1 + Math.floor(r() * (REGION_ROWS - 2))
      const patch = growPond(r, px, py)
      const points = [...patch].map((k) => k.split(',').map(Number))
      const minX = Math.min(...points.map((p) => p[0]!)), maxX = Math.max(...points.map((p) => p[0]!))
      const minY = Math.min(...points.map((p) => p[1]!)), maxY = Math.max(...points.map((p) => p[1]!))
      // Reject rectangles too: each accepted pond has at least one irregular inlet or lobe.
      if (patch.size === (maxX - minX + 1) * (maxY - minY + 1)) continue
      const touches = (tx: number, ty: number) => cornerMaskAt((cx, cy) => hasCell(patch, cx, cy), tx, ty) !== 0
      let fits = true
      for (let ty = minY - 1; ty <= maxY; ty++)
        for (let tx = minX - 1; tx <= maxX; tx++) {
          if (!touches(tx, ty)) continue
          if (tx < 0 || ty < 0 || tx >= REGION_COLS || ty >= REGION_ROWS || hasCell(road, tx, ty) || cornerMaskAt((cx, cy) => hasCell(wet, cx, cy), tx, ty)
            || stages.some((m) => Math.abs(m.x - tx) <= 1 && Math.abs(m.y - ty) <= 1)) fits = false
        }
      if (!fits) continue
      patch.forEach((k) => wet.add(k)); ponds.push(patch)
    }
  }
  return { road, wet, stages, ponds }
}

export function sampleRegionMap(biome: Biome, ground: readonly Img[], roads: readonly Img[], liquids: readonly Img[], label = `world:${biome}`): Img {
  const spec = BIOMES[biome], { road, wet, stages } = regionLayout(biome, label)
  const out = new Img(REGION_COLS * TILE, REGION_ROWS * TILE)
  const liquidMask = (x: number, y: number) => cornerMaskAt((cx, cy) => hasCell(wet, cx, cy), x, y)
  for (let y = 0; y < REGION_ROWS; y++)
    for (let x = 0; x < REGION_COLS; x++) {
      out.copy(ground[worldVariantAt(label, x, y)]!, x * TILE, y * TILE)
      const m = liquidMask(x, y)
      if (m) out.draw(liquids[m]!, x * TILE, y * TILE)
      if (hasCell(road, x, y)) out.draw(roads[maskAt((cx, cy) => hasCell(road, cx, cy), x, y)]!, x * TILE, y * TILE)
    }
  const r = rng(`${label}:props`), occupied: Cells = new Set()
  const propImages = new Map<string, Img>()
  const placed: { x: number; y: number; img: Img }[] = []
  const free = (x: number, y: number) => !hasCell(road, x, y) && !liquidMask(x, y) && !hasCell(occupied, x, y)
    && !stages.some((m) => Math.abs(m.x - x) <= 1 && Math.abs(m.y - y) <= 1)
  for (let attempt = 0; attempt < 800 && placed.length < 30; attempt++) {
    const edge = r() < 0.65, x = edge ? (r() < 0.5 ? Math.floor(r() * 3) : 13 + Math.floor(r() * 3)) : Math.floor(r() * REGION_COLS)
    const y = 1 + Math.floor(r() * (REGION_ROWS - 1)), id = spec.props[Math.floor(r() * spec.props.length)]!
    const prop = worldProp(id)
    if (!free(x, y) || prop.h > TILE && !free(x, y - 1)) continue
    let img = propImages.get(id)
    if (!img) { img = drawWorldProp(prop); propImages.set(id, img) }
    placed.push({ x, y, img }); occupied.add(cellKey(x, y))
    if (img.h > TILE) occupied.add(cellKey(x, y - 1))
  }
  placed.sort((a, b) => a.y - b.y || a.x - b.x)
  for (const p of placed) out.draw(p.img, p.x * TILE, (p.y + 1) * TILE - p.img.h)
  for (const m of stages) out.draw(stageMarker(m.kind, m.state), m.x * TILE, m.y * TILE)
  const frontier = stages.find((m) => m.state === 'open')!
  out.draw(frontierRing(0), frontier.x * TILE, frontier.y * TILE)
  return out
}

export function continentStripRoad(): Cells {
  const cells: Cells = new Set()
  for (const y of [3, 7, 11]) for (let x = 0; x < REGION_COLS; x++) markRoad(cells, x, y, 12)
  for (const [x, from, to] of [[0, 3, 7], [15, 7, 11]] as const) for (let y = from; y <= to; y++) markRoad(cells, x, y, 12)
  return cells
}

/** Three four-plot bands; all five milestone biomes appear next to neighbours across the strip. */
export function sampleContinentStrip(): Img {
  const out = new Img(16 * TILE, 12 * TILE), road = continentStripRoad()
  const tiles = roadTiles('dirt')
  for (let band = 0; band < 3; band++)
    for (let plot = 0; plot < 4; plot++) {
      const biome = PHASE_ONE_BIOMES[(band * 4 + plot) % 5]!, ground = [0, 1, 2, 3].map((v) => biomeGround(biome, v))
      for (let y = band * 4; y < band * 4 + 4; y++)
        for (let x = plot * 4; x < plot * 4 + 4; x++) out.copy(ground[worldVariantAt(`continent:${biome}`, x, y)]!, x * TILE, y * TILE)
      const prop = drawWorldProp(worldProp(BIOMES[biome].props[0]!))
      out.draw(prop, (plot * 4 + 1) * TILE, (band * 4 + 3) * TILE - prop.h)
      out.draw(flag(band === 2 && plot < 2), (plot * 4 + 3) * TILE, (band * 4 + 3) * TILE - 32)
    }
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++) {
      if (!hasCell(road, x, y)) continue
      // One continent road material avoids mismatched board/stone joins at biome and level borders.
      out.draw(tiles[maskAt((cx, cy) => hasCell(road, cx, cy), x, y)]!, x * TILE, y * TILE)
    }
  out.draw(spring(), 0, 4 * TILE)
  return out
}

export function regionPreview(biome: Biome): Img {
  const spec = BIOMES[biome]
  return sampleRegionMap(biome, [0, 1, 2, 3].map((v) => biomeGround(biome, v)), roadTiles(spec.road), spec.liquid ? liquidTiles(spec.liquid) : [])
}

export function biomePlot(biome: Biome): Img {
  const ground = [0, 1, 2, 3].map((v) => biomeGround(biome, v)), out = new Img(64, 48)
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) out.copy(ground[worldVariantAt(`plot:${biome}`, x, y)]!, x * 16, y * 16)
  const prop = drawWorldProp(worldProp(BIOMES[biome].props[0]!))
  out.draw(prop, 16, 48 - prop.h); out.draw(flag(), 48, 16)
  return out
}
