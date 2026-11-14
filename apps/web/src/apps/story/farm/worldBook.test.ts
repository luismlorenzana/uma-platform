import { describe, expect, it } from 'vitest'
import { slug, worldSections } from './worldBook'

const book = `Intro before any heading.

# The World Book
The world in a line.
## History
Long ago.
## For the game
What the story wants.
### Seasons
Four of them.
### Places
The town.
## The families
Not for the game.
## History
A second history.`

describe('the World Book’s sections', () => {
  it('splits by heading, keeps the text before the first one, and gives each an anchor, numbered when repeated', () => {
    const s = worldSections(book)
    expect(s.map((x) => [x.level, x.id])).toEqual([[0, 'start'], [1, 'the-world-book'], [2, 'history'], [2, 'for-the-game'], [3, 'seasons'], [3, 'places'], [2, 'the-families'], [2, 'history-2']])
    expect(s[0]!.body).toBe('Intro before any heading.')
  })
  it('sets apart "For the game" and its subsections, and only them', () => {
    expect(worldSections(book).filter((x) => x.forGame).map((x) => x.title)).toEqual(['For the game', 'Seasons', 'Places'])
  })
  it('ignores headings inside a fenced block', () => {
    expect(worldSections('# A\n```\n# not a heading\n```\n# B').map((x) => x.title)).toEqual(['A', 'B'])
  })
  it('makes plain anchors from any title', () => {
    expect(slug('Café & Crews: Part 1', new Map())).toBe('cafe-crews-part-1')
  })
})
