// What a new release brings and what it still lacks (docs/new-umas.md). Pure, so `pnpm uma:check` and `pnpm uma:report`
// can say the same things from two different pairs of releases.

import { ATLAS_FAMILIES, type ArtIndex, type Character, type LocalText, type MasterData, type Outfit, type Scenario, type Skill, type SupportCard } from '@luismlorenzana/uma-data'
import { DRESS_LOOKS, standName } from './wiki'

export type RecordSets = Pick<MasterData, 'characters' | 'outfits' | 'supportCards' | 'skills' | 'scenarios'>

export interface NewRecords {
  characters: Character[]
  outfits: Outfit[]
  supportCards: SupportCard[]
  skills: Skill[]
  scenarios: Scenario[]
  /** Records present in both that the source changed, by set: a Global date, an English title, a rebalance. */
  changed: Record<keyof RecordSets, number>
}

function diff<T extends { id: number }>(before: readonly T[], after: readonly T[]): { added: T[]; changed: number } {
  const known = new Map(before.map((item) => [item.id, JSON.stringify(item)]))
  const added = after.filter((item) => !known.has(item.id))
  const changed = after.filter((item) => known.has(item.id) && known.get(item.id) !== JSON.stringify(item)).length
  return { added, changed }
}

export function newRecords(before: RecordSets, after: RecordSets): NewRecords {
  const characters = diff(before.characters, after.characters)
  const outfits = diff(before.outfits, after.outfits)
  const supportCards = diff(before.supportCards, after.supportCards)
  const skills = diff(before.skills, after.skills)
  const scenarios = diff(before.scenarios, after.scenarios)
  return {
    characters: characters.added,
    outfits: outfits.added,
    supportCards: supportCards.added,
    skills: skills.added,
    scenarios: scenarios.added,
    changed: {
      characters: characters.changed,
      outfits: outfits.changed,
      supportCards: supportCards.changed,
      skills: skills.changed,
      scenarios: scenarios.changed,
    },
  }
}

export const hasNews = (news: NewRecords): boolean =>
  news.characters.length + news.outfits.length + news.supportCards.length + news.skills.length + news.scenarios.length > 0 ||
  Object.values(news.changed).some((count) => count > 0)

const name = (text: LocalText): string => text.global ?? text.en ?? text.ja

function outfitLine(outfit: Outfit, characters: ReadonlyMap<number, Character>): string {
  const character = characters.get(outfit.characterId)
  const title = name(outfit.title).replace(/^\[(.*)\]$/, '$1').trim() || 'no title yet'
  const tags = [`${outfit.rarity}★`, outfit.variant, outfit.release.global ? `Global ${outfit.release.global}` : null].filter(Boolean).join(' · ')
  return `${outfit.id} ${character ? name(character.name) : `character ${outfit.characterId}`} · ${title} · Japan ${outfit.release.jp} · ${tags}`
}

/** The lines both commands print. */
export function describeNews(news: NewRecords, after: RecordSets): string[] {
  const characters = new Map(after.characters.map((character) => [character.id, character]))
  const lines: string[] = []
  const section = (title: string, items: readonly string[]) => {
    if (items.length > 0) lines.push(`${title} (${items.length}):`, ...items.map((item) => `  ${item}`))
  }
  section('New outfits', news.outfits.map((outfit) => outfitLine(outfit, characters)))
  section('New characters', news.characters.map((character) =>
    `${character.id} ${name(character.name)} · ${character.playable.jp || character.playable.global ? 'trainable' : 'not trainable'}`))
  section('New support cards', news.supportCards.map((card) =>
    `${card.id} ${name(card.characterName)} · ${card.type} · ${['', 'R', 'SR', 'SSR'][card.rarity] ?? card.rarity} · Japan ${card.release.jp}`))
  section('New scenarios', news.scenarios.map((scenario) =>
    `${scenario.id} ${name(scenario.name)} · order ${scenario.order} · Japan ${scenario.startsAt.jp?.slice(0, 10) ?? 'unknown'}`))
  if (news.skills.length > 0) lines.push(`New skills: ${news.skills.length}`)
  const changed = Object.entries(news.changed).filter(([, count]) => count > 0).map(([set, count]) => `${set} ${count}`)
  if (changed.length > 0) lines.push(`Changed records: ${changed.join(', ')}`)
  return lines
}

export interface ArtGaps {
  /** Every game draws these for an outfit, and the import makes them, so one missing means the release isn't done. */
  required: string[]
  /** Fall back in the games. */
  optional: string[]
  /** The wiki files to save by hand: school and casual stands, which only a new character needs. */
  wikiFiles: string[]
}

/** What the release's art index lacks for its own records. */
export function artGaps(data: RecordSets, art: ArtIndex | null): ArtGaps {
  const gaps: ArtGaps = { required: [], optional: [], wikiFiles: [] }
  const image = (family: keyof ArtIndex['images'], key: string) => art?.images[family]?.[key] !== undefined
  const frame = (family: (typeof ATLAS_FAMILIES)[number], key: string) => art?.atlases[family]?.frames[key] !== undefined

  for (const outfit of data.outfits) {
    const id = String(outfit.id)
    if (!frame('outfit-icons', id)) gaps.required.push(`outfit-icons/${id}`)
    for (const family of ['outfit-portraits', 'outfit-busts', 'outfit-faces', 'outfit-glass'] as const) {
      if (!image(family, id)) gaps.required.push(`${family}/${id}`)
    }
    for (const pose of ['a', 'b'] as const) if (!image('outfit-chibis', `${id}-${pose}`)) gaps.optional.push(`outfit-chibis/${id}-${pose}`)
  }
  for (const characterId of new Set(data.outfits.map((outfit) => outfit.characterId))) {
    for (const look of DRESS_LOOKS) {
      if (image('character-dresses', `${characterId}-${look}`)) continue
      gaps.optional.push(`character-dresses/${characterId}-${look}`)
      gaps.wikiFiles.push(standName(String(characterId), look))
    }
    if (!image('character-faces', String(characterId))) gaps.optional.push(`character-faces/${characterId}`)
  }
  for (const card of data.supportCards) {
    if (!frame('support-card-icons', String(card.id))) gaps.optional.push(`support-card-icons/${card.id}`)
    if (!image('support-card-art', String(card.id))) gaps.optional.push(`support-card-art/${card.id}`)
  }
  for (const scenario of data.scenarios) if (!frame('scenario-icons', String(scenario.id))) gaps.optional.push(`scenario-icons/${scenario.id}`)
  const icons = new Set(data.skills.flatMap((skill) => (skill.globalIconId === null ? [skill.iconId] : [skill.iconId, skill.globalIconId])))
  for (const icon of [...icons].sort((left, right) => left - right)) if (!frame('skill-icons', String(icon))) gaps.optional.push(`skill-icons/${icon}`)
  return gaps
}

/** The wiki's own page for a file. Its robots.txt closes `/w/`, where the images sit, so these are for saving by hand. */
export const wikiPage = (file: string): string => `https://umamusu.wiki/File:${file}`
