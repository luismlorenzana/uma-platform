// GameTora `support-cards` → master support cards, ported from uma-racer (docs/master-data.md#support-cards).
// Every rarity is kept with its raw effect table. uma-racer's SSR filter, eras, effect profile, starter flag and
// obtain grouping are game interpretations and stay in its adapter (docs/racer-mapping.md).

import {
  SUPPORT_CARD_EFFECT_LEVELS,
  type SupportCard,
  type SupportCardEffect,
  type SupportCardHints,
  type SupportCardType,
  type SupportCardUniqueEffect,
} from '@luismlorenzana/uma-data'
import { id, ids, integer, isRecord, localText, number, optionalIds, pick, records, serverDates, text, type NormalizeResult } from './shared'

function cardType(value: unknown): SupportCardType | null {
  if (value === 'intelligence') return 'wit'
  if (value === 'speed' || value === 'stamina' || value === 'power' || value === 'guts') return value
  if (value === 'friend' || value === 'group') return value
  return null
}

/** Each row is `[type, value at each of SUPPORT_CARD_EFFECT_LEVELS…]`, with -1 for "no value at this level". */
function effects(value: unknown): { effects: SupportCardEffect[]; malformed: number } {
  if (!Array.isArray(value)) return { effects: [], malformed: 0 }
  const result: SupportCardEffect[] = []
  let malformed = 0
  for (const row of value) {
    const type = Array.isArray(row) ? integer(row[0]) : null
    if (!Array.isArray(row) || type === null || row.length !== SUPPORT_CARD_EFFECT_LEVELS.length + 1) {
      malformed += 1
      continue
    }
    const values = row.slice(1).map((entry) => {
      const parsed = number(entry)
      return parsed === null || parsed === -1 ? null : parsed
    })
    result.push({ type, values })
  }
  return { effects: result, malformed }
}

function uniqueEffect(value: unknown, description: unknown): SupportCardUniqueEffect | null {
  if (!isRecord(value)) return null
  const level = integer(value.level)
  if (level === null || level <= 0 || !Array.isArray(value.effects)) return null
  const parsed = value.effects.filter(isRecord).flatMap((entry) => {
    const type = integer(entry.type)
    const amount = number(entry.value)
    if (type === null || amount === null) return []
    // value_1…value_4 are extra parameters of conditional effects, given in order.
    const params: number[] = []
    for (let index = 1; index <= 4; index += 1) {
      const param = number(entry[`value_${index}`])
      if (param === null) break
      params.push(param)
    }
    return [{ type, value: amount, params }]
  })
  return { level, description: text(description), effects: parsed }
}

/** `hint_others` holds `{hint_type, hint_value}` rows, sometimes nested in an array or under a `{level, stats}` gate. */
function hints(value: unknown): SupportCardHints {
  if (!isRecord(value)) return { skillIds: [], others: [] }
  const others: SupportCardHints['others'] = []
  const visit = (entry: unknown, minLevel: number | null): void => {
    if (Array.isArray(entry)) {
      for (const nested of entry) visit(nested, minLevel)
      return
    }
    if (!isRecord(entry)) return
    if (Array.isArray(entry.stats)) {
      const level = integer(entry.level)
      visit(entry.stats, level !== null && level > 0 ? level : minLevel)
      return
    }
    const type = integer(entry.hint_type)
    const amount = number(entry.hint_value)
    if (type !== null && amount !== null) others.push({ type, value: amount, minLevel })
  }
  visit(value.hint_others, null)
  return { skillIds: ids(value.hint_skills), others }
}

export function normalizeSupportCards(value: unknown): NormalizeResult<SupportCard> {
  const warnings: string[] = []
  const items: SupportCard[] = []
  const seen = new Set<number>()
  let malformedEffects = 0

  for (const raw of records(value)) {
    const cardId = id(raw.support_id)
    const characterId = id(raw.char_id)
    const type = cardType(raw.type)
    const rarity = integer(raw.rarity)
    const release = serverDates(raw, 'release')
    const characterName = localText(pick(raw, 'name_ja', 'name_jp'), raw.char_name, raw.name_en_gl)
    const title = localText(pick(raw, 'title_ja', 'title_jp'), raw.title_en)
    const obtain = text(raw.obtained ?? raw.obtain)
    if (!cardId || !characterId || !type || rarity === null || rarity < 1 || !release || !characterName || !title || !obtain) {
      warnings.push(`Support card ${cardId ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    if (seen.has(cardId)) {
      warnings.push(`Support card ${cardId} repeats; the first row was kept`)
      continue
    }
    seen.add(cardId)
    const effectTable = effects(raw.effects)
    malformedEffects += effectTable.malformed
    items.push({
      id: cardId,
      characterId,
      characterName,
      title,
      type,
      rarity,
      obtain,
      release,
      effects: effectTable.effects,
      uniqueEffect: uniqueEffect(raw.unique, raw.unique_desc),
      hints: hints(raw.hints),
      eventSkillIds: ids(raw.event_skills),
      globalEventSkillIds: optionalIds(raw.event_skills_en),
    })
  }

  if (malformedEffects > 0) warnings.push(`${malformedEffects} malformed support-card effect row(s) were skipped`)
  return { items, warnings }
}
