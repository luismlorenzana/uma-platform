import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadCatalog } from './catalog.js'
import { loadEnemyCatalog } from './enemy-catalog.js'
import { parseEnemyRankings } from './enemy-model.js'
import { parseRankings } from './model.js'
import { CATEGORIES, LEGACY_TIER, leadOutfit, type Category, type EnemyUnit, type Franchise, type LegacyBoards, type TierCatalog, type UmaCharacter } from './tier-model.js'

/** Locally imported franchises (P115): `content/authoring/enemies/imports/<franchise>.json`. */
export const IMPORTED = ['genshin', 'wuwa', 'hsr', 'zzz', 'hi3', 'pgr'] as const
export type ImportedFranchise = typeof IMPORTED[number]
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
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const IMPORT_PREFIX: Record<ImportedFranchise, string> = { genshin: 'gi-', wuwa: 'ww-', hsr: 'hsr-', zzz: 'zzz-', hi3: 'hi3-', pgr: 'pgr-' }

/** Only images the importer wrote: `assets/enemies/<id>-<kind>.<hash8>.webp`, never another local path. */
export function parseEnemyImport(value: unknown): EnemyImport {
  if (!object(value) || value.schemaVersion !== 1 || value.kind !== 'enemy-import' || !IMPORTED.includes(value.franchise as ImportedFranchise) ||
      typeof value.source !== 'string' || typeof value.filter !== 'string' || typeof value.importedAt !== 'string' || !Array.isArray(value.units)) {
    throw new Error('Invalid enemy import (schemaVersion 1).')
  }
  const franchise = value.franchise as ImportedFranchise, prefix = IMPORT_PREFIX[franchise], seen = new Set<string>()
  const units = value.units.map((u: unknown): ImportUnit => {
    if (!object(u) || typeof u.id !== 'string' || !u.id.startsWith(prefix) || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(u.id) || seen.has(u.id) ||
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

export async function loadImports(content: string): Promise<EnemyImport[]> {
  const folder = resolve(content, 'authoring/enemies/imports')
  const files = await readdir(folder).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return [] as string[]; throw error })
  const result: EnemyImport[] = []
  for (const franchise of IMPORTED) {
    if (files.includes(`${franchise}.json`)) {
      const parsed = parseEnemyImport(JSON.parse(await readFile(resolve(folder, `${franchise}.json`), 'utf8')) as unknown)
      if (parsed.franchise !== franchise) throw new Error(`${franchise}.json holds another franchise.`)
      result.push(parsed)
    }
  }
  return result
}

async function maybe<T>(path: string, parse: (v: unknown) => T): Promise<T | null> {
  try { return parse(JSON.parse(await readFile(path, 'utf8')) as unknown) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}

/** The old boards, read only: the outfit roster stays the sprite queue's input (P114), the enemy roster is history. */
export async function loadLegacy(content: string): Promise<LegacyBoards> {
  const outfits = await maybe(resolve(content, 'authoring/uma-art-roster.json'), parseRankings)
  const enemies = await maybe(resolve(content, 'authoring/enemy-art-roster.json'), parseEnemyRankings)
  return {
    outfits: outfits?.rankings.map((r) => ({ outfitId: r.outfitId, characterId: r.characterId, tier: r.tier })) ?? [],
    enemies: enemies?.rankings.map((r) => ({ enemyId: r.enemyId, bucket: r.bucket, tier: r.tier, note: r.note })) ?? [],
  }
}

/** Every Uma character with an outfit, and every enemy unit; image paths are the Studio's own URLs. */
export async function loadTierCatalog(content: string): Promise<{ catalog: TierCatalog; legacy: LegacyBoards; imports: EnemyImport[] }> {
  const release = resolve(content, 'release')
  const [outfits, base, imports, legacy] = await Promise.all([loadCatalog(release), loadEnemyCatalog(content), loadImports(content), loadLegacy(content)])
  const outfitTier = new Map(legacy.outfits.map((r) => [r.outfitId, LEGACY_TIER[r.tier] ?? null]))
  const byCharacter = new Map<number, UmaCharacter>()
  for (const o of outfits.umas) {
    const character = byCharacter.get(o.characterId) ?? { id: String(o.characterId), name: o.name, face: null, portrait: null, outfits: [], lead: o.id }
    character.outfits.push({ id: o.id, title: o.title, original: o.original, way: o.bucket, strategy: { ...o.strategy }, face: o.face, portrait: o.portrait, before: outfitTier.get(o.id) ?? null })
    byCharacter.set(o.characterId, character)
  }
  const umas = [...byCharacter.values()].map((c) => {
    c.outfits.sort((a, b) => Number(b.original) - Number(a.original) || a.id - b.id)
    // Her face is her original outfit's; her playstyle starts from her lead outfit (P117).
    const first = c.outfits[0], lead = leadOutfit(c.outfits) ?? first
    return { ...c, face: first?.face ?? null, portrait: first?.portrait ?? null, lead: lead?.id ?? 0 }
  }).sort((a, b) => a.name.localeCompare(b.name) || Number(a.id) - Number(b.id))
  const old = new Map(legacy.enemies.map((r) => [r.enemyId, r]))
  const url = (images: Partial<Record<'face' | 'art' | 'splash', string>>) => Object.fromEntries(Object.entries(images).map(([k, p]) => [k, `/enemy-assets/${p}`]))
  const enemies: EnemyUnit[] = [
    ...base.units.map((u): EnemyUnit => {
      const row = old.get(u.id)
      return {
        id: u.id, name: u.name, franchise: u.franchise as Franchise, category: u.sourceTier, studyAvailable: u.studyAvailable, images: url(u.images), details: [],
        before: { role: row?.bucket ?? u.defaultBucket, tier: row?.tier ? LEGACY_TIER[row.tier] ?? null : null },
      }
    }),
    ...imports.flatMap((i) => i.units.map((u): EnemyUnit => ({
      id: u.id, name: u.name, franchise: i.franchise, category: u.category, studyAvailable: false, images: url(u.images), details: u.details, before: null,
    }))),
  ].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  return { catalog: { release: outfits.release, umas, enemies }, legacy, imports }
}

/** The enemy image files the Studio may serve, relative to `content/authoring/enemies`. */
export function enemyImageFiles(catalog: TierCatalog): Set<string> {
  return new Set(catalog.enemies.flatMap((u) => Object.values(u.images)).map((p) => p!.slice('/enemy-assets/'.length)))
}
