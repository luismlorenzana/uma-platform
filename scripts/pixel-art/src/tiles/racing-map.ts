// A01 review composition only. The game owns its live layout; this checks the new terrain around 3×3 buildings.
import { BASE, SIZE } from '../buildings/kit.ts'
import { PLACES } from '../buildings/places.ts'
import { Sprite } from '../sprite.ts'
import { Img } from './image.ts'
import { closesBlock, type PropSprite, sampleMap } from './maps.ts'
import { TILE } from './noise.ts'

export const RACING_LOTS = [
  { id: 'scenario-gate', col: 6, row: 4 },
  { id: 'trophy-hall', col: 2, row: 10 },
  { id: 'tier-finale', col: 9, row: 10 },
  { id: 'racecourse', col: 6, row: 18 },
] as const

export function racingLayout(): { road: Set<string>; reserved: Set<string> } {
  const reserved = new Set<string>(), road = new Set<string>()
  for (const { col, row } of RACING_LOTS) {
    for (let y = row - 2; y <= row; y++) for (let x = col - 1; x <= col + 1; x++) reserved.add(`${x},${y}`)
  }
  const add = (x: number, y: number) => {
    if (reserved.has(`${x},${y}`) || closesBlock(road, x, y)) throw new Error(`Invalid Racing road at ${x},${y}`)
    road.add(`${x},${y}`)
  }
  for (let y = 5; y <= 14; y++) add(6, y)
  for (let x = 2; x <= 9; x++) if (x !== 6) add(x, 11)
  for (let x = 7; x <= 10; x++) add(x, 14)
  for (let y = 15; y <= 19; y++) add(10, y)
  for (let x = 6; x < 10; x++) add(x, 19)
  for (let y = 20; y <= 21; y++) add(6, y)
  // Keep name/pip rows out of the prop scatter too; roads are still allowed to pass along them.
  for (const { col, row } of RACING_LOTS) for (let x = col - 1; x <= col + 1; x++) reserved.add(`${x},${row + 1}`)
  return { road, reserved }
}

export function racingHubMap(ground: readonly Img[], paths: readonly Img[], props: readonly PropSprite[]): Img {
  const { road, reserved } = racingLayout()
  const map = sampleMap('racing-hub', ground, [{ cells: road, on: (x, y) => road.has(`${x},${y}`), tiles: paths }], props, reserved)
  for (const { id, col, row } of RACING_LOTS) {
    const place = PLACES.find(p => p.id === id)
    if (!place) throw new Error(`Missing Racing sample building ${id}`)
    const sprite = new Sprite(SIZE, SIZE)
    sprite.shadow = { cx: SIZE / 2, cy: BASE + 0.5, rx: 20, ry: 3.2, alpha: 72 }
    place.paint(sprite)
    map.draw(new Img(SIZE, SIZE, sprite.render()), (col - 1) * TILE, (row - 2) * TILE)
  }
  return map
}
