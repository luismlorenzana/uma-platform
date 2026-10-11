// Learning props: a globe lamp, a clipped hedge, a stone bench, an academy banner and a flower bed.
import { rng } from '../../rng.ts'
import { Mask, shadeDome } from '../../shape.ts'
import type { Sprite } from '../../sprite.ts'
import { add, box } from './kit.ts'
import { foot, type Prop } from './types.ts'

function globeLamp(s: Sprite): void {
  const iron = add(s, '#3c4a5e', { hueShift: 8 })
  const brass = add(s, '#c9a24a', { hueShift: 10 })
  const glass = add(s, '#ffe9a8', { lift: 0.4, drop: 0.12 })
  box(s, 5, 26, 10, 29, 26, iron)
  for (let y = 11; y <= 25; y++) {
    s.paint(7, y, iron, 4)
    s.paint(8, y, iron, 2)
  }
  for (let x = 6; x <= 9; x++) {
    s.paint(x, 18, brass, x === 6 ? 5 : x === 9 ? 2 : 4)
    s.paint(x, 11, brass, x === 6 ? 4 : x === 9 ? 2 : 3)
  }
  shadeDome(s, Mask.circle(8, 7, 3.4, 16, 32), glass, { bias: 0.35, contact: false })
  for (let x = 6; x <= 9; x++) s.paint(x, 3, iron, x === 6 ? 4 : 3)
  s.paint(7, 2, brass, 5)
  s.paint(8, 2, brass, 3)
}

function hedge(s: Sprite): void {
  const leaf = add(s, '#3e8748', { hueShift: 10 })
  box(s, 1, 4, 14, 12, 7, leaf, true)
  const r = rng('learning:hedge')
  for (let y = 4; y <= 12; y++)
    for (let x = 1; x <= 14; x++) {
      if (!s.filled(x, y)) continue
      const k = r()
      if (k < 0.16) s.shift(x, y, -1)
      else if (k < 0.26 && y <= 8) s.shift(x, y, 1)
    }
  for (let x = 2; x <= 13; x++) s.paint(x, 8, leaf, 2)
}

function stoneBench(s: Sprite): void {
  const stone = add(s, '#d3c9ae', { hueShift: 6 })
  // A low back slab, the seat in front of it, two block legs.
  box(s, 2, 3, 13, 5, 3, stone)
  for (const x0 of [3, 11])
    for (let y = 10; y <= 12; y++) {
      s.paint(x0, y, stone, 3)
      s.paint(x0 + 1, y, stone, 2)
    }
  box(s, 1, 6, 14, 9, 7, stone)
  for (let x = 2; x <= 13; x++) s.paint(x, 6, stone, 2)
}

function banner(s: Sprite): void {
  const pole = add(s, '#5a4632', { hueShift: 8 })
  const gold = add(s, '#d6aa3e', { hueShift: 10 })
  const cloth = add(s, '#2f55a8', { hueShift: 10 })
  const stone = add(s, '#c9c0a8')
  for (let y = 3; y <= 27; y++) {
    s.paint(3, y, pole, 4)
    s.paint(4, y, pole, 2)
  }
  s.paint(3, 2, gold, 5)
  s.paint(4, 2, gold, 3)
  s.paint(3, 1, gold, 4)
  for (let x = 3; x <= 13; x++) s.paint(x, 4, gold, x === 13 ? 2 : 4)
  // The cloth hangs from the bar, folds shading it in columns, a swallowtail hem.
  for (let y = 5; y <= 21; y++)
    for (let x = 5; x <= 12; x++) {
      if (y >= 19 && x >= 8 && x <= 9 && y - 19 >= 0) continue
      if (y === 21 && (x === 7 || x === 10)) continue
      const fold = [4, 3, 3, 4, 3, 2, 2, 1][x - 5] ?? 3
      s.paint(x, y, cloth, fold)
    }
  for (let y = 5; y <= 20; y++) {
    s.paint(5, y, gold, 4)
    s.paint(12, y, gold, 2)
  }
  // The crest: a gold lozenge with a lit corner.
  for (const [x, y, t] of [[8, 9, 5], [9, 9, 4], [7, 10, 4], [8, 10, 4], [9, 10, 3], [10, 10, 3], [8, 11, 3], [9, 11, 2], [7, 13, 4], [8, 14, 3], [9, 14, 3], [10, 13, 2]] as const)
    s.paint(x, y, gold, t)
  box(s, 1, 27, 6, 29, 27, stone)
}

function flowerBed(s: Sprite): void {
  const stone = add(s, '#cfc6ad', { hueShift: 6 })
  const soil = add(s, '#6f4c34')
  const leaf = add(s, '#3e8a45')
  const blooms = [add(s, '#d9474f'), add(s, '#efc54a'), add(s, '#9a72d6')]
  box(s, 1, 5, 14, 13, 11, stone, true)
  for (let y = 6; y <= 10; y++) for (let x = 2; x <= 13; x++) s.paint(x, y, soil, y === 6 ? 2 : 3)
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 3 + row, y = 7 + row * 2
      const b = blooms[(i + row * 2) % blooms.length] ?? leaf
      s.paint(x, y + 1, leaf, 3)
      s.paint(x + 1, y + 1, leaf, 2)
      s.paint(x, y, b, 4)
      s.paint(x + 1, y, b, 3)
      s.paint(x, y - 1, b, 5)
    }
}

export const LEARNING_PROPS: readonly Prop[] = [
  { id: 'lamp', w: 16, h: 32, shadow: foot(8.5, 29.2, 4.5, 1.6), paint: globeLamp },
  { id: 'hedge', w: 16, h: 16, shadow: foot(8.5, 13, 7.5, 1.8), paint: hedge },
  { id: 'bench', w: 16, h: 16, shadow: foot(8.5, 12.8, 7, 1.6), paint: stoneBench },
  { id: 'banner', w: 16, h: 32, shadow: foot(5, 29.3, 4, 1.4), paint: banner },
  { id: 'flower-bed', w: 16, h: 16, shadow: foot(8.5, 13.6, 7.5, 1.4, 60), paint: flowerBed },
]
