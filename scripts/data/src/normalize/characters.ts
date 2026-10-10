// GameTora `characters` → master characters (docs/master-data.md#characters).

import type { Character, RealHorse } from '@luismlorenzana/uma-data'
import { date, id, integer, isRecord, localText, number, pick, records, serverFlags, text, type NormalizeResult, type RawRecord } from './shared'

function realHorse(value: unknown): RealHorse | null {
  if (!isRecord(value) || Object.keys(value).length === 0) return null
  const earnings = integer(value.earnings)
  const races = integer(value.races)
  const wins = integer(value.wins)
  const country = text(value.country)
  const record = text(value.record)
  if (earnings === null || races === null || wins === null || !country || !record) return null
  const otherEarnings = Array.isArray(value.earnings_other)
    ? value.earnings_other.flatMap((entry) => {
        if (!Array.isArray(entry)) return []
        const amount = number(entry[0])
        const currency = text(entry[1])
        return amount === null || !currency ? [] : [{ amount, currency }]
      })
    : []
  const winStats = Array.isArray(value.win_stats)
    ? value.win_stats.map(integer).filter((entry): entry is number => entry !== null && entry >= 0)
    : []
  return { activeYears: text(value.active), country, death: date(value.death), earnings, otherEarnings, races, wins, record, winStats }
}

function kind(raw: RawRecord): string | null {
  return text(raw.race)
}

const color = (value: unknown): string | null =>
  typeof value === 'string' && /^[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : null

export function normalizeCharacters(value: unknown): NormalizeResult<Character> {
  const warnings: string[] = []
  const items: Character[] = []
  const seen = new Set<number>()

  for (const raw of records(value)) {
    const characterId = id(raw.char_id)
    const name = localText(pick(raw, 'name_ja', 'jp_name'), pick(raw, 'name_en', 'en_name'))
    const month = integer(raw.birth_month)
    const day = integer(raw.birth_day)
    if (!characterId || !name || month === null || day === null || month < 1 || day < 1) {
      warnings.push(`Character ${characterId ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    if (seen.has(characterId)) {
      warnings.push(`Character ${characterId} repeats; the first row was kept`)
      continue
    }
    seen.add(characterId)
    const sizes = isRecord(raw.three_sizes) ? raw.three_sizes : null
    const bust = integer(sizes?.b)
    const waist = integer(sizes?.w)
    const hip = integer(sizes?.h)
    const height = integer(raw.height)
    const birthYear = integer(raw.birth_year)
    const main = color(raw.color_main)
    const sub = color(raw.color_sub)
    const counterpart = isRecord(raw.rl_counterpart) ? raw.rl_counterpart : null
    items.push({
      id: characterId,
      name,
      fullNameJa: text(pick(raw, 'name_ja_real', 'jp_name_real')),
      colors: main && sub ? { main, sub } : null,
      fictional: raw.fictional === true,
      realCounterpart: counterpart ? localText(pick(counterpart, 'name_ja', 'name_jp'), counterpart.name_en) : null,
      kind: kind(raw),
      realHorseSex: raw.sex === 1 ? 'male' : raw.sex === 2 ? 'female' : null,
      birthday: { month, day, year: birthYear !== null && birthYear > 0 ? birthYear : null },
      heightCm: height !== null && height > 0 ? height : null,
      threeSizes: bust && waist && hip ? { bust, waist, hip } : null,
      playable: serverFlags(raw, 'playable'),
      active: serverFlags(raw, 'active'),
      voiceActor: { ja: text(raw.va_ja), en: text(raw.va_en) },
      realHorse: realHorse(raw.rl),
    })
  }

  return { items, warnings }
}
