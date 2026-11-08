// @vitest-environment jsdom
// KL1 (0.18.0): uma-kit on a game's stage. The turn maps pointer movement onto the stage; sheets portal into the stage
// and size by it; on a landscape stage they come from the right edge and close by a rightward drag on the stage, however
// it's turned; the frame, the bars and the side panel become rails and read swipes in the stage's directions. Outside a
// stage, portrait.test.tsx pins the markup to 0.17.0's.
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccountBar } from '../shell/AccountBar.js'
import { AppFrame } from '../shell/AppFrame.js'
import { BottomBar } from '../shell/BottomBar.js'
import { PeekPanel } from '../shell/PeekPanel.js'
import { BottomSheet, Sheet } from './BottomSheet.js'
import { HomeIcon } from './icons/index.js'
import { setReducedMotion } from './motion.js'
import { KitStage, toStageDelta, type StageLayout, type StageTurn } from './stage.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
async function mount(node: ReactNode) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(<MemoryRouter>{node}</MemoryRouter>) })
}
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  setReducedMotion(false)
})
const onStage = (layout: StageLayout, node: ReactNode) => renderToStaticMarkup(<MemoryRouter><KitStage layout={layout}>{node}</KitStage></MemoryRouter>)

/** A pointer gesture on `target`, from one viewport point to another. React reads pointer events as their names. */
async function gesture(target: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  const fire = (type: string, at: { x: number; y: number }, time: number) =>
    target.dispatchEvent(Object.assign(new MouseEvent(type, { bubbles: true, clientX: at.x, clientY: at.y }), { pointerId: 1, timeStampOverride: time }))
  await act(async () => {
    fire('pointerdown', from, 0)
    fire('pointermove', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, 50)
    fire('pointermove', to, 100)
    fire('pointerup', to, 150)
  })
}

describe('toStageDelta', () => {
  it("matches uma-quest's turned stage, where viewport (x, y) is stage (y, width − x)", () => {
    const width = 393
    const toStage = (x: number, y: number) => ({ x: y, y: width - x })
    const a = toStage(100, 200)
    const b = toStage(130, 260)
    expect(toStageDelta(90, 30, 60)).toEqual({ x: b.x - a.x, y: b.y - a.y })
  })

  it('turns every quarter and leaves an unturned stage alone', () => {
    const cases: [StageTurn, { x: number; y: number }][] = [[0, { x: 3, y: 4 }], [90, { x: 4, y: -3 }], [180, { x: -3, y: -4 }], [270, { x: -4, y: 3 }]]
    for (const [turn, expected] of cases) expect(toStageDelta(turn, 3, 4)).toEqual(expected)
    expect(Object.is(toStageDelta(90, 0, 0).y, 0)).toBe(true)
  })
})

describe('KitStage', () => {
  it('fills the stage as a size container and carries its layout', async () => {
    await mount(<KitStage turn={90}>Inside</KitStage>)
    const stage = document.querySelector<HTMLElement>('[data-kit="stage"]')!
    expect(stage.dataset.layout).toBe('landscape')
    expect(stage.style.containerType).toBe('size')
    expect(stage.style.position).toBe('absolute')
    expect(stage.querySelector('[data-kit="stage-layer"]')).not.toBeNull()
  })

  it("portals sheets into the stage's layer, and into the body outside a stage", async () => {
    await mount(<KitStage><Sheet open onClose={() => {}} label="Inn">Rest</Sheet></KitStage>)
    expect(document.querySelector('[data-kit="stage-layer"] [data-kit="sheet"]')).not.toBeNull()
    await act(async () => root?.unmount())
    root = undefined
    document.body.innerHTML = ''
    await mount(<Sheet open onClose={() => {}} label="Inn">Rest</Sheet>)
    const sheet = document.querySelector('[data-kit="sheet"]')!
    expect(sheet.closest('[data-kit="stage-layer"]')).toBeNull()
    expect(sheet.parentElement).toBe(document.body)
  })
})

describe('the sheet on a stage', () => {
  it('comes from the right edge on a landscape stage, sized by the stage, its handle on its left edge', () => {
    setReducedMotion(true)
    const html = onStage('landscape', <BottomSheet open onClose={() => {}} title="Party">Body</BottomSheet>)
    expect(html).toContain('data-placement="side"')
    expect(html).toContain('fixed inset-y-0 right-0 z-50 flex w-[min(26rem,62cqw)]')
    expect(html).toContain('pt-safe pb-safe pr-safe')
    expect(html).toContain('data-kit="sheet-handle"')
    expect(html).not.toContain('dvh')
  })

  it('stays a bottom sheet on a portrait stage, at most 92% of the stage tall', () => {
    const html = onStage('portrait', <BottomSheet open onClose={() => {}} title="Party">Body</BottomSheet>)
    expect(html).toContain('data-placement="bottom"')
    expect(html).toContain('max-h-[92cqh]')
    expect(html).not.toContain('dvh')
  })

  it('closes when the thumb pulls it right on a stage turned 90°, which is down the viewport', async () => {
    setReducedMotion(true)
    const close = vi.fn()
    await mount(<KitStage turn={90}><Sheet open onClose={close} label="Party">Body</Sheet></KitStage>)
    const handle = document.querySelector('[data-kit="sheet-handle"]')!
    // Across the viewport is along the stage's height on a turned stage: it doesn't close the sheet.
    await gesture(handle, { x: 200, y: 300 }, { x: 40, y: 300 })
    expect(close).not.toHaveBeenCalled()
    await gesture(handle, { x: 200, y: 300 }, { x: 200, y: 460 })
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('reads the same pull directly on a stage iOS turned itself', async () => {
    setReducedMotion(true)
    const close = vi.fn()
    await mount(<KitStage turn={0}><Sheet open onClose={close} label="Party">Body</Sheet></KitStage>)
    const handle = document.querySelector('[data-kit="sheet-handle"]')!
    await gesture(handle, { x: 200, y: 300 }, { x: 200, y: 460 })
    expect(close).not.toHaveBeenCalled()
    await gesture(handle, { x: 200, y: 300 }, { x: 360, y: 300 })
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('the frame and the bars on a landscape stage', () => {
  const tabs = [
    { key: 'home', to: '/', label: 'Home', Icon: HomeIcon, active: true },
    { key: 'play', to: '/play', label: 'Play', Icon: HomeIcon, active: false, raised: true },
  ]
  const menu = { to: '/menu', label: 'Menu', text: 'Menu' }

  it('lays the frame out as a row, the top bar its left rail and the bottom bar its right', () => {
    const doc = new DOMParser().parseFromString(onStage('landscape',
      <AppFrame top={<AccountBar initial="T" account={{ to: '/account', label: 'Account' }} chips={[]} menu={menu} />}
        bottom={<BottomBar tabs={tabs} menu={menu} label="Places" />}>Stage</AppFrame>), 'text/html')
    const frame = doc.querySelector<HTMLElement>('[data-kit="frame"]')!
    expect(frame.dataset.layout).toBe('landscape')
    expect(frame.className).toContain('flex-row')
    const [left, , right] = [...frame.children]
    expect(left?.getAttribute('data-kit')).toBe('account-bar')
    expect(left?.className).toContain('pl-safe')
    expect(right?.getAttribute('data-kit')).toBe('bottom-bar')
    expect(right?.className).toContain('pr-safe')
    // The menu is the left rail's on a landscape stage, by the left thumb, and only there.
    expect(left?.querySelector('a[aria-label="Menu"]')?.getAttribute('data-kit')).toBe('rail-menu')
    expect(right?.querySelector('a[aria-label="Menu"]')).toBeNull()
    expect(right?.querySelectorAll('a')).toHaveLength(2)
  })

  it('gives the side panel the right inset, and reads its swipe on the stage', async () => {
    expect(onStage('landscape', <PeekPanel title="Inn" onClose={() => {}} words={{ close: 'Close', about: 'About', backTo: 'Back' }}>Body</PeekPanel>))
      .toContain('pr-safe')
    const close = vi.fn()
    await mount(<KitStage turn={90}><PeekPanel title="Inn" onClose={close} words={{ close: 'Close', about: 'About', backTo: 'Back' }}>Body</PeekPanel></KitStage>)
    const panel = document.querySelector('[data-kit="side-panel"]')!
    await gesture(panel, { x: 200, y: 300 }, { x: 40, y: 300 })
    expect(close).not.toHaveBeenCalled()
    await gesture(panel, { x: 200, y: 300 }, { x: 200, y: 460 })
    expect(close).toHaveBeenCalledTimes(1)
  })
})
