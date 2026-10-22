// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { domMax } from 'motion/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MotionRoot } from '../ui/motion.js'
import { UmaPicker, type UmaPickerRow } from './UmaPicker.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined

async function mount(node: ReactNode) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(<MemoryRouter><MotionRoot features={domMax}>{node}</MotionRoot></MemoryRouter>) })
}

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const row = (id: string, name: string): UmaPickerRow => ({ id, name, search: name.toLowerCase(), facets: {}, sorts: {}, level: 1, releasedAt: '' })

describe('UmaPicker', () => {
  it('dims an eligible row without preventing its selection', async () => {
    const onPick = vi.fn()
    await mount(<UmaPicker open title="Choose" rows={[row('ada', 'Ada'), row('bee', 'Bee')]}
      dimmed={(candidate) => candidate.id === 'bee'} onPick={onPick} onClose={() => {}} />)

    const bee = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.getAttribute('aria-label') === 'Bee')!
    expect(bee.disabled).toBe(false)
    expect(bee.dataset.dimmed).toBe('true')
    await act(async () => { bee.click() })
    expect(onPick).toHaveBeenCalledExactlyOnceWith(['bee'])
  })
})
