// Town props: an iron street lantern, a barrel, a crate, a potted geranium, a wooden bench and a plaza tree.
import { Mask } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, box, circles, foliage, stroke } from './kit.ts'
import { foot, type Prop } from './types.ts'

function streetLamp(s: Sprite): void {
  const iron = add(s, '#33373e', { hueShift: 8, lift: 0.3 })
  const glow = add(s, '#ffcf6e', { lift: 0.4, drop: 0.14 })
  box(s, 5, 27, 10, 29, 27, iron)
  for (let y = 12; y <= 26; y++) {
    s.paint(7, y, iron, 4)
    s.paint(8, y, iron, 2)
  }
  for (let x = 6; x <= 9; x++) s.paint(x, 23, iron, x === 6 ? 4 : 3)
  // The lantern: a cap, four panes of warm light in an iron frame, a tray.
  for (const [y, x0, x1] of [[2, 7, 8], [3, 6, 9], [4, 5, 10]] as const) for (let x: number = x0; x <= x1; x++) s.paint(x, y, iron, x === x0 ? 4 : x === x1 ? 2 : 3)
  for (let y = 5; y <= 10; y++)
    for (let x = 5; x <= 10; x++) {
      if (x === 5 || x === 10) s.paint(x, y, iron, x === 5 ? 3 : 2)
      else if (x === 8) s.paint(x, y, iron, 3)
      else s.paint(x, y, glow, y <= 6 ? 5 : x === 9 ? 3 : 4)
    }
  for (let x = 4; x <= 11; x++) s.paint(x, 11, iron, x === 4 ? 4 : x === 11 ? 1 : 2)
  s.paint(7, 1, iron, 4)
}

function barrel(s: Sprite): void {
  const wood = add(s, '#9a6236', { hueShift: 10 })
  const hoop = add(s, '#5a5d63', { hueShift: 6 })
  const body = Mask.from((px, py) => py >= 4 && py <= 14 && Math.abs(px - 8) <= 5 - 0.07 * (py - 9.5) ** 2, 16, 16)
  body.each((x, y) => {
    const u = (x + 0.5 - 8) / (5 - 0.07 * (y + 0.5 - 9.5) ** 2)
    const t = u < -0.55 ? 4 : u < 0.15 ? 3 : u < 0.6 ? 2 : 1
    const isHoop = y === 6 || y === 11
    s.paint(x, y, isHoop ? hoop : wood, isHoop ? Math.min(5, t + 1) : t)
    if (!isHoop && (x === 6 || x === 10) && t > 1) s.shift(x, y, -1)
  })
  Mask.ellipse(8, 4.6, 4.4, 1.6, 0, 16, 16).each((x, y) => s.paint(x, y, wood, y <= 4 ? 5 : 4))
  for (const x of [5, 6, 9, 10]) s.paint(x, 5, wood, 2)
}

function crate(s: Sprite): void {
  const wood = add(s, '#a8763f', { hueShift: 10 })
  const frame = add(s, '#7d5430', { hueShift: 10 })
  // Top: three boards with dark seams. Front: boards inside a frame, crossed by a brace.
  for (let y = 3; y <= 6; y++) for (let x = 2; x <= 13; x++) s.paint(x, y, wood, y === 3 ? 5 : 4)
  for (const x of [5, 9]) for (let y = 3; y <= 6; y++) s.paint(x, y, wood, 3)
  for (let y = 7; y <= 13; y++) for (let x = 2; x <= 13; x++) s.paint(x, y, wood, y === 10 ? 2 : 3)
  for (let y = 7; y <= 13; y++) {
    s.paint(2, y, frame, 4)
    s.paint(13, y, frame, 2)
  }
  for (let x = 2; x <= 13; x++) {
    s.paint(x, 7, frame, 4)
    s.paint(x, 13, frame, 2)
  }
  stroke(s, 3, 12, 12, 8, frame, 4)
  stroke(s, 4, 12, 12, 9, frame, 2)
}

function flowerPot(s: Sprite): void {
  const clay = add(s, '#c4663c', { hueShift: 10 })
  const leaf = add(s, '#3f8a3e', { hueShift: 10 })
  const bloom = add(s, '#e2475a')
  const clumps = [[8, 6.2, 4], [5, 7.5, 2.6], [11, 7.5, 2.6]] as const
  foliage(s, circles(s, clumps), leaf, clumps)
  for (const [x, y] of [[6, 4], [10, 5], [8, 7], [4, 7], [12, 8]] as const) {
    s.paint(x, y, bloom, 4)
    s.paint(x + 1, y, bloom, 3)
    s.paint(x, y + 1, bloom, 2)
    s.paint(x, y - 1, bloom, 5)
  }
  for (let x = 3; x <= 12; x++) s.paint(x, 9, clay, x === 3 ? 5 : x === 12 ? 2 : 4)
  for (let y = 10; y <= 13; y++) {
    const inset = y >= 12 ? 1 : 0
    for (let x = 4 + inset; x <= 11 - inset; x++) s.paint(x, y, clay, x <= 5 + inset ? 4 : x >= 10 - inset ? 2 : 3)
  }
}

function woodBench(s: Sprite): void {
  const wood = add(s, '#93603a', { hueShift: 10 })
  const iron = add(s, '#33363c', { lift: 0.3 })
  for (const y of [3, 5]) for (let x = 2; x <= 13; x++) s.paint(x, y, wood, x === 2 ? 5 : 4)
  for (const y of [4, 6]) for (let x = 2; x <= 13; x++) s.paint(x, y, wood, 2)
  for (let x = 2; x <= 13; x++) {
    s.paint(x, 8, wood, 5)
    s.paint(x, 9, wood, 4)
    s.paint(x, 10, wood, 2)
  }
  for (const x of [1, 14])
    for (let y = 3; y <= 12; y++) s.paint(x, y, iron, x === 1 ? 4 : 2)
  for (const x of [1, 14]) s.paint(x, 7, iron, 5)
}

function plazaTree(s: Sprite): void {
  const bark = add(s, '#6f4a30', { hueShift: 10 })
  const leaf = add(s, '#5a9a3a', { hueShift: 12 })
  const stone = add(s, '#a7a49c')
  const soil = add(s, '#5b4030')
  Mask.ellipse(8, 27.6, 5.6, 2.3, 0, 16, 32).each((x, y) => s.paint(x, y, stone, y <= 26 ? 4 : y >= 29 ? 2 : 3))
  Mask.ellipse(8, 27.3, 3.6, 1.2, 0, 16, 32).each((x, y) => s.paint(x, y, soil, 2))
  for (let y = 15; y <= 27; y++) {
    s.paint(7, y, bark, 4)
    s.paint(8, y, bark, 2)
  }
  const clumps = [[8, 9, 6.2], [5.2, 5.6, 3.2], [10.8, 5.6, 3.2], [4.4, 11.6, 3.2], [11.6, 11.6, 3.2], [8, 3.8, 2.8], [8, 14.2, 3]] as const
  foliage(s, circles(s, clumps), leaf, clumps, 0.1)
}

export const TOWN_PROPS: readonly Prop[] = [
  { id: 'lamp', w: 16, h: 32, shadow: foot(8.5, 29.2, 4.5, 1.6), paint: streetLamp },
  { id: 'barrel', w: 16, h: 16, shadow: foot(8.5, 14, 6, 1.6), paint: barrel },
  { id: 'crate', w: 16, h: 16, shadow: foot(8.5, 13.6, 7, 1.6), paint: crate },
  { id: 'flower-pot', w: 16, h: 16, shadow: foot(8.5, 13.6, 5, 1.5), paint: flowerPot },
  { id: 'bench', w: 16, h: 16, shadow: foot(8.5, 12.6, 7.5, 1.6), paint: woodBench },
  { id: 'tree', w: 16, h: 32, shadow: foot(8.5, 29.5, 6, 1.6), paint: plazaTree },
]
