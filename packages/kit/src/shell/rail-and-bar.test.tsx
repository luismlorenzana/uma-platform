// @vitest-environment jsdom
// The rail-and-bar arrangement (0.20.0, uma-farm's F74): on a landscape stage `AppFrame landscape="rail-and-bar"` puts
// `bottom` (`BottomBar side="left"`) down the left edge, full height, and `top` (`AccountBar landscape="bar"`) across the
// top of the page column. Each is opt-in: without the new props a landscape stage draws KL1's rails (stage.test.tsx), and
// off a landscape stage the props change nothing.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { HomeIcon } from '../ui/icons/index.js'
import { KitStage, type StageLayout } from '../ui/stage.js'
import { AccountBar } from './AccountBar.js'
import { AppFrame } from './AppFrame.js'
import { BottomBar, type BarTab } from './BottomBar.js'

const markup = (node: ReactNode, layout?: StageLayout) =>
  renderToStaticMarkup(<MemoryRouter>{layout ? <KitStage layout={layout}>{node}</KitStage> : node}</MemoryRouter>)
const parse = (node: ReactNode, layout?: StageLayout) => new DOMParser().parseFromString(markup(node, layout), 'text/html')
const classes = (element: Element | null | undefined) => (element?.getAttribute('class') ?? '').split(' ')

const MENU = { to: '/menu', label: 'Every place', text: 'Menu' }
const CHIPS = [
  { key: 'date', mark: 'season/spring', value: 3, to: '/calendar', label: 'Calendar: Spring 3' },
  { key: 'gold', mark: 'currency/gold', value: 1200, to: '/bin', label: 'Gold: 1,200g' },
]
const TABS: BarTab[] = [
  { key: 'farm', to: '/', label: 'Farm', Icon: HomeIcon, active: true },
  { key: 'town', to: '/town', label: 'Town', Icon: HomeIcon, active: false, badge: 2, badgeLabel: 'Town, 2 new' },
  { key: 'people', to: '/hearts', label: 'People', Icon: HomeIcon, active: false },
]
const end = <a href="/?sheet=end" data-test="end">End day</a>
const bar = <AccountBar landscape="bar" chips={CHIPS} actions={end} menu={MENU} />
const rail = <BottomBar side="left" tabs={TABS} label="Pages" />

describe('AppFrame landscape="rail-and-bar"', () => {
  it('puts the pages down the left edge, full height, and the bar across the top of the page column', () => {
    const doc = parse(<AppFrame landscape="rail-and-bar" top={bar} bottom={rail} overlays={<div data-test-over />}>
      <p data-test-page>Page</p></AppFrame>, 'landscape')
    const frame = doc.querySelector<HTMLElement>('[data-kit="frame"]')!
    expect(frame.dataset.layout).toBe('landscape')
    expect(frame.dataset.arrangement).toBe('rail-and-bar')
    expect(classes(frame)).toContain('flex-row')
    const [left, column, over] = [...frame.children]
    expect(left?.getAttribute('data-kit')).toBe('bottom-bar')
    expect(left?.getAttribute('data-side')).toBe('left')
    expect(column?.getAttribute('data-kit')).toBe('frame-column')
    expect(classes(column)).toEqual(expect.arrayContaining(['flex', 'flex-1', 'flex-col', 'min-w-0']))
    expect(over?.hasAttribute('data-test-over')).toBe(true)
    // In the column: the bar on top, then the page, which takes the rest.
    const [top, page] = [...column!.children]
    expect(top?.getAttribute('data-kit')).toBe('account-bar')
    expect(top?.getAttribute('data-variant')).toBe('bar')
    expect(classes(page)).toEqual(expect.arrayContaining(['relative', 'flex-1', 'min-h-0', 'overflow-hidden']))
    expect(page?.querySelector('[data-test-page]')).not.toBeNull()
  })

  it("zeroes the left inset beside the rail, so the bar's pl-safe adds nothing there", () => {
    const column = (node: ReactNode) => parse(node, 'landscape').querySelector<HTMLElement>('[data-kit="frame-column"]')!
    expect(column(<AppFrame landscape="rail-and-bar" top={bar} bottom={rail}>Page</AppFrame>).style.getPropertyValue('--inset-left')).toBe('0px')
    // No rail (a full-screen flow, or none given): the column is the stage's left edge, so the inset stands.
    expect(column(<AppFrame landscape="rail-and-bar" top={bar} bottom={rail} fullScreen>Fight</AppFrame>).getAttribute('style')).toBeNull()
    expect(column(<AppFrame landscape="rail-and-bar" top={bar}>Page</AppFrame>).getAttribute('style')).toBeNull()
  })

  it('drops both bars for a full-screen flow', () => {
    const frame = parse(<AppFrame landscape="rail-and-bar" fullScreen top={bar} bottom={rail}>Fight</AppFrame>, 'landscape')
      .querySelector('[data-kit="frame"]')!
    expect(frame.getAttribute('data-full-screen')).toBe('true')
    expect(frame.querySelector('[data-kit="bottom-bar"], [data-kit="account-bar"]')).toBeNull()
    expect(frame.textContent).toBe('Fight')
  })

  it('keeps the rails by default and changes nothing off a landscape stage', () => {
    const rails = parse(<AppFrame top={<header>Top</header>} bottom={<nav>Bottom</nav>}>Page</AppFrame>, 'landscape').querySelector('[data-kit="frame"]')!
    expect(rails.hasAttribute('data-arrangement')).toBe(false)
    expect([...rails.children].map((child) => child.tagName)).toEqual(['HEADER', 'DIV', 'NAV'])
    for (const layout of [undefined, 'portrait'] as const) {
      const plain = <AppFrame top={<header>Top</header>} bottom={<nav>Bottom</nav>}>Page</AppFrame>
      const asked = <AppFrame landscape="rail-and-bar" top={<header>Top</header>} bottom={<nav>Bottom</nav>}>Page</AppFrame>
      expect(markup(asked, layout)).toBe(markup(plain, layout))
    }
  })
})

describe('AccountBar landscape="bar"', () => {
  it('is one 44 pt row across the top, clear of the top and side insets, the chips from the left and the actions and Menu at the right end', () => {
    const doc = parse(bar, 'landscape')
    const header = doc.querySelector('[data-kit="account-bar"]')!
    expect(header.tagName).toBe('HEADER')
    expect(header.getAttribute('data-layout')).toBe('landscape')
    expect(header.getAttribute('data-variant')).toBe('bar')
    expect(classes(header)).toEqual(expect.arrayContaining(['pt-safe', 'pl-safe', 'pr-safe', 'border-b']))
    expect(classes(header)).not.toContain('border-r')
    expect(classes(header)).not.toContain('flex-col')
    const row = header.firstElementChild!
    expect(classes(row)).toEqual(expect.arrayContaining(['flex', 'h-11', 'items-center']))
    const [chips, trailing] = [...row.children]
    // No initial given: the chips lead, in a row.
    expect([...chips!.querySelectorAll('a')].map((a) => a.getAttribute('aria-label'))).toEqual(['Calendar: Spring 3', 'Gold: 1,200g'])
    expect(classes(chips)).not.toContain('flex-col')
    expect(trailing?.getAttribute('data-kit')).toBe('bar-actions')
    expect(classes(trailing)).toContain('ml-auto')
    expect([...trailing!.children].map((child) => child.getAttribute('data-test') ?? child.getAttribute('data-kit'))).toEqual(['end', 'bar-menu'])
    const menu = trailing!.querySelector('[data-kit="bar-menu"]')!
    expect(menu.getAttribute('aria-label')).toBe('Every place')
    expect(menu.getAttribute('href')).toBe('/menu')
    expect(classes(menu)).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']))
    expect(doc.querySelector('[data-kit="rail-menu"]')).toBeNull()
  })

  it('leads with the initial and its crest link when given them', () => {
    const doc = parse(<AccountBar landscape="bar" initial="F" tier={2} tierShifter={{ to: '/tier', label: 'Tier 2' }}
      account={{ to: '/account', label: 'Account' }} chips={CHIPS} />, 'landscape')
    const row = doc.querySelector('[data-kit="account-bar"] > div')!
    const [lead, chips] = [...row.children]
    expect(lead?.querySelector('a[aria-label="Account"]')?.textContent).toBe('F')
    expect(lead?.querySelector('[data-kit="tier-shifter"]')?.getAttribute('href')).toBe('/tier')
    // Positioned after the crest's link, so it keeps every chip's tap area.
    expect(classes(chips)).toContain('relative')
    expect(row.querySelector('[data-kit="bar-actions"]')).toBeNull()
  })

  it('draws the rail by default on a landscape stage, and the portrait bar off one', () => {
    const rail = parse(<AccountBar initial="T" account={{ to: '/a', label: 'Account' }} chips={CHIPS} menu={MENU} />, 'landscape')
      .querySelector('[data-kit="account-bar"]')!
    expect(rail.hasAttribute('data-variant')).toBe(false)
    expect(classes(rail)).toContain('flex-col')
    const props = { initial: 'T', account: { to: '/a', label: 'Account' }, chips: CHIPS, menu: MENU }
    for (const layout of [undefined, 'portrait'] as const) {
      expect(markup(<AccountBar landscape="bar" {...props} />, layout)).toBe(markup(<AccountBar {...props} />, layout))
    }
  })
})

describe('BottomBar side="left"', () => {
  it('runs down the left edge: a right border, clear of the left inset, the marker on its inner (right) edge, labels under the icons', () => {
    const nav = parse(rail, 'landscape').querySelector('nav[data-kit="bottom-bar"]')!
    expect(nav.getAttribute('aria-label')).toBe('Pages')
    expect(nav.getAttribute('data-side')).toBe('left')
    expect(classes(nav)).toEqual(expect.arrayContaining(['pt-safe', 'pb-safe', 'pl-safe', 'border-r', 'flex-col']))
    expect(classes(nav)).not.toContain('pr-safe')
    expect(classes(nav)).not.toContain('border-l')
    const active = nav.querySelector('a[aria-current="page"]')!
    const mark = active.querySelector('span[aria-hidden="true"].bg-accent')!
    expect(classes(mark)).toEqual(expect.arrayContaining(['right-0', 'rounded-l-full']))
    expect(classes(mark)).not.toContain('left-0')
    const look = active.firstElementChild!
    expect(classes(look)).toEqual(expect.arrayContaining(['flex-col', 'h-14']))
    expect(look.lastElementChild?.textContent).toBe('Farm')
    expect(nav.querySelector('a[href="/town"]')?.getAttribute('aria-label')).toBe('Town, 2 new')
  })

  it('has no menu slot, even when given one', () => {
    const nav = parse(<BottomBar side="left" tabs={TABS} menu={MENU} label="Pages" />, 'landscape').querySelector('nav')!
    expect(nav.querySelectorAll('a')).toHaveLength(TABS.length)
    expect(nav.querySelector('a[aria-label="Every place"]')).toBeNull()
  })

  it("raises the disc out of the rail's inner (right) edge, with its badge and glow", () => {
    const tabs: BarTab[] = [...TABS, { key: 'end', to: '/end', label: 'End day', Icon: HomeIcon, active: false, raised: true, badge: 3, glow: true }]
    const disc = parse(<BottomBar side="left" tabs={tabs} label="Pages" />, 'landscape').querySelector('a[href="/end"] > span')!
    expect(classes(disc)).toContain('-mr-5')
    expect(classes(disc)).not.toContain('-ml-5')
    expect(classes(disc)).toContain('size-[62px]')
    expect(disc.querySelector('.bg-success')?.textContent).toBe('3')
    expect(disc.querySelector('[data-glow]')).not.toBeNull()
  })

  it('keeps the right rail by default, and the portrait bar (with its menu) off a landscape stage', () => {
    const right = parse(<BottomBar tabs={TABS} menu={MENU} label="Pages" />, 'landscape').querySelector('nav')!
    expect(right.hasAttribute('data-side')).toBe(false)
    expect(classes(right)).toEqual(expect.arrayContaining(['pr-safe', 'border-l']))
    for (const layout of [undefined, 'portrait'] as const) {
      expect(markup(<BottomBar side="left" tabs={TABS} menu={MENU} label="Pages" />, layout)).toBe(markup(<BottomBar tabs={TABS} menu={MENU} label="Pages" />, layout))
    }
    // Off a landscape stage a left rail without a menu draws the four tabs and no fifth slot.
    expect(parse(<BottomBar side="left" tabs={TABS} label="Pages" />).querySelectorAll('nav a')).toHaveLength(TABS.length)
  })
})
