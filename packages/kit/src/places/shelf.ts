// The Warehouse's rules as pure helpers (uma-platform SD2): which grade chips to offer, what a shelf shows, and the sell
// sizes. Both games' shelves, words aside.

export interface ShelfItem {
  readonly id: string
  readonly name: string
  readonly shelf: string
  /** 1–10; null where grades don't apply (tickets). */
  readonly grade: number | null
  /** How many are held (free to sell). */
  readonly count: number
  /** A family or line, for "highest only": its highest grade held. */
  readonly group?: string
}

export const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

/** The grade filter: every grade, one grade, or the highest held in each group. */
export type GradeFilter = number | 'all' | 'highest'

/** The grade chips worth offering on a shelf: the grades it holds, ascending. */
export function gradeChips(items: readonly ShelfItem[], shelf: string): number[] {
  const held = new Set<number>()
  for (const item of items) if (item.shelf === shelf && item.count > 0 && item.grade !== null) held.add(item.grade)
  return GRADES.filter((g) => held.has(g))
}

/** What a shelf shows under a grade filter: held items only, in the given order. */
export function shelfItems<I extends ShelfItem>(items: readonly I[], shelf: string, grade: GradeFilter = 'all'): I[] {
  const held = items.filter((item) => item.shelf === shelf && item.count > 0)
  if (grade === 'all') return held
  if (grade !== 'highest') return held.filter((item) => item.grade === grade)
  const top = new Map<string, number>()
  for (const item of held) {
    const key = item.group ?? item.id
    if (item.grade !== null) top.set(key, Math.max(top.get(key) ?? 0, item.grade))
  }
  return held.filter((item) => item.grade === null || item.grade === top.get(item.group ?? item.id))
}

/** Every held item's count on a shelf. */
export const shelfTotal = (items: readonly ShelfItem[], shelf: string): number =>
  items.reduce((sum, item) => sum + (item.shelf === shelf ? item.count : 0), 0)

export interface SellOption {
  /** `1`, `10` or `all`. */
  readonly size: 1 | 10 | 'all'
  readonly qty: number
  readonly total: number
}

/** Sell ×1, ×10 or All of `have` at `unitPrice`: sizes above what's held are left out, and All never repeats ×1 or ×10. */
export function sellOptions(have: number, unitPrice: number): SellOption[] {
  if (!Number.isInteger(have) || have < 1) return []
  const options: SellOption[] = []
  for (const size of [1, 10] as const) if (size <= have) options.push({ size, qty: size, total: size * unitPrice })
  if (have > 1 && have !== 10) options.push({ size: 'all', qty: have, total: have * unitPrice })
  return options
}
