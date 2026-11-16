// The enemy cast folders (P200): every boss and lieutenant the owner cast in the Ranker for a game (Uma Cyberpunk's cast
// page, EC1), one folder per character in each enemy authoring app, ready for ChatGPT to author her in:
//
//   <universe>/<app>/cast/tier-<n>/<NN>-<uma>/<enemy>/
//     character.json      who she is, whom she opposes, her place in the cast, her references and their hashes
//     references/         the Ranker's own pictures of her (art, face, splash), byte for byte
//     v001/ …             her studies, as the app's packet says; the cast album shows every picture under her folder
//
// The apps: the bosses' armour looks (`enemies/`), the bosses' casual looks (`enemies/casual/`), and the lieutenants
// (`enemies/lieutenants/`, P200). It reads the local Ranker (`pnpm ranker:pull`): the plan's `enemyCasts.<game>` for the
// cast, and the catalog and imports for each unit's pictures. Nothing is ever deleted: a character cast elsewhere moves
// with her work; one no longer cast keeps her folder and is reported. Names stay in the local folders, never in git.
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { content, encode, slashed, write } from './lib.js'

export const rankerDir = resolve(process.env.RANKER_DIR ?? resolve(content, 'authoring/ranker'))
export const CHARACTER = 'character.json'

export type Role = 'boss' | 'lieutenant'
export interface CastApp { id: 'bosses' | 'casual' | 'lieutenants'; title: string; dir: string; role: Role }
/** The enemy authoring apps and whom each authors: the bosses twice (armour and casual), the lieutenants once. */
export const CAST_APPS: readonly CastApp[] = [
  { id: 'bosses', title: 'Bosses', dir: 'enemies', role: 'boss' },
  { id: 'casual', title: 'Bosses, casual', dir: 'enemies/casual', role: 'boss' },
  { id: 'lieutenants', title: 'Lieutenants', dir: 'enemies/lieutenants', role: 'lieutenant' },
]

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
/** "Foe One (Night)" is `foe-one-night`; a name with no Latin letters falls back to the unit's id. */
export const slugOf = (name: string, id: string): string => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || id

export interface Unit { id: string; name: string; franchise: string | null; images: Record<string, string> }
/** Every enemy unit the Ranker knows, with its pictures: the catalog's, then each import's. */
export function rankerUnits(dir = rankerDir): Map<string, Unit> {
  const units = new Map<string, Unit>()
  const add = (raw: unknown, franchise: string | null) => {
    if (!object(raw) || !text(raw.id)) return
    const id = raw.id as string, before = units.get(id)
    const images = object(raw.images) ? Object.fromEntries(Object.entries(raw.images).filter((e): e is [string, string] => typeof e[1] === 'string')) : {}
    units.set(id, { id, name: text(raw.name) ?? before?.name ?? id, franchise: text(raw.franchise) ?? franchise ?? before?.franchise ?? null, images: { ...before?.images, ...images } })
  }
  const catalog = join(dir, 'catalog', 'enemies.json')
  if (existsSync(catalog)) { const c = JSON.parse(readFileSync(catalog, 'utf8')) as unknown; if (object(c) && Array.isArray(c.units)) for (const u of c.units) add(u, null) }
  const imports = join(dir, 'imports')
  if (existsSync(imports)) for (const f of readdirSync(imports).filter((f) => f.endsWith('.json')).sort()) {
    const j = JSON.parse(readFileSync(join(imports, f), 'utf8')) as unknown
    if (object(j) && Array.isArray(j.units)) for (const u of j.units) add(u, text(j.franchise))
  }
  return units
}

export interface CastFaction { id: string; title: string; color: string | null }
export interface CastMember { id: string; name: string; franchise: string | null; rankerTier: string | null }
export interface CastUma { id: string; name: string; tier: string; order: number; faction: CastFaction | null; boss: CastMember | null; lieutenants: CastMember[] }
export interface Cast { game: string; revision: number | null; updatedAt: string | null; umas: CastUma[] }

/** The plan's cast for a game: every Uma with a boss cast to her, in tier and board order. */
export function castOf(plan: unknown, game: string): Cast {
  const cast = object(plan) && object(plan.enemyCasts) ? plan.enemyCasts[game] : null
  if (!object(cast) || !Array.isArray(cast.tiers)) throw new Error(`The Ranker's plan has no enemy cast for ${game}: run pnpm ranker:pull, or cast it on the Ranker first.`)
  const factions = new Map((Array.isArray(cast.factions) ? cast.factions : []).filter(object).flatMap((f) => (text(f.id) ? [[f.id as string, { id: f.id as string, title: text(f.title) ?? (f.id as string), color: text(f.color) }] as const] : [])))
  const member = (m: unknown): CastMember | null => (object(m) && text(m.id) ? { id: m.id as string, name: text(m.name) ?? (m.id as string), franchise: text(m.franchise), rankerTier: text(m.tier) } : null)
  const umas: CastUma[] = []
  for (const t of cast.tiers.filter(object)) for (const u of (Array.isArray(t.umas) ? t.umas : []).filter(object)) {
    const boss = member(u.boss)
    if (!boss) continue
    umas.push({
      id: String(u.uma), name: text(u.name) ?? String(u.uma), tier: text(t.tier) ?? text(u.tier) ?? 'T?', order: typeof u.order === 'number' ? u.order : umas.length + 1,
      faction: text(u.faction) ? factions.get(u.faction as string) ?? { id: u.faction as string, title: u.faction as string, color: null } : null,
      boss, lieutenants: (Array.isArray(u.subBosses) ? u.subBosses : []).flatMap((s) => member(s) ?? []),
    })
  }
  return { game, revision: typeof cast.revision === 'number' ? cast.revision : null, updatedAt: text(cast.updatedAt), umas }
}

/** Where a character's folder goes in an app: `cast/tier-1/01-<uma>/<enemy>`, by name (`cast/tier-1/01-rider-one/foe-one`). */
export const folderOf = (uma: CastUma, who: CastMember): string =>
  ['cast', `tier-${uma.tier.replace(/^T/i, '')}`, `${String(uma.order).padStart(2, '0')}-${slugOf(uma.name, uma.id)}`, slugOf(who.name, who.id)].join('/')

export interface Reference { kind: string; file: string; source: string; sha256: string; bytes: number }
export interface CharacterRecord {
  schemaVersion: 1
  kind: 'enemy-cast-character'
  game: string
  app: CastApp['id']
  role: Role
  id: string
  name: string
  franchise: string | null
  rankerTier: string | null
  uma: { id: string; name: string; tier: string; order: number }
  faction: CastFaction | null
  references: Reference[]
  castRevision: number | null
}

/** Every character folder an app holds now, by id: wherever it sits under `cast/`. */
export function castFolders(appDir: string): Map<string, string> {
  const found = new Map<string, string>(), root = join(appDir, 'cast')
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || !existsSync(dir)) return
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'references') continue
      const folder = join(dir, e.name), file = join(folder, CHARACTER)
      if (existsSync(file)) { const r = JSON.parse(readFileSync(file, 'utf8')) as Partial<CharacterRecord>; if (r.id) found.set(r.id, folder) }
      else walk(folder, depth + 1)
    }
  }
  walk(root, 0)
  return found
}

export interface AppReport { app: CastApp['id']; characters: number; created: string[]; moved: string[]; references: string[]; unchanged: number; leftover: string[]; missing: string[] }

/**
 * Prepares one app's cast folders for the cast: creates each character's folder with her references and record, moves a
 * re-cast character's folder (her work goes with her), refreshes a reference the Ranker changed, and reports what it did.
 * Never deletes. With `dryRun`, says what it would do and writes nothing.
 */
export function prepareApp(universeDir: string, app: CastApp, cast: Cast, units: Map<string, Unit>, options: { dryRun?: boolean; ranker?: string } = {}): AppReport {
  const appDir = join(universeDir, ...app.dir.split('/')), ranker = options.ranker ?? rankerDir
  const report: AppReport = { app: app.id, characters: 0, created: [], moved: [], references: [], unchanged: 0, leftover: [], missing: [] }
  const existing = castFolders(appDir), cast_ids = new Set<string>()
  for (const uma of cast.umas) for (const who of app.role === 'boss' ? [uma.boss!] : uma.lieutenants) {
    report.characters++
    cast_ids.add(who.id)
    const rel = folderOf(uma, who), folder = join(appDir, ...rel.split('/'))
    const unit = units.get(who.id)
    if (!unit || Object.keys(unit.images).length === 0) { report.missing.push(`${who.id}: no pictures in the Ranker`); continue }
    const was = existing.get(who.id)
    let changed = false
    if (was && resolve(was) !== resolve(folder)) {
      if (existsSync(folder)) { report.missing.push(`${who.id}: ${rel} is taken; her folder stays at ${slashed(relative(appDir, was))}`); continue }
      if (!options.dryRun) { mkdirSync(dirname(folder), { recursive: true }); renameSync(was, folder) }
      report.moved.push(`${slashed(relative(appDir, was))} → ${rel}`)
      changed = true
    } else if (!was) { report.created.push(rel); changed = true }
    const references: Reference[] = []
    for (const kind of ['art', 'face', 'splash', ...Object.keys(unit.images).filter((k) => !['art', 'face', 'splash'].includes(k)).sort()]) {
      const source = unit.images[kind]
      if (!source) continue
      const from = join(ranker, ...source.split('/'))
      if (!existsSync(from)) { report.missing.push(`${who.id}: ${source} isn't in the local Ranker (pnpm ranker:pull)`); continue }
      const bytes = readFileSync(from), file = `references/${kind}${extname(source).toLowerCase()}`, to = join(folder, ...file.split('/'))
      if (!existsSync(to) || sha256(readFileSync(to)) !== sha256(bytes)) {
        if (!options.dryRun) { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to) }
        if (was) report.references.push(`${rel}/${file}`)
        changed = true
      }
      references.push({ kind, file, source, sha256: sha256(bytes), bytes: statSync(from).size })
    }
    const record: CharacterRecord = {
      schemaVersion: 1, kind: 'enemy-cast-character', game: cast.game, app: app.id, role: app.role, id: who.id, name: who.name, franchise: who.franchise ?? unit.franchise,
      rankerTier: who.rankerTier, uma: { id: uma.id, name: uma.name, tier: uma.tier, order: uma.order }, faction: uma.faction, references, castRevision: cast.revision,
    }
    if (!options.dryRun && write(join(folder, CHARACTER), encode(record))) changed = true
    else if (options.dryRun && (!existsSync(join(folder, CHARACTER)) || readFileSync(join(folder, CHARACTER), 'utf8') !== encode(record))) changed = true
    if (!changed) report.unchanged++
  }
  for (const [id, folder] of existing) if (!cast_ids.has(id)) report.leftover.push(`${id} (${slashed(relative(appDir, folder))}): no longer cast here; her folder stays`)
  return report
}

/** The words a new cast album starts with, written once beside its page; the owner's words replace them freely. */
export function castWords(app: CastApp, game: string): Record<string, unknown> {
  const [noun, plural] = app.role === 'boss' ? ['boss', 'bosses'] : ['lieutenant', 'lieutenants']
  return {
    note: "The words of this cast album. The page is built by uma-platform's scripts/character-art/albums (pnpm art:albums, and fresh on every visit through pnpm art:gallery) from the character folders beside it; keep it local.",
    kind: 'cast-album',
    title: `Uma ${game[0]!.toUpperCase()}${game.slice(1)} · ${app.title} · cast`,
    noun, plural,
    header: `<div class="eyebrow">Cast album · ${app.title}</div><h1>${app.title}: the cast</h1><p>{characters} cast against {umas} in the Ranker: {withWork} with authored pictures, {approved} with an approved look, {published} published. Each card shows her Ranker reference, then every picture added to her folder, newest first.</p><a href="../approved/review.html">The approved album</a>`,
    footer: '<footer>Cast from the Ranker (revision {revision}) · local authoring folders · refresh to see new pictures</footer>',
    empty: `No ${noun} is cast here yet: cast them on the Ranker, then run pnpm art:cast.`,
  }
}

/** The cast folders of every enemy app, and each app's album words when it has none yet. */
export function prepareCast(universeDir: string, game: string, options: { dryRun?: boolean; ranker?: string; apps?: readonly CastApp[] } = {}): AppReport[] {
  const ranker = options.ranker ?? rankerDir, planFile = join(ranker, 'plan.json')
  if (!existsSync(planFile)) throw new Error(`No local Ranker plan at ${planFile}: run pnpm ranker:pull first.`)
  const cast = castOf(JSON.parse(readFileSync(planFile, 'utf8')), game), units = rankerUnits(ranker)
  return (options.apps ?? CAST_APPS).map((app) => {
    const report = prepareApp(universeDir, app, cast, units, { ...options, ranker })
    const words = join(universeDir, ...app.dir.split('/'), 'cast', 'album.json')
    if (!options.dryRun && !existsSync(words) && cast.umas.length) write(words, encode(castWords(app, game)))
    return report
  })
}
