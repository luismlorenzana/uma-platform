// A universe's dialogue portraits, published as their pieces (CA5, P169): every outfit's neutral waist-up crop, every
// expression's face layer, and the recipe that puts them together, so a game composes any of the states itself. Uma
// Character Art shows the pieces on each Uma's page but never composes a state (the owner: "just wiring and uploading the
// pieces is good enough", then "the pieces are visible in the page though right?"). The source is
// `<universe>/dialogue-portraits/`, whose `approval.json` binds each approved state to the exact crop, face and position
// it was made from; a piece goes up only when its file still has the hash the owner approved. Nothing is deleted online.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import {
  authoring, BUCKET, characterStudies, encode, FLAGGED, isUniverse, md5, pngSize, PORTRAIT_RECORD, RECORD, RECORD_SCRIPT, sha256, slashed, stable, studyFile,
  tagGalleries, universesIn, write, writeStudyScript, type Remote,
} from './lib.js'

export const PORTRAITS_INDEX = 'portraits/index.json'
/** A universe's dialogue portrait collection, beside its approved looks. */
export const portraitsDir = (universe: string, base = authoring): string => join(base, universe, FLAGGED.portraits)
/** The universes whose dialogue portraits have an owner approval record. */
export const portraitUniverses = (base = authoring): string[] =>
  universesIn(base).filter((u) => existsSync(join(portraitsDir(u, base), 'manifest.json')) && existsSync(join(portraitsDir(u, base), 'approval.json')))

/** How a state is put together, written into the index for the games. */
export const BLEND = 'The neutral state is the base alone. Any other state draws its face over the base with its top-left corner at (x, y), no scaling or rotation: for each face pixel with alpha a > 0, each colour channel becomes round(base × (1 − a/255) + face × a/255), and pixels outside the face are the base unchanged.'

interface Piece { id: string; character: string; path: string; bytes: number; sha256: string; width: number; height: number }
export interface PortraitBase extends Piece { outfit: string }
export interface PortraitFace extends Piece { expression: string }
export interface PortraitState {
  character: string
  outfit: string
  expression: string
  /** The base's id. */
  base: string
  /** The face's id; null for the neutral state, which is the base alone. */
  face: string | null
  /** Where the face's top-left corner goes on the base; null for the neutral state. */
  at: { x: number; y: number } | null
  /** The approved flattened PNG's SHA-256, kept in private authoring: provenance, not a file the games get. */
  approvedSha256: string | null
}
/** The bucket's `art/universes/<universe>/portraits/index.json`: the pieces and the recipe. Paths are under `portraits/`. */
export interface PortraitIndex {
  schemaVersion: 1
  kind: 'universe-portraits'
  universe: string
  revision: number | null
  approvedOn: string | null
  publishedAt: string
  size: { width: number; height: number }
  faceSize: { width: number; height: number }
  blend: string
  characters: { id: string; name: string }[]
  outfits: string[]
  expressions: string[]
  bases: PortraitBase[]
  faces: PortraitFace[]
  states: PortraitState[]
}
/** The approved collection as it is on this machine, with each piece's local file and every reason it can't go out. */
export interface PortraitSet {
  universe: string
  revision: number | null
  approvedOn: string | null
  characters: { id: string; name: string }[]
  outfits: string[]
  expressions: string[]
  size: { width: number; height: number }
  faceSize: { width: number; height: number }
  bases: (PortraitBase & { file: string })[]
  faces: (PortraitFace & { file: string })[]
  states: PortraitState[]
  problems: string[]
}

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [])
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const json = (file: string): Record<string, unknown> => {
  const value = JSON.parse(readFileSync(file, 'utf8')) as unknown
  if (!object(value)) throw new Error(`${file} isn't a JSON object.`)
  return value
}
const at = (v: unknown): { x: number; y: number } | null =>
  object(v) && Number.isSafeInteger(v.x) && Number.isSafeInteger(v.y) ? { x: v.x as number, y: v.y as number } : null
/** A local file inside the collection's folder, or null. */
const inside = (dir: string, rel: unknown): string | null => {
  const p = text(rel)
  if (!p || p.split('/').some((s) => s === '..' || s === '' || s.startsWith('.')) || !p.endsWith('.png')) return null
  return p
}

/**
 * Reads the approved collection: `approval.json` (the owner's approval, each state's crop hash, face hash and position)
 * and `manifest.json` (where each crop and face is, and the characters and order), then each character's own collection
 * (`characters/<key>/`, P174), whose manifest holds the same records with the owner's approval on each state. A piece is
 * listed only when its file has the approved hash and size; anything else is a problem, and a push with problems sends
 * nothing. Every piece's `file` is relative to `dir`.
 */
export function readPortraits(universe: string, dir: string): PortraitSet {
  if (!isUniverse(universe)) throw new Error(`A universe is a lowercase name joined by hyphens: ${universe}`)
  for (const f of ['manifest.json', 'approval.json']) if (!existsSync(join(dir, f))) throw new Error(`No approved dialogue portraits: ${join(dir, f)} doesn't exist.`)
  const manifest = json(join(dir, 'manifest.json')), approval = json(join(dir, 'approval.json'))
  const problems: string[] = []
  const characters: { id: string; name: string }[] = [], outfits: string[] = [], expressions: string[] = []
  const bases: PortraitSet['bases'] = [], faces = new Map<string, PortraitSet['faces'][number]>(), states: PortraitState[] = []
  let size: { width: number; height: number } | null = null, faceSize: { width: number; height: number } | null = null
  const union = (into: string[], from: string[]) => { for (const v of from) if (!into.includes(v)) into.push(v) }

  /** One collection: its approved entries (a crop's hash, then each state's face hash and position), its manifest's records,
   *  and how its paths resolve to a file and a name relative to `dir`. */
  interface Source {
    label: string
    entries: Record<string, unknown>[]
    manifest: Record<string, unknown>
    locate: (rel: unknown) => { abs: string; file: string } | null
  }
  const ingest = (src: Source) => {
    const names = object(src.manifest.characterNames) ? src.manifest.characterNames : {}
    const mine = Object.entries(names).filter(([id, n]) => KEBAB.test(id) && typeof n === 'string').map(([id, n]) => ({ id, name: n as string }))
    for (const c of mine) if (!characters.some((x) => x.id === c.id)) characters.push(c)
    const retired = new Set(strings(src.manifest.retiredOutfits))
    const ownOutfits = strings(src.manifest.outfits).filter((o) => !retired.has(o)), ownExpressions = strings(src.manifest.expressions)
    union(outfits, ownOutfits); union(expressions, ownExpressions)
    const neutral = ownExpressions[0] ?? 'neutral'
    const assets = Array.isArray(src.manifest.assets) ? (src.manifest.assets as unknown[]).filter(object) : []
    const faceRecords = Array.isArray(src.manifest.faces) ? (src.manifest.faces as unknown[]).filter(object) : []

    /** A local PNG with the approved hash; its bytes and size, or a problem. */
    const piece = (rel: unknown, hash: unknown, what: string): { file: string; bytes: number; sha256: string; width: number; height: number } | null => {
      const found = src.locate(rel)
      if (!found || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) { problems.push(`${what}: no PNG or no approved hash`); return null }
      if (!existsSync(found.abs)) { problems.push(`${what}: ${found.file} is missing`); return null }
      const bytes = readFileSync(found.abs)
      if (sha256(bytes) !== hash) { problems.push(`${what}: ${found.file} changed since it was approved`); return null }
      const dims = pngSize(bytes)
      if (!dims) { problems.push(`${what}: ${found.file} isn't a PNG`); return null }
      return { file: found.file, bytes: bytes.byteLength, sha256: hash, ...dims }
    }

    for (const entry of src.entries) {
      const character = text(entry.character), outfit = text(entry.outfit)
      const what = `${character ?? '?'} ${outfit ?? '?'}`
      if (!character || !outfit || !KEBAB.test(character) || !KEBAB.test(outfit)) { problems.push(`${what}: an approval entry without a character or outfit`); continue }
      if (retired.has(outfit) || !ownOutfits.includes(outfit)) { problems.push(`${what}: the outfit isn’t a current one`); continue }
      if (!mine.some((c) => c.id === character)) { problems.push(`${what}: the character has no name in ${src.label}`); continue }
      const record = assets.find((a) => a.character === character && a.outfit === outfit)
      if (!record) { problems.push(`${what}: ${src.label} has no crop for it`); continue }
      const base = piece(record.base, entry.baseSha256, `${what} crop`)
      if (!base) continue
      size ??= { width: base.width, height: base.height }
      if (base.width !== size.width || base.height !== size.height) { problems.push(`${what} crop: ${base.width}×${base.height}, not ${size.width}×${size.height}`); continue }
      const id = `${character}-${outfit}`
      if (bases.some((b) => b.id === id)) { problems.push(`${what}: approved twice`); continue }
      bases.push({ id, character, outfit, path: `bases/${id}.${base.sha256.slice(0, 16)}.png`, ...base })
      states.push({ character, outfit, expression: neutral, base: id, face: null, at: null, approvedSha256: null })
      for (const output of (Array.isArray(entry.outputs) ? (entry.outputs as unknown[]) : []).filter(object)) {
        const expression = text(output.expression), position = at(output.position)
        if (!expression || !KEBAB.test(expression) || !ownExpressions.includes(expression) || !position) { problems.push(`${what}: a state without a known expression or position`); continue }
        const faceId = `${character}-${expression}`
        let face = faces.get(faceId)
        if (!face) {
          const record = faceRecords.find((f) => f.character === character && f.expression === expression)
          const found = record ? piece(record.file, output.faceSha256, `${character} ${expression} face`) : null
          if (!record) problems.push(`${character} ${expression} face: ${src.label} has no face for it`)
          if (!found) continue
          faceSize ??= { width: found.width, height: found.height }
          if (found.width !== faceSize.width || found.height !== faceSize.height) { problems.push(`${character} ${expression} face: ${found.width}×${found.height}, not ${faceSize.width}×${faceSize.height}`); continue }
          face = { id: faceId, character, expression, path: `faces/${faceId}.${found.sha256.slice(0, 16)}.png`, ...found }
          faces.set(faceId, face)
        } else if (face.sha256 !== output.faceSha256) { problems.push(`${what} ${expression}: approved with another ${expression} face`); continue }
        if (position.x < 0 || position.y < 0 || position.x + face.width > size.width || position.y + face.height > size.height) { problems.push(`${what} ${expression}: the face falls outside the crop`); continue }
        states.push({ character, outfit, expression, base: id, face: faceId, at: position, approvedSha256: text(output.sha256) })
      }
    }
  }

  // The shared collection: its approval record gates every state.
  if (approval.status !== 'approved' || approval.by !== 'owner') problems.push('approval.json doesn’t record the owner’s approval')
  ingest({
    label: 'the manifest', manifest,
    entries: (Array.isArray(approval.assets) ? (approval.assets as unknown[]) : []).filter(object),
    locate: (rel) => { const f = inside(dir, rel); return f ? { abs: join(dir, f), file: f } : null },
  })
  // Each character's own collection: her manifest's approval, her crops the owner approved, and her approved states.
  for (const study of characterStudies(resolve(dir, '..'))) {
    const own = object(study.manifest.approval) ? study.manifest.approval : {}
    if (!Array.isArray(study.manifest.assets)) continue
    if (own.status !== 'approved' || own.by !== 'owner') { problems.push(`${study.key}: her manifest doesn’t record the owner’s approval`); continue }
    ingest({
      label: `${study.key}'s manifest`, manifest: study.manifest,
      entries: (study.manifest.assets as unknown[]).filter(object).map((a) => ({
        character: a.character, outfit: a.outfit, baseSha256: a.neutralOwnerApproved === true ? a.baseSha256 : null,
        outputs: (Array.isArray(a.outputs) ? (a.outputs as unknown[]) : []).filter(object).filter((o) => o.ownerApproved === true),
      })),
      locate: (rel) => { const abs = studyFile(study, rel); return abs ? { abs, file: slashed(relative(dir, abs)) } : null },
    })
  }
  if (bases.length === 0) problems.push('no approved crop')
  // In the collections' order: character, outfit, expression.
  const rank = (list: string[], v: string) => { const i = list.indexOf(v); return i === -1 ? Infinity : i }
  const order = characters.map((c) => c.id)
  states.sort((a, b) => rank(order, a.character) - rank(order, b.character) || rank(outfits, a.outfit) - rank(outfits, b.outfit) || rank(expressions, a.expression) - rank(expressions, b.expression))
  bases.sort((a, b) => rank(order, a.character) - rank(order, b.character) || rank(outfits, a.outfit) - rank(outfits, b.outfit))
  const faceList = [...faces.values()].sort((a, b) => rank(order, a.character) - rank(order, b.character) || rank(expressions, a.expression) - rank(expressions, b.expression))
  return {
    universe, revision: typeof manifest.revision === 'number' ? manifest.revision : null, approvedOn: text(approval.date),
    characters, outfits, expressions,
    size: size ?? { width: 0, height: 0 }, faceSize: faceSize ?? { width: 0, height: 0 }, bases, faces: faceList, states, problems,
  }
}

export function parsePortraitIndex(source: string | null, universe: string): PortraitIndex | null {
  if (source === null) return null
  const value = JSON.parse(source) as unknown
  if (!object(value) || value.kind !== 'universe-portraits' || value.universe !== universe || !Array.isArray(value.bases) || !Array.isArray(value.faces) || !Array.isArray(value.states)) {
    throw new Error(`The bucket's ${PORTRAITS_INDEX} isn't the ${universe} universe's portraits index.`)
  }
  return value as unknown as PortraitIndex
}

const strip = <T extends { file: string }>({ file: _, ...rest }: T): Omit<T, 'file'> => rest
export interface PortraitPlan { index: PortraitIndex; upload: (PortraitSet['bases'][number] | PortraitSet['faces'][number])[]; unchanged: number; same: boolean }
/** What a push sends: every piece the bucket doesn't hold yet, then an index of the whole approved collection. */
export function planPortraits(set: PortraitSet, remote: PortraitIndex | null, now: string): PortraitPlan {
  const there = new Set([...(remote?.bases ?? []), ...(remote?.faces ?? [])].map((p) => `${p.path}:${p.sha256}`))
  const pieces = [...set.bases, ...set.faces]
  const upload = pieces.filter((p) => !there.has(`${p.path}:${p.sha256}`))
  const body = {
    universe: set.universe, revision: set.revision, approvedOn: set.approvedOn, size: set.size, faceSize: set.faceSize, blend: BLEND,
    characters: set.characters, outfits: set.outfits, expressions: set.expressions, bases: set.bases.map(strip), faces: set.faces.map(strip), states: set.states,
  }
  // The bucket's index without its own stamps, in the same key order, so equal collections give equal text.
  const same = remote !== null && JSON.stringify(body) === JSON.stringify({
    universe: remote.universe, revision: remote.revision, approvedOn: remote.approvedOn, size: remote.size, faceSize: remote.faceSize, blend: remote.blend,
    characters: remote.characters, outfits: remote.outfits, expressions: remote.expressions, bases: remote.bases, faces: remote.faces, states: remote.states,
  })
  return {
    index: { schemaVersion: 1, kind: 'universe-portraits', ...body, publishedAt: same ? remote.publishedAt : now } as PortraitIndex,
    upload, unchanged: pieces.length - upload.length, same,
  }
}

// --- the published flag, beside the portraits' manifest

export interface PortraitPublication {
  schemaVersion: 1
  kind: 'universe-portraits-publication'
  universe: string
  destination: string
  checkedAt: string
  /** `published`: the bucket's index is this collection; `changed`: it is an older one; `unpublished`; `refused`. */
  state: 'published' | 'changed' | 'unpublished' | 'refused'
  publishedAt: string | null
  states: number
  bases: number
  faces: number
  /** Uma Character Art shows the pieces on each Uma's page; the games compose the states. */
  composedBy: 'the games'
  /** Each character's share, by key, for her own album's line (P174). */
  characters?: Record<string, { states: number; bases: number; faces: number }>
  note: string | null
}
export function portraitPublicationOf(set: PortraitSet, remote: PortraitIndex | null, now: string, bucket = BUCKET): PortraitPublication {
  const plan = set.problems.length ? null : planPortraits(set, remote, now)
  const state: PortraitPublication['state'] = set.problems.length ? 'refused' : !remote ? 'unpublished' : plan!.same && plan!.upload.length === 0 ? 'published' : 'changed'
  return {
    schemaVersion: 1, kind: 'universe-portraits-publication', universe: set.universe, destination: `gs://${bucket}/art/universes/${set.universe}/portraits/`,
    checkedAt: now, state, publishedAt: remote?.publishedAt ?? null, states: set.states.length, bases: set.bases.length, faces: set.faces.length, composedBy: 'the games',
    characters: Object.fromEntries(set.characters.map((c) => [c.id, {
      states: set.states.filter((s) => s.character === c.id).length, bases: set.bases.filter((b) => b.character === c.id).length, faces: set.faces.filter((f) => f.character === c.id).length,
    }])),
    note: state === 'refused' ? `Can’t publish: ${set.problems.slice(0, 5).join('; ')}${set.problems.length > 5 ? `; and ${set.problems.length - 5} more` : ''}.`
      : state === 'changed' ? 'The approved collection changed since it was published; a push sends the new pieces.' : null,
  }
}

/** Writes the record and its script beside the portraits' manifest, and the galleries' tags. Says which files changed. */
export function writePortraitFlags(dir: string, publication: PortraitPublication): string[] {
  const changed: string[] = []
  const recordFile = join(dir, RECORD)
  const before = existsSync(recordFile) ? JSON.parse(readFileSync(recordFile, 'utf8')) as PortraitPublication : null
  const record = before && JSON.stringify({ ...before, checkedAt: '' }) === JSON.stringify({ ...publication, checkedAt: '' }) ? before : publication
  if (write(recordFile, encode(record))) changed.push(RECORD)
  if (write(join(dir, RECORD_SCRIPT), `// Written by pnpm art:push --portraits and pnpm art:status from ${RECORD}; the galleries read it.\nwindow.UMA_PORTRAIT_PUBLICATION = ${JSON.stringify(record, null, 2)};\n`)) changed.push(RECORD_SCRIPT)
  // Each character collection keeps her share beside her active study, for her album's line (P174).
  for (const study of characterStudies(resolve(dir, '..'))) {
    const mine = record.characters?.[study.key]
    if (!mine) continue
    const { characters: _, ...rest } = record
    const target = join(study.folder, PORTRAIT_RECORD), at = slashed(relative(dir, study.folder))
    if (write(target, encode(stable(target, { ...rest, ...mine })))) changed.push(`${at}/${PORTRAIT_RECORD}`)
    if (writeStudyScript(study.folder)) changed.push(`${at}/${RECORD_SCRIPT}`)
  }
  return [...changed, ...tagGalleries(resolve(dir, '..'), 'dialogue-portraits')]
}

// --- the push

export interface PortraitPushResult { universe: string; uploaded: string[]; unchanged: number; states: number; indexed: boolean; publication: PortraitPublication; flagged: string[] }
/**
 * `pnpm art:push <universe> --portraits`: sends every approved crop and face the bucket doesn't hold yet (byte for byte,
 * under hash names), reads each back by size and MD5, then writes the index last under a generation check and flags the
 * collection as published. A collection with any problem sends nothing.
 */
export function pushPortraits(universe: string, dir: string, mirrorDir: string, remote: Remote, now: string, options: { dryRun?: boolean } = {}): PortraitPushResult {
  const set = readPortraits(universe, dir)
  const there = remote.read(PORTRAITS_INDEX)
  const before = parsePortraitIndex(there?.text ?? null, universe)
  if (set.problems.length) {
    const shown = set.problems.slice(0, 8).join('\n  ')
    throw new Error(`${universe}: the dialogue portraits can't be published, nothing was sent:\n  ${shown}${set.problems.length > 8 ? `\n  … and ${set.problems.length - 8} more` : ''}`)
  }
  const plan = planPortraits(set, before, now)
  const result: PortraitPushResult = {
    universe, uploaded: plan.upload.map((p) => p.id), unchanged: plan.unchanged, states: set.states.length, indexed: !plan.same,
    publication: portraitPublicationOf(set, options.dryRun ? before : plan.index, now), flagged: [],
  }
  if (options.dryRun) return result
  const home = join(mirrorDir, 'universes', universe)
  const pieces = [...set.bases, ...set.faces]
  for (const p of pieces) {
    const to = join(home, 'portraits', p.path)
    if (existsSync(to) && sha256(readFileSync(to)) === p.sha256) continue
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(join(dir, p.file), to)
  }
  if (plan.upload.length) {
    const stage = mkdtempSync(join(tmpdir(), 'art-portraits-'))
    try {
      for (const p of plan.upload) { const to = join(stage, 'portraits', p.path); mkdirSync(dirname(to), { recursive: true }); copyFileSync(join(dir, p.file), to) }
      remote.uploadFolder(stage)
    } finally { rmSync(stage, { recursive: true, force: true }) }
  }
  const inBucket = new Map(remote.list().map((f) => [f.path, f]))
  for (const p of pieces) {
    const file = inBucket.get(`portraits/${p.path}`)
    if (!file) throw new Error(`${universe}: portraits/${p.path} isn't in the bucket after the upload. The index wasn't written; run the push again.`)
    if (file.bytes !== p.bytes || file.md5 !== md5(readFileSync(join(dir, p.file)))) throw new Error(`${universe}: the bucket's portraits/${p.path} isn't the approved PNG. The index wasn't written.`)
  }
  const indexFile = join(home, PORTRAITS_INDEX)
  write(indexFile, encode(plan.index))
  if (!plan.same && !remote.uploadFile(indexFile, PORTRAITS_INDEX, there?.generation ?? '0')) throw new Error(`${universe}: the portraits index changed in the bucket while pushing. Run it again.`)
  result.flagged = writePortraitFlags(dir, result.publication)
  return result
}

/** `pnpm art:status`: the portraits' flag against the bucket as it is now. Publishes nothing. */
export function portraitStatus(universe: string, dir: string, remote: Remote, now: string): { publication: PortraitPublication; flagged: string[] } {
  const publication = portraitPublicationOf(readPortraits(universe, dir), parsePortraitIndex(remote.read(PORTRAITS_INDEX)?.text ?? null, universe), now)
  return { publication, flagged: writePortraitFlags(dir, publication) }
}
