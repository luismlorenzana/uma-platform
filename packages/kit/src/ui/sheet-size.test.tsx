// @vitest-environment jsdom
// The wide side sheet (0.20.0, uma-farm's F74): on a landscape stage `size="wide"` takes up to `min(34rem, 75cqw)` for a
// content-heavy panel instead of `min(26rem, 62cqw)`. A bottom sheet is full width already, so the size changes nothing
// there.
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { BottomSheet, Sheet, type SheetSize } from './BottomSheet.js'
import { setReducedMotion } from './motion.js'
import { KitStage, type StageLayout } from './stage.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const sheet = (size?: SheetSize) => <BottomSheet open onClose={() => {}} title="Morning" size={size} footer={<button type="button">Start</button>}>Body</BottomSheet>
const markup = (node: ReactNode, layout?: StageLayout) => renderToStaticMarkup(layout ? <KitStage layout={layout}>{node}</KitStage> : node)
const dialog = (html: string) => new DOMParser().parseFromString(html, 'text/html').querySelector<HTMLElement>('[data-kit="sheet"]')!

let root: Root | undefined
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  setReducedMotion(false)
})

describe('the wide side sheet', () => {
  it('takes up to min(34rem, 75cqw) on a landscape stage, from the right edge, its full height', () => {
    setReducedMotion(true)
    const wide = dialog(markup(sheet('wide'), 'landscape'))
    expect(wide.dataset.placement).toBe('side')
    expect(wide.dataset.size).toBe('wide')
    expect(wide.className).toBe('fixed inset-y-0 right-0 z-50 flex w-[min(34rem,75cqw)]')
    expect(wide.querySelector('[data-kit="sheet-handle"]')).not.toBeNull()
    expect(wide.textContent).toContain('Start')
  })

  it("is the regular side sheet without it, or with `regular`", () => {
    setReducedMotion(true)
    for (const size of [undefined, 'regular'] as const) {
      const regular = dialog(markup(sheet(size), 'landscape'))
      expect(regular.hasAttribute('data-size')).toBe(false)
      expect(regular.className).toBe('fixed inset-y-0 right-0 z-50 flex w-[min(26rem,62cqw)]')
    }
    expect(markup(sheet('regular'), 'landscape')).toBe(markup(sheet(), 'landscape'))
  })

  it('changes nothing for a bottom sheet, on a portrait stage or none', () => {
    for (const layout of [undefined, 'portrait'] as const) expect(markup(sheet('wide'), layout)).toBe(markup(sheet(), layout))
  })

  it("reaches the stage's layer through Sheet", async () => {
    setReducedMotion(true)
    root = createRoot(document.body.appendChild(document.createElement('div')))
    await act(async () => { root!.render(<KitStage><Sheet open onClose={() => {}} label="Shop" size="wide">Wares</Sheet></KitStage>) })
    const placed = document.querySelector<HTMLElement>('[data-kit="stage-layer"] [data-kit="sheet"]')!
    expect(placed.dataset.size).toBe('wide')
    expect(placed.className).toContain('w-[min(34rem,75cqw)]')
  })
})
