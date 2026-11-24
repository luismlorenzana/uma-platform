// Character Art's master-data references, published universe pictures and exact Ranker identities.
import type { ArtIndex } from '@luismlorenzana/uma-data'
import { PLAYABLE_TIERS, type AnyTier } from '@uma-platform/tiers'
import { request } from '../../api/client'
import { CONTENT } from '../../content/client'

export interface AlbumEntry {
  outfitId: number
  characterId: number
  /** The Uma she is: her character's name, or her sister's. */
  name: string
  /** The outfit's title, e.g. her original or a seasonal dress. */
  title: string
  /** Her character's name, when she is a sister. */
  sisterOf: string | null
  sister: { relation: string; age: string; profile: string } | null
  /** Her tier on Playable Umas, and her place in the whole ranking. */
  tier: AnyTier | null
  order: number | null
}

export interface AlbumData {
  entries: AlbumEntry[]
  art: ArtIndex | null
  release: string
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
    const [outfits, characters, art, order] = await Promise.all([
      client.set(manifest, 'outfits'), client.set(manifest, 'characters'), client.art(manifest), request<Order>('/api/art/order'),
    ])
    // Names and titles as the Ranker shows them (the Global text first), so both pages say the same.
    const names = new Map(characters.map((c) => [c.id as number, c.name.global ?? c.name.en ?? c.name.ja]))
    const ranked = new Map(order.outfits.map((o) => [o.outfitId, o]))
    const entries = outfits
      .filter((o) => art?.images['outfit-portraits']?.[String(o.id)] || art?.images['outfit-renders']?.[String(o.id)])
      .map((o): AlbumEntry => {
        const r = ranked.get(o.id as number), character = names.get(o.characterId as number) ?? `#${o.characterId}`
        return {
          outfitId: o.id as number, characterId: o.characterId as number, name: r?.name ?? character,
          title: (o.title.global ?? o.title.en ?? o.title.ja).replace(/^\[(.*)\]$/, '$1'),
          sisterOf: r?.sister ? character : null, sister: r?.sister ?? null, tier: r?.tier ?? null, order: r?.order ?? null,
        }
      })
      .sort(byPlace)
    return { entries, art, release: manifest.version }
  })()
  album.catch(() => { album = null })
  return album
}

/** A universe look (CA4, P162): an owner-approved picture of an Uma in another world, published by `pnpm art:push`. */
export interface UniverseLook {
  duo?: { id: string; members: { castId: string; character: string; role: 'character' | 'boss-ally'; characterId: number | null; outfitId?: number }[] }
  category?: import('./categories').ArtCategory
  id: string
  /** A full-body look, or a splash illustration (P175); absent from an older API, which means a look. */
  kind?: 'look' | 'splash'
  character: string
  /** Her real character, resolved by a master or Ranker sister name; null for an unknown name. */
  characterId: number | null
  /** The selected outfit when this art belongs to a sister. */
  outfitId?: number
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
/** One piece of a universe's dialogue portraits (CA5, P169): an outfit's neutral crop or an expression's face. The page
 *  shows the pieces; the games compose the states. Or an outfit's profile picture (P180), the square master data ships. */
export interface PortraitPiece {
  kind: 'crop' | 'face' | 'profile'
  id: string
  character: string
  characterId: number | null
  outfitId?: number
  outfit: string | null
  expression: string | null
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
}
export interface UniversePortraits { states: number; approvedOn: string | null; publishedAt: string | null; pieces: PortraitPiece[] }
/** Her profile pictures (P180): one square a base, as the master data release named ships them. */
export interface UniverseProfiles { size: number | null; release: string | null; publishedAt: string | null; pieces: PortraitPiece[] }
export interface Universe {
  id: string; title: string; style: string | null; revision: number | null; publishedAt: string | null; looks: UniverseLook[]
  portraits?: UniversePortraits | null
  profiles?: UniverseProfiles | null
}

let universes: Promise<Universe[]> | null = null
const hiddenWorlds = new Set(['rpg', 'uma-rpg', 'quest', 'uma-quest', 'high-fantasy'])
/** Every published universe, loaded once a visit; `fresh` reads them again. */
export function loadUniverses(fresh = false): Promise<Universe[]> {
  if (fresh) universes = null
  universes ??= request<Universe[]>('/api/art/universes').then(all => all.filter(world => !hiddenWorlds.has(world.id)))
  universes.catch(() => { universes = null })
  return universes
}

/** A character's looks, dialogue portrait pieces (crops before faces) and profile pictures in every universe that has one
 *  of hers. */
export function looksOf(all: readonly Universe[], characterId: number, outfitId?: number): { universe: Universe; looks: UniverseLook[]; splash: UniverseLook[]; pieces: PortraitPiece[]; profiles: PortraitPiece[] }[] {
  const hers = (piece: { characterId: number | null; outfitId?: number }) => piece.characterId === characterId && piece.outfitId === outfitId
  return all.filter(universe => !hiddenWorlds.has(universe.id)).map((universe) => {
    const pieces = (universe.portraits?.pieces ?? []).filter(hers)
    const looks = universe.looks.filter(look => hers(look) || look.duo?.members.some(member => member.role === 'character' && hers(member)))
    return {
      universe, looks: looks.filter((l) => l.kind !== 'splash'), splash: looks.filter((l) => l.kind === 'splash'),
      pieces: [...pieces.filter((p) => p.kind === 'crop'), ...pieces.filter((p) => p.kind === 'face')],
      profiles: (universe.profiles?.pieces ?? []).filter(hers),
    }
  }).filter((g) => g.looks.length > 0 || g.splash.length > 0 || g.pieces.length > 0 || g.profiles.length > 0)
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
