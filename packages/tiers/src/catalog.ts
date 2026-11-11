// The catalog the boards rank, assembled from what the API or a script has read (pure: no files here). Umas come from the
// master data release; enemies from the private enemy catalog (uma-rpg's release) and the local franchise imports
// (P115–P120); the old boards' tiers ride along as hints. Images are paths, resolved by whoever draws them: release paths
// (`art/…`) for Umas, pack paths (`assets/enemies/…`) for enemies.
import type { ArtIndex, Character, Outfit } from '@luismlorenzana/uma-data'
import { CATEGORIES, LEGACY_TIER, wayOf, type Category, type EnemyUnit, type Franchise, type Tier, type TierCatalog, type UmaCharacter } from './model.js'

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// ---- The private enemy catalog (uma-rpg's enemy release, Azur Lane and NIKKE) ----

export interface CatalogEnemy {
  id: string
  name: string
  franchise: 'azurlane' | 'nikke'
  sourceTier: 'regular' | 'key' | 'subboss' | 'boss'
  defaultBucket: 'regular' | 'elite' | 'boss'
  studyAvailable: boolean
  images: Partial<Record<'face' | 'art' | 'splash', string>>
}
export interface EnemyCatalogFile { schemaVersion: 1; sourceVersion: string; sources: string[]; importedAt: string; units: CatalogEnemy[] }
const enemyIdPattern = /^[a-z0-9][a-z0-9-]{0,99}$/

export function parseEnemyCatalog(value: unknown): EnemyCatalogFile {
  if (!object(value) || value.schemaVersion !== 1 || typeof value.sourceVersion !== 'string' ||
      !Array.isArray(value.sources) || !value.sources.every((s) => typeof s === 'string') ||
      typeof value.importedAt !== 'string' || !Array.isArray(value.units)) throw new Error('Invalid private enemy catalog.')
  const seen = new Set<string>()
  const units = value.units.map((u: unknown): CatalogEnemy => {
    if (!object(u) || typeof u.id !== 'string' || !enemyIdPattern.test(u.id) || seen.has(u.id) ||
        typeof u.name !== 'string' || !u.name.trim() || !['azurlane', 'nikke'].includes(String(u.franchise)) ||
        !['regular', 'key', 'subboss', 'boss'].includes(String(u.sourceTier)) || !['regular', 'elite', 'boss'].includes(String(u.defaultBucket)) ||
        typeof u.studyAvailable !== 'boolean' || !object(u.images)) throw new Error('Invalid or duplicate enemy entry.')
    seen.add(u.id)
    const images: CatalogEnemy['images'] = {}
    for (const kind of ['face', 'art', 'splash'] as const) {
      const path = u.images[kind]
      if (path === undefined) continue
      if (typeof path !== 'string' || !new RegExp(`^assets/enemies/[a-z0-9-]+-${kind}\\.[a-f0-9]{8}\\.webp$`).test(path)) throw new Error('Invalid enemy image path.')
      images[kind] = path
    }
    return { id: u.id, name: u.name, franchise: u.franchise as CatalogEnemy['franchise'], sourceTier: u.sourceTier as CatalogEnemy['sourceTier'], defaultBucket: u.defaultBucket as CatalogEnemy['defaultBucket'], studyAvailable: u.studyAvailable, images }
  })
  return { schemaVersion: 1, sourceVersion: value.sourceVersion, sources: value.sources as string[], importedAt: value.importedAt, units }
}

// ---- The franchise imports (P115–P120) ----

export const IMPORTED = ['genshin', 'wuwa', 'hsr', 'zzz', 'hi3', 'pgr'] as const
export type ImportedFranchise = typeof IMPORTED[number]
export const IMPORT_PREFIX: Record<ImportedFranchise, string> = { genshin: 'gi-', wuwa: 'ww-', hsr: 'hsr-', zzz: 'zzz-', hi3: 'hi3-', pgr: 'pgr-' }
export interface ImportUnit { id: string; name: string; category: Category; details: string[]; images: { face?: string; art?: string; splash?: string } }
export interface EnemyImport {
  schemaVersion: 1
  kind: 'enemy-import'
  franchise: ImportedFranchise
  /** Where the roster and images came from, and the filter applied. */
  source: string
  filter: string
  importedAt: string
  units: ImportUnit[]
}

/** Only images the importer wrote: `assets/enemies/<id>-<kind>.<hash8>.webp`, never another path. */
export function parseEnemyImport(value: unknown): EnemyImport {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'enemy-import' || !IMPORTED.includes(value.franchise as ImportedFranchise) ||
      typeof value.source !== 'string' || typeof value.filter !== 'string' || typeof value.importedAt !== 'string' || !Array.isArray(value.units)) {
    throw new Error('Invalid enemy import (schemaVersion 1).')
  }
  const franchise = value.franchise as ImportedFranchise, prefix = IMPORT_PREFIX[franchise], seen = new Set<string>()
  const units = value.units.map((u: unknown): ImportUnit => {
    if (!object(u) || typeof u.id !== 'string' || !u.id.startsWith(prefix) || !enemyIdPattern.test(u.id) || seen.has(u.id) ||
        typeof u.name !== 'string' || !u.name.trim() || !CATEGORIES.some((c) => c.id === u.category) ||
        !Array.isArray(u.details) || !u.details.every((d) => typeof d === 'string' && d.length <= 40) || !object(u.images)) {
      throw new Error('Invalid or duplicate imported unit.')
    }
    seen.add(u.id)
    const images: ImportUnit['images'] = {}
    for (const kind of ['face', 'art', 'splash'] as const) {
      const path = u.images[kind]
      if (path === undefined) continue
      if (typeof path !== 'string' || !new RegExp(`^assets/enemies/${u.id}-${kind}\\.[a-f0-9]{8}\\.webp$`).test(path)) throw new Error('Invalid imported image path.')
      images[kind] = path
    }
    return { id: u.id, name: u.name, category: u.category as Category, details: [...u.details as string[]], images }
  })
  return { schemaVersion: 1, kind: 'enemy-import', franchise, source: value.source, filter: value.filter, importedAt: value.importedAt, units }
}

// ---- The old boards' tiers, as hints ----

/** What the cards show of the old boards (P113, P114, P131): read once from the old files, never written. */
export interface LegacyHints {
  schemaVersion: 1
  kind: 'tier-legacy'
  /** The old outfit board (2026-11-06), per outfit, on its own scale (SS, A1, A2, B, F). */
  outfits: { outfitId: number; characterId: number; tier: string }[]
  /** The old per-character Playable Umas board (P114–P125), on the lettered scale, in its order. */
  characters: { characterId: number; tier: Tier }[]
  /** The old enemy board's rows, in its authoring order. */
  enemies: { enemyId: string; bucket: 'regular' | 'elite' | 'boss'; tier: string | null; note: string }[]
}
export const emptyLegacy = (): LegacyHints => ({ schemaVersion: 1, kind: 'tier-legacy', outfits: [], characters: [], enemies: [] })

export function parseLegacy(value: unknown): LegacyHints {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'tier-legacy' || !Array.isArray(value.outfits) || !Array.isArray(value.characters) || !Array.isArray(value.enemies)) {
    throw new Error('Invalid tier legacy hints (schemaVersion 1).')
  }
  const positive = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0
  return {
    schemaVersion: 1, kind: 'tier-legacy',
    outfits: value.outfits.map((r: unknown) => {
      if (!object(r) || !positive(r.outfitId) || !positive(r.characterId) || typeof r.tier !== 'string') throw new Error('Invalid legacy outfit row.')
      return { outfitId: Number(r.outfitId), characterId: Number(r.characterId), tier: r.tier }
    }),
    characters: value.characters.map((r: unknown) => {
      if (!object(r) || !positive(r.characterId) || !['SSS', 'SS', 'S', 'A', 'B', 'F'].includes(String(r.tier))) throw new Error('Invalid legacy character row.')
      return { characterId: Number(r.characterId), tier: r.tier as Tier }
    }),
    enemies: value.enemies.map((r: unknown) => {
      if (!object(r) || typeof r.enemyId !== 'string' || !['regular', 'elite', 'boss'].includes(String(r.bucket)) || !(r.tier === null || typeof r.tier === 'string') || typeof r.note !== 'string') {
        throw new Error('Invalid legacy enemy row.')
      }
      return { enemyId: r.enemyId, bucket: r.bucket as 'regular' | 'elite' | 'boss', tier: r.tier as string | null, note: r.note }
    }),
  }
}

// ---- Assembly ----

export interface CatalogInput {
  release: string
  characters: readonly Pick<Character, 'id' | 'name'>[]
  outfits: readonly Pick<Outfit, 'id' | 'characterId' | 'title' | 'variant' | 'aptitudes'>[]
  art: ArtIndex | null
  enemies: EnemyCatalogFile | null
  imports: readonly EnemyImport[]
  legacy: LegacyHints
}

/** Every Uma character with an outfit (outfits original first), and every enemy unit, each sorted by name. */
export function buildCatalog(input: CatalogInput): TierCatalog {
  const names = new Map(input.characters.map((c) => [c.id, c.name.global ?? c.name.en ?? c.name.ja]))
  const outfitTier = new Map(input.legacy.outfits.map((r) => [r.outfitId, LEGACY_TIER[r.tier] ?? null]))
  const characterTier = new Map(input.legacy.characters.map((r) => [String(r.characterId), r.tier]))
  const image = (family: string, key: string) => (input.art?.images as Partial<Record<string, Record<string, { path: string }>>> | undefined)?.[family]?.[key]?.path ?? null
  const byCharacter = new Map<number, UmaCharacter>()
  for (const o of input.outfits) {
    const id = String(o.id), face = image('outfit-faces', id) ?? image('outfit-busts', id) ?? image('outfit-portraits', id)
    const character = byCharacter.get(o.characterId) ?? { id: String(o.characterId), name: names.get(o.characterId) ?? `Uma ${o.characterId}`, face: null, portrait: null, outfits: [], before: characterTier.get(String(o.characterId)) ?? null }
    character.outfits.push({
      id: o.id, title: (o.title.global ?? o.title.en ?? o.title.ja).replace(/^\[(.*)\]$/, '$1'), original: o.variant === null, way: wayOf(o.aptitudes.strategy), strategy: { ...o.aptitudes.strategy },
      face, portrait: image('outfit-busts', id) ?? image('outfit-portraits', id) ?? face, before: outfitTier.get(o.id) ?? null,
    })
    byCharacter.set(o.characterId, character)
  }
  const umas = [...byCharacter.values()].map((c) => {
    c.outfits.sort((a, b) => Number(b.original) - Number(a.original) || a.id - b.id)
    return { ...c, face: c.outfits[0]?.face ?? null, portrait: c.outfits[0]?.portrait ?? null }
  }).sort((a, b) => a.name.localeCompare(b.name) || Number(a.id) - Number(b.id))
  const old = new Map(input.legacy.enemies.map((r) => [r.enemyId, r]))
  const enemies: EnemyUnit[] = [
    ...(input.enemies?.units ?? []).map((u): EnemyUnit => {
      const row = old.get(u.id)
      return {
        id: u.id, name: u.name, franchise: u.franchise as Franchise, category: u.sourceTier, studyAvailable: u.studyAvailable, images: { ...u.images }, details: [],
        before: { role: row?.bucket ?? u.defaultBucket, tier: row?.tier ? LEGACY_TIER[row.tier] ?? null : null },
      }
    }),
    ...input.imports.flatMap((i) => i.units.map((u): EnemyUnit => ({
      id: u.id, name: u.name, franchise: i.franchise, category: u.category, studyAvailable: false, images: { ...u.images }, details: u.details, before: null,
    }))),
  ].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  return { release: input.release, umas, enemies }
}

/** The pack paths of every enemy image the catalog may show: the only ones the API serves. */
export function enemyImagePaths(catalog: TierCatalog): Set<string> {
  return new Set(catalog.enemies.flatMap((u) => Object.values(u.images).filter((p): p is string => typeof p === 'string')))
}
