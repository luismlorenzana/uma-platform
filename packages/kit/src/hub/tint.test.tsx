// The Hub's tint wash (0.12.0): HubCanvas draws one layer after its host, hidden from assistive tech and from taps, that
// theme.css fills only under `<html data-tint>`.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HubCanvas } from './HubCanvas.js'
import { PALETTES } from './palettes.js'
import type { PageGround } from './types.js'

const GROUND: PageGround = { id: 'town', tiles: 'town', palette: PALETTES.town! }

describe('the Hub tint layer', () => {
  it('sits after the canvas host, aria-hidden, with no pointer events', () => {
    const html = renderToStaticMarkup(<HubCanvas ground={GROUND} places={[]} paused={false} reducedMotion />)
    const host = html.indexOf('data-kit="hub-canvas"')
    const tint = html.indexOf('data-kit="hub-tint"')
    expect(host).toBeGreaterThanOrEqual(0)
    expect(tint).toBeGreaterThan(host)
    const layer = /<div[^>]*data-kit="hub-tint"[^>]*>/.exec(html)?.[0] ?? ''
    expect(layer).toContain('aria-hidden="true"')
    expect(layer).toContain('pointer-events-none')
    expect(layer).toContain('inset-0')
  })
})
