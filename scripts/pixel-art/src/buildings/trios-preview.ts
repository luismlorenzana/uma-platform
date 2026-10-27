// H113 review composition only. The games own their live layouts and naming.
import { Sprite } from '../sprite.ts'
import { groundTile } from '../tiles/ground.ts'
import { Img } from '../tiles/image.ts'
import { closesBlock } from '../tiles/maps.ts'
import { GROUND as TERRAIN, PATH } from '../tiles/terrain.ts'
import { BASE, SIZE } from './kit.ts'
import { PLACES } from './places.ts'

export const TRIO_ROWS = [
  ['mine', 'mine-workbench', 'weapon-forge'],
  ['vegetable-garden', 'fields-workbench', 'tome-forge'],
  ['forest', 'forest-workbench', 'lancers-barracks'],
  ['fishery', 'fishery-workbench', 'charm-forge'],
  ['monster-den', 'den-workbench', 'lapidary'],
] as const
export const TRIO_COLS = 17, TRIO_MAP_ROWS = 30, TILE = 16
export const TRIO_LOTS = TRIO_ROWS.flatMap((ids, r) => ids.map((id, c) => ({ id, col: 3 + c * 5, row: 3 + r * 6 })))

export function triosLayout() {
  const road = new Set<string>(), reserved = new Set<string>()
  for (const { col, row } of TRIO_LOTS)
    for (let y = row - 2; y <= row; y++) for (let x = col - 1; x <= col + 1; x++) reserved.add(`${x},${y}`)
  const add = (x: number, y: number) => {
    const key = `${x},${y}`
    if (road.has(key)) return
    if (reserved.has(key) || closesBlock(road, x, y)) throw new Error(`Invalid Wilds review road ${key}`)
    road.add(key)
  }
  for (let y = 0; y < TRIO_MAP_ROWS; y++) if (!reserved.has(`8,${y}`)) add(8, y)
  for (const { col, row } of TRIO_LOTS) {
    if (col !== 8) continue
    // Door branches and an east lane around the three-tile shed footprint.
    for (let x = 3; x <= 13; x++) add(x, row + 1)
    add(9, row - 3)
    for (let y = row - 3; y <= row + 1; y++) add(10, y)
  }
  return { road, reserved }
}

export function triosMock(): Img {
  const { road } = triosLayout(), ground = [0, 1, 2, 3].map(v => groundTile(TERRAIN.wilds, v))
  const paths = Array.from({ length: 16 }, (_, m) => PATH.wilds(m, ground[0]!))
  const out = new Img(TRIO_COLS * TILE, TRIO_MAP_ROWS * TILE)
  for (let y = 0; y < TRIO_MAP_ROWS; y++) for (let x = 0; x < TRIO_COLS; x++) {
    const on = (xx: number, yy: number) => yy < 0 || yy >= TRIO_MAP_ROWS || road.has(`${xx},${yy}`)
    const mask = (on(x, y - 1) ? 1 : 0) | (on(x + 1, y) ? 2 : 0) | (on(x, y + 1) ? 4 : 0) | (on(x - 1, y) ? 8 : 0)
    out.copy(road.has(`${x},${y}`) ? paths[mask]! : ground[(x * 17 + y * 7) % 4]!, x * TILE, y * TILE)
  }
  for (const { id, col, row } of TRIO_LOTS) {
    const place = PLACES.find(p => p.id === id)
    if (!place) throw new Error(`Missing Wilds review building ${id}`)
    const s = new Sprite(SIZE, SIZE)
    s.shadow = { cx: 24, cy: BASE + .5, rx: 20, ry: 3.2, alpha: 72 }
    place.paint(s)
    out.draw(new Img(SIZE, SIZE, s.render()), (col - 1) * TILE, (row - 2) * TILE)
  }
  return out
}
