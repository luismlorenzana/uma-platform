// The engine is pure and neutral: no clock but the given `now`, no dice, no I/O and no globals; it never writes into its
// inputs; the same state, input and `now` give the same result. Its sources name no game and import none, and its
// refusals are one table of plain words. Ported from uma-racer's `work/purity.test.ts`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ENV, farmAccount, HELPER, node, PLAIN, STUDENT, withNodes, withPrizeMoney, withStock, type FarmState } from '../test/fixtures/farm.js'
import { clock, codeOnly, deepFreeze } from '../test/fixtures/support.js'
import { isRefusal } from './refusal.js'
import { collect, finish, queue, recall, speedUp, start, upgrade } from './operations.js'
import { WORK_REFUSALS } from './refusals.js'
import { settle } from './settle.js'
import type { OpResult } from './types.js'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const SOURCES = readdirSync(HERE).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => join(HERE, f))

describe('purity', () => {
  it('reads no clock, rolls no dice and does no I/O', () => {
    expect(SOURCES.length).toBeGreaterThan(10)
    for (const file of SOURCES) {
      const code = codeOnly(readFileSync(file, 'utf8'))
      for (const banned of [/Date\.now/, /new Date\b/, /Math\.random/, /from 'node:/, /\brequire\(/, /\bfetch\(/, /localStorage/, /indexedDB/, /\bwindow\./, /\bdocument\./, /\bprocess\./, /\bconsole\./]) {
        expect(banned.test(code), `${file} uses ${banned}`).toBe(false)
      }
    }
  })

  it('names no game and imports nothing outside the package', () => {
    for (const file of SOURCES) {
      const source = readFileSync(file, 'utf8')
      expect(/\b(Farm|Kitchen|Pantry|Wilds|Forge|Lapidary)\b/.test(source), `${file} names a game's place`).toBe(false)
      for (const [, from] of source.matchAll(/from '([^']+)'/g)) expect(from!.startsWith('./'), `${file} imports ${from}`).toBe(true)
    }
  })

  it('never writes into deep-frozen inputs, and repeats itself exactly, after a JSON round trip too', () => {
    const run = (initial: FarmState) => {
      const receipts: unknown[] = []
      let state = deepFreeze(initial)
      const step = <R>(result: OpResult<R, FarmState>) => {
        if (isRefusal(result)) throw new Error(result.message)
        receipts.push(result.receipt)
        state = deepFreeze(result.state)
      }
      step(start(state, { outfitId: PLAIN.id, slot: { building: 'pantry', slot: 0 }, request: { kind: 'craft', item: 'chopped-carrot', count: 4 } }, clock('08:00'), ENV))
      step(queue(state, { outfitId: PLAIN.id, add: { request: { kind: 'craft', item: 'wheat-flour', count: 2 }, building: 'pantry' } }, clock('08:01'), ENV))
      step(start(state, { outfitId: STUDENT.id, slot: { building: 'observatory', slot: 0 }, request: { kind: 'session', unlocks: [node(1), node(2)] } }, clock('08:02'), ENV))
      step(start(state, { outfitId: HELPER.id, slot: { building: 'fields', slot: 0 }, request: { kind: 'gather', item: 'wheat', count: 3 } }, clock('08:03'), ENV))
      step(speedUp(state, { outfitId: PLAIN.id, startedAt: clock('08:00'), tickets: 1 }, clock('08:30'), ENV))
      step(upgrade(state, { building: 'fields' }, clock('11:31'), ENV))
      step(collect(state, { outfitId: PLAIN.id }, clock('12:00'), ENV))
      step(finish(state, { outfitId: HELPER.id, startedAt: clock('08:03') }, clock('12:01'), ENV))
      step(recall(state, { outfitId: STUDENT.id }, clock('12:02'), ENV))
      const settled = settle(state, clock('23:00'), ENV)
      step({ state: settled.state, receipt: settled.report })
      return { state, receipts }
    }
    const initial = withNodes(withPrizeMoney(withStock(farmAccount(), {
      carrot: 4, wheat: 2, 'dish-vegetables-1': 2, 'speed-ticket': 20, 'wheat-flour': 4,
    }), 2_000), STUDENT.id, 0)
    const first = run(initial)
    expect(run(initial)).toEqual(first)
    expect(run(JSON.parse(JSON.stringify(initial)) as FarmState)).toEqual(first)
    expect(first.receipts).toHaveLength(10)
    expect(first.state.buildings.fields).toEqual({ level: 2 })
  })
})

describe('refusals', () => {
  it('list every rule failure in one table', () => {
    expect(WORK_REFUSALS).toEqual({
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
    })
  })

  it('use plain words: no protocol names, no codes', () => {
    const banned = /\b(operation|receipt|revision|generation|version|stale|conflict|payload|id|ids|sync|error|[1-5]\d\d)\b/i
    for (const [code, message] of Object.entries(WORK_REFUSALS)) expect(banned.test(message), `${code}: ${message}`).toBe(false)
  })
})
