// The Exchange's numbers as pure helpers (uma-platform SD2): a purchase's total, how many a balance affords, and how
// much is still missing.

/** The price of `qty` at `each`. */
export const exchangeTotal = (each: number, qty: number): number => each * qty

/** How many `each` a `balance` buys, up to `max` (99 by default). */
export function affordable(balance: number, each: number, max = 99): number {
  if (each <= 0) return max
  return Math.max(0, Math.min(max, Math.floor(balance / each)))
}

/** How much more the balance needs for `total`, or 0 when it's enough. */
export const shortBy = (balance: number, total: number): number => Math.max(0, total - balance)

/** A quantity typed by hand: a whole number from 1 to `max`, else null. */
export function typedQuantity(text: string, max = 99): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const n = Number(text.trim())
  return n >= 1 && n <= max ? n : null
}
