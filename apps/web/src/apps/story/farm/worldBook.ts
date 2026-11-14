// The farm's World Book (uma-farm F40; uma-platform P167): `world-book.md`, pushed with the farm's drafts. Pure: its
// sections by heading for the contents column, each with an id to link to, and which of them are the "For the game"
// section (that heading and everything under it), which the page sets apart.

export const WORLD_BOOK = 'world-book.md'

export interface WorldSection {
  id: string
  title: string
  /** 0 for the text before the first heading; else the heading's level, 1–4. */
  level: number
  /** The section's text below its heading, up to the next heading of any level. */
  body: string
  /** Under "For the game": the heading itself or any of its subsections. */
  forGame: boolean
}

const FOR_THE_GAME = /^for the game\b/i

/** A heading's anchor: lowercase words joined by hyphens, numbered when two headings share it. */
export function slug(title: string, seen: Map<string, number>): string {
  const base = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section'
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n === 0 ? base : `${base}-${n + 1}`
}

export function worldSections(text: string): WorldSection[] {
  const sections: WorldSection[] = []
  const seen = new Map<string, number>()
  let current: WorldSection = { id: 'start', title: '', level: 0, body: '', forGame: false }
  let gameLevel: number | null = null
  const lines: string[] = []
  const close = () => { current.body = lines.join('\n').trim(); lines.length = 0; if (current.level > 0 || current.body) sections.push(current) }
  let fenced = false
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line.trim())) fenced = !fenced
    const heading = fenced ? null : /^(#{1,4})\s+(.*?)\s*#*\s*$/.exec(line)
    if (!heading) { lines.push(line); continue }
    close()
    const level = heading[1]!.length, title = heading[2]!
    if (gameLevel !== null && level <= gameLevel) gameLevel = null
    if (FOR_THE_GAME.test(title)) gameLevel = level
    current = { id: slug(title, seen), title, level, body: '', forGame: gameLevel !== null }
  }
  close()
  return sections
}
