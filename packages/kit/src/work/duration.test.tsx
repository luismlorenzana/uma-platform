// @vitest-environment jsdom
// The work screens' duration format (0.19.0, uma-farm's F18 request): every duration the kit prints goes through the
// game's `formatDuration` with where it is printed, `left`, `length` or `ago`. Without one, the text is `durationText`'s,
// so uma-rpg's and uma-racer's screens don't move (frames.test.tsx's snapshots hold that too).
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { domMax } from 'motion/react'
import { queue, start, type Refusal } from '@luismlorenzana/uma-work'
import { afterEach, describe, expect, it } from 'vitest'
import { MotionRoot } from '../ui/motion.js'
import { WorkProvider, useWork } from './context.js'
import { JobSheet } from './JobSheet.js'
import { QueueChips } from './QueueChips.js'
import { SizeChips } from './SizeChips.js'
import { SlotRow } from './SlotRow.js'
import { StoppedQueueCard } from './StoppedQueueCard.js'
import { AT, done, ENV, fresh, MINUTE, type TestRequest, type TestState } from './work.fixtures.js'
import type { DurationFormat } from './words.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const slot = { building: 'grove', slot: 0 }
/** Prints the use and the minutes, so each call site shows which use it asked for. */
const tagged: DurationFormat = (ms, use) => `[${use} ${ms / MINUTE}]`
const ACTIONS = { collect: () => {}, speedUp: () => {}, recall: () => {}, restart: () => {}, dismiss: () => {}, queue: () => {}, start: () => {} }
let root: Root | undefined
async function mount(node: ReactNode) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(<MemoryRouter><MotionRoot features={domMax}>{node}</MotionRoot></MemoryRouter>) })
}
/** Mounts `node` in a provider and returns the page's markup, sheets included. */
/** `null` leaves `formatDuration` out, for the default. */
async function html(node: ReactNode, state: TestState, now = AT, format: DurationFormat | null = tagged): Promise<string> {
  await mount(<WorkProvider state={state} now={now} env={ENV} names={{ uma: (id) => id === 'ada' ? 'Ada' : id }} actions={ACTIONS} formatDuration={format ?? undefined}>{node}</WorkProvider>)
  return document.body.innerHTML
}
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const running = () => done(start(fresh(), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))

describe('formatDuration', () => {
  it('words the time left on a running job, on the row and in its VoiceOver line', async () => {
    const shown = await html(<SlotRow slot={slot} />, running(), AT + 25 * MINUTE)
    expect(shown).toContain('aria-label="Ada. twig, 1 of 2 made, [left 15] left"')
    expect(shown).toContain('[left 15]</span>')
    expect(shown).not.toContain('15m')
  })

  it('words the speed-up sheet’s time left', async () => {
    await html(<SlotRow slot={slot} />, running(), AT + 25 * MINUTE)
    await act(async () => { document.querySelector<HTMLButtonElement>('[data-action="speed"]')!.click() })
    expect(document.body.textContent).toContain('[left 15] left')
  })

  it('words a refusal’s {time} as time left from now, never below zero', async () => {
    const refused = (time: number): Refusal => ({ refused: true, code: 'wait', message: 'Ready in {time}.', data: { time } })
    function Probe() {
      const { refusal } = useWork()
      return <p>{refusal(refused(AT + 90 * MINUTE))} {refusal(refused(AT - MINUTE))}</p>
    }
    expect(await html(<Probe />, fresh())).toContain('Ready in [left 90]. Ready in [left 0].')
  })

  it('words a job’s length: the size chips, their idle time, the queue line and the submit button', async () => {
    const recommend = () => ({ size: 2, label: 'Fits', idleMs: { 2: 30 * MINUTE } })
    const chips = await html(<SizeChips start={AT} itemSeconds={[600, 600, 600]} max={3} value={2} onChange={() => {}} rule={{ mode: 'duration', recommend }} />, fresh())
    expect(chips).toContain('>[length 10]</span>')
    expect(chips).toContain('aria-label="×2, [length 20], then free [length 30], Fits"')
    let state = done(start(fresh({ twig: 3 }), { outfitId: 'ada', slot, request: { kind: 'make', item: 'toy', count: 1 } }, AT, ENV))
    state = done(queue(state, { outfitId: 'ada', add: { building: 'grove', request: { kind: 'make', item: 'toy', count: 2 } } }, AT, ENV))
    expect(await html(<QueueChips outfitId="ada" />, state)).toContain('then toy ×2 · [length 20]')
    await html(<JobSheet query={{ job: 'toy', uma: 'ada', count: 2, queue: false, slot: 0, back: null }} building="grove" title="Make toys"
        rows={[{ id: 'ada', name: 'Ada', search: 'ada', facets: {}, sorts: {}, level: 1, workLevel: 7, releasedAt: '' }]}
        request={(item, count): TestRequest => ({ kind: 'make', item, count })} renderWhat={() => <p>Toy</p>} onClose={() => {}} />, fresh({ twig: 4 }))
    expect(document.querySelector('[data-action="job-submit"]')?.textContent).toBe('Start · ×2 · [length 20]')
  })

  it('words how long ago a queue stopped', async () => {
    const dropped: TestState = { ...fresh(), work: { ada: { outfitId: 'ada', entries: [], slot: null, last: null, queue: [], dropped: { at: AT, slot, requests: [{ kind: 'make', item: 'toy', count: 2 }], short: [{ item: 'twig', qty: 2 }], refused: null } } } }
    expect(await html(<StoppedQueueCard outfitId="ada" />, dropped, AT + 3 * MINUTE)).toContain('grove · stopped [ago 3] ago')
  })

  it('defaults to durationText for all three', async () => {
    expect(await html(<SlotRow slot={slot} />, running(), AT + 25 * MINUTE, null)).toContain('Ada. twig, 1 of 2 made, 15m left')
    const chips = await html(<SizeChips start={AT} itemSeconds={[600, 3000]} max={2} value={2} onChange={() => {}} rule={{ mode: 'duration' }} />, fresh(), AT, null)
    expect(chips).toContain('>1h</span>')
  })
})
