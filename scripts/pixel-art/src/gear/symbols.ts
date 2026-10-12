// Tiny embossed elements and etched weapons: shapes remain distinct even when two grade materials share a color.
import type { Sprite } from '../sprite.ts'
import { use } from './materials.ts'

export const ELEMENTS = {
  fire: { color: '#ff8a5c', ink: '#ffcf4a', glyph: ['...#...', '..##...', '.####..', '#####..', '#####..', '.###...', '..#....'] },
  ice: { color: '#8fd3ff', ink: '#e5f7ff', glyph: ['#..#..#', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '#..#..#'] },
  lightning: { color: '#ffd84d', ink: '#fff5ce', glyph: ['...##..', '..##...', '.###...', '#####..', '...##..', '..##...', '..#....'] },
  light: { color: '#fff2b0', ink: '#ce912e', glyph: ['#..#..#', '.#...#.', '..###..', '#.###.#', '..###..', '.#...#.', '#..#..#'] },
  dark: { color: '#c79bff', ink: '#f0dcff', glyph: ['..###..', '.##....', '##.....', '##.....', '##.....', '.##...#', '..####.'] },
} as const

export type Element = keyof typeof ELEMENTS
export type Arm = 'greatsword' | 'axe' | 'lance' | 'bow' | 'katana'
export type Kind = Arm | Element

const ARMS: Record<Arm, readonly string[]> = {
  greatsword: ['...#...', '..###..', '..###..', '..###..', '..###..', '#######', '...#...', '...#...', '..###..'],
  axe: ['...#...', '.###...', '####...', '####...', '.###...', '...#...', '...#...', '...#...', '...#...'],
  lance: ['...#...', '..##...', '..##...', '.###...', '.###...', '.#####.', '...#...', '...#...', '...#...'],
  bow: ['..#....', '..###..', '..#.##.', '..#..#.', '..#..#.', '..#..#.', '..#.##.', '..###..', '..#....'],
  katana: ['....#..', '....#..', '...##..', '...#...', '..##...', '.##....', '#####..', '.#.....', '#......'],
}

/** A relief glyph, with its upper-left rim catching the light. Returns its bright cells for legendary glow. */
export function elementGlyph(s: Sprite, element: Element, x0: number, y0: number): [number, number][] {
  const spec = ELEMENTS[element]
  const id = use(s, spec.ink, { lift: 0.55, drop: 0.25 })
  const bright: [number, number][] = []
  spec.glyph.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return
    const lit = spec.glyph[y - 1]?.[x] !== '#' || row[x - 1] !== '#'
    // A gold sun on a pale Light cover/sphere needs a darker relief than the other white-hot emblems.
    s.paint(x0 + x, y0 + y, id, element === 'light' ? (lit ? 3 : 2) : lit ? 5 : x < 3 ? 4 : 2)
    if (lit) bright.push([x0 + x, y0 + y])
  }))
  return bright
}

/** Recessed dark silhouette, a fine bright bevel below it. */
export function armGlyph(s: Sprite, arm: Arm): void {
  const id = use(s, '#3f526b', { lift: 0.45, drop: 0.28 })
  const rows = ARMS[arm]
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return
    const px = 12 + x, py = 9 + y
    if (rows[y + 1]?.[x] !== '#') s.paint(px, py + 1, id, 5)
    s.paint(px, py, id, x <= 3 ? 2 : 3)
  }))
}
