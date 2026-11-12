import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DraftReader, hintOf, JsonTree, MarkdownText } from './Reader'

// Invented text only.
describe('the plain reader', () => {
  it('shows a JSON draft as a tree, the first level open and deeper ones closed until asked', () => {
    const html = renderToString(<JsonTree text={JSON.stringify({ title: 'An invented story', bosses: [{ name: 'Stand-in boss', tie: 'rival' }], premise: 'A long line of invented prose that runs well past seventy characters so it is set as a block.' })} />)
    expect(html).toContain('An invented story')
    expect(html).toContain('bosses')
    expect(html).toContain('1 item')
    expect(html).toContain('A long line of invented prose')
    // The boss's own fields are two levels down: not drawn until that branch is opened.
    expect(html).not.toContain('rival')
  })

  it('never runs or injects what a draft holds', () => {
    const html = renderToString(<JsonTree text={JSON.stringify({ line: '<img src=x onerror=alert(1)>' })} />)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(renderToString(<MarkdownText text={'# <script>alert(1)</script>'} />)).not.toContain('<script>')
  })

  it('says when a JSON draft is broken, and still shows its text', () => {
    const html = renderToString(<JsonTree text={'{ "title": '} />)
    expect(html).toContain('valid JSON')
    expect(html).toContain('{ &quot;title&quot;:')
  })

  it('reads markdown as headings, list lines, tables and paragraphs', () => {
    const html = renderToString(<MarkdownText text={'# The valley\n\nA quiet place.\nStill quiet.\n\n## Rules\n- Everyone is an adult\n- Tender, never explicit\n\n| Season | Festival |\n|---|---|\n| Spring | Flowers |\n'} />)
    expect(html).toContain('aria-level="1"')
    expect(html).toContain('The valley')
    expect(html).toContain('A quiet place.\nStill quiet.')
    expect(html).toContain('Everyone is an adult')
    expect(html).toContain('| Season | Festival |')
    expect(renderToString(<DraftReader path="world.md" text="# Title" />)).toContain('aria-level="1"')
    expect(renderToString(<DraftReader path="cast.json" text='{"version":1}' />)).toContain('version')
  })

  it('hints at what an entry is', () => {
    expect(hintOf({ title: 'An invented title', other: 1 })).toBe('title: An invented title')
    expect(hintOf({ characterId: '9000001', paragraph: 'x' })).toBe('characterId: 9000001')
    expect(hintOf({ x: {}, y: [] })).toBe('2 fields')
    expect(hintOf([1, 2, 3])).toBe('3 items')
    expect(hintOf('text')).toBe('')
  })
})
