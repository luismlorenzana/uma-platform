// SB6 integration regression: compact chrome hides its text, not its accessible name or caller's vocabulary.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AlbumChrome } from './AlbumChrome.js'
import type { AlbumQuery } from '../roster/query.js'

const query: AlbumQuery = { search: '', filters: {}, sort: 'level', direction: 'desc', group: null, view: 'icons', mode: null }

describe('album filter accessibility', () => {
  it.each([false, true])('names the Filter button with compact=%s, including game-owned words', (compact) => {
    const html = renderToStaticMarkup(<AlbumChrome compact={compact} title="Invented roster" query={query} facets={[]}
      sorts={[{ key: 'level', label: 'Level', defaultDirection: 'desc' }]} counts={{}} total={1}
      countFor={() => 1} onQueryChange={() => {}} words={{ filters: 'Narrow the roster' }} />)
    expect(html).toMatch(/<button[^>]*aria-label="Narrow the roster"/)
  })
})
