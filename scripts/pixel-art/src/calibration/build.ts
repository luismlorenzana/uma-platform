// H01 calibration preview. This intentionally writes no published atlas: H03 and H06 integrate the accepted work.
// Run from the repo root:
//   pnpm --filter @uma-platform/pixel-art exec tsx src/calibration/build.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hex, type RGBA } from '../color.ts'
import { fireOrb } from '../gear/element-orb.ts'
import { fireTome } from '../gear/element-tome.ts'
import { katana } from '../gear/katana.ts'
import { drawIcon, ICON_SIZE } from '../icon.ts'
import type { ItemIcon } from '../items/types.ts'
import { encodePng } from '../png.ts'
import { autotileSeams, cornerAutotileSeams, groundSeams } from '../tiles/check.ts'
import { Img } from '../tiles/image.ts'
import { TILE } from '../tiles/noise.ts'
import { biomeGround } from '../world/ground.ts'
import { biomeIcon } from '../world/icons.ts'
import { REGION_COLS, REGION_ROWS, sampleRegionMap } from '../world/maps.ts'
import { liquidTiles, roadTiles } from '../world/networks.ts'
import { drawWorldProp, worldProp } from '../world/props.ts'
import { BIOMES, CALIBRATION_BIOMES, LIQUIDS, ROADS } from '../world/spec.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const BG = hex('#0f141b'), CELL = hex('#18202a'), RULE = hex('#293545')

interface Frame {
  id: string
  img: Img
}

const grounds = Object.fromEntries(CALIBRATION_BIOMES.map((biome) => [biome, [0, 1, 2, 3].map((v) => biomeGround(biome, v))])) as Record<(typeof CALIBRATION_BIOMES)[number], Img[]>
const liquids = Object.fromEntries(LIQUIDS.map((kind) => [kind, liquidTiles(kind)])) as Record<(typeof LIQUIDS)[number], Img[]>
const roads = Object.fromEntries(ROADS.map((kind) => [kind, roadTiles(kind)])) as Record<(typeof ROADS)[number], Img[]>

const problems: string[] = []
for (const biome of CALIBRATION_BIOMES) problems.push(...groundSeams(biome, grounds[biome]))
const transparent = new Img(TILE, TILE)
for (const kind of LIQUIDS) problems.push(...cornerAutotileSeams(`liquid/${kind}`, liquids[kind]))
for (const kind of ROADS) problems.push(...autotileSeams(`road/${kind}`, roads[kind], transparent))
if (problems.length) throw new Error(`Calibration seam check failed:\n${problems.join('\n')}`)

const worldFrames: Frame[] = []
for (const biome of CALIBRATION_BIOMES) {
  grounds[biome].forEach((img, variant) => worldFrames.push({ id: `ground/${biome}-${variant}`, img }))
  for (const propId of BIOMES[biome].props) worldFrames.push({ id: `prop/${biome}/${propId}`, img: drawWorldProp(worldProp(propId)) })
}
for (const kind of LIQUIDS) liquids[kind].forEach((img, mask) => { if (mask) worldFrames.push({ id: `liquid/${kind}-${mask}`, img }) })
for (const kind of ROADS) roads[kind].forEach((img, mask) => worldFrames.push({ id: `road/${kind}-${mask}`, img }))
for (const biome of CALIBRATION_BIOMES) worldFrames.push({ id: `icon/${biome}`, img: biomeIcon(biome) })
if (worldFrames.length !== 162) throw new Error(`Expected 162 calibration world frames, got ${worldFrames.length}`)

const gearPainters = [
  { id: 'katana', paint: katana },
  { id: 'tome-fire', paint: fireTome },
  { id: 'orb-fire', paint: fireOrb },
] as const
const gearRows = gearPainters.map((type) =>
  Array.from({ length: 10 }, (_, i) => {
    const grade = i + 1
    const icon: ItemIcon = { id: `${type.id}-g${grade}`, name: `${type.id}, grade ${grade}`, grade, paint: (s) => type.paint(s, grade) }
    return new Img(ICON_SIZE, ICON_SIZE, drawIcon(icon))
  }),
)

const maps = CALIBRATION_BIOMES.map((biome) => {
  const spec = BIOMES[biome]
  return sampleRegionMap(biome, grounds[biome], roads[spec.road], liquids[spec.liquid!])
})

function rect(img: Img, x0: number, y0: number, w: number, h: number, color: RGBA): void {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.set(x, y, color)
}

const PAD = 8, GAP = 18
const WORLD_COLS = 16, WORLD_SCALE = 3, WORLD_SLOT_W = 54, WORLD_SLOT_H = 102
const worldRows = Math.ceil(worldFrames.length / WORLD_COLS)
const worldH = worldRows * WORLD_SLOT_H + PAD * 2
const mapW = REGION_COLS * TILE * 2, mapH = REGION_ROWS * TILE * 2
const mapsW = maps.length * mapW + (maps.length - 1) * GAP
const mapsTop = worldH + GAP
const gearScale = 3, gearSlotW = ICON_SIZE * gearScale + PAD, gearSlotH = ICON_SIZE * gearScale + ICON_SIZE + PAD * 3
const gearW = 10 * gearSlotW + PAD
const gearTop = mapsTop + mapH + GAP
const out = new Img(Math.max(WORLD_COLS * WORLD_SLOT_W + PAD * 2, mapsW + PAD * 2, gearW), gearTop + gearRows.length * gearSlotH + PAD).fill(BG)

// Every world frame at 3x, bottom-aligned so 16x16 and 16x32 props share the same grid.
worldFrames.forEach((frame, i) => {
  const col = i % WORLD_COLS, row = Math.floor(i / WORLD_COLS)
  const x = PAD + col * WORLD_SLOT_W, y = PAD + row * WORLD_SLOT_H
  rect(out, x, y, TILE * WORLD_SCALE, TILE * 2 * WORLD_SCALE, CELL)
  const scaled = frame.img.scaled(WORLD_SCALE)
  out.draw(scaled, x, y + TILE * 2 * WORLD_SCALE - scaled.h)
})

rect(out, 0, worldH, out.w, 2, RULE)
maps.forEach((map, i) => {
  const x = PAD + i * (mapW + GAP)
  rect(out, x - 2, mapsTop - 2, mapW + 4, mapH + 4, CELL)
  out.copy(map.scaled(2), x, mapsTop)
})

rect(out, 0, gearTop - Math.floor(GAP / 2), out.w, 2, RULE)
gearRows.forEach((row, rowIndex) =>
  row.forEach((icon, gradeIndex) => {
    const x = PAD + gradeIndex * gearSlotW, y = gearTop + rowIndex * gearSlotH
    rect(out, x, y, ICON_SIZE * gearScale, ICON_SIZE * gearScale, CELL)
    out.draw(icon.scaled(gearScale), x, y)
    const oneX = x + Math.floor((ICON_SIZE * gearScale - ICON_SIZE) / 2)
    rect(out, oneX, y + ICON_SIZE * gearScale + PAD, ICON_SIZE, ICON_SIZE, CELL)
    out.draw(icon, oneX, y + ICON_SIZE * gearScale + PAD)
  }),
)

const previews = join(ROOT, 'assets', 'previews')
mkdirSync(previews, { recursive: true })
const output = join(previews, 'calibration.png')
writeFileSync(output, encodePng(out.w, out.h, out.px))
console.log(`Wrote ${worldFrames.length} world frames, ${gearRows.flat().length} gear icons and ${maps.length} maps to ${relative(ROOT, output)} (${out.w}x${out.h}); seams clean`)
