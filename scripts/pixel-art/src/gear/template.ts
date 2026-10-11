// Symmetric front-view pieces drawn as ASCII: the left half (16 columns) is written out and mirrored, each letter a
// region. Regions become masks, shaded as domes so light still comes from the top left.
import { Mask } from '../shape.ts'

export interface Template {
  /** The region letter at a pixel ('.' when empty). */
  at(x: number, y: number): string
  /** The mask of one or more region letters. */
  mask(letters: string): Mask
}

/** `rows` are the left halves (16 characters) of rows `top`, `top + 1`, …; column x mirrors to 31 − x. */
export function mirrored(top: number, rows: readonly string[]): Template {
  const at = (x: number, y: number): string => {
    const row = rows[y - top]
    if (row === undefined || x < 0 || x > 31) return '.'
    return row[x < 16 ? x : 31 - x] ?? '.'
  }
  return {
    at,
    mask(letters) {
      return Mask.from((px, py) => letters.includes(at(Math.floor(px), Math.floor(py))))
    },
  }
}
