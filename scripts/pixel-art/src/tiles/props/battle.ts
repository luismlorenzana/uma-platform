// H31: original drill-ground furniture. Tall props stand in the lower cell, as in every existing Hub page.
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, box, stroke } from './kit.ts'
import { foot, type Prop } from './types.ts'

function banner(s: Sprite): void {
  const wood = add(s, '#8b6847'), red = add(s, '#aa544b'), gold = add(s, '#d8b35b')
  box(s, 3, 3, 4, 29, 4, wood)
  box(s, 3, 4, 13, 5, 4, gold)
  const cloth = Mask.polygon([[5, 6], [12, 6], [12, 21], [8.5, 18], [5, 21]], 16, 32)
  cloth.each((x, y) => s.paint(x, y, x === 5 || !cloth.get(x, y + 1) ? gold : red, x < 8 ? 4 : 2))
  // A simple diamond standard, not lettering or a franchise crest.
  Mask.polygon([[8, 9], [10, 12], [8, 15], [6, 12]], 16, 32).each((x, y) => s.paint(x, y, gold, x < 9 ? 5 : 3))
  s.paint(3, 2, gold, 5)
  box(s, 2, 28, 5, 29, 28, wood)
}

function weaponRack(s: Sprite): void {
  const wood = add(s, '#966b43'), steel = add(s, '#afb9c0'), leather = add(s, '#694c3a')
  for (const x of [3, 12]) box(s, x, 6, x + 1, 13, 6, wood)
  box(s, 2, 6, 13, 8, 6, wood)
  stroke(s, 5, 2, 5, 10, steel, 4)
  stroke(s, 6, 3, 6, 9, steel, 2)
  stroke(s, 4, 10, 7, 10, steel, 5)
  stroke(s, 5, 11, 5, 12, leather, 3)
  stroke(s, 10, 3, 10, 12, wood, 4)
  const axe = Mask.polygon([[10, 3], [13, 3], [13, 6], [11, 7], [10, 5]], 16, 16)
  axe.each((x, y) => s.paint(x, y, steel, y < 5 ? 5 : 3))
}

function trainingDummy(s: Sprite): void {
  const wood = add(s, '#8d6541'), straw = add(s, '#c2a36a'), rope = add(s, '#8d7152'), red = add(s, '#a95348')
  box(s, 7, 19, 8, 29, 20, wood)
  box(s, 4, 28, 11, 29, 28, wood)
  stroke(s, 2, 13, 13, 13, wood, 4)
  stroke(s, 2, 14, 13, 14, wood, 2)
  shadeDome(s, Mask.circle(8, 7, 3.2, 16, 32), straw, { contact: false, relief: .45 })
  shadeDome(s, Mask.polygon([[4, 11], [11, 11], [12, 20], [10, 23], [5, 23], [3, 20]], 16, 32), straw, { contact: false, relief: .5 })
  for (const y of [12, 21]) stroke(s, 4, y, 11, y, rope, 2)
  const target = Mask.circle(8, 16.5, 3, 16, 32)
  target.each((x, y) => s.paint(x, y, red, x < 8 ? 4 : 2))
  s.paint(7, 16, straw, 5); s.paint(8, 16, straw, 4)
  for (const [x, y] of [[5, 14], [10, 19], [6, 20], [9, 6]] as const) s.paint(x, y, rope, 2)
}

function torch(s: Sprite): void {
  const wood = add(s, '#87603e'), iron = add(s, '#777f85'), stone = add(s, '#9d9b87')
  const flame = add(s, '#e28b36', { lift: .4, drop: .28 }), core = add(s, '#f8d27c', { lift: .3 })
  box(s, 7, 13, 8, 28, 14, wood)
  shadeDome(s, Mask.ellipse(8, 28.5, 3.5, 1.5, 0, 16, 32), stone, { contact: false, relief: .35 })
  box(s, 5, 12, 10, 15, 12, iron)
  const fire = Mask.polygon([[8, 2], [10, 7], [12, 6], [11, 11], [8, 14], [5, 11], [5, 7], [7, 8]], 16, 32)
  fire.each((x, y) => s.paint(x, y, flame, y < 8 ? 5 : x < 8 ? 4 : 3))
  Mask.polygon([[8, 7], [10, 11], [8, 13], [6, 11]], 16, 32).each((x, y) => s.paint(x, y, core, x < 9 ? 5 : 4))
}

function crate(s: Sprite): void {
  const wood = add(s, '#a17a4c'), edge = add(s, '#755336'), iron = add(s, '#87908f')
  box(s, 2, 4, 13, 13, 6, wood)
  for (const x of [5, 9]) stroke(s, x, 7, x, 12, edge, 2)
  stroke(s, 3, 7, 12, 12, wood, 4)
  stroke(s, 3, 12, 12, 7, wood, 3)
  for (const [x, y] of [[3, 5], [12, 5], [3, 12], [12, 12]] as const) s.paint(x, y, iron, 3)
}

function shieldStand(s: Sprite): void {
  const wood = add(s, '#8d6846'), steel = add(s, '#b5b8a5'), blue = add(s, '#557e93'), gold = add(s, '#d7b266')
  box(s, 7, 7, 8, 13, 8, wood)
  box(s, 3, 12, 12, 13, 12, wood)
  shadeDome(s, Mask.polygon([[3, 3], [12, 3], [11, 8], [8, 12], [4, 9]], 16, 16), steel, { contact: false, relief: .3 })
  Mask.polygon([[5, 4], [10, 4], [10, 8], [8, 10], [5, 8]], 16, 16).each((x, y) => s.paint(x, y, blue, x < 8 ? 4 : 2))
  s.paint(7, 6, gold, 5); s.paint(8, 6, gold, 4); s.paint(7, 7, gold, 3)
}

export const BATTLE_PROPS: readonly Prop[] = [
  { id: 'banner', w: 16, h: 32, shadow: foot(5, 29.5, 4, 1.3), paint: banner },
  { id: 'weapon-rack', w: 16, h: 16, shadow: foot(8, 13.7, 6.5, 1.2), paint: weaponRack },
  { id: 'training-dummy', w: 16, h: 32, shadow: foot(8, 29.5, 4.5, 1.3), paint: trainingDummy },
  { id: 'torch', w: 16, h: 32, shadow: foot(8, 29.5, 4, 1.3), paint: torch },
  { id: 'crate', w: 16, h: 16, shadow: foot(8, 13.7, 6.5, 1.2), paint: crate },
  { id: 'shield-stand', w: 16, h: 16, shadow: foot(8, 13.7, 5.5, 1.2), paint: shieldStand },
]
