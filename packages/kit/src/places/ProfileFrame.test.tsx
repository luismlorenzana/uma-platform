// @vitest-environment jsdom
// H118's opt-in header contract. The pre-change regular HTML stays frozen in frames.test.tsx.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProfileFrame, type ProfileFrameProps } from './ProfileFrame.js'

const props: ProfileFrameProps = {
  portrait: <i data-portrait="" />, name: 'W'.repeat(24), title: 'Sample outfit A', level: 'Lv 40',
  chips: <span data-rarity="">★★★</span>, corner: <button type="button">Target</button>,
  summary: <div data-summary="">Party · Work · Details</div>,
  tabs: [{ key: 'class', label: 'Class' }, { key: 'gear', label: 'Gear', dot: true, dotLabel: 'Gear, ready' }], tab: 'class',
}
const progress = { value: 1200, max: 2400, label: '1,200/2,400' }
const doc = (extra: Partial<ProfileFrameProps> = {}) => new DOMParser().parseFromString(renderToStaticMarkup(<ProfileFrame {...props} {...extra} />), 'text/html')

describe('the compact ProfileFrame (H118)', () => {
  it('uses the 64px portrait, wraps the full name, and keeps the truncating title beside the chips', () => {
    const page = doc({ size: 'compact', progress }), header = page.querySelector('section')!
    expect(header.classList.contains('h-16')).toBe(true)
    expect(header.firstElementChild!.classList.contains('size-16')).toBe(true)
    const name = header.querySelector('h2')!, title = header.querySelector('p')!, chips = header.querySelector('[data-rarity]')!
    expect(name.textContent).toBe('W'.repeat(24))
    expect(name.classList.contains('break-words')).toBe(true)
    expect(name.className).not.toMatch(/truncate|line-clamp|overflow-hidden/)
    expect(title.classList.contains('truncate')).toBe(true)
    expect(title.classList.contains('min-w-0')).toBe(true)
    expect(title.parentElement).toBe(chips.parentElement!.parentElement)
    expect(title.parentElement!.classList.contains('flex')).toBe(true)
    const level = header.querySelector('[data-kit="profile-level"]')!
    expect(level.textContent).toBe('Lv 401,200/2,400')
    expect(level.querySelector('[role="progressbar"]')).not.toBeNull()
    expect(page.querySelector('[data-summary]')!.textContent).toBe('Party · Work · Details')
    expect(page.querySelector('[data-dot]')).not.toBeNull()
  })

  it('keeps the regular header identical when size is omitted or explicitly regular', () => {
    expect(doc({ size: 'regular' }).body.innerHTML).toBe(doc().body.innerHTML)
  })

  it('uses only a named 14px lock icon on the compact portrait', () => {
    const page = doc({ size: 'compact', locked: true, lockedLabel: 'Not owned' })
    const badge = page.querySelector('[role="img"][aria-label="Not owned"]')!
    expect(badge.textContent).toBe('')
    expect(badge.querySelector('svg')!.getAttribute('width')).toBe('14')
    expect(badge.querySelector('svg')!.getAttribute('height')).toBe('14')
  })

  it.each(['regular', 'compact'] as const)('draws accessible progress in %s, even without a level', size => {
    const page = doc({ size, progress, level: undefined }), bar = page.querySelector('[role="progressbar"]')!
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuenow')).toBe('1200')
    expect(bar.getAttribute('aria-valuemax')).toBe('2400')
    expect(bar.getAttribute('aria-valuetext')).toBe('1,200/2,400')
    expect(bar.classList.contains('h-1')).toBe(true)
  })

  it('draws regular progress below the unchanged level', () => {
    const page = doc({ progress }), line = page.querySelector('[role="progressbar"]')!.parentElement!
    expect(line.previousElementSibling!.textContent).toBe('Lv 40')
    expect(line.previousElementSibling!.classList.contains('text-[22px]')).toBe(true)
  })

  it.each([[0, 100, '0%'], [50, 100, '50%'], [150, 100, '100%'], [0, 0, '100%']] as const)('fills %i of %i without exceeding the bar', (value, max, width) => {
    const page = doc({ size: 'compact', progress: { value, max, label: 'Progress' } })
    expect(page.querySelector<HTMLElement>('[role="progressbar"] > span')!.style.width).toBe(width)
  })
})
