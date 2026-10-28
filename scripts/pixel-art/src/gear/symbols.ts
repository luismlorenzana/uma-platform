// Tiny embossed elements and etched weapons: shapes remain distinct even when two grade materials share a color.
import type { Sprite } from '../sprite.ts'
import { use, type Material } from './materials.ts'

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

/** Each Arm's own color (uma-rpg D234), beside its twin element's on the wheel as a Tome wears its element: the
 * Greatsword orange by Fire, the Lance green by Lightning, the Axe purple by Ice; Light and Dark's pale and deep pair
 * gives the Bow a pale jade and the Katana a deep rose. `glow` lights the legendary grades. */
export const ARM_COLORS: Readonly<Record<Arm, { color: string; glow: string }>> = {
  greatsword: { color: '#f0922e', glow: '#ffc76a' },
  axe: { color: '#8466e8', glow: '#c9b8ff' },
  lance: { color: '#46c05a', glow: '#b4ffb0' },
  bow: { color: '#6fd6c0', glow: '#d2fff4' },
  katana: { color: '#d9437f', glow: '#ff9cc4' },
}
export const ARM_IDS = Object.keys(ARM_COLORS) as readonly Arm[]
/** An Arm's color as a metal: the blade, head or limbs of its colored rows, whatever the grade. */
export const armTint = (arm: Arm): Material => ({ base: ARM_COLORS[arm].color, opts: { lift: 0.42, drop: 0.32, hueShift: 6 }, glow: ARM_COLORS[arm].glow })

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

/** Recessed dark silhouette, a fine bright bevel below it; `ink` a light emblem instead, on a colored sphere. */
export function armGlyph(s: Sprite, arm: Arm, ink = '#3f526b'): void {
  const id = use(s, ink, { lift: 0.45, drop: 0.28 })
  const rows = ARMS[arm]
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '#') return
    const px = 12 + x, py = 9 + y
    if (rows[y + 1]?.[x] !== '#') s.paint(px, py + 1, id, 5)
    s.paint(px, py, id, x <= 3 ? 2 : 3)
  }))
}
