// @vitest-environment jsdom
// The top bar's tier crest: inside the account link by default (uma-racer's bar, unchanged), or a link of its own with
// `tierShifter` (uma-rpg's Tier shifter, 0.12.0). A server render over a stub `ui` atlas with the three crests, read back
// with jsdom's parser.
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { KitArtProvider, type KitArt } from '../ui/art.js'
import { AccountBar } from './AccountBar.js'

const crest = { w: 12, h: 12, y: 0 }
const ART: KitArt = {
  ui: { url: '/ui.png', index: { width: 36, height: 12, frames: { 'tier/1': { ...crest, x: 0 }, 'tier/2': { ...crest, x: 12 }, 'tier/3': { ...crest, x: 24 } } } },
}
const ACCOUNT = { to: '/town/account', label: 'Account: Tester' }

function render(node: ReactNode): Document {
  const html = renderToStaticMarkup(<MemoryRouter><KitArtProvider art={ART}>{node}</KitArtProvider></MemoryRouter>)
  return new DOMParser().parseFromString(html, 'text/html')
}
const accountLink = (doc: Document) => doc.querySelector('a[aria-label="Account: Tester"]')

describe('the top bar', () => {
  it('keeps the crest inside the account link without a tier shifter', () => {
    const doc = render(<AccountBar initial="T" tier={1} account={ACCOUNT} chips={[]} />)
    expect(doc.querySelector('[data-kit="tier-shifter"]')).toBeNull()
    expect(accountLink(doc)?.querySelector('[data-mark="tier/1"]')).not.toBeNull()
    expect(doc.querySelectorAll('a')).toHaveLength(1)
  })

  it('makes the crest a link of its own with a tier shifter', () => {
    const doc = render(<AccountBar initial="T" tier={2} tierShifter={{ to: '/town?sheet=tier', label: 'Tier 2, switch tiers' }} account={ACCOUNT} chips={[]} />)
    const shifters = doc.querySelectorAll('[data-kit="tier-shifter"]')
    expect(shifters).toHaveLength(1)
    const shifter = shifters[0]!
    expect(shifter.tagName).toBe('A')
    expect(shifter.getAttribute('aria-label')).toBe('Tier 2, switch tiers')
    expect(shifter.getAttribute('href')).toBe('/town?sheet=tier')
    expect(shifter.querySelector('[data-mark="tier/2"]')).not.toBeNull()
    expect(accountLink(doc)?.querySelector('[data-mark]')).toBeNull()
    expect(accountLink(doc)?.textContent).toBe('T')
  })

  it('draws no shifter without a tier', () => {
    const doc = render(<AccountBar initial="T" tierShifter={{ to: '/town?sheet=tier', label: 'Switch tiers' }} account={ACCOUNT} chips={[]} />)
    expect(doc.querySelector('[data-kit="tier-shifter"]')).toBeNull()
    expect(doc.querySelector('[data-mark]')).toBeNull()
  })
})
