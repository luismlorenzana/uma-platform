// Uma Enemy Art's publishing (EA1, P183): the enemy looks the owner approved, from a universe's private
// `enemies/approved/manifest.json` (P182), to their own folder of the app's bucket, `gs://uma-platform-content/enemy-art/<game>/`:
// each approved PNG byte for byte under a name that carries its hash, then an `index.json` (`kind: enemy-art`), which is
// exactly what Uma Enemy Art shows. The game is named by its universe (cyberpunk is Uma Cyberpunk; the album's `game`
// words name it otherwise). Faction names and look captions come from the album's words (`album.json`), the enemies' names
// from the manifest: all local, none in git. As with `art:push`, nothing is deleted in the bucket, every picture is read back
// before the index is written, the index goes last over the generation read, and the flags are written beside the
// manifest (`publication.json`, `publication.js`), where the enemy album and the gallery's front page show them.
// EA3 (P186): the casual collection beside it, `enemies/casual/approved/` (P185), goes up in the same push and the same
// index, each of its looks marked `kind: "casual"`, with its own flags in the casual album. A look both albums hold with
// the same id and picture (the bosses' pilot suits, the base of both cycles, P191) is published once, marked `kind: "base"`,
// and flagged in both albums. EA4 (P201): the lieutenants' collection, `enemies/lieutenants/approved/` (P200), goes up in the
// same push too, each of its looks marked `kind: "lieutenant"`, with its own flags in the lieutenants' album.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import {
  authoring, BUCKET, content, encode, FLAG_FILE, GALLERY, INDEX, isUniverse, keyOf, MANIFEST, md5, pngSize, RECORD, RECORD_SCRIPT, recordScript, sha256, slashed, stable,
  withFlagTags, write, type LookFlag, type LookState, type RefusedLook, type Remote,
} from './lib.js'
import { FLAG_SCRIPT } from './flag.js'

export const ENEMY_SITE = 'https://uma-platform.web.app/enemy-art'
export const ENEMY_APP = 'Uma Enemy Art'
/** The local copy of what is published, for the app in dev: `content/published/enemy-art/<game>/`. */
export const enemyMirror = resolve(process.env.ENEMY_ART_DIR ?? resolve(content, 'published/enemy-art'))
/** A game's folder in the app's bucket. */
export const enemyPrefix = (game: string) => `enemy-art/${game}`

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')
const readJson = (file: string): unknown => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as unknown : null)

export const enemiesDir = (universe: string, base = authoring): string => join(base, universe, 'enemies', 'approved')
/** The casual collection beside an enemy collection (P185): `enemies/casual/approved/`. */
export const casualOf = (dir: string): string => resolve(dir, '..', 'casual', 'approved')
/** The lieutenants' collection beside an enemy collection (P200): `enemies/lieutenants/approved/`. */
export const lieutenantsOf = (dir: string): string => resolve(dir, '..', 'lieutenants', 'approved')
/** The collections a push reads beside the bosses' own, the flag record each keeps, and the kind each look carries. */
const OTHERS = [
  { collection: 'casual', at: casualOf, kind: 'casual', noun: 'casual looks' },
  { collection: 'lieutenants', at: lieutenantsOf, kind: 'lieutenant', noun: 'lieutenant looks' },
] as const
const collectionOf = (kind: ApprovedEnemy['kind']): string | null => OTHERS.find((o) => o.kind === kind)?.collection ?? null
/** The universes with an approved enemy collection. */
export function enemyUniverses(base = authoring): string[] {
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory() && isUniverse(e.name) && existsSync(join(enemiesDir(e.name, base), MANIFEST))).map((e) => e.name).sort()
}

/** An enemy look the owner approved, whose file is still the one approved. */
export interface ApprovedEnemy {
  id: string
  /** The enemy's name, as the manifest gives it. */
  character: string
  faction: string
  unitId: string | null
  look: string
  title: string
  /** The PNG, relative to the approved folder. */
  image: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  /** Her armour and combat looks, her casual collection's (EA3), or a lieutenant's (EA4). */
  kind: 'combat' | 'casual' | 'lieutenant'
  /** The PNG on disk, whichever collection holds it. */
  file: string
  /** Both albums hold this look, with the same id and picture: the base of both cycles (P191). */
  shared?: boolean
}
export interface Faction { id: string; title: string }
export interface EnemyCollection {
  game: string
  title: string
  /** Every faction the album names, in its order, then any other a look of the manifest has. */
  factions: Faction[]
  looks: ApprovedEnemy[]
  refused: RefusedLook[]
  /** Every look's id in the manifest's order. */
  order: string[]
}

/**
 * The approved enemy collection as it is now: every look whose approval, hash and size hold, and every one refused. The
 * casual collection beside it (EA3), when there is one, is read the same way and joins it, its looks marked casual.
 */
export function readEnemies(universe: string, dir: string): EnemyCollection {
  if (!isUniverse(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
  const manifest = readJson(join(dir, MANIFEST))
  if (!object(manifest) || !Array.isArray(manifest.assets)) throw new Error(`${join(dir, MANIFEST)} isn't an approved enemy collection's manifest (no assets).`)
  const album = readJson(join(dir, 'album.json'))
  const factionNames: Record<string, unknown> = object(album) && object(album.factions) ? { ...album.factions } : {}
  const looks: ApprovedEnemy[] = [], refused: RefusedLook[] = [], order: string[] = [], seen = new Set<string>()
  const factionIds = Object.keys(factionNames).filter((f) => KEBAB.test(f))
  const sources: { dir: string; assets: unknown[]; lookNames: Record<string, unknown>; kind: ApprovedEnemy['kind'] }[] = [
    { dir, assets: manifest.assets as unknown[], lookNames: object(album) && object(album.looks) ? album.looks : {}, kind: 'combat' },
  ]
  for (const other of OTHERS) {
    const otherDir = other.at(dir), record = readJson(join(otherDir, MANIFEST))
    if (!object(record) || !Array.isArray(record.assets)) continue
    const words = readJson(join(otherDir, 'album.json'))
    if (object(words) && object(words.factions)) for (const [k, v] of Object.entries(words.factions)) if (!(k in factionNames)) { factionNames[k] = v; if (KEBAB.test(k)) factionIds.push(k) }
    sources.push({ dir: otherDir, assets: record.assets as unknown[], lookNames: object(words) && object(words.looks) ? words.looks : {}, kind: other.kind })
  }
  for (const { dir, assets, lookNames, kind: from } of sources) for (const asset of assets) {
    if (!object(asset)) continue
    const id = text(asset.id) ?? '(no id)', given = text(asset.image)
    const image = given && /^[a-z0-9][a-z0-9._/-]{0,199}\.png$/.test(given) && !given.split('/').some((p) => p === '' || p.startsWith('.')) ? given : null
    const refuse = (kind: RefusedLook['kind'], why: string) => { const collection = collectionOf(from); refused.push({ id, image: image ?? given, kind, why, ...(collection ? { collection } : {}) }) }
    if (!KEBAB.test(id) || id.length > 80) { refuse('damaged', 'its id isn’t a lowercase name joined by hyphens'); continue }
    // The casual album may hold an enemy-album look itself, same id and picture: the base of both (P191).
    const twin = from === 'casual' && seen.has(id) ? looks.find((l) => l.id === id && l.kind === 'combat') ?? null : null
    if (seen.has(id) && !(twin && twin.sha256 === text(asset.sha256))) { refuse('damaged', twin ? 'its id is listed twice with another picture' : 'its id is listed twice'); continue }
    if (!twin) { seen.add(id); order.push(id) }
    const approval = object(asset.approval) ? asset.approval : {}
    if (approval.status !== 'approved' || approval.by !== 'owner') { refuse('unapproved', 'the owner hasn’t approved it'); continue }
    const character = text(asset.character), faction = text(asset.faction), look = text(asset.look), hash = text(asset.sha256)
    if (!character || !faction || !KEBAB.test(faction) || !look || !hash || !/^[a-f0-9]{64}$/.test(hash)) { refuse('damaged', 'its entry has no name, faction, look or SHA-256'); continue }
    if (!image) { refuse('damaged', 'its image isn’t a PNG inside the approved folder'); continue }
    const path = join(dir, image)
    if (!existsSync(path)) { refuse('damaged', 'its PNG is missing'); continue }
    const bytes = readFileSync(path)
    if (sha256(bytes) !== hash) { refuse('damaged', 'the PNG changed since it was approved'); continue }
    const size = pngSize(bytes)
    if (!size || size.width !== asset.width || size.height !== asset.height) { refuse('damaged', 'the PNG isn’t the size its entry says'); continue }
    if (!factionIds.includes(faction)) factionIds.push(faction)
    looks.push({
      id, character, faction, unitId: text(asset.unitId), look, title: text(lookNames[look]) ?? words(look), image, bytes: bytes.byteLength, sha256: hash,
      width: size.width, height: size.height, approvedOn: text(approval.date) ?? text(approval.on), kind: from, file: path, ...(twin ? { shared: true } : {}),
    })
    if (twin) twin.shared = true
  }
  const title = (object(album) ? text(album.game) : null) ?? `Uma ${words(universe)}`
  return { game: universe, title, factions: factionIds.map((f) => ({ id: f, title: text(factionNames[f]) ?? words(f) })), looks, refused, order }
}

// --- what the bucket holds

export interface PublishedEnemy {
  id: string
  character: string
  faction: string
  unitId: string | null
  look: string
  title: string
  /** Relative to the game's folder: `images/<id>.<16 hex>.png`. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  publishedAt: string
  /** A look of her casual collection (EA3), or one both albums hold, the base of both (P191); absent for her armour and
   *  combat looks. */
  kind?: 'casual' | 'base' | 'lieutenant'
}
/** A game's index in the bucket, `enemy-art/<game>/index.json`: exactly what Uma Enemy Art shows. */
export interface EnemyIndex {
  schemaVersion: 1
  kind: 'enemy-art'
  game: string
  title: string
  publishedAt: string
  /** The factions of the listed looks, in the album's order. */
  factions: Faction[]
  looks: PublishedEnemy[]
}
export const enemyPath = (look: Pick<ApprovedEnemy, 'id' | 'sha256'>): string => `images/${look.id}.${look.sha256.slice(0, 16)}.png`

export function parseEnemyIndex(source: string | null, game: string): EnemyIndex | null {
  if (source === null) return null
  const value = JSON.parse(source) as unknown
  if (!object(value) || value.kind !== 'enemy-art' || value.game !== game || !Array.isArray(value.looks)) throw new Error(`The bucket's ${INDEX} isn't ${game}'s enemy index.`)
  return value as unknown as EnemyIndex
}

/** `--only` names an enemy look by its id, its faction, or its enemy's name (`red-one` for "Red One"). */
export type EnemySelection = ((look: { id: string; faction: string; character: string }) => boolean) | undefined
export const enemySelection = (names: readonly string[]): EnemySelection => {
  if (names.length === 0) return undefined
  const wanted = new Set(names)
  return (look) => wanted.has(look.id) || wanted.has(look.faction) || wanted.has(keyOf(look.character))
}

export interface EnemyPlan {
  index: EnemyIndex
  upload: ApprovedEnemy[]
  unchanged: number
  /** Published looks that leave the index (no longer approved here); their files stay. */
  withdrawn: string[]
  /** Published looks kept as they are: outside `--only`, or their local copy is damaged. */
  kept: string[]
  same: boolean
}

/** What a push sends, as `art:push` plans a universe's looks: a look published with the same picture keeps its date. */
export function planEnemyPush(collection: EnemyCollection, remote: EnemyIndex | null, now: string, select?: EnemySelection): EnemyPlan {
  const chosen = (look: { id: string; faction: string; character: string }) => !select || select(look)
  const before = new Map((remote?.looks ?? []).map((l) => [l.id, l]))
  const damaged = new Set(collection.refused.filter((r) => r.kind === 'damaged').map((r) => r.id))
  const upload: ApprovedEnemy[] = [], looks: PublishedEnemy[] = [], listed = new Set<string>()
  for (const look of collection.looks) {
    // A shared look is listed once, from the enemy album's entry.
    if (listed.has(look.id)) continue
    listed.add(look.id)
    const old = before.get(look.id), same = old?.sha256 === look.sha256
    if (!chosen(look)) { if (old) looks.push(old); continue }
    if (!same) upload.push(look)
    looks.push({
      id: look.id, character: look.character, faction: look.faction, unitId: look.unitId, look: look.look, title: look.title, path: enemyPath(look), bytes: look.bytes,
      sha256: look.sha256, width: look.width, height: look.height, approvedOn: look.approvedOn, publishedAt: same ? old!.publishedAt : now,
      ...(look.shared ? { kind: 'base' as const } : look.kind === 'casual' || look.kind === 'lieutenant' ? { kind: look.kind } : {}),
    })
  }
  const here = new Set(collection.looks.map((l) => l.id))
  const gone = [...before.values()].filter((l) => !here.has(l.id))
  const kept = gone.filter((l) => damaged.has(l.id) || !chosen(l))
  const withdrawn = gone.filter((l) => !damaged.has(l.id) && chosen(l)).map((l) => l.id).sort()
  const place = new Map(collection.order.map((id, i) => [id, i]))
  const all = [...looks, ...kept].sort((a, b) => (place.get(a.id) ?? Infinity) - (place.get(b.id) ?? Infinity))
  // The listed looks' factions, in the album's order; a kept look's faction the album no longer names keeps its old title.
  const known = [...collection.factions, ...(remote?.factions ?? []).filter((f) => !collection.factions.some((c) => c.id === f.id))]
  const factions = known.filter((f) => all.some((l) => l.faction === f.id))
  const head = { game: collection.game, title: collection.title, factions }
  const same = remote !== null && JSON.stringify({ ...head, looks: all }) === JSON.stringify({ game: remote.game, title: remote.title, factions: remote.factions, looks: remote.looks })
  return {
    index: { schemaVersion: 1, kind: 'enemy-art', game: collection.game, title: collection.title, publishedAt: same ? remote.publishedAt : now, factions, looks: all },
    upload, unchanged: looks.filter((l) => !upload.some((u) => u.id === l.id)).length, withdrawn, kept: kept.map((l) => l.id).sort(), same,
  }
}

// --- the flags

/** The record beside the enemy manifest, `enemies/approved/publication.json`: the published flag of every enemy look. */
export interface EnemyPublication {
  schemaVersion: 1
  kind: 'enemy-art-publication'
  game: string
  /** The app the flag script names. */
  app: string
  destination: string
  site: string
  checkedAt: string
  publishedAt: string | null
  counts: Record<LookState, number>
  looks: LookFlag[]
  withdrawable: string[]
  noun: string
}

export function enemyPublicationOf(collection: EnemyCollection, remote: EnemyIndex | null, now: string, bucket = BUCKET): EnemyPublication {
  const there = new Map((remote?.looks ?? []).map((l) => [l.id, l]))
  const looks: LookFlag[] = collection.looks.map((look): LookFlag => {
    const old = there.get(look.id), collection = collectionOf(look.kind), from = collection ? { collection } : {}
    if (old?.sha256 === look.sha256) return { id: look.id, image: look.image, state: 'published', sha256: look.sha256, publishedAt: old.publishedAt, path: old.path, note: null, ...from }
    if (old) return { id: look.id, image: look.image, state: 'changed', sha256: look.sha256, publishedAt: old.publishedAt, path: old.path, note: 'Approved again with another picture; a push replaces the published one.', ...from }
    return { id: look.id, image: look.image, state: 'unpublished', sha256: look.sha256, publishedAt: null, path: null, note: null, ...from }
  })
  for (const r of collection.refused) {
    const old = there.get(r.id)
    looks.push({ id: r.id, image: r.image, state: 'refused', sha256: null, publishedAt: old?.publishedAt ?? null, path: old?.path ?? null, note: `Can’t publish: ${r.why}.${old ? ' An earlier picture is still published.' : ''}`, ...(r.collection ? { collection: r.collection } : {}) })
  }
  const counts: Record<LookState, number> = { published: 0, changed: 0, unpublished: 0, refused: 0 }
  for (const l of looks) counts[l.state]++
  const listed = new Set(looks.map((l) => l.id))
  return {
    schemaVersion: 1, kind: 'enemy-art-publication', game: collection.game, app: ENEMY_APP, destination: `gs://${bucket}/${enemyPrefix(collection.game)}/`, site: ENEMY_SITE,
    checkedAt: now, publishedAt: remote?.publishedAt ?? null, counts, looks, withdrawable: [...there.keys()].filter((id) => !listed.has(id)).sort(), noun: 'enemy looks',
  }
}

/** One collection's share of the record, its counts recounted: the armour looks' (`null`) or the casual ones'. */
export function enemySlice(publication: EnemyPublication, collection: string | null): EnemyPublication {
  const looks = publication.looks.filter((l) => (l.collection ?? null) === collection)
  const counts: Record<LookState, number> = { published: 0, changed: 0, unpublished: 0, refused: 0 }
  for (const l of looks) counts[l.state]++
  return { ...publication, counts, looks, withdrawable: collection === null ? publication.withdrawable : [], noun: OTHERS.find((o) => o.collection === collection)?.noun ?? publication.noun }
}

/**
 * Flags the enemy looks where the owner reviews them: `publication.json` and `publication.js` beside each manifest (the
 * enemy album's, and the casual album's when it has looks), the shared flag script at the universes' root, and each
 * album's script tags. Says which files changed, relative to the enemy album's folder.
 */
export function writeEnemyFlags(dir: string, publication: EnemyPublication): string[] {
  const changed: string[] = []
  const flagAt = (folder: string) => slashed(relative(folder, resolve(dir, '..', '..', '..', FLAG_FILE)))
  const at = (folder: string, f: string) => (folder === dir ? f : slashed(relative(dir, join(folder, f))))
  if (write(resolve(dir, '..', '..', '..', FLAG_FILE), FLAG_SCRIPT)) changed.push(`../../../${FLAG_FILE}`)
  // Each album's record: the bosses' always; another collection's once it has looks, or when it already had a record.
  const slices: [string, EnemyPublication][] = [[dir, enemySlice(publication, null)]]
  for (const other of OTHERS) {
    const folder = other.at(dir), slice = enemySlice(publication, other.collection)
    if (slice.looks.length || existsSync(join(folder, RECORD))) slices.push([folder, slice])
  }
  for (const [folder, slice] of slices) {
    const recordFile = join(folder, RECORD), record = stable(recordFile, slice)
    if (write(recordFile, encode(record))) changed.push(at(folder, RECORD))
    if (write(join(folder, RECORD_SCRIPT), recordScript(record, RECORD))) changed.push(at(folder, RECORD_SCRIPT))
    const album = join(folder, GALLERY)
    if (existsSync(album) && write(album, withFlagTags(readFileSync(album, 'utf8'), flagAt(folder), [RECORD_SCRIPT]))) changed.push(at(folder, GALLERY))
  }
  return changed
}

// --- the push

export interface EnemyPushResult {
  game: string
  uploaded: string[]
  unchanged: number
  withdrawn: string[]
  kept: string[]
  refused: RefusedLook[]
  indexed: boolean
  publication: EnemyPublication
  flagged: string[]
}

/** `pnpm art:push <universe> --enemies`: as `art:push` sends a universe's looks, to the game's folder of Uma Enemy Art. */
export function pushEnemies(universe: string, dir: string, mirrorDir: string, remote: Remote, now: string, options: { dryRun?: boolean; only?: readonly string[] } = {}): EnemyPushResult {
  const collection = readEnemies(universe, dir)
  const there = remote.read(INDEX)
  const before = parseEnemyIndex(there?.text ?? null, collection.game)
  if (collection.looks.length === 0 && !before) throw new Error(`Nothing to publish: ${universe} has no approved enemy look whose PNG matches its manifest.`)
  const only = options.only ?? []
  if (only.length) {
    const known = [...collection.looks, ...(before?.looks ?? [])]
    const unknown = only.filter((name) => !known.some((l) => l.id === name || l.faction === name || keyOf(l.character) === name))
    if (unknown.length) throw new Error(`${universe}: --only names no approved or published enemy look: ${unknown.join(', ')}.`)
  }
  const plan = planEnemyPush(collection, before, now, enemySelection(only))
  const result: EnemyPushResult = {
    game: collection.game, uploaded: plan.upload.map((l) => l.id), unchanged: plan.unchanged, withdrawn: plan.withdrawn, kept: plan.kept, refused: collection.refused,
    indexed: !plan.same, publication: enemyPublicationOf(collection, options.dryRun ? before : plan.index, now), flagged: [],
  }
  if (options.dryRun) return result
  const listed = new Map(plan.index.looks.map((l) => [l.id, l.sha256]))
  const local = new Map(collection.looks.filter((l) => listed.get(l.id) === l.sha256).map((l) => [enemyPath(l), l]))
  // Each look's PNG is read where its collection holds it (the enemy album's folder, or the casual one's).
  const home = join(mirrorDir, collection.game)
  for (const [path, look] of local) {
    const to = join(home, path)
    if (existsSync(to) && sha256(readFileSync(to)) === look.sha256) continue
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(look.file, to)
  }
  if (plan.upload.length) {
    const stage = mkdtempSync(join(tmpdir(), 'enemy-push-'))
    try {
      for (const look of plan.upload) { const to = join(stage, enemyPath(look)); mkdirSync(dirname(to), { recursive: true }); copyFileSync(look.file, to) }
      remote.uploadFolder(stage)
    } finally { rmSync(stage, { recursive: true, force: true }) }
  }
  const inBucket = new Map(remote.list().map((f) => [f.path, f]))
  for (const [path, look] of local) {
    const file = inBucket.get(path)
    if (!file) throw new Error(`${universe}: ${path} isn't in the bucket after the upload. The index wasn't written; run the push again.`)
    if (file.bytes !== look.bytes || file.md5 !== md5(readFileSync(look.file))) throw new Error(`${universe}: the bucket's ${path} isn't the approved PNG. The index wasn't written.`)
  }
  const file = join(home, INDEX)
  write(file, encode(plan.index))
  if (!plan.same && !remote.uploadFile(file, INDEX, there?.generation ?? '0')) throw new Error(`${universe}: the enemy index changed in the bucket while pushing. Run it again.`)
  result.flagged = writeEnemyFlags(dir, result.publication)
  return result
}

/** `pnpm art:status`: each enemy look's flag against the bucket as it is now. Publishes nothing. */
export function enemyStatus(universe: string, dir: string, remote: Remote, now: string): { publication: EnemyPublication; flagged: string[] } {
  const collection = readEnemies(universe, dir)
  const publication = enemyPublicationOf(collection, parseEnemyIndex(remote.read(INDEX)?.text ?? null, collection.game), now)
  return { publication, flagged: writeEnemyFlags(dir, publication) }
}
