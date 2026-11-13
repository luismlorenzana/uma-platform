// What Character Art shows (CA1, adapted from uma-quest's album/data.ts at 6c572e6): every outfit in master data with her
// name and title, the art master data holds for her, which have adult keys, and, from the Ranker (/api/art/order), the
// Uma she is (a sister's name and profile) and her tier and place. Read at run time, never from git.
import type { ArtIndex } from '@luismlorenzana/uma-data'
import { PLAYABLE_TIERS, type AnyTier } from '@uma-platform/tiers'
import { request } from '../../api/client'
import { CONTENT } from '../../content/client'
import { KEYS } from './content'
import { keyOutfitIds } from './keys'

export interface AlbumEntry {
  outfitId: number
  characterId: number
  /** The Uma she is: her character's name, or her sister's. */
  name: string
  /** The outfit's title, e.g. her original or a seasonal dress. */
  title: string
  /** She has an adult battle set (uma-quest's Q44, Q46) in the key pack. */
  adult: boolean
  /** Her character's name, when she is a sister. */
  sisterOf: string | null
  sister: { relation: string; age: string; profile: string } | null
  /** Her tier on Playable Umas, and her place in the whole ranking. */
  tier: AnyTier | null
  order: number | null
  /** She has a chibi sprite set in master data (`outfit-sprites`, CA2). */
  sprite: boolean
}

/** A support card of her character's, with its art (CA2). */
export interface SupportCard { id: number; title: string; rarity: 1 | 2 | 3; type: string; art: string | null }

export interface AlbumData {
  entries: AlbumEntry[]
  art: ArtIndex | null
  release: string
  /** Each character's support cards, SSR first (CA2). */
  cards: Map<number, SupportCard[]>
}

interface Order {
  release: string
  outfits: { outfitId: number; name: string; sister: AlbumEntry['sister']; tier: AnyTier | null; order: number | null }[]
}

let album: Promise<AlbumData> | null = null

/** The Album's rows, loaded once a visit; `fresh` reloads the Ranker's order. */
export function loadAlbum(fresh = false): Promise<AlbumData> {
  if (fresh) album = null
  album ??= (async () => {
    const client = await CONTENT.release()
    const manifest = await CONTENT.manifest()
    const [outfits, characters, supports, art, adult, order] = await Promise.all([
      client.set(manifest, 'outfits'), client.set(manifest, 'characters'), client.set(manifest, 'support-cards'), client.art(manifest),
      keyOutfitIds(KEYS).catch(() => [] as number[]), request<Order>('/api/art/order'),
    ])
    // Names and titles as the Ranker shows them (the Global text first), so both pages say the same.
    const names = new Map(characters.map((c) => [c.id as number, c.name.global ?? c.name.en ?? c.name.ja]))
    const ranked = new Map(order.outfits.map((o) => [o.outfitId, o]))
    const keyed = new Set(adult)
    const entries = outfits
      .filter((o) => art?.images['outfit-portraits']?.[String(o.id)] || keyed.has(o.id as number))
      .map((o): AlbumEntry => {
        const r = ranked.get(o.id as number), character = names.get(o.characterId as number) ?? `#${o.characterId}`
        return {
          outfitId: o.id as number, characterId: o.characterId as number, name: r?.name ?? character,
          title: (o.title.global ?? o.title.en ?? o.title.ja).replace(/^\[(.*)\]$/, '$1'), adult: keyed.has(o.id as number),
          sisterOf: r?.sister ? character : null, sister: r?.sister ?? null, tier: r?.tier ?? null, order: r?.order ?? null,
          sprite: !!art?.sprites?.[String(o.id)],
        }
      })
      .sort(byPlace)
    const cards = new Map<number, SupportCard[]>()
    for (const c of supports) {
      const list = cards.get(c.characterId as number) ?? []
      list.push({ id: c.id as number, title: (c.title.global ?? c.title.en ?? c.title.ja).replace(/^\[(.*)\]$/, '$1'), rarity: c.rarity as 1 | 2 | 3, type: c.type, art: art?.images['support-card-art']?.[String(c.id)]?.path ?? null })
      cards.set(c.characterId as number, list)
    }
    for (const list of cards.values()) list.sort((a, b) => b.rarity - a.rarity || a.id - b.id)
    return { entries, art, release: manifest.version, cards }
  })()
  album.catch(() => { album = null })
  return album
}

/** A universe look (CA4, P162): an owner-approved picture of an Uma in another world, published by `pnpm art:push`. */
export interface UniverseLook {
  id: string
  character: string
  /** Her character in master data, found by name; null when no character has that name. */
  characterId: number | null
  outfit: string
  title: string
  /** Her PNG's pack path, read at /api/art/content/…; `bytes` and `sha256` check it. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  publishedAt: string | null
}
export interface Universe { id: string; title: string; style: string | null; revision: number | null; publishedAt: string | null; looks: UniverseLook[] }

let universes: Promise<Universe[]> | null = null
/** Every published universe, loaded once a visit; `fresh` reads them again. */
export function loadUniverses(fresh = false): Promise<Universe[]> {
  if (fresh) universes = null
  universes ??= request<Universe[]>('/api/art/universes')
  universes.catch(() => { universes = null })
  return universes
}

/** A character's looks in every universe that has one of hers. */
export function looksOf(all: readonly Universe[], characterId: number): { universe: Universe; looks: UniverseLook[] }[] {
  return all.map((universe) => ({ universe, looks: universe.looks.filter((l) => l.characterId === characterId) })).filter((g) => g.looks.length > 0)
}

/** How many looks each character has across the universes, for her tiles. */
export function lookCounts(all: readonly Universe[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const universe of all) for (const look of universe.looks) if (look.characterId !== null) counts.set(look.characterId, (counts.get(look.characterId) ?? 0) + 1)
  return counts
}

/** The Ranker's order: ranked first by place, then by name. */
export function byPlace(a: AlbumEntry, b: AlbumEntry): number {
  return (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name) || a.outfitId - b.outfitId
}

export interface Section { id: AnyTier | 'unranked'; entries: AlbumEntry[] }
/** The album laid out as the Ranker ranks: T1 to T10 in order, then the unranked, then F (P135). */
export function sections(entries: readonly AlbumEntry[]): Section[] {
  const tiers: Section[] = PLAYABLE_TIERS.map((t) => ({ id: t.id, entries: entries.filter((e) => e.tier === t.id).sort(byPlace) }))
  const unranked: Section = { id: 'unranked', entries: entries.filter((e) => e.tier === null).sort(byPlace) }
  return [...tiers.filter((s) => s.id !== 'F'), unranked, tiers.find((s) => s.id === 'F')!]
}

/** How many Umas a set of entries holds: a sister is her own Uma; two outfits of one Uma count once. */
export function umaCount(entries: readonly AlbumEntry[]): number {
  return new Set(entries.map((e) => (e.sister ? `s${e.outfitId}` : String(e.characterId)))).size
}

/** One picture of hers: a label and its release path. */
export interface AlbumPicture { label: string; path: string; width: number; height: number }

/** Every picture master data holds for an outfit and her character, in the order the Album shows them. */
export function picturesOf(art: ArtIndex | null, entry: Pick<AlbumEntry, 'outfitId' | 'characterId'>): AlbumPicture[] {
  if (!art) return []
  const o = String(entry.outfitId), c = String(entry.characterId)
  const images = art.images as Partial<Record<string, Record<string, { path: string; width: number; height: number }>>>
  const pick = (family: string, key: string, label: string): AlbumPicture[] => {
    const img = images[family]?.[key]
    return img ? [{ label, path: img.path, width: img.width, height: img.height }] : []
  }
  return [
    ...pick('outfit-portraits', o, 'Portrait'),
    ...pick('outfit-busts', o, 'Bust'),
    ...pick('outfit-faces', o, 'Face'),
    ...pick('outfit-glass', o, 'Glass window'),
    ...pick('outfit-chibis', `${o}-a`, 'Chibi A'),
    ...pick('outfit-chibis', `${o}-b`, 'Chibi B'),
    ...pick('character-faces', c, 'Character face'),
    ...(['gym', 'summer', 'winter', 'casual'] as const).flatMap((d) => pick('character-dresses', `${c}-${d}`, `${d[0]!.toUpperCase()}${d.slice(1)} dress`)),
  ]
}

/** Her full-body 3D render, head to toe (master data's `outfit-renders`, 1.5.0, P137): the reference for authoring her. */
export function renderOf(art: ArtIndex | null, outfitId: number): AlbumPicture | null {
  const images = art?.images as Partial<Record<string, Record<string, { path: string; width: number; height: number }>>> | undefined
  const img = images?.['outfit-renders']?.[String(outfitId)]
  return img ? { label: 'Full body', path: img.path, width: img.width, height: img.height } : null
}

/** The small picture a grid tile shows: her face crop, else her bust or portrait. */
export function tileOf(art: ArtIndex | null, outfitId: number): string | null {
  const o = String(outfitId)
  return art?.images['outfit-faces']?.[o]?.path ?? art?.images['outfit-busts']?.[o]?.path ?? art?.images['outfit-portraits']?.[o]?.path ?? null
}
