// Original small biome props, lit upper-left and grounded at h-2. Shared primitives, not borrowed images.
import { Mask, shadeDome, shadeFacets, cutStone, type Point } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { add, box, circles, foliage, stroke } from '../tiles/props/kit.ts'
import { WILDS_PROPS } from '../tiles/props/wilds.ts'
import type { WorldProp } from './props.ts'

const short = { cx: 8, cy: 14.4, rx: 5, ry: 1.4, alpha: 72 }
const tall = { cx: 8, cy: 30.3, rx: 5.4, ry: 1.5, alpha: 76 }
const prop = (id: string, h: 16 | 32, paint: (s: Sprite) => void): WorldProp => ({ id, w: 16, h, shadow: h === 32 ? tall : short, paint })
const dome = (s: Sprite, mask: Mask, color: string, relief = 0.6) =>
  shadeDome(s, mask, add(s, color, { lift: 0.32, drop: 0.26 }), { relief, contact: false })
function stone(s: Sprite, base: string, outer: readonly Point[], inner: readonly Point[]): number {
  const id = add(s, base, { lift: 0.34, drop: 0.28 })
  shadeFacets(s, outer, cutStone(outer, inner, 2.8), id)
  return id
}
function bareTree(s: Sprite, color: string, moss = false): void {
  const wood = add(s, color)
  stroke(s, 7, 29, 8, 6, wood, 3); stroke(s, 8, 29, 9, 8, wood, 2)
  for (const [a, b, c, d] of [[8, 14, 3, 9], [4, 10, 2, 5], [8, 11, 13, 5], [8, 20, 13, 15], [8, 23, 3, 18]] as const)
    stroke(s, a, b, c, d, wood, a < c ? 2 : 4)
  stroke(s, 4, 29, 11, 29, wood, 2)
  if (moss) { const green = add(s, '#6e8e50'); stroke(s, 7, 23, 6, 28, green, 4); s.paint(5, 29, green, 3) }
}
function leafyTree(s: Sprite, leafColor: string, golden = false): void {
  const wood = add(s, golden ? '#9a7951' : '#78583d'), leaf = add(s, leafColor)
  box(s, 7, 16, 9, 29, 18, wood)
  stroke(s, 8, 19, 3, 14, wood, 4); stroke(s, 8, 17, 13, 11, wood, 2)
  const clumps = [[4, 12, 4], [11, 13, 4.3], [8, 6, 5.7], [3.5, 6.5, 3.2], [12, 7, 3.6]] as const
  foliage(s, circles(s, clumps), leaf, clumps, 0.06)
  if (golden) { const gold = add(s, '#fff0b0'); for (const [x, y] of [[5, 4], [10, 6], [3, 10], [9, 11]]) s.paint(x!, y!, gold, 5) }
  else { const vine = add(s, '#91ba5a'); stroke(s, 12, 14, 11, 24, vine, 4); stroke(s, 3, 14, 5, 21, vine, 3) }
}
function shrub(s: Sprite, base: string, flowers?: string): void {
  const leaf = add(s, base), wood = add(s, '#847459')
  for (const [x, y] of [[4, 8], [8, 5], [12, 7]] as const) {
    stroke(s, 8, 14, x, y, wood, 3)
    dome(s, Mask.ellipse(x, y + 2, 2.7, 2, 0, 16, 16), base)
  }
  s.paint(7, 14, leaf, 2); s.paint(9, 13, leaf, 3)
  if (flowers) { const bloom = add(s, flowers); for (const [x, y] of [[3, 8], [8, 6], [12, 8], [6, 10]]) s.paint(x!, y!, bloom, 4) }
}
function crystal(s: Sprite, base: string, tallShape = false): void {
  const bottom = tallShape ? 29 : 14, peak = tallShape ? 3 : 2
  const id = stone(s, base, [[2, bottom], [5, peak + 7], [8, peak], [11, peak + 8], [14, bottom]],
    [[5, bottom - 3], [7, peak + 6], [8, peak + 3], [10, peak + 8], [11, bottom - 3]])
  stroke(s, 7, peak + 4, 6, bottom - 6, id, 5)
}
function skull(s: Sprite, x: number, y: number, size = 4): void {
  const bone = add(s, '#d2c6a2')
  shadeDome(s, Mask.ellipse(x, y, size, size * 0.82, 0, s.w, s.h), bone, { relief: 0.5, contact: false })
  for (const dx of [-2, 1]) { s.paint(x + dx, y, bone, 0); s.paint(x + dx + 1, y, bone, 1) }
  s.paint(x, y + 2, bone, 1)
  stroke(s, x - 2, y + 3, x + 2, y + 3, bone, 3)
}
function flame(s: Sprite, base: string): void {
  const color = add(s, base, { lift: 0.5, drop: 0.25 })
  shadeDome(s, Mask.polygon([[4, 14], [2, 10], [6, 7], [7, 2], [11, 6], [10, 9], [14, 9], [12, 14]], 16, 16),
    color, { bias: 0.1, relief: 0.7, contact: false })
  stroke(s, 7, 12, 8, 7, color, 5)
}
function pillar(s: Sprite, base: string, broken = false): void {
  const id = add(s, base)
  box(s, 3, 26, 13, 29, 27, id); box(s, 5, 8, 11, 26, 9, id)
  for (const x of [6, 9]) stroke(s, x, 11, x, 24, id, x === 6 ? 4 : 2)
  if (broken) { stroke(s, 5, 7, 8, 10, id, 2); stroke(s, 8, 10, 11, 6, id, 4); stroke(s, 8, 18, 10, 21, id, 1) }
  else box(s, 3, 5, 13, 9, 6, id)
}
const REST = [
  prop('dead-tree', 32, (s) => bareTree(s, '#6b6954', true)),
  prop('reeds', 16, (s) => {
    const leaf = add(s, '#879754'), seed = add(s, '#9d7950')
    for (const [x, y] of [[3, 6], [6, 3], [9, 5], [12, 2]] as const) {
      stroke(s, x, 14, x, y, leaf, 4); stroke(s, x, 12, x + 2, 8, leaf, 3)
      box(s, x, y, x + 1, y + 3, y, seed, true)
    }
  }),
  prop('log', 16, (s) => WILDS_PROPS.find((p) => p.id === 'log')!.paint(s)),
  prop('jungle-tree', 32, (s) => leafyTree(s, '#3e994d')),
  prop('fern', 16, (s) => {
    const leaf = add(s, '#56a66c')
    for (const [dx, top] of [[-6, 8], [-4, 4], [-1, 2], [3, 4], [6, 7]] as const) {
      stroke(s, 8, 14, 8 + dx, top, leaf, dx < 0 ? 4 : 3)
      for (let y = top + 2; y < 13; y += 3) { const x = Math.round(8 + dx * (14 - y) / (14 - top)); stroke(s, x - 2, y - 1, x + 2, y + 1, leaf, 3) }
    }
  }),
  prop('vine-rock', 16, (s) => {
    const id = stone(s, '#849a80', [[2, 14], [2, 9], [5, 5], [10, 4], [14, 9], [13, 14]], [[4, 11], [5, 8], [9, 6], [12, 10], [10, 12]])
    stroke(s, 5, 7, 10, 13, id, 2)
    const vine = add(s, '#67ac51'); stroke(s, 11, 5, 7, 10, vine, 4); stroke(s, 7, 10, 8, 14, vine, 3)
  }),
  prop('cactus', 32, (s) => {
    const id = add(s, '#729b50')
    box(s, 6, 5, 9, 29, 7, id, true); box(s, 2, 12, 5, 20, 13, id, true); box(s, 10, 9, 13, 17, 10, id, true)
    stroke(s, 4, 20, 7, 20, id, 3); stroke(s, 9, 17, 12, 17, id, 3)
    for (const [x, y] of [[7, 8], [7, 14], [7, 23], [3, 16], [11, 12]]) s.paint(x!, y!, id, 5)
    const bloom = add(s, '#db7899'); s.paint(7, 4, bloom, 4); s.paint(8, 4, bloom, 5)
  }),
  prop('bones', 16, (s) => {
    const id = add(s, '#d9c896'); stroke(s, 3, 13, 13, 7, id, 4); stroke(s, 4, 13, 14, 7, id, 2)
    for (const [x, y] of [[3, 13], [13, 7]]) dome(s, Mask.circle(x!, y!, 1.8, 16, 16), '#d9c896')
    skull(s, 6, 8, 3)
  }),
  prop('sandstone', 16, (s) => { stone(s, '#cfaa67', [[2, 14], [3, 7], [6, 4], [12, 5], [14, 14]], [[4, 11], [5, 7], [11, 7], [12, 11]]); const id = add(s, '#9f7951'); stroke(s, 4, 10, 12, 11, id, 3) }),
  prop('mesa', 32, (s) => {
    const id = add(s, '#b9714c')
    dome(s, Mask.polygon([[1, 29], [3, 21], [5, 8], [11, 8], [13, 21], [15, 29]], 16, 32), '#b9714c')
    box(s, 4, 6, 12, 10, 7, id, true)
    for (const y of [15, 20, 25]) stroke(s, 4 - Math.floor((y - 15) / 5), y, 11 + Math.floor((y - 15) / 5), y, id, 2)
  }),
  prop('dry-bush', 16, (s) => shrub(s, '#ae985b')),
  prop('boulder', 16, (s) => WILDS_PROPS.find((p) => p.id === 'boulder')!.paint(s)),
  prop('geyser', 32, (s) => {
    const steam = add(s, '#e8e3d8'), water = add(s, '#65bac2')
    shadeDome(s, circles(s, [[5, 5, 3], [10, 4, 3.5], [8, 9, 3.2]]), steam, { bias: 0.1, relief: 0.4, contact: false })
    for (const x of [6, 8, 10]) stroke(s, x, 12, x - 1, 26, water, x === 6 ? 5 : 3)
    dome(s, Mask.ellipse(8, 28, 6, 2, 0, 16, 32), '#cdb994')
    dome(s, Mask.ellipse(8, 27, 4, 1.5, 0, 16, 32), '#65bac2')
  }),
  prop('mineral-mound', 16, (s) => {
    const id = add(s, '#d6bb8c'); dome(s, Mask.ellipse(8, 11, 6, 3, 0, 16, 16), '#d6bb8c')
    dome(s, Mask.ellipse(7, 8, 4, 2, 0, 16, 16), '#dfa366')
    stroke(s, 4, 12, 12, 12, id, 4); s.paint(6, 14, id, 2)
  }),
  prop('steam-vent', 16, (s) => {
    dome(s, circles(s, [[6, 3, 2], [10, 5, 2.5]]), '#dfded3')
    dome(s, Mask.ellipse(8, 12, 6, 2.5, 0, 16, 16), '#c3b193')
    const id = add(s, '#6b8887'); stroke(s, 6, 11, 10, 11, id, 2)
  }),
  prop('snowy-pine', 32, (s) => {
    const leaf = add(s, '#537765'), wood = add(s, '#847762'), snow = add(s, '#eaf3f5')
    box(s, 7, 20, 8, 29, 20, wood)
    for (const [a, b, w] of [[3, 14, 4], [9, 21, 6], [16, 27, 7]] as const) {
      shadeDome(s, Mask.polygon([[8, a], [8 + w, b], [8 - w, b]], 16, 32), leaf, { relief: 0.5, contact: false })
      stroke(s, 8, a, 8 - Math.floor(w * 0.6), a + 5, snow, 5); stroke(s, 8, a + 1, 8 + 2, a + 4, snow, 4)
    }
  }),
  prop('ice-rock', 16, (s) => { stone(s, '#a4c9d9', [[2, 14], [2, 9], [7, 4], [12, 7], [14, 14]], [[4, 11], [7, 7], [11, 9], [10, 12]]); const id = add(s, '#eff6f6'); stroke(s, 5, 6, 10, 7, id, 5) }),
  prop('frozen-shrub', 16, (s) => shrub(s, '#78979b', '#eaf4f5')),
  prop('crag', 32, (s) => { const id = stone(s, '#78848c', [[1, 29], [4, 20], [6, 5], [9, 3], [12, 16], [15, 29]], [[4, 26], [7, 12], [9, 7], [11, 19], [12, 26]]); stroke(s, 9, 7, 8, 21, id, 1) }),
  prop('scree', 16, (s) => {
    for (const [x, y, size] of [[4, 12, 3], [10, 10, 3.5], [12, 14, 1.5], [7, 14, 2]] as const)
      dome(s, Mask.ellipse(x, y, size, size * 0.55, -15, 16, 16), '#89939b')
  }),
  prop('stormstone', 16, (s) => { stone(s, '#6c7b98', [[2, 14], [4, 5], [10, 3], [14, 14]], [[5, 11], [6, 7], [9, 6], [11, 12]]); const id = add(s, '#dfd594'); stroke(s, 8, 5, 6, 9, id, 5); stroke(s, 6, 9, 10, 9, id, 4); stroke(s, 10, 9, 8, 13, id, 5) }),
  prop('standing-stone', 32, (s) => {
    const id = stone(s, '#a49daa', [[4, 29], [3, 11], [6, 5], [11, 7], [13, 29]], [[6, 26], [5, 13], [7, 9], [10, 11], [11, 26]])
    stroke(s, 7, 14, 10, 17, id, 1); stroke(s, 10, 17, 7, 20, id, 1); s.paint(9, 24, id, 4)
  }),
  prop('heather', 16, (s) => shrub(s, '#85846c', '#bd89b0')),
  prop('cairn', 16, (s) => { for (const [y, w] of [[13, 6], [10, 4.5], [7, 3], [4, 1.8]] as const) dome(s, Mask.ellipse(8, y, w, 1.8, 0, 16, 16), '#aba69d') }),
  prop('golden-tree', 32, (s) => leafyTree(s, '#c9b660', true)),
  prop('sky-crystal', 16, (s) => { crystal(s, '#9dd9db'); const id = add(s, '#fff4c2'); s.paint(4, 12, id, 5); s.paint(11, 5, id, 5) }),
  prop('cloud-tuft', 16, (s) => dome(s, circles(s, [[5, 11, 4], [9, 9, 4.5], [12, 12, 3]]), '#e7e2d4', 0.4)),
  prop('bone-pillar', 32, (s) => {
    const id = add(s, '#c8bfa6')
    box(s, 5, 10, 10, 29, 12, id); for (const y of [15, 20, 25]) { stroke(s, 3, y, 12, y, id, 3); s.paint(3, y - 1, id, 4) }
    skull(s, 8, 7, 5)
  }),
  prop('soul-flame', 16, (s) => flame(s, '#71bfc5')),
  prop('skull-rock', 16, (s) => { dome(s, Mask.ellipse(8, 12, 6, 2.5, 0, 16, 16), '#746779'); skull(s, 8, 8, 5) }),
  prop('bare-tree', 32, (s) => bareTree(s, '#85808b')),
  prop('gravestone', 16, (s) => {
    const id = add(s, '#a1a1ad')
    dome(s, Mask.polygon([[3, 14], [3, 6], [5, 3], [10, 3], [12, 6], [12, 14]], 16, 16), '#a1a1ad')
    stroke(s, 7, 6, 7, 11, id, 1); stroke(s, 5, 8, 9, 8, id, 1)
  }),
  prop('wisp', 16, (s) => { flame(s, '#bad7d3'); const id = add(s, '#fff3cb'); s.paint(6, 8, id, 5); s.paint(9, 8, id, 5) }),
  prop('crystal-spire', 32, (s) => crystal(s, '#59c9d9', true)),
  prop('crystal-cluster', 16, (s) => {
    const id = add(s, '#72cad6')
    for (const [x, y, w] of [[4, 7, 2], [8, 2, 3], [12, 6, 2]] as const)
      shadeDome(s, Mask.polygon([[x - w, 14], [x - w + 1, y + 3], [x, y], [x + w - 1, y + 3], [x + w, 14]], 16, 16), id, { relief: 0.6, contact: false })
    s.paint(7, 5, id, 5)
  }),
  prop('glow-cap', 16, (s) => {
    const id = add(s, '#739a92'), cap = add(s, '#8ed8c3')
    box(s, 6, 8, 8, 14, 9, id)
    shadeDome(s, Mask.ellipse(7, 7, 5, 3, 0, 16, 16), cap, { bias: 0.12, relief: 0.5, contact: false }); s.paint(5, 5, cap, 5)
  }),
  prop('broken-column', 32, (s) => pillar(s, '#c0b5a0', true)),
  prop('rubble', 16, (s) => {
    const id = add(s, '#b2a895')
    for (const [x, y, w] of [[2, 10, 4], [9, 9, 4], [5, 5, 5]] as const) box(s, x, y, x + w, y + 4, y + 1, id, true)
    const leaf = add(s, '#7f935e'); stroke(s, 4, 14, 6, 11, leaf, 4)
  }),
  prop('statue-head', 16, (s) => {
    const id = add(s, '#bbb4a8')
    dome(s, Mask.ellipse(8, 9, 5, 5.5, 0, 16, 16), '#bbb4a8')
    stroke(s, 4, 8, 6, 8, id, 1); stroke(s, 10, 8, 12, 8, id, 1); stroke(s, 8, 8, 8, 11, id, 4)
    stroke(s, 6, 13, 9, 13, id, 2); stroke(s, 11, 5, 10, 7, id, 1)
  }),
  prop('rift-shard', 32, (s) => {
    crystal(s, '#8b79c1', true)
    const id = add(s, '#ead5db'); stroke(s, 8, 10, 6, 17, id, 5); stroke(s, 6, 17, 9, 17, id, 4); stroke(s, 9, 17, 7, 24, id, 5)
  }),
  prop('star-mote', 16, (s) => {
    const id = add(s, '#d4bddc')
    shadeDome(s, Mask.polygon([[8, 2], [10, 7], [14, 9], [10, 11], [8, 14], [6, 11], [2, 9], [6, 7]], 16, 16), id, { bias: 0.1, relief: 0.7, contact: false })
    s.paint(7, 7, id, 5)
  }),
  prop('floating-rock', 16, (s) => {
    stone(s, '#877aab', [[3, 8], [5, 3], [10, 3], [13, 8], [10, 11], [6, 11]], [[5, 7], [6, 5], [10, 5], [11, 8], [7, 9]])
    const id = add(s, '#b0a6cb'); stroke(s, 5, 14, 10, 14, id, 3)
  }),
]
export const REST_PROPS: Readonly<Record<string, WorldProp>> = Object.fromEntries(REST.map((p) => [p.id, p]))
