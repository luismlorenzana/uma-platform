// Small shared details: set gems, glow runes, legendary halos.
import { hex } from '../color.ts'
import { halo } from '../items/refined/workbench-kit.ts'
import type { Sprite } from '../sprite.ts'
import { GEMS, use, type Material } from './materials.ts'

/** A cut gem of the grade ladder (1–10). */
export function gemOf(g: number): Material {
  return GEMS[g - 1] ?? (GEMS[0] as Material)
}

/** A small set stone, lit from the top left: 2×2, 3×3 (rounded) or 4×4 (rounded), top-left corner at (x, y). */
export function jewel(s: Sprite, x: number, y: number, size: 2 | 3 | 4, m: Material | number): void {
  const id = typeof m === 'number' ? m : use(s, m)
  const shapes: Record<number, string[]> = {
    2: ['53', '32'],
    3: ['.4.', '453', '.32'],
    4: ['.44.', '4543', '4332', '.32.'],
  }
  for (const [dy, row] of (shapes[size] ?? []).entries())
    for (const [dx, c] of [...row].entries()) if (c !== '.') s.paint(x + dx, y + dy, id, Number(c))
}

/** The legendary finish: a soft colored halo around the whole piece. */
export function legendaryHalo(s: Sprite, color: string, alpha = 60): void {
  halo(s, color, alpha, 2)
}

/** Glow pixels: painted in a glowing ramp at full light, with a soft tint around them. */
export function glowPixels(s: Sprite, cells: readonly (readonly [number, number])[], color: string, tint = 60): void {
  const id = use(s, color, { lift: 0.6, drop: 0.2 })
  for (const [x, y] of cells) s.paint(x, y, id, 5)
  if (tint > 0)
    for (const [x, y] of cells)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy
        if (!cells.some(([cx, cy]) => cx === nx && cy === ny)) s.overlay(nx, ny, hex(color, tint))
      }
}
