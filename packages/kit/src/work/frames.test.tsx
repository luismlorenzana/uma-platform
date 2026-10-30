import { start, queue } from '@luismlorenzana/uma-work'
import { type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { WorkArtProvider } from './art.js'
import { WorkProvider } from './context.js'
import { RecallPreviewLines, SpeedUpControls } from './controls.js'
import { FacilityHeader } from './FacilityHeader.js'
import { QueueChips } from './QueueChips.js'
import { SizeChips } from './SizeChips.js'
import { SlotRow, PeekRow } from './SlotRow.js'
import { StoppedQueueCard } from './StoppedQueueCard.js'
import { TargetsStrip } from './TargetsStrip.js'
import { AT, done, ENV, fresh, MINUTE, type TestState } from './work.fixtures.js'

const slot = { building: 'grove', slot: 0 }
const html = (node: ReactNode, state: TestState = fresh(), now = AT) => renderToStaticMarkup(<MemoryRouter>
  <WorkArtProvider art={{ Item: ({ id, size }) => <i data-item={id} data-size={size} /> }}>
    <WorkProvider state={state} now={now} env={ENV} names={{ uma: (id) => id === 'ada' ? 'Ada' : id }}
      actions={{ collect: () => {}, repeat: () => {}, speedUp: () => {}, recall: () => {}, upgrade: () => {}, restart: () => {}, dismiss: () => {}, queue: () => {} }} words={{ startJob: 'Begin work' }}>
      {node}
    </WorkProvider>
  </WorkArtProvider>
</MemoryRouter>)

describe('shared work frames', () => {
  it('draws compact rows from state, injected art and words with accessible actions', async () => {
    const free = html(<SlotRow slot={slot} startTo="/work?job=" />)
    expect(free).toContain('Begin work in slot 1')
    await expect(free).toMatchFileSnapshot('./testing/legacy-h118-slot-free.html')
    const state = done(start(fresh({ ticket: 2 }), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))
    const running = html(<SlotRow slot={slot} onQueue={() => {}} />, state, AT + 25 * MINUTE)
    await expect(running).toMatchFileSnapshot('./testing/legacy-h118-slot-running.html')
    for (const text of ['data-kit="slot-row"', 'data-slot-card="running"', 'data-item="twig"', 'Collect 1 twig', 'Speed up twig', 'Ada. twig, 1 of 2 made, 15m left']) expect(running).toContain(text)
    expect(running).not.toContain('data-action="repeat"')
    const ready = html(<PeekRow slot={slot} repeat />, state, AT + 40 * MINUTE)
    await expect(ready).toMatchFileSnapshot('./testing/legacy-h118-peek-ready.html')
    expect(ready).toContain('data-action="repeat"')
    expect(ready).toContain('data-slot-card="ready"')
  })
  it('renders queues, upgrade stats, recall and game-defined targets', () => {
    let state = done(start(fresh({ twig: 1 }), { outfitId: 'ada', slot, request: { kind: 'make', item: 'toy', count: 1 } }, AT, ENV))
    state = done(queue(state, { outfitId: 'ada', add: { building: 'grove', request: { kind: 'make', item: 'toy', count: 2 } } }, AT, ENV))
    const shown = html(<><QueueChips outfitId="ada" /><FacilityHeader building="grove" /><RecallPreviewLines outfitId="ada" />
      <TargetsStrip targets={[{ id: 'target', item: 'toy', short: 2, label: 'Two toys needed', to: '/work?job=toy' }]} /></>, state)
    for (const text of ['Short 2 twig', 'Remove toy ×2 from the queue', '1 of 2 slots in use', 'Two toys needed', 'comes back']) expect(shown).toContain(text)
    expect(shown).not.toContain('data-grade')
  })
  it('makes the worker face a named profile door only when the game opts in, in full and peek rows', () => {
    const state = done(start(fresh(), { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))
    for (const Row of [SlotRow, PeekRow]) {
      expect(html(<Row slot={slot} />, state)).not.toContain('aria-label="Profile: Ada"')
      const shown = html(<Row slot={slot} onFace={() => {}} />, state)
      expect(shown).toMatch(/<button[^>]*aria-label="Profile: Ada"[^>]*><span aria-hidden="true" data-ring=/)
      expect(shown).toContain('min-h-11 min-w-11')
    }
    expect(html(<SlotRow slot={slot} onFace={() => {}} />)).not.toContain('aria-label="Profile:')
  })
  it('marks each target tile with its grade when the game gives one', () => {
    const shown = html(<TargetsStrip targets={[
      { id: 'g2', item: 'toy', short: 3, grade: 2, label: 'Toy G2' }, { id: 'g5', item: 'toy', short: 1, grade: 5, label: 'Toy G5' },
    ]} />, fresh())
    expect(shown).toMatch(/data-grade="2"[^>]*>G2</)
    expect(shown).toMatch(/data-grade="5"[^>]*>G5</)
  })
  it('renders larger refining counts, ticket shortage and stopped queue recovery', () => {
    const state = fresh()
    expect(html(<SizeChips start={AT} itemSeconds={Array.from({ length: 40 }, () => 60)} max={40} value={40} onChange={() => {}} rule={{ mode: 'count', sizes: [1, 4, 8, 20, 40] }} />, state)).toContain('data-size="40"')
    const working = done(start(state, { outfitId: 'ada', slot, request: { kind: 'gather', item: 'twig', count: 2 } }, AT, ENV))
    expect(html(<SpeedUpControls outfitId="ada" />, working)).toContain('Needs 2 Speed Tickets.')
    const dropped: TestState = { ...fresh(), work: { ada: { outfitId: 'ada', entries: [], slot: null, last: null, queue: [], dropped: { at: AT, slot, requests: [{ kind: 'make', item: 'toy', count: 2 }], short: [{ item: 'twig', qty: 2 }], refused: null } } } }
    const stopped = html(<StoppedQueueCard outfitId="ada" />, dropped, AT + MINUTE)
    expect(stopped).toContain('Ada’s queue stopped')
    expect(stopped).toContain('data-action="dismiss"')
    expect(stopped).toMatch(/<button(?=[^>]*data-action="restart")[^>]* disabled=/)
  })
})
