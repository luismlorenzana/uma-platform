// H31 review composition only. The games own their live layouts, not this synthetic two-place drill ground.
import { BASE, SIZE } from '../buildings/kit.ts'
import { PLACES } from '../buildings/places.ts'
import { Sprite } from '../sprite.ts'
import { Img } from './image.ts'
import { closesBlock, type PropSprite, sampleMap } from './maps.ts'
import { TILE } from './noise.ts'

export const BATTLE_LOTS = [
  { id: 'scenario-gate', col: 6, row: 4 },
  { id: 'tier-finale', col: 6, row: 15 },
] as const

export const BATTLE_FURNITURE = [
  { id: 'banner', col: 2, row: 5 },
  { id: 'weapon-rack', col: 3, row: 8 },
  { id: 'training-dummy', col: 8, row: 6 },
  { id: 'torch', col: 8, row: 15 },
  { id: 'crate', col: 9, row: 18 },
  { id: 'shield-stand', col: 3, row: 18 },
] as const

export function battleLayout(): { road: Set<string>; reserved: Set<string> } {
  const road = new Set<string>(), reserved = new Set<string>()
  for (const { col, row } of BATTLE_LOTS) {
    for (let y = row - 2; y <= row; y++) for (let x = col - 1; x <= col + 1; x++) reserved.add(`${x},${y}`)
  }
  const add = (x: number, y: number) => {
    if (reserved.has(`${x},${y}`) || closesBlock(road, x, y)) throw new Error(`Invalid Battle road at ${x},${y}`)
    road.add(`${x},${y}`)
  }
  for (let y = 5; y <= 9; y++) add(6, y)
  for (let x = 7; x <= 10; x++) add(x, 9)
  for (let y = 10; y <= 16; y++) add(10, y)
  for (let x = 6; x <= 9; x++) add(x, 16)
  for (let y = 17; y <= 21; y++) add(6, y)
  // Name/pip rows are also kept clear of furniture.
  for (const { col, row } of BATTLE_LOTS) for (let x = col - 1; x <= col + 1; x++) reserved.add(`${x},${row + 1}`)
  return { road, reserved }
}

/** H38's review lots: the Rift stands in the Tier Finale's lot. */
export const RIFT_LOTS = [
  { id: 'scenario-gate', col: 6, row: 4 },
  { id: 'rift', col: 6, row: 15 },
] as const

/** `lots` swaps which building stands in each lot; they must keep BATTLE_LOTS' cells, so the road and props stay put. */
export function battleHubMap(ground: readonly Img[], paths: readonly Img[], props: readonly PropSprite[],
  lots: readonly { id: string; col: number; row: number }[] = BATTLE_LOTS): Img {
  if (lots.length !== BATTLE_LOTS.length || lots.some((l, i) => l.col !== BATTLE_LOTS[i]!.col || l.row !== BATTLE_LOTS[i]!.row))
    throw new Error('Battle sample lots must keep the H31 lot cells')
  const { road, reserved } = battleLayout()
  const map = sampleMap('battle-hub', ground, [{ cells: road, on: (x, y) => road.has(`${x},${y}`), tiles: paths }], [], reserved)
  const stamps: { row: number; x: number; y: number; img: Img }[] = []
  for (const { id, col, row } of BATTLE_FURNITURE) {
    const prop = props.find(p => p.id === id)
    if (!prop) throw new Error(`Missing Battle sample prop ${id}`)
    stamps.push({ row, x: col * TILE, y: (row + 1) * TILE - prop.img.h, img: prop.img })
  }
  for (const { id, col, row } of lots) {
    const place = PLACES.find(p => p.id === id)
    if (!place) throw new Error(`Missing Battle sample building ${id}`)
    const sprite = new Sprite(SIZE, SIZE)
    sprite.shadow = { cx: SIZE / 2, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
    place.paint(sprite)
    stamps.push({ row, x: (col - 1) * TILE, y: (row - 2) * TILE, img: new Img(SIZE, SIZE, sprite.render()) })
  }
  for (const { img, x, y } of stamps.sort((a, b) => a.row - b.row)) map.draw(img, x, y)
  return map
}
