// Every rule failure of the work engine, in plain words. `{uma}` is her outfit and `{item}` an item, which the screen
// turns into names; `{time}` is a timestamp it shows as how long until then. The data carries what the screen needs
// to ask again with new numbers ("Only 3 left now. Start ×3?"): `freeAt`, the shortfall and `largestCoverable`. One
// table, so a game can test every sentence it maps.
import { refuse, type Refusal } from './refusal.js'

export const WORK_REFUSALS = {
  'unknown-worker': "{uma} isn't unlocked.",
  'slot-taken': 'That slot is taken.',
  busy: '{uma} is busy for another {time}.',
  count: 'Make 1 to {max} at a time.',
  'not-here': "That isn't made here.",
  grade: 'Needs Lv {level}.',
  'top-level': 'Already at the top level.',
  short: 'Short {n} {item}.',
  'queue-full': 'Three are already queued.',
  'queue-place': 'A queue stays at one place.',
  finished: "It's already finished.",
  tickets: 'Needs {n} Speed Tickets.',
  money: 'Needs {n} to upgrade.',
} as const

export type WorkRefusalCode = keyof typeof WORK_REFUSALS

export const workRefusal = (code: WorkRefusalCode, data?: Refusal['data']): Refusal => refuse(code, WORK_REFUSALS[code], data)
