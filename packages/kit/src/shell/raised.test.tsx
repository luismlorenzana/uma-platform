// @vitest-environment jsdom
// The raised tab's badge and glow (0.19.0, uma-farm's F18 request): the disc draws `badge` like the other tabs (hidden at
// 0, at its top-right on the ring) and an optional `glow` halo, still under reduced motion, in the portrait bar and on the
// landscape rail. Without either, portrait.test.tsx holds the disc to 0.18.0's markup.
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { domMax } from 'motion/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MoonIcon } from '../ui/icons/index.js'
import { MotionRoot } from '../ui/motion.js'
import { KitStage, type StageLayout } from '../ui/stage.js'
import { BottomBar, type BarTab } from './BottomBar.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const MENU = { to: '/menu', label: 'Menu', text: 'Menu' }
const end = (more: Partial<BarTab> = {}): BarTab => ({ key: 'end', to: '/end', label: 'End day', Icon: MoonIcon, active: false, raised: true, ...more })
const bar = (tab: BarTab, layout?: StageLayout) => {
  const node = <BottomBar tabs={[tab]} menu={MENU} label="Pages" />
  return new DOMParser().parseFromString(renderToStaticMarkup(<MemoryRouter>{layout ? <KitStage layout={layout}>{node}</KitStage> : node}</MemoryRouter>), 'text/html')
}
const disc = (doc: Document) => doc.querySelector<HTMLElement>('a[href="/end"] > span')!

let root: Root | undefined
async function mount(node: ReactNode) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(<MemoryRouter><MotionRoot features={domMax}>{node}</MotionRoot></MemoryRouter>) })
}
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})
/** The system's reduced-motion switch, as `matchMedia` reports it. */
const systemReduced = (matches: boolean) => vi.stubGlobal('matchMedia', () => ({ matches, addEventListener: () => {}, removeEventListener: () => {} }))

describe('the raised tab', () => {
  it.each([['the portrait bar', undefined], ['the landscape rail', 'landscape' as const]])('draws its badge on the disc in %s, hidden at 0', (_where, layout) => {
    const shown = bar(end({ badge: 3, badgeLabel: 'End the day: 3 waiting' }), layout)
    const badge = disc(shown).querySelector('span[aria-hidden="true"].bg-success')!
    expect(badge.textContent).toBe('3')
    expect(badge.className).toContain('-top-1 -right-1')
    expect(disc(shown).className).toContain('relative')
    expect(shown.querySelector('a[href="/end"]')?.getAttribute('aria-label')).toBe('End the day: 3 waiting')
    const none = bar(end({ badge: 0, badgeLabel: 'End the day: all set' }), layout)
    expect(disc(none).querySelector('.bg-success')).toBeNull()
    expect(disc(none).className).not.toContain('relative')
    expect(none.querySelector('a[href="/end"]')?.getAttribute('aria-label')).toBe('End day')
  })

  it.each([['the portrait bar', undefined], ['the landscape rail', 'landscape' as const]])('draws the glow only when asked, in %s', (_where, layout) => {
    expect(disc(bar(end(), layout)).querySelector('[data-glow]')).toBeNull()
    const glow = disc(bar(end({ glow: true }), layout)).querySelector<HTMLElement>('[data-glow]')!
    expect(glow.getAttribute('aria-hidden')).toBe('true')
    expect(glow.className).toContain('pointer-events-none')
    expect(glow.className).toContain('-inset-1')
  })

  it('pulses the glow, and holds it still under reduced motion', async () => {
    systemReduced(false)
    await mount(<BottomBar tabs={[end({ glow: true })]} menu={MENU} label="Pages" />)
    expect(document.querySelector('[data-glow]')?.getAttribute('data-glow')).toBe('pulse')
    await act(async () => root?.unmount())
    root = undefined
    systemReduced(true)
    await mount(<BottomBar tabs={[end({ glow: true })]} menu={MENU} label="Pages" />)
    const still = document.querySelector<HTMLElement>('[data-glow]')!
    expect(still.getAttribute('data-glow')).toBe('still')
    expect(still.className).toContain('opacity-80')
    expect(still.getAttribute('style')).toBeNull()
  })
})
