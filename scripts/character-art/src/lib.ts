// Shared by Uma Character Art's scripts (CA4, AP73–AP82): which looks of a universe the owner approved, what a push sends
// to the app's bucket, the record that flags each look as published, and the scoped gcloud. A universe is a folder of
// private authoring, `content/authoring/character-universes/<universe>/approved/`, whose `manifest.json` binds the owner's
// approval to each PNG's SHA-256. Nothing here reads a picture's pixels, and nothing it reads or writes goes in git.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FLAG_SCRIPT } from './flag.js'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const content = resolve(process.env.UMA_CONTENT_DIR ?? resolve(root, 'content'))
/** Where the universes are authored on this machine. */
export const authoring = resolve(process.env.UNIVERSES_DIR ?? resolve(content, 'authoring/character-universes'))
/** The local copy of the bucket's `art/` folder: the dev API reads it (ART_DIR), a push fills it. */
export const mirror = resolve(process.env.ART_DIR ?? resolve(content, 'published/art'))
export const BUCKET = process.env.CONTENT_BUCKET ?? 'uma-platform-content'
export const SITE = 'https://uma-platform.web.app/art'

export const INDEX = 'index.json', MANIFEST = 'manifest.json', GALLERY = 'review.html'
export const RECORD = 'publication.json', RECORD_SCRIPT = 'publication.js', FLAG_FILE = 'publication-flag.js'

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const isUniverse = (value: string): boolean => value.length <= 40 && KEBAB.test(value)
/** A universe's approved folder. */
export const approvedDir = (universe: string, base = authoring): string => join(base, universe, 'approved')
/** Every universe with an approved collection, by name. */
export function universesIn(base = authoring): string[] {
  if (!existsSync(base)) return []
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && isUniverse(e.name) && existsSync(join(approvedDir(e.name, base), MANIFEST)))
    .map((e) => e.name).sort()
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const md5 = (bytes: Uint8Array) => createHash('md5').update(bytes).digest('base64')
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')

/** A PNG's size from its header (the signature, then IHDR); null when the bytes aren't a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.byteLength < 24 || SIGNATURE.some((b, i) => bytes[i] !== b)) return null
  if (String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!) !== 'IHDR') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

/** A look the owner approved, whose file is still the one approved. */
export interface ApprovedLook {
  id: string
  character: string
  outfit: string
  title: string
  /** The PNG, relative to the approved folder. */
  image: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
}
/** A look of the manifest that can't go out. `unapproved`: the owner hasn't approved it. `damaged`: the file or its entry
 *  isn't what was approved, so a copy published earlier stays as it is. */
export interface RefusedLook { id: string; image: string | null; kind: 'unapproved' | 'damaged'; why: string }
export interface Collection {
  universe: string
  title: string
  style: string | null
  revision: number | null
  looks: ApprovedLook[]
  refused: RefusedLook[]
  /** Every look's id in the manifest's order, approved or refused: the order the gallery and the app show them in. */
  order: string[]
}

/** The approved collection as it is now: every look whose approval, hash and size hold, and every one that is refused. */
export function readCollection(universe: string, dir: string): Collection {
  if (!isUniverse(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
  const file = join(dir, MANIFEST)
  if (!existsSync(file)) throw new Error(`No approved collection: ${file} doesn't exist.`)
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as unknown
  if (!object(manifest) || !Array.isArray(manifest.assets)) throw new Error(`${file} isn't an approved collection's manifest (no assets).`)
  const looks: ApprovedLook[] = [], refused: RefusedLook[] = [], order: string[] = [], seen = new Set<string>()
  for (const asset of manifest.assets as unknown[]) {
    if (!object(asset)) continue
    const id = text(asset.id) ?? '(no id)', image = text(asset.image)
    const refuse = (kind: RefusedLook['kind'], why: string) => { refused.push({ id, image, kind, why }) }
    if (!KEBAB.test(id) || id.length > 80) { refuse('damaged', 'its id isn’t a lowercase name joined by hyphens'); continue }
    if (seen.has(id)) { refuse('damaged', 'its id is listed twice'); continue }
    seen.add(id)
    order.push(id)
    const approval = object(asset.approval) ? asset.approval : {}
    if (approval.status !== 'approved' || approval.by !== 'owner') { refuse('unapproved', 'the owner hasn’t approved it'); continue }
    const character = text(asset.character), outfit = text(asset.outfit), hash = text(asset.sha256)
    if (!character || !outfit || !hash || !/^[a-f0-9]{64}$/.test(hash)) { refuse('damaged', 'its entry has no character, outfit or SHA-256'); continue }
    if (!image || !/^[a-z0-9][a-z0-9._/-]{0,199}\.png$/.test(image) || image.split('/').some((p) => p === '' || p.startsWith('.'))) { refuse('damaged', 'its image isn’t a PNG inside the approved folder'); continue }
    const path = join(dir, image)
    if (!existsSync(path)) { refuse('damaged', 'its PNG is missing'); continue }
    const bytes = readFileSync(path)
    if (sha256(bytes) !== hash) { refuse('damaged', 'the PNG changed since it was approved'); continue }
    const size = pngSize(bytes)
    if (!size || size.width !== asset.width || size.height !== asset.height) { refuse('damaged', 'the PNG isn’t the size its entry says'); continue }
    looks.push({
      id, character, outfit, title: text(asset.title) ?? words(outfit), image, bytes: bytes.byteLength, sha256: hash,
      width: size.width, height: size.height, approvedOn: text(approval.on),
    })
  }
  return {
    universe, title: words(universe), style: text(manifest.style), revision: typeof manifest.revision === 'number' ? manifest.revision : null,
    looks, refused, order,
  }
}

// --- what the bucket holds

/** A published look: the approved PNG byte for byte, under a name that carries its hash. */
export interface PublishedLook {
  id: string
  character: string
  outfit: string
  title: string
  /** Relative to the universe's folder: `images/<id>.<16 hex>.png`. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  publishedAt: string
}
/** A universe's index in the bucket, `art/universes/<universe>/index.json`: exactly what Character Art shows. */
export interface UniverseIndex {
  schemaVersion: 1
  kind: 'universe-art'
  universe: string
  title: string
  style: string | null
  revision: number | null
  publishedAt: string
  looks: PublishedLook[]
}
export const publishedPath = (look: Pick<ApprovedLook, 'id' | 'sha256'>): string => `images/${look.id}.${look.sha256.slice(0, 16)}.png`

export function parseIndex(source: string | null, universe: string): UniverseIndex | null {
  if (source === null) return null
  const value = JSON.parse(source) as unknown
  if (!object(value) || value.kind !== 'universe-art' || value.universe !== universe || !Array.isArray(value.looks)) throw new Error(`The bucket's ${INDEX} isn't the ${universe} universe's index.`)
  return value as unknown as UniverseIndex
}

export interface PushPlan {
  index: UniverseIndex
  /** Looks whose PNG goes up: new, or approved again with another picture. */
  upload: ApprovedLook[]
  unchanged: number
  /** Published looks that leave the index: no longer in the approved set, or no longer approved. Their files stay. */
  withdrawn: string[]
  /** Published looks kept as they are, because their local copy is damaged. */
  kept: string[]
  /** Nothing differs from the bucket's index. */
  same: boolean
}
/** What a push sends. A look already published with the same picture keeps its date; the index lists the approved set. */
export function planPush(collection: Collection, remote: UniverseIndex | null, now: string): PushPlan {
  const before = new Map((remote?.looks ?? []).map((l) => [l.id, l]))
  const damaged = new Set(collection.refused.filter((r) => r.kind === 'damaged').map((r) => r.id))
  const upload: ApprovedLook[] = [], looks: PublishedLook[] = []
  for (const look of collection.looks) {
    const old = before.get(look.id), same = old?.sha256 === look.sha256
    if (!same) upload.push(look)
    looks.push({
      id: look.id, character: look.character, outfit: look.outfit, title: look.title, path: publishedPath(look), bytes: look.bytes, sha256: look.sha256,
      width: look.width, height: look.height, approvedOn: look.approvedOn, publishedAt: same ? old!.publishedAt : now,
    })
  }
  const here = new Set(collection.looks.map((l) => l.id))
  const kept = [...before.values()].filter((l) => !here.has(l.id) && damaged.has(l.id))
  const withdrawn = [...before.keys()].filter((id) => !here.has(id) && !damaged.has(id)).sort()
  // In the manifest's order, a kept look where its entry still is.
  const place = new Map(collection.order.map((id, i) => [id, i]))
  const all = [...looks, ...kept].sort((a, b) => (place.get(a.id) ?? Infinity) - (place.get(b.id) ?? Infinity))
  const head = { universe: collection.universe, title: collection.title, style: collection.style, revision: collection.revision }
  const same = remote !== null && JSON.stringify({ ...head, looks: all }) === JSON.stringify({ universe: remote.universe, title: remote.title, style: remote.style, revision: remote.revision, looks: remote.looks })
  return {
    index: { schemaVersion: 1, kind: 'universe-art', ...head, publishedAt: same ? remote.publishedAt : now, looks: all },
    upload, unchanged: looks.length - upload.length, withdrawn, kept: kept.map((l) => l.id).sort(), same,
  }
}

// --- the flag: which looks are published

export type LookState = 'published' | 'changed' | 'unpublished' | 'refused'
export interface LookFlag {
  id: string
  /** The PNG in the approved folder, as the gallery names it. */
  image: string | null
  state: LookState
  /** The approved picture's hash, when the entry holds. */
  sha256: string | null
  publishedAt: string | null
  /** Where the published copy is, inside the universe's folder in the bucket. */
  path: string | null
  /** Why a look can't go out, or what a push would do. */
  note: string | null
}
/** The record kept beside the manifest, `approved/publication.json`: the published flag of every look in the manifest. */
export interface Publication {
  schemaVersion: 1
  kind: 'universe-art-publication'
  universe: string
  destination: string
  site: string
  checkedAt: string
  /** When the bucket's index last changed; null when nothing is published. */
  publishedAt: string | null
  revision: number | null
  counts: Record<LookState, number>
  looks: LookFlag[]
  /** Published looks the approved set no longer holds; the next push takes them off the index. */
  withdrawable: string[]
}

/**
 * Each look's flag, from the approved collection as it is now and the bucket's index: `published` (the approved picture
 * is the published one), `changed` (approved again with another picture since), `unpublished`, or `refused`.
 */
export function publicationOf(collection: Collection, remote: UniverseIndex | null, now: string, bucket = BUCKET): Publication {
  const there = new Map((remote?.looks ?? []).map((l) => [l.id, l]))
  const looks: LookFlag[] = collection.looks.map((look) => {
    const old = there.get(look.id)
    if (old?.sha256 === look.sha256) return { id: look.id, image: look.image, state: 'published', sha256: look.sha256, publishedAt: old.publishedAt, path: old.path, note: null }
    if (old) return { id: look.id, image: look.image, state: 'changed', sha256: look.sha256, publishedAt: old.publishedAt, path: old.path, note: 'Approved again with another picture; a push replaces the published one.' }
    return { id: look.id, image: look.image, state: 'unpublished', sha256: look.sha256, publishedAt: null, path: null, note: null }
  })
  for (const r of collection.refused) {
    const old = there.get(r.id)
    looks.push({ id: r.id, image: r.image, state: 'refused', sha256: null, publishedAt: old?.publishedAt ?? null, path: old?.path ?? null, note: `Can’t publish: ${r.why}.${old ? ' An earlier picture is still published.' : ''}` })
  }
  const counts: Record<LookState, number> = { published: 0, changed: 0, unpublished: 0, refused: 0 }
  for (const l of looks) counts[l.state]++
  const listed = new Set(looks.map((l) => l.id))
  return {
    schemaVersion: 1, kind: 'universe-art-publication', universe: collection.universe,
    destination: `gs://${bucket}/art/universes/${collection.universe}/`, site: SITE, checkedAt: now,
    publishedAt: remote?.publishedAt ?? null, revision: collection.revision, counts, looks,
    withdrawable: [...there.keys()].filter((id) => !listed.has(id)).sort(),
  }
}

const encode = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`
const write = (file: string, body: string): boolean => {
  if (existsSync(file) && readFileSync(file, 'utf8') === body) return false
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
  return true
}

const BLOCK_START = '<!-- publication flags: written by pnpm art:push and pnpm art:status; keep this block -->'
const BLOCK_END = '<!-- /publication flags -->'
/** The gallery page with the two script tags that draw the flags, added before `</body>` once; the same page when they're in. */
export function withFlagTags(html: string, flagScript: string): string {
  const block = `${BLOCK_START}<script src="${RECORD_SCRIPT}"></script><script src="${flagScript}"></script>${BLOCK_END}`
  const start = html.indexOf(BLOCK_START), end = html.indexOf(BLOCK_END)
  if (start !== -1 && end > start) return html.slice(0, start) + block + html.slice(end + BLOCK_END.length)
  const body = html.lastIndexOf('</body>')
  return body === -1 ? `${html}\n${block}\n` : `${html.slice(0, body)}${block}${html.slice(body)}`
}

/**
 * Flags a universe's looks where the owner reviews them: writes `publication.json` and `publication.js` beside the
 * manifest, the shared flag script at the universes' root, and the gallery's two script tags. The manifest, the
 * pictures and the rest of the gallery page are never touched. Says which files changed.
 */
export function writeFlags(dir: string, publication: Publication): string[] {
  const changed: string[] = []
  // The check's time alone isn't a change: an unchanged record keeps its file, so a status run leaves no diff.
  const recordFile = join(dir, RECORD)
  const before = existsSync(recordFile) ? JSON.parse(readFileSync(recordFile, 'utf8')) as Publication : null
  const record = before && JSON.stringify({ ...before, checkedAt: '' }) === JSON.stringify({ ...publication, checkedAt: '' }) ? before : publication
  if (write(recordFile, encode(record))) changed.push(RECORD)
  if (write(join(dir, RECORD_SCRIPT), `// Written by pnpm art:push and pnpm art:status from ${RECORD}; the gallery reads it.\nwindow.UMA_PUBLICATION = ${JSON.stringify(record, null, 2)};\n`)) changed.push(RECORD_SCRIPT)
  // approved/ sits two folders under the universes' root, where the shared flag script is kept.
  const base = resolve(dir, '../..')
  if (write(join(base, FLAG_FILE), FLAG_SCRIPT)) changed.push(`../../${FLAG_FILE}`)
  const gallery = join(dir, GALLERY)
  if (existsSync(gallery) && write(gallery, withFlagTags(readFileSync(gallery, 'utf8'), `../../${FLAG_FILE}`))) changed.push(GALLERY)
  return changed
}

// --- the push

/** A file of the universe's folder in the bucket. */
export interface RemoteFile { path: string; bytes: number; md5: string }
/** The bucket's side of a universe. The real one is gcloud; tests use a map. */
export interface Remote {
  /** A file's text and generation, or null when it isn't there. */
  read(path: string): { text: string; generation: string } | null
  /** Uploads every file of a folder under the universe, adding and replacing; never deletes. */
  uploadFolder(dir: string): void
  /** Uploads one file, only over that generation ('0': not there yet). False on a lost race. */
  uploadFile(file: string, path: string, ifGeneration: string): boolean
  /** Every file under the universe, with its size and MD5 (base64), as the bucket reports them. */
  list(): RemoteFile[]
}

export interface PushResult {
  universe: string
  uploaded: string[]
  unchanged: number
  withdrawn: string[]
  kept: string[]
  refused: RefusedLook[]
  /** The index was written (something changed). */
  indexed: boolean
  publication: Publication
  /** The local files the flags changed; empty on a dry run. */
  flagged: string[]
}

/**
 * `pnpm art:push <universe>`: sends the approved looks that aren't published yet (the PNGs, byte for byte), checks each
 * against the bucket's own size and MD5, then writes the index and, locally, the published flags. Nothing is deleted in
 * the bucket: a withdrawn look leaves the index and its file stays, with the bucket's older versions.
 */
export function push(universe: string, dir: string, mirrorDir: string, remote: Remote, now: string, options: { dryRun?: boolean } = {}): PushResult {
  const collection = readCollection(universe, dir)
  const there = remote.read(INDEX)
  const before = parseIndex(there?.text ?? null, universe)
  if (collection.looks.length === 0 && !before) throw new Error(`Nothing to publish: ${universe} has no approved look whose PNG matches its manifest.`)
  const plan = planPush(collection, before, now)
  const result: PushResult = {
    universe, uploaded: plan.upload.map((l) => l.id), unchanged: plan.unchanged, withdrawn: plan.withdrawn, kept: plan.kept, refused: collection.refused,
    indexed: !plan.same, publication: publicationOf(collection, options.dryRun ? before : plan.index, now), flagged: [],
  }
  if (options.dryRun) return result
  const local = new Map(collection.looks.map((l) => [publishedPath(l), l]))
  // The mirror first: the same files at the same paths, for the local app.
  const home = join(mirrorDir, 'universes', universe)
  for (const [path, look] of local) {
    const to = join(home, path)
    if (existsSync(to) && sha256(readFileSync(to)) === look.sha256) continue
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(join(dir, look.image), to)
  }
  if (plan.upload.length) {
    const stage = mkdtempSync(join(tmpdir(), 'art-push-'))
    try {
      for (const look of plan.upload) { const to = join(stage, publishedPath(look)); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(dir, look.image), to) }
      remote.uploadFolder(stage)
    } finally { rmSync(stage, { recursive: true, force: true }) }
  }
  // Read back before the index says so: every look this machine holds is in the bucket at its size and MD5.
  const listed = new Map(remote.list().map((f) => [f.path, f]))
  for (const [path, look] of local) {
    const file = listed.get(path)
    if (!file) throw new Error(`${universe}: ${path} isn't in the bucket after the upload. The index wasn't written; run the push again.`)
    if (file.bytes !== look.bytes || file.md5 !== md5(readFileSync(join(dir, look.image)))) throw new Error(`${universe}: the bucket's ${path} isn't the approved PNG. The index wasn't written.`)
  }
  if (!plan.same) {
    // The index goes last, and only over the one that was read: it never lists a look that isn't there.
    const file = join(home, INDEX)
    write(file, encode(plan.index))
    if (!remote.uploadFile(file, INDEX, there?.generation ?? '0')) throw new Error(`${universe}: the index changed in the bucket while pushing. Run it again.`)
  } else write(join(home, INDEX), encode(plan.index))
  result.flagged = writeFlags(dir, result.publication)
  return result
}

/** `pnpm art:status`: each look's flag against the bucket as it is now, written where the gallery reads it. Publishes nothing. */
export function status(universe: string, dir: string, remote: Remote, now: string): { publication: Publication; flagged: string[] } {
  const publication = publicationOf(readCollection(universe, dir), parseIndex(remote.read(INDEX)?.text ?? null, universe), now)
  return { publication, flagged: writeFlags(dir, publication) }
}

// --- gcloud

/** How to start gcloud on this platform (as the Ranker's scripts do): on Windows it is `gcloud.cmd`, run through the shell
 *  with every argument quoted. */
export function gcloudCommand(args: string[], platform: NodeJS.Platform = process.platform): { file: string; args: string[]; shell: boolean } {
  if (platform !== 'win32') return { file: 'gcloud', args, shell: false }
  if (args.some((a) => a.includes('"'))) throw new Error('A gcloud argument with a quote cannot be passed through cmd.exe.')
  return { file: 'gcloud.cmd', args: args.map((a) => `"${a}"`), shell: true }
}

/** gcloud storage, scoped to the owner's default configuration and the games' project; never `config set`. Null on failure. */
function gcloud(args: string[], options: { quiet?: boolean } = {}): string | null {
  try {
    const command = gcloudCommand(['storage', ...args])
    return execFileSync(command.file, command.args, {
      env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' },
      stdio: ['ignore', 'pipe', options.quiet ? 'pipe' : 'inherit'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: command.shell,
    })
  } catch (error) {
    if (options.quiet) return null
    throw error
  }
}

/** A universe's folder in the app's bucket, `gs://uma-platform-content/art/universes/<universe>/`. */
export function bucketRemote(universe: string): Remote {
  const base = `gs://${BUCKET}/art/universes/${universe}`
  return {
    read(path) {
      const generation = gcloud(['objects', 'describe', `${base}/${path}`, '--format=value(generation)'], { quiet: true })?.trim()
      if (!generation) return null
      const body = gcloud(['cat', `${base}/${path}`], { quiet: true })
      return body === null ? null : { text: body, generation }
    },
    uploadFolder(dir) { gcloud(['rsync', '--recursive', dir, base]) },
    uploadFile(file, path, ifGeneration) { return gcloud(['cp', `--if-generation-match=${ifGeneration}`, file, `${base}/${path}`], { quiet: true }) !== null },
    list() {
      const out = gcloud(['objects', 'list', `${base}/**`, '--format=json(name,size,md5_hash)'], { quiet: true })
      if (!out) return []
      const prefix = `art/universes/${universe}/`
      return (JSON.parse(out) as { name: string; size: string | number; md5_hash: string }[])
        .filter((f) => f.name.startsWith(prefix))
        .map((f) => ({ path: f.name.slice(prefix.length), bytes: Number(f.size), md5: f.md5_hash }))
    },
  }
}
