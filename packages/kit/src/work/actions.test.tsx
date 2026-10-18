// @vitest-environment jsdom
// Real React events over synthetic work: confirmations, a shared in-flight lock and entry identity (SC2).
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { domMax } from 'motion/react'
import { finish, queue, start, type StartInput } from '@luismlorenzana/uma-work'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionRoot } from '../ui/motion.js'
import { WorkProvider, TapNoteLine, useTap, type WorkActions, type WorkAnswer } from './context.js'
import { SpeedUpControls } from './controls.js'
import { JobSheet } from './JobSheet.js'
import { SlotRow } from './SlotRow.js'
import { AT, done, ENV, fresh, MINUTE, type TestRequest, type TestState } from './work.fixtures.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
async function mount(node: ReactNode) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(<MemoryRouter><MotionRoot features={domMax}>{node}</MotionRoot></MemoryRouter>) })
}
async function click(selector: string) {
  const element = document.querySelector<HTMLButtonElement>(selector)
  expect(element, selector).not.toBeNull()
  await act(async () => { element!.click() })
}
const slot = { building: 'grove', slot: 0 }
const wrap = (node: ReactNode, state: TestState, actions: WorkActions, now = AT) => <WorkProvider state={state} now={now} env={ENV} actions={actions}>{node}</WorkProvider>
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('work actions', () => {
  it('holds a single in-flight action across two rows, including rapid taps', async () => {
    let release: (() => void) | undefined
    const promise = new Promise<void>((resolve) => { release = resolve })
    const collect = vi.fn(() => promise)
    let state = fresh()
    for (const [index, outfitId] of ['ada', 'bee'].entries()) state = done(start(state, {
      outfitId, slot: { building: 'grove', slot: index }, request: { kind: 'gather', item: 'twig', count: 1 },
    }, AT, ENV))
    await mount(wrap(<><SlotRow slot={slot} /><SlotRow slot={{ building: 'grove', slot: 1 }} /></>, state, { collect }, AT + 30 * MINUTE))
    await click('[data-slot="0"] [data-action="collect"]')
    expect(document.querySelector<HTMLButtonElement>('[data-slot="1"] [data-action="collect"]')!.disabled).toBe(true)
    await click('[data-slot="1"] [data-action="collect"]')
    expect(collect).toHaveBeenCalledTimes(1)
    await act(async () => { release!(); await promise })
    expect(document.querySelector<HTMLButtonElement>('[data-slot="1"] [data-action="collect"]')!.disabled).toBe(false)
  })

  it('closes the speed controls when Finish starts the next queued entry', async () => {
    let first = done(start(fresh({ ticket: 10 }), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))
    first = done(queue(first, { outfitId: 'ada', add: { building: 'grove', request: { kind: 'gather', item: 'twig', count: 1 } } }, AT, ENV))
    function Page() {
      const [state, setState] = useState(first)
      return wrap(<SlotRow slot={slot} />, state, {
        speedUp: () => {}, collect: () => {},
        finish: (input) => { setState((current) => done(finish(current, input, AT, ENV))) },
      })
    }
    await mount(<Page />)
    await click('[data-action="speed"]')
    expect(document.querySelector('[data-kit="speed-up"]')).not.toBeNull()
    await click('[data-action="finish"]')
    expect(document.querySelector('[data-kit="speed-up"]')).toBeNull()
    expect(document.querySelector('[data-action="collect"]')?.getAttribute('aria-label')).toBe('Collect 2 twig')
    expect(document.querySelector('[data-slot-card="running"]')?.getAttribute('aria-label')).toContain('0 of 1 made')
  })

  it('requires confirmation before wasting a ticket and preserves the entry start in the callback', async () => {
    const state = done(start(fresh({ ticket: 1 }), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 1 } }, AT, ENV))
    const speedUp = vi.fn()
    await mount(wrap(<SpeedUpControls outfitId="ada" />, state, { speedUp }, AT + 8 * MINUTE))
    await click('[data-action="finish"]')
    expect(speedUp).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('18 of the ticket')
    const yes = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Yes')!
    await act(async () => { yes.click() })
    expect(speedUp).toHaveBeenCalledExactlyOnceWith({ outfitId: 'ada', startedAt: AT, tickets: 1 })
  })

  it('keeps a question pending until its confirmation succeeds', async () => {
    const completed = vi.fn()
    const confirmed = vi.fn((): WorkAnswer => ({ kind: 'done' }))
    function Ask() {
      const tap = useTap()
      return <><button data-run type="button" onClick={() => void tap.run(() => ({ kind: 'ask', message: 'Use the new size?', confirm: confirmed }), completed)}>Run</button><TapNoteLine tap={tap} /></>
    }
    await mount(wrap(<Ask />, fresh(), {}))
    await click('[data-run]')
    expect(completed).not.toHaveBeenCalled()
    expect(confirmed).not.toHaveBeenCalled()
    const yes = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Yes')!
    await act(async () => { yes.click() })
    expect(confirmed).toHaveBeenCalledTimes(1)
    expect(completed).toHaveBeenCalledTimes(1)
  })

  it('confirms a ticket purchase with its quote and never silently treats a refusal as success', async () => {
    const state = done(start(fresh(), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))
    const quote = { price: 12, label: '12 tokens' }
    const buyAndFinish = vi.fn((): WorkAnswer => ({ refused: true, code: 'money', message: 'Need more tokens.' }))
    await mount(<WorkProvider state={state} now={AT} env={ENV} actions={{ buyAndFinish }} ticketOffer={() => quote}><SpeedUpControls outfitId="ada" /></WorkProvider>)
    await click('[data-action="finish"]')
    expect(buyAndFinish).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('12 tokens')
    const yes = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Yes')!
    await act(async () => { yes.click() })
    expect(buyAndFinish).toHaveBeenCalledExactlyOnceWith({ outfitId: 'ada', startedAt: AT, tickets: 2, quote })
    expect(document.body.textContent).toContain('Need more tokens.')
  })

  it('drops a standalone ticket confirmation when a different entry replaces it in the same millisecond', async () => {
    const state = done(start(fresh({ ticket: 1 }), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 1 } }, AT, ENV))
    const speedUp = vi.fn()
    await mount(wrap(<SpeedUpControls outfitId="ada" />, state, { speedUp }, AT + 8 * MINUTE))
    await click('[data-action="finish"]')
    expect(document.body.textContent).toContain('Finish now?')
    const next = { ...state, work: { ada: { ...state.work.ada!, entries: state.work.ada!.entries.map((entry) => ({ ...entry, seconds: [...entry.seconds] })) } } }
    await mount(wrap(<SpeedUpControls outfitId="ada" />, next, { speedUp }, AT + 8 * MINUTE))
    expect([...document.querySelectorAll('button')].some((button) => button.textContent === 'Yes')).toBe(false)
    expect(speedUp).not.toHaveBeenCalled()
  })

  it('keeps a chosen ×40 recipe batch across a clock update and submits that request', async () => {
    const startAction = vi.fn((_input: StartInput): WorkAnswer => ({ kind: 'say', message: 'Changed stock.' }))
    const onDone = vi.fn()
    const state = fresh({ twig: 40 })
    const sheet = <JobSheet query={{ job: 'toy', uma: 'ada', count: 1, queue: false, slot: 0, back: null }} building="grove" title="Make toys"
      rows={[{ id: 'ada', name: 'Ada', search: 'ada', facets: {}, sorts: {}, level: 1, workLevel: 7, releasedAt: '' }]}
      request={(item, count): TestRequest => ({ kind: 'refine', item, count })} sizeRule={{ mode: 'count', sizes: [1, 4, 8, 20, 40] }}
      renderWhat={() => <p>Toy recipe</p>} onClose={() => {}} onDone={onDone} />
    await mount(wrap(sheet, state, { start: startAction }))
    await click('[data-size="40"]')
    await mount(wrap(sheet, state, { start: startAction }, AT + MINUTE))
    expect(document.querySelector('[data-size="40"]')?.getAttribute('aria-checked')).toBe('true')
    await click('[data-action="job-submit"]')
    expect(startAction).toHaveBeenCalledWith({ outfitId: 'ada', slot, request: { kind: 'refine', item: 'toy', count: 40 } })
    expect(onDone).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Changed stock.')
  })
})
