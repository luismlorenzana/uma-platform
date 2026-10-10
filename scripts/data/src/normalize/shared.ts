// Helpers shared by the GameTora normalizers (ported from uma-racer, plus server and text helpers).

import type { LocalText, Server, ServerDates, ServerFlags, ServerTimes } from '@luismlorenzana/uma-data'

export interface NormalizeResult<T> {
  items: T[]
  warnings: string[]
}

export type RawRecord = Record<string, unknown>

export function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** GameTora uses both arrays and id-keyed objects across its datasets. */
export function records(value: unknown): RawRecord[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) return Object.values(value).filter(isRecord)
  return []
}

/**
 * The first of `keys` the row has. GameTora renames fields now and then (`jp_name` became `name_ja` in 2026), so
 * normalizers name the current key first and the older ones after it.
 */
export function pick(raw: RawRecord | null | undefined, ...keys: string[]): unknown {
  if (!raw) return undefined
  for (const key of keys) if (raw[key] !== undefined && raw[key] !== null) return raw[key]
  return undefined
}

/** A trimmed non-empty string, or null. */
export function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function integer(value: unknown): number | null {
  return Number.isSafeInteger(value) ? (value as number) : null
}

/** A positive integer id, also from a numeric string (a few GameTora lists mix the two). */
export function id(value: unknown): number | null {
  if (Number.isSafeInteger(value) && (value as number) > 0) return value as number
  if (typeof value === 'string' && /^[1-9]\d{0,15}$/.test(value)) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

/** Ids in source order, dropping anything that isn't one and repeats of an id already listed. */
export function ids(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(id).filter((entry): entry is number => entry !== null))]
}

/** Like `ids`, but null when the source has no list at all (used for Global overrides). */
export function optionalIds(value: unknown): number[] | null {
  return Array.isArray(value) ? ids(value) : null
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** A real `YYYY-MM-DD` date, or null. */
export function date(value: unknown): string | null {
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value.trim()) : null
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? match[0]
    : null
}

/** Unix seconds to a UTC ISO timestamp, or null. */
export function timestamp(value: unknown): string | null {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) return null
  return new Date((value as number) * 1000).toISOString()
}

/** GameTora's suffixes for the non-Japanese servers. */
const SERVER_SUFFIXES = { global: 'en', kr: 'ko', tw: 'zh_tw' } as const

/** Release dates from `<prefix>`, `<prefix>_en`, `<prefix>_ko` and `<prefix>_zh_tw`; null when Japan's is invalid. */
export function serverDates(raw: RawRecord, prefix: string): ServerDates | null {
  const jp = date(raw[prefix])
  if (!jp) return null
  return {
    jp,
    global: date(raw[`${prefix}_${SERVER_SUFFIXES.global}`]),
    kr: date(raw[`${prefix}_${SERVER_SUFFIXES.kr}`]),
    tw: date(raw[`${prefix}_${SERVER_SUFFIXES.tw}`]),
  }
}

/** Start times from `<prefix>_ja`, `<prefix>_en`, `<prefix>_ko` and `<prefix>_zh_tw` (Unix seconds). */
export function serverTimes(raw: RawRecord, prefix: string): ServerTimes | null {
  const jp = timestamp(raw[`${prefix}_ja`])
  if (!jp) return null
  return {
    jp,
    global: timestamp(raw[`${prefix}_${SERVER_SUFFIXES.global}`]),
    kr: timestamp(raw[`${prefix}_${SERVER_SUFFIXES.kr}`]),
    tw: timestamp(raw[`${prefix}_${SERVER_SUFFIXES.tw}`]),
  }
}

/** Flags from `<prefix>`, `<prefix>_en`, `<prefix>_ko` and `<prefix>_zh_tw`. */
export function serverFlags(raw: RawRecord, prefix: string): ServerFlags {
  const flag = (value: unknown) => (typeof value === 'boolean' ? value : null)
  return {
    jp: flag(raw[prefix]),
    global: flag(raw[`${prefix}_${SERVER_SUFFIXES.global}`]),
    kr: flag(raw[`${prefix}_${SERVER_SUFFIXES.kr}`]),
    tw: flag(raw[`${prefix}_${SERVER_SUFFIXES.tw}`]),
  }
}

const SERVERS_BY_CODE: Record<string, Server> = { ja: 'jp', jp: 'jp', en: 'global', ko: 'kr', zh_tw: 'tw' }

/** GameTora's server codes (`en`, `ko`, `zh_tw`) as master servers; unknown codes are reported through `unknown`. */
export function servers(value: unknown, unknown?: (code: string) => void): Server[] {
  if (!Array.isArray(value)) return []
  const result: Server[] = []
  for (const code of value) {
    const server = typeof code === 'string' ? SERVERS_BY_CODE[code] : undefined
    if (server) {
      if (!result.includes(server)) result.push(server)
    } else unknown?.(String(code))
  }
  return result
}

/** A LocalText, or null when the Japanese text is missing. */
export function localText(ja: unknown, en: unknown, global: unknown = null): LocalText | null {
  const japanese = text(ja)
  if (!japanese) return null
  return { ja: japanese, en: text(en), global: text(global) }
}

/** Collects warnings that repeat per record into one aggregate line each. */
export class WarningTally {
  private readonly counts = new Map<string, { count: number; examples: string[] }>()

  add(kind: string, example: string): void {
    const entry = this.counts.get(kind) ?? { count: 0, examples: [] }
    entry.count += 1
    if (entry.examples.length < 5) entry.examples.push(example)
    this.counts.set(kind, entry)
  }

  lines(): string[] {
    return [...this.counts].map(([kind, { count, examples }]) =>
      `${kind}: ${count}${count > examples.length ? ` (e.g. ${examples.join(', ')})` : ` (${examples.join(', ')})`}`,
    )
  }
}
