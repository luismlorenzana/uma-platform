// @vitest-environment jsdom
// KL1 (0.18.0) adds a landscape layout inside a `KitStage`. Outside a stage every piece must draw exactly what it drew
// before: these snapshots were taken from 0.17.0's markup, before the change, and must never move.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BottomSheet } from '../ui/BottomSheet.js'
import { HomeIcon } from '../ui/icons/index.js'
import { AccountBar } from './AccountBar.js'
import { AppFrame } from './AppFrame.js'
import { BottomBar } from './BottomBar.js'
import { PeekPanel } from './PeekPanel.js'
import { PlaceMenu } from './PlaceMenu.js'

const html = (node: ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('portrait markup, unchanged since 0.17.0', () => {
  it('AppFrame', async () => {
    await expect(html(<AppFrame top={<header>Top</header>} bottom={<nav>Bottom</nav>} overlays={<div>Over</div>}>Page</AppFrame>))
      .toMatchFileSnapshot('./testing/legacy-kl1-frame.html')
    await expect(html(<AppFrame fullScreen top={<header>Top</header>}>Fight</AppFrame>)).toMatchFileSnapshot('./testing/legacy-kl1-frame-full.html')
  })

  it('AccountBar', async () => {
    const chips = [{ key: 'a', mark: 'currency/uma-ticket', value: 1200, to: '/shop', label: 'Uma Tickets, 1,200' }, { key: 'b', mark: 'currency/shard', value: null, to: '/x', label: 'Shards' }]
    await expect(html(<AccountBar initial="T" tier={2} account={{ to: '/account', label: 'Account' }} chips={chips}
      sync={{ state: 'waiting', text: 'Saving', label: 'Saving', to: '/sync' }} />)).toMatchFileSnapshot('./testing/legacy-kl1-account-bar.html')
  })

  it('BottomBar', async () => {
    const tabs = [
      { key: 'home', to: '/', label: 'Home', Icon: HomeIcon, active: true },
      { key: 'grow', to: '/grow', label: 'Grow', Icon: HomeIcon, active: false, badge: 3, badgeLabel: 'Grow, 3 ready' },
      { key: 'play', to: '/play', label: 'Play', Icon: HomeIcon, active: false, raised: true },
      { key: 'work', to: '/work', label: 'Work', Icon: HomeIcon, active: false },
    ]
    await expect(html(<BottomBar tabs={tabs} menu={{ to: '/menu', label: 'Menu', text: 'Menu' }} label="Places" />))
      .toMatchFileSnapshot('./testing/legacy-kl1-bottom-bar.html')
  })

  it('BottomSheet', async () => {
    await expect(html(<BottomSheet open onClose={() => {}} title="A sheet" footer={<button type="button">Go</button>}>Body</BottomSheet>))
      .toMatchFileSnapshot('./testing/legacy-kl1-sheet.html')
  })

  it('PeekPanel', async () => {
    await expect(html(<PeekPanel title="Mine" count={2} about="About" onClose={() => {}} enter={{ to: '/mine', label: 'Enter Mine' }}
      words={{ close: 'Close', about: 'About', backTo: 'Back to the Hub' }}>Body</PeekPanel>)).toMatchFileSnapshot('./testing/legacy-kl1-peek.html')
  })

  it('PlaceMenu', async () => {
    const groups = [{ key: 'g', label: 'Town', places: [{ key: 'a', name: 'Shop', to: '/shop', count: 2 }, { key: 'b', name: 'Inn', to: '/inn', locked: true }] }]
    await expect(html(<PlaceMenu groups={groups} extra={[{ key: 'acc', name: 'Account', to: '/account' }]} />)).toMatchFileSnapshot('./testing/legacy-kl1-menu.html')
  })
})
