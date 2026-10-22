// theme.css's tints (0.12.0): each tint sets the three accent tokens, unlayered, for light, `<html data-theme="dark">`, a
// fight's dark subtree and the phone's dark mode, and its light rule sets the Hub's wash. `accent-ink` never changes.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface Rule {
  readonly selectors: readonly string[]
  /** The enclosing at-rules, outermost first, such as `@media (prefers-color-scheme: dark)`; empty when top level. */
  readonly within: readonly string[]
  readonly props: Readonly<Record<string, string>>
}

/** Every leaf rule of a stylesheet, comments dropped. Enough CSS for theme.css: no strings holding braces. */
function parse(css: string): Rule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: Rule[] = []
  const stack: string[] = []
  let start = 0
  let leaf = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      stack.push(text.slice(start, i).trim().replace(/\s+/g, ' '))
      start = i + 1
      leaf = true
    } else if (text[i] === '}') {
      const prelude = stack.pop() ?? ''
      if (leaf) {
        const props = Object.fromEntries(text.slice(start, i).split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
          const at = d.indexOf(':')
          return [d.slice(0, at).trim(), d.slice(at + 1).trim()]
        }))
        rules.push({ selectors: prelude.split(',').map((s) => s.trim()), within: [...stack], props })
      }
      start = i + 1
      leaf = false
    }
  }
  return rules
}

const rules = parse(readFileSync(new URL('../../theme.css', import.meta.url), 'utf8'))
const PHONE_DARK = '@media (prefers-color-scheme: dark)'
function rule(selector: string, within: readonly string[] = []): Rule {
  const found = rules.filter((r) => r.selectors.includes(selector) && r.within.join('|') === within.join('|'))
  expect(found, selector).toHaveLength(1)
  return found[0]!
}
const accents = (r: Rule) => ({ accent: r.props['--color-accent'], strong: r.props['--color-accent-strong'], wash: r.props['--color-accent-wash'] })

// The packet's starting values (H36), as logged in P68.
const LOOKS = {
  dusk: { light: { accent: '#e08a3c', strong: '#c06c1f', wash: '#fcebdc' }, dark: { accent: '#e89a52', strong: '#f4b072', wash: '#2e2013' } },
  night: { light: { accent: '#9d86e8', strong: '#7a62cf', wash: '#efebfc' }, dark: { accent: '#a894f0', strong: '#c1b2ff', wash: '#231e3a' } },
} as const

describe('the tints in theme.css', () => {
  for (const [tint, look] of Object.entries(LOOKS)) {
    it(`gives ${tint} its accent in light and in every dark rule, unlayered`, () => {
      const light = rule(`:root[data-tint='${tint}']`)
      expect(accents(light)).toEqual(look.light)
      expect(light.props['--kit-hub-tint']).toMatch(/^rgb\(/)
      for (const dark of [
        rule(`:root[data-theme='dark'][data-tint='${tint}']`),
        rule(`:root[data-tint='${tint}'] [data-theme='dark']`),
        rule(`:root[data-tint='${tint}']:not([data-theme='light'])`, [PHONE_DARK]),
      ]) {
        expect(accents(dark)).toEqual(look.dark)
        expect(Object.keys(dark.props).sort()).toEqual(['--color-accent', '--color-accent-strong', '--color-accent-wash'])
      }
    })
  }

  it('changes nothing else, and hides the Hub wash unless a tint is set', () => {
    for (const r of rules.filter((x) => x.selectors.some((s) => s.includes('data-tint')))) {
      expect(r.props['--color-accent-ink']).toBeUndefined()
      expect(r.props['--color-page']).toBeUndefined()
      expect(r.props['--color-ink']).toBeUndefined()
    }
    expect(rule(`[data-kit='hub-tint']`).props.display).toBe('none')
    const shown = rule(`:root[data-tint] [data-kit='hub-tint']`)
    expect(shown.props.display).toBe('block')
    expect(shown.props['background-color']).toContain('var(--kit-hub-tint')
  })
})
