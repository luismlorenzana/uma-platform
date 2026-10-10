// GameTora `character-cards` → master outfits, ported from uma-racer's umas.ts (docs/master-data.md#outfits).
// The racer-only parts (starter flag, growth as ratios, signature races, image URL) stay with uma-racer's adapter.

import { APTITUDE_GRADES, type AptitudeGrade, type Aptitudes, type Outfit, type Stats } from '@luismlorenzana/uma-data'
import { id, ids, integer, isRecord, localText, number, optionalIds, pick, records, serverDates, text, type NormalizeResult } from './shared'

function stats(value: unknown): Stats | null {
  if (!Array.isArray(value) || value.length < 5) return null
  const values = value.slice(0, 5).map(number)
  if (values.some((entry) => entry === null)) return null
  const [speed, stamina, power, guts, wit] = values as [number, number, number, number, number]
  return { speed, stamina, power, guts, wit }
}

function grade(value: unknown): AptitudeGrade | null {
  return typeof value === 'string' && (APTITUDE_GRADES as readonly string[]).includes(value) ? (value as AptitudeGrade) : null
}

/** GameTora's order: turf, dirt, sprint, mile, medium, long, front, pace, late, end. */
function aptitudes(value: unknown): Aptitudes | null {
  if (!Array.isArray(value) || value.length < 10) return null
  const values = value.slice(0, 10).map(grade)
  if (values.some((entry) => entry === null)) return null
  const [turf, dirt, sprint, mile, medium, long, front, pace, late, end] = values as AptitudeGrade[] as [
    AptitudeGrade, AptitudeGrade, AptitudeGrade, AptitudeGrade, AptitudeGrade,
    AptitudeGrade, AptitudeGrade, AptitudeGrade, AptitudeGrade, AptitudeGrade,
  ]
  return { surface: { turf, dirt }, distance: { sprint, mile, medium, long }, strategy: { front, pace, late, end } }
}

/** `base_stats` holds the stats at the starting rarity; the other star levels have their own fields. */
function starStats(row: Record<string, unknown>, rarity: number): Outfit['stats'] | null {
  const base = stats(row.base_stats)
  const named = {
    1: null as Stats | null,
    2: stats(row.two_star_stats),
    3: stats(row.three_star_stats),
    4: stats(row.four_star_stats),
    5: stats(row.five_star_stats),
  }
  const at = (star: 1 | 2 | 3 | 4 | 5): Stats | null => (star < rarity ? null : star === rarity ? base : named[star])
  const star4 = at(4)
  const star5 = at(5)
  if (!base || !star4 || !star5) return null
  return { star1: at(1), star2: at(2), star3: at(3), star4, star5 }
}

function evolutions(value: unknown): Outfit['skills']['evolutions'] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((entry) => {
    const from = id(entry.old)
    const to = id(entry.new)
    return from && to ? [{ from, to }] : []
  })
}

export function normalizeOutfits(value: unknown): NormalizeResult<Outfit> {
  const warnings: string[] = []
  const items: Outfit[] = []
  const seen = new Set<number>()

  for (const row of records(value)) {
    const outfitId = id(row.card_id)
    const characterId = id(row.char_id)
    const costumeId = id(row.costume)
    const talentGroupId = id(row.talent_group)
    const rarity = integer(row.rarity)
    const release = serverDates(row, 'release')
    const title = localText(pick(row, 'title_ja', 'title_jp'), row.title, row.title_en_gl)
    const growth = stats(row.stat_bonus)
    const aptitude = aptitudes(row.aptitude)
    const obtain = text(row.obtained)
    const starLevels = rarity !== null && rarity >= 1 && rarity <= 5 ? starStats(row, rarity) : null

    if (!outfitId || !characterId || !costumeId || !talentGroupId || !release || !title || !growth || !aptitude ||
      !obtain || !starLevels || rarity === null) {
      warnings.push(`Outfit ${outfitId ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    if (seen.has(outfitId)) {
      warnings.push(`Outfit ${outfitId} repeats; the first row was kept`)
      continue
    }
    seen.add(outfitId)

    items.push({
      id: outfitId,
      characterId,
      costumeId,
      talentGroupId,
      rarity,
      variant: text(row.version),
      obtain,
      premium: row.premium === true,
      previewId: id(row.preview_id),
      eventStatusIds: ids(row.event_statuses),
      title,
      release,
      stats: starLevels,
      growthRatePercents: growth,
      aptitudes: aptitude,
      skills: {
        unique: ids(row.skills_unique),
        innate: ids(row.skills_innate),
        awakening: ids(row.skills_awakening),
        globalAwakening: optionalIds(row.skills_awakening_en),
        event: ids(row.skills_event),
        evolutions: evolutions(row.skills_evo),
      },
    })
  }

  return { items, warnings }
}
