// Characters: identity and real-horse facts (docs/master-data.md#characters).

import { parseLocalText, parseServerFlags, type CharacterId, type LocalText, type ServerFlags } from '../common.js'
import {
  arrayOf,
  boolean,
  fail,
  fields,
  finite,
  id,
  isoDate,
  nonNegativeInteger,
  nullable,
  oneOf,
  positiveInteger,
  text,
  type Parser,
} from '../parse.js'

export interface RealHorse {
  /** Racing years as the source writes them, e.g. `1997-1999`; null where the source doesn't say. */
  activeYears: string | null
  /** Country code, lowercase, e.g. `jp`. */
  country: string
  /** Date of death, or null when alive or unknown. */
  death: string | null
  /** Career earnings in yen. */
  earnings: number
  /** Earnings in other currencies. */
  otherEarnings: { amount: number; currency: string }[]
  races: number
  wins: number
  /** Placings as `wins-seconds-thirds-other`, e.g. `10-4-2-1`. */
  record: string
  /** GameTora's `win_stats`: four counts it doesn't document, kept as given. */
  winStats: number[]
}

export interface Character {
  id: CharacterId
  /** `en` is the official English name. */
  name: LocalText
  /** The full Japanese name when the display name is a title (e.g. a chairwoman's real name). */
  fullNameJa: string | null
  /** Theme colours as `RRGGBB`. */
  colors: { main: string; sub: string } | null
  /** A character the original made up rather than one named after a real horse. */
  fictional: boolean
  /** For a fictional character modelled on a real horse: that horse's name. */
  realCounterpart: LocalText | null
  /** GameTora's `race`: `uma`, `human` or `unknown`; null where it's unset. */
  kind: string | null
  /** The real horse's sex from GameTora's `sex` (1 male, 2 female). Characters without a real horse still carry it. */
  realHorseSex: 'male' | 'female' | null
  birthday: { month: number; day: number; year: number | null }
  heightCm: number | null
  threeSizes: { bust: number; waist: number; hip: number } | null
  /** Whether the character can be trained, per server. */
  playable: ServerFlags
  /** Whether the character appears in the game at all, per server. */
  active: ServerFlags
  voiceActor: { ja: string | null; en: string | null }
  realHorse: RealHorse | null
}

const parseRealHorse: Parser<RealHorse> = (value, path) => {
  const f = fields(value, path)
  return {
    activeYears: f('activeYears', nullable(text)),
    country: f('country', text),
    death: f('death', nullable(isoDate)),
    earnings: f('earnings', nonNegativeInteger),
    otherEarnings: f(
      'otherEarnings',
      arrayOf((entry, at) => {
        const e = fields(entry, at)
        return { amount: e('amount', finite), currency: e('currency', text) }
      }),
    ),
    races: f('races', nonNegativeInteger),
    wins: f('wins', nonNegativeInteger),
    record: f('record', text),
    winStats: f('winStats', arrayOf(nonNegativeInteger)),
  }
}

const parseColor: Parser<string> = (value, path) =>
  typeof value === 'string' && /^[0-9A-F]{6}$/.test(value) ? value : fail(path, 'a colour as RRGGBB (uppercase)')

export const parseCharacter: Parser<Character> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', id),
    name: f('name', parseLocalText),
    fullNameJa: f('fullNameJa', nullable(text)),
    colors: f(
      'colors',
      nullable((colors, at) => {
        const c = fields(colors, at)
        return { main: c('main', parseColor), sub: c('sub', parseColor) }
      }),
    ),
    fictional: f('fictional', boolean),
    realCounterpart: f('realCounterpart', nullable(parseLocalText)),
    kind: f('kind', nullable(text)),
    realHorseSex: f('realHorseSex', nullable(oneOf(['male', 'female'] as const))),
    birthday: f('birthday', (birthday, at) => {
      const b = fields(birthday, at)
      return { month: b('month', positiveInteger), day: b('day', positiveInteger), year: b('year', nullable(positiveInteger)) }
    }),
    heightCm: f('heightCm', nullable(positiveInteger)),
    threeSizes: f(
      'threeSizes',
      nullable((sizes, at) => {
        const s = fields(sizes, at)
        return { bust: s('bust', positiveInteger), waist: s('waist', positiveInteger), hip: s('hip', positiveInteger) }
      }),
    ),
    playable: f('playable', parseServerFlags),
    active: f('active', parseServerFlags),
    voiceActor: f('voiceActor', (voice, at) => {
      const v = fields(voice, at)
      return { ja: v('ja', nullable(text)), en: v('en', nullable(text)) }
    }),
    realHorse: f('realHorse', nullable(parseRealHorse)),
  }
}
