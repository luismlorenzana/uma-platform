/** Splits a long list into stable virtual rows. Invalid column counts collapse safely to one. */
export function gridRows<T>(items: readonly T[], columns: number): T[][] {
  const width = Math.max(1, Math.floor(Number.isFinite(columns) ? columns : 1))
  const rows: T[][] = []
  for (let index = 0; index < items.length; index += width) rows.push(items.slice(index, index + width))
  return rows
}

/** Enabled rows first, while both partitions retain the caller's order. */
export function orderPickerRows<T>(
  rows: readonly T[],
  order: (left: T, right: T) => number,
  disabled: (row: T) => string | null,
): T[] {
  return [...rows].sort((left, right) => Number(disabled(left) !== null) - Number(disabled(right) !== null) || order(left, right))
}

/** A second tap removes; a new tap never exceeds the cap. */
export function togglePickerSelection(selected: readonly string[], id: string, max: number): string[] {
  if (selected.includes(id)) return selected.filter((entry) => entry !== id)
  const cap = Math.max(1, Math.floor(Number.isFinite(max) ? max : 1))
  return selected.length >= cap ? [...selected] : [...selected, id]
}
