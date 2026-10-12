// H06 part 3: pure sample compositions, matching map-art.md's runtime cell/sprite/spot contract.
// Cells use tile coordinates; sprites and spots use art pixels. No labels are painted in the canvas.
import { rng } from '../rng.ts'
import { maskAt } from '../tiles/compose.ts'
import { closesBlock } from '../tiles/maps.ts'
import { Img } from '../tiles/image.ts'
import { TILE } from '../tiles/noise.ts'
import { worldFrames } from './atlas.ts'
import { cornerMaskAt } from './liquids.ts'
import { cellKey, hasCell, worldVariantAt, type Cells } from './maps.ts'
import { BIOMES, BIOME_IDS, ROADS, worldFrameSpecs, type Biome, type Road } from './spec.ts'

export interface MapCell { col: number; row: number; frame: string }
export interface MapSprite { x: number; y: number; frame: string }
export interface MapSpot { id: string; kind: 'region' | 'spring' | 'capital' | 'continent'; x: number; y: number; w: number; h: number }
export interface MapComposition { cols: number; rows: number; cells: MapCell[]; sprites: MapSprite[]; spots: MapSpot[]; road: Cells }
export interface Plot { id: string; row: number; col: number; biome: Biome; cleared: number }
export interface SampleContinent { id: string; regions: Plot[] }

function shuffle(label: string): Biome[] {
  const values = [...BIOME_IDS], random = rng(label)
  for (let i = values.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j]!, values[i]!] }
  return values
}
export function sampleContinent(id = 'synthetic-continent-1'): SampleContinent {
  const deal = Array.from({ length: 3 }, (_, n) => shuffle(id + ':biomes:' + n)).flat()
  return { id, regions: Array.from({ length: 40 }, (_, n) => ({ id: id + '-r' + n, row: Math.floor(n / 4), col: n % 4,
    biome: deal[n]!, cleared: n < 4 ? 12 : n === 4 ? 4 : 0 })) }
}
export function commonBiomes(continent: SampleContinent): [Biome, Biome] {
  const count = (biome: Biome) => continent.regions.filter((r) => r.biome === biome).length
  const sorted = [...BIOME_IDS].sort((a, b) => count(b) - count(a))
  return [sorted[0]!, sorted[1]!]
}
export function continentRoad(continent: SampleContinent): Road {
  const count = (road: Road) => continent.regions.filter((r) => BIOMES[r.biome].road === road).length
  return [...ROADS].sort((a, b) => count(b) - count(a))[0]!
}
export const continentBandY = (row: number): number => 4 + (9 - row) * 4

export function continentComposition(continent: SampleContinent): MapComposition {
  const out: MapComposition = { cols: 16, rows: 44, cells: [], sprites: [], spots: [], road: new Set() }
  const material = continentRoad(continent)
  // Reuse the atlas's cracked flagstones for the stone plaza, not a 2×2 network of road tiles with window holes.
  const plazaGround = material === 'stone' ? 'ruins' : material === 'dirt' ? 'desert' : 'coast'
  const road = (x: number, y: number) => { if (!closesBlock(out.road, x, y)) out.road.add(cellKey(x, y)) }
  for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++)
    out.cells.push({ col: x, row: y, frame: 'ground/' + plazaGround + '-' + worldVariantAt(continent.id, x, y) })
  for (let row = 0; row < 10; row++) {
    const y = continentBandY(row), roadY = y + 3, side = row % 2 === 0 ? 0 : 15
    for (let x = 0; x < 16; x++) road(x, roadY)
    // The highest band connects to the capital plaza as well.
    for (let yy = roadY - 4; yy <= roadY; yy++) road(side, yy)
    for (const plot of continent.regions.filter((r) => r.row === row).sort((a, b) => a.col - b.col)) {
      const x = plot.col * 4
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++)
        out.cells.push({ col: x + dx, row: y + dy, frame: 'ground/' + plot.biome + '-' + worldVariantAt(continent.id + ':' + plot.id, x + dx, y + dy) })
      const prop = BIOMES[plot.biome].props[0]!
      const spec = worldFrameSpecs([plot.biome]).find((f) => f.id === 'prop/' + plot.biome + '/' + prop)!
      out.sprites.push({ x: (x + 1) * TILE, y: (y + 3) * TILE - spec.h, frame: spec.id })
      out.sprites.push({ x: (x + 2) * TILE, y: (y + 1) * TILE, frame: plot.cleared === 12 ? 'marker/flag-cleared' : 'marker/flag' })
      out.spots.push({ id: plot.id, kind: 'region', x: x * TILE, y: y * TILE, w: 4 * TILE, h: 3 * TILE })
    }
  }
  for (let x = 0; x < 16; x++) road(x, 3)
  for (let row = 0; row < 10; row += 2) {
    // Above domain rows 1,3,5,7,9; the marker stands on the inter-band connector.
    const x = row % 4 === 0 ? 0 : 15, y = continentBandY(row) * TILE - 32
    const frame = row === 4 ? 'marker/spring-dry' : 'marker/spring'
    out.sprites.push({ x: x * TILE, y, frame })
    out.spots.push({ id: continent.id + '-spring-' + row, kind: 'spring', x: x * TILE, y, w: 16, h: 32 })
  }
  out.sprites.push({ x: 104, y: 4, frame: 'marker/capital' })
  out.spots.push({ id: continent.id + '-capital', kind: 'capital', x: 104, y: 4, w: 48, h: 48 })
  for (const k of out.road) {
    const [x, y] = k.split(',').map(Number) as [number, number]
    out.cells.push({ col: x, row: y, frame: 'road/' + material + '-' + maskAt((a, b) => hasCell(out.road, a, b), x, y) })
  }
  return out
}

export function worldComposition(continents: readonly SampleContinent[]): MapComposition {
  const out: MapComposition = { cols: 16, rows: 22, cells: [], sprites: [], spots: [], road: new Set() }
  for (let y = 0; y < out.rows; y++) for (let x = 0; x < out.cols; x++)
    out.cells.push({ col: x, row: y, frame: 'ground/ocean-' + worldVariantAt('synthetic-world', x, y) })
  continents.slice(0, 5).forEach((continent, index) => {
    const left = index % 2 === 0 ? 2 : 8, top = 17 - index * 4, biomes = commonBiomes(continent)
    const land = (x: number, y: number) => ((x - 3) / 3) ** 2 + ((y - 2) / 2) ** 2 <= 1
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
      const mask = cornerMaskAt((cx, cy) => !land(cx, cy), x, y)
      if (mask === 15) continue // Open ocean stays the deep-blue ocean tile, not the shallower shore water.
      const biome = biomes[(x + y + index) % 5 === 0 ? 1 : 0]!
      out.cells.push({ col: left + x, row: top + y, frame: 'ground/' + biome + '-' + worldVariantAt(continent.id, x, y) })
      if (mask) out.cells.push({ col: left + x, row: top + y, frame: 'liquid/water-' + mask })
    }
    const biome = biomes[0], name = BIOMES[biome].props[0]!
    const spec = worldFrameSpecs([biome]).find((f) => f.id === 'prop/' + biome + '/' + name)!
    out.sprites.push({ x: (left + 2) * TILE, y: (top + 3) * TILE - spec.h, frame: spec.id })
    out.sprites.push({ x: (left + 4) * TILE, y: (top + 3) * TILE - 32, frame: 'marker/flag' })
    out.spots.push({ id: continent.id, kind: 'continent', x: left * TILE, y: top * TILE, w: 96, h: 64 })
  })
  return out
}

/** The same indexed atlas frames a runtime canvas will draw, without repainting scene-specific assets. */
export function drawComposition(layout: MapComposition): Img {
  const out = new Img(layout.cols * TILE, layout.rows * TILE), frames = new Map(worldFrames(BIOME_IDS, true).map((f) => [f.id, f.img]))
  for (const c of layout.cells) {
    const frame = frames.get(c.frame)
    if (!frame) throw new Error('Unknown map frame ' + c.frame)
    out.draw(frame, c.col * TILE, c.row * TILE)
  }
  for (const s of layout.sprites) {
    const frame = frames.get(s.frame)
    if (!frame) throw new Error('Unknown map frame ' + s.frame)
    out.draw(frame, s.x, s.y)
  }
  return out
}
