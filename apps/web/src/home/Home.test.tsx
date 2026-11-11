import { AuthProvider } from '@luismlorenzana/uma-kit/auth'
import { renderToString } from 'react-dom/server'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { checkRegistry, type SubApp } from '../apps'
import { Home, masterWords } from './Home'

// Invented sub-apps only.
const screen = async () => ({ default: () => null })
const sample: SubApp[] = [
  { id: 'first-tool', title: 'First tool', blurb: 'Does the first thing', load: screen },
  { id: 'second', title: 'Second tool', blurb: 'Does the second thing', load: screen, summary: async () => [{ label: 'items', value: '12' }] },
]

const render = (apps?: readonly SubApp[]) => {
  const router = createMemoryRouter([{ path: '/', element: <Home apps={apps} /> }])
  return renderToString(<AuthProvider config={null}><RouterProvider router={router} /></AuthProvider>)
}

describe('Home', () => {
  it('shows the platform, the account and master data, with an empty state before any sub-app', () => {
    const html = render([])
    expect(html).toContain('Uma Platform')
    expect(html).toContain('Master data')
    expect(html).toContain('No sub-apps yet')
  })

  it('draws a tile a sub-app, linked to its route, waiting for its numbers', () => {
    const html = render(sample)
    expect(html).toContain('href="/first-tool"')
    expect(html).toContain('Second tool')
    expect(html).toContain('Does the second thing')
    expect(html).toContain('Loading')
    expect(html).not.toContain('No sub-apps yet')
  })

  it('words the master data state', () => {
    expect(masterWords({ status: 'ready', version: 'abc123' })).toBe('abc123')
    expect(masterWords({ status: 'error', message: 'x' })).toBe('Unavailable')
    expect(masterWords({ status: 'idle' })).toBe('Loading')
  })
})

describe('the registry', () => {
  it('takes lowercase hyphenated ids, each once', () => {
    expect(checkRegistry(sample)).toBe(sample)
    expect(() => checkRegistry([{ ...sample[0]!, id: 'Bad Id' }])).toThrow(/lowercase/)
    expect(() => checkRegistry([sample[0]!, sample[0]!])).toThrow(/twice/)
  })
})
