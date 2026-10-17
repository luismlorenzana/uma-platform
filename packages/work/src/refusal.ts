// The engine's refusal: a stable code, default plain words and the data a screen needs to ask again. A game maps codes
// to its own words ("Needs Lv {level}." becomes the game's own level name).

/** A refused operation. `message` has `{name}` placeholders filled from `data`. */
export interface Refusal {
  readonly refused: true
  readonly code: string
  readonly message: string
  readonly data?: Readonly<Record<string, string | number>>
}

export const refuse = (code: string, message: string, data?: Refusal['data']): Refusal =>
  data ? { refused: true, code, message, data } : { refused: true, code, message }

export const isRefusal = (value: unknown): value is Refusal =>
  typeof value === 'object' && value !== null && (value as { refused?: unknown }).refused === true
