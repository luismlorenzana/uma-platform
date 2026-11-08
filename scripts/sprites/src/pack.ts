// `pnpm sprites:pack` (UA5): approved revisions → master data's `outfit-sprites` family (format.md §13).
// Each approved outfit's frames and face patches are trimmed to their visible pixels, packed on WebP pages and
// described by one sprite set file; the local release's art index gains a `sprites` map. Deterministic: a second pack
// of the same revisions writes the same bytes.

import {
  parseSpriteSet,
  type ReleaseFile,
  type ReleaseManifest,
  type SpriteAction,
  type SpriteBounds,
  type SpriteFace,
  type SpriteFrame,
  type SpriteSet,
} from '@luismlorenzana/uma-data'
import {
  readLocalManifest,
  readVerifiedFile,
  removeUnlisted,
  writeLocalManifest,
  writeReleaseFile,
} from '@uma-platform/data-pipeline/release-dir'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { current, hash, inside, readJson } from './io.js'
import { bounds as opaqueBounds } from './pixels.js'
import { reviewState } from './reviews.js'
import type { NativeAtlas, NativeFrame, Pixels } from './types.js'

export const SPRITE_PAGE_MAX = 4096
export const SPRITE_PADDING = 2
export type SpriteEncoding = 'lossless' | 'lossy'
/** UA5's measured choice for batch 1 (format.md §13, P100). */
export const DEFAULT_SPRITE_ENCODING: SpriteEncoding = 'lossy'
const FAMILY_SETS = 'art/outfit-sprites'
const FAMILY_PAGES = 'atlases'

// ── Approval ────────────────────────────────────────────────────────────────────────────────────────────────

export interface PackCandidate { outfitId: number; dir: string; atlas: NativeAtlas }
export interface PackSkip { outfitId: number; reason: string }

/** Every outfit whose current revision's set gate is approved against its present file hashes; the rest, with why. */
export async function approvedSets(root: string, ids?: readonly number[]): Promise<{ ready: PackCandidate[]; skipped: PackSkip[] }> {
  const outfitIds = ids ?? (await readdir(root)).filter((name) => /^\d+$/.test(name)).map(Number).sort((a, b) => a - b)
  const ready: PackCandidate[] = []
  const skipped: PackSkip[] = []
  for (const outfitId of outfitIds) {
    let dir: string
    try {
      dir = await current(root, outfitId)
    } catch {
      skipped.push({ outfitId, reason: 'no current revision' })
      continue
    }
    const atlas = await readJson<NativeAtlas>(resolve(dir, 'atlas.json'))
    const state = await reviewState(root, dir, atlas)
    const gate = state.gates?.set
    if (state.set.approved) ready.push({ outfitId, dir, atlas })
    else if (state.set.changed) {
      skipped.push({ outfitId, reason: `r${atlas.revision}: ${state.set.missing.length} file(s) changed since the set approval (e.g. ${state.set.missing[0]})` })
    } else if (gate?.decision === 'changes') skipped.push({ outfitId, reason: `r${atlas.revision}: the set gate asked for changes` })
    else skipped.push({ outfitId, reason: `r${atlas.revision}: no set approval` })
  }
  return { ready, skipped }
}

// ── Layout ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface PackItem { key: string; w: number; h: number }
export interface PackLayout {
  pages: { width: number; height: number }[]
  /** Where each item's pixels start on its page (inside its padding). */
  places: Map<string, { page: number; x: number; y: number }>
}

/**
 * Shelf packing: tallest first, rows of a near-square width, a new page before one would pass `maxSide`. Each item
 * gets `padding` transparent pixels on every side. The order is fixed by height, width and key, so it's deterministic.
 */
export function layoutRects(items: readonly PackItem[], maxSide = SPRITE_PAGE_MAX, padding = SPRITE_PADDING): PackLayout {
  const slots = items.map((item) => ({ ...item, sw: item.w + padding * 2, sh: item.h + padding * 2 }))
  for (const slot of slots) if (slot.sw > maxSide || slot.sh > maxSide) throw new Error(`${slot.key} doesn't fit on a ${maxSide} px page`)
  slots.sort((a, b) => b.sh - a.sh || b.sw - a.sw || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  const area = slots.reduce((sum, slot) => sum + slot.sw * slot.sh, 0)
  const width = Math.min(maxSide, Math.max(Math.ceil(Math.sqrt(area)), ...slots.map((slot) => slot.sw), 1))
  const pages: PackLayout['pages'] = []
  const places: PackLayout['places'] = new Map()
  let page = { width: 0, height: 0 }
  let x = 0
  let y = 0
  let row = 0
  for (const slot of slots) {
    if (x + slot.sw > width) {
      y += row
      x = 0
      row = 0
    }
    if (y + slot.sh > maxSide) {
      pages.push(page)
      page = { width: 0, height: 0 }
      x = 0
      y = 0
      row = 0
    }
    places.set(slot.key, { page: pages.length, x: x + padding, y: y + padding })
    x += slot.sw
    row = Math.max(row, slot.sh)
    page.width = Math.max(page.width, x)
    page.height = Math.max(page.height, y + row)
  }
  if (slots.length > 0) pages.push(page)
  return { pages, places }
}

// ── Packing one set ─────────────────────────────────────────────────────────────────────────────────────────

interface Trimmed { key: string; w: number; h: number; dx: number; dy: number; data: Buffer }

async function rgba(file: string): Promise<Pixels> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/** The rectangle of every pixel with any alpha, so antialiased edges outside the opaque bounds are kept. */
export function visibleRect(p: Pixels): { x: number; y: number; w: number; h: number } | null {
  const b = opaqueBounds(p, 1)
  return b.right < 0 ? null : { x: b.left, y: b.top, w: b.width, h: b.height }
}

function crop(p: Pixels, r: { x: number; y: number; w: number; h: number }): Buffer {
  const out = Buffer.alloc(r.w * r.h * 4)
  for (let row = 0; row < r.h; row += 1) p.data.copy(out, row * r.w * 4, ((r.y + row) * p.width + r.x) * 4, ((r.y + row) * p.width + r.x + r.w) * 4)
  return out
}

function trim(p: Pixels, label: string): Trimmed {
  const r = visibleRect(p)
  if (!r) throw new Error(`${label} is empty`)
  const data = crop(p, r)
  return { key: hash(Buffer.concat([Buffer.from(`${r.w}x${r.h}:`), data])), w: r.w, h: r.h, dx: r.x, dy: r.y, data }
}

const sameBounds = (a: SpriteBounds, b: SpriteBounds) =>
  a.left === b.left && a.right === b.right && a.top === b.top && a.bottom === b.bottom && a.width === b.width && a.height === b.height

export interface PackedPage { bytes: Buffer; width: number; height: number }
export interface PackedSprites {
  outfitId: number
  revision: number
  profile: string
  /** The sprite set with `pages` still to be named (their paths depend on the page bytes). */
  set: Omit<SpriteSet, 'pages'>
  pages: PackedPage[]
}

export function encodePage(raw: Buffer, width: number, height: number, encoding: SpriteEncoding): Promise<Buffer> {
  const image = sharp(raw, { raw: { width, height, channels: 4 } })
  return (encoding === 'lossless'
    ? image.webp({ lossless: true, effort: 6 })
    : image.webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
  ).toBuffer()
}

/** Packs one approved revision: trimmed, deduplicated frames and patches on WebP pages, and its sprite set. */
export async function packRevision(candidate: PackCandidate, encoding: SpriteEncoding): Promise<PackedSprites> {
  const { atlas, dir } = candidate
  const images = new Map<string, Trimmed>()
  const add = (t: Trimmed) => {
    if (!images.has(t.key)) images.set(t.key, t)
    return t
  }

  const frameFor = async (frame: NativeFrame, at: string) => {
    const pixels = await rgba(await inside(dir, frame.file))
    if (pixels.width !== atlas.cell || pixels.height !== atlas.cell) throw new Error(`${at} isn't ${atlas.cell} px square`)
    const t = add(trim(pixels, at))
    const opaque = opaqueBounds(pixels)
    if (opaque.right < 0) throw new Error(`${at} has no opaque pixels`)
    if (frame.bounds && !sameBounds(frame.bounds, opaque)) throw new Error(`${at}'s bounds disagree with its pixels`)
    return { t, opaque }
  }

  const actions: Record<string, SpriteAction> = {}
  const frameRefs: { frame: Omit<SpriteFrame, 'page' | 'x' | 'y'>; key: string }[] = []
  for (const [name, native] of Object.entries(atlas.actions)) {
    const frames: SpriteFrame[] = []
    for (const [index, frame] of native.frames.entries()) {
      const { t, opaque } = await frameFor(frame, `${atlas.id} r${atlas.revision} ${name}[${index}]`)
      const out: SpriteFrame = { page: 0, x: 0, y: 0, w: t.w, h: t.h, dx: t.dx, dy: t.dy,
        headLocked: frame.headLocked, hold: frame.hold, air: frame.air ?? false, hit: frame.hit, bounds: frame.bounds ?? opaque }
      if (frame.ms !== undefined) out.ms = frame.ms
      if (frame.headOffset) out.headOffset = frame.headOffset
      if (frame.grip) out.grip = frame.grip
      if (frame.off) out.off = frame.off
      if (frame.cast) out.cast = frame.cast
      if (frame.handOcclusion) out.handOcclusion = frame.handOcclusion
      if (frame.view) out.view = frame.view
      frames.push(out)
      frameRefs.push({ frame: out, key: t.key })
    }
    const events: SpriteAction['events'] = {}
    for (const key of ['impact', 'release'] as const) if (typeof native.events[key] === 'number') events[key] = native.events[key] as number
    for (const key of ['hold', 'repeat'] as const) {
      const pair = native.events[key]
      if (Array.isArray(pair)) events[key] = [pair[0]!, pair[1]!]
    }
    actions[name] = { loop: native.loop, events, frames }
  }

  const faces: Record<string, SpriteFace> = {}
  const faceRefs: { face: SpriteFace; key: string }[] = []
  for (const [name, native] of Object.entries(atlas.faces)) {
    const pixels = await rgba(await inside(dir, native.file))
    if (pixels.width !== native.w || pixels.height !== native.h) throw new Error(`${atlas.id} face ${name} isn't its face box's size`)
    const t = add(trim(pixels, `${atlas.id} face ${name}`))
    faces[name] = { page: 0, x: 0, y: 0, w: t.w, h: t.h, dx: t.dx, dy: t.dy, place: { x: native.x, y: native.y, w: native.w, h: native.h } }
    faceRefs.push({ face: faces[name]!, key: t.key })
  }

  const layout = layoutRects([...images.values()].map(({ key, w, h }) => ({ key, w, h })))
  const raws = layout.pages.map((page) => Buffer.alloc(page.width * page.height * 4))
  for (const image of images.values()) {
    const place = layout.places.get(image.key)!
    const page = layout.pages[place.page]!
    for (let row = 0; row < image.h; row += 1) {
      image.data.copy(raws[place.page]!, ((place.y + row) * page.width + place.x) * 4, row * image.w * 4, (row + 1) * image.w * 4)
    }
  }
  for (const ref of [...frameRefs.map((r) => ({ target: r.frame, key: r.key })), ...faceRefs.map((r) => ({ target: r.face, key: r.key }))]) {
    const place = layout.places.get(ref.key)!
    Object.assign(ref.target, { page: place.page, x: place.x, y: place.y })
  }

  const pages: PackedPage[] = []
  for (const [index, page] of layout.pages.entries()) {
    const bytes = await encodePage(raws[index]!, page.width, page.height, encoding)
    if (encoding === 'lossless') await checkLossless(bytes, raws[index]!, page, `${atlas.id} page ${index}`)
    pages.push({ bytes, width: page.width, height: page.height })
  }

  return {
    outfitId: atlas.id,
    revision: atlas.revision,
    profile: atlas.profile,
    pages,
    set: { outfitId: atlas.id, revision: atlas.revision, profile: atlas.profile, cell: atlas.cell, logicalCell: atlas.logicalCell,
      foot: atlas.foot, headBox: atlas.headBox, faceBox: atlas.faceBox, hit: atlas.hit, faces, actions },
  }
}

/** A lossless page decodes to the packed pixels: every alpha exactly, and colour wherever alpha isn't zero. */
async function checkLossless(bytes: Buffer, raw: Buffer, page: { width: number; height: number }, label: string): Promise<void> {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (info.width !== page.width || info.height !== page.height) throw new Error(`${label} decodes at the wrong size`)
  for (let i = 0; i < raw.length; i += 4) {
    if (data[i + 3] !== raw[i + 3] || (raw[i + 3] !== 0 && (data[i] !== raw[i] || data[i + 1] !== raw[i + 1] || data[i + 2] !== raw[i + 2]))) {
      throw new Error(`${label} doesn't decode to its packed pixels`)
    }
  }
}

// ── Writing into the local release ──────────────────────────────────────────────────────────────────────────

const isSpriteFile = (path: string) => path.startsWith(`${FAMILY_SETS}/`) || path.startsWith(`${FAMILY_PAGES}/outfit-sprites-`)

/**
 * Replaces the local release's `outfit-sprites` family with `packed`: page files, one sprite set file per outfit and a
 * new art index whose `sprites` map lists them. Every other file and art index entry is kept as it is.
 */
export async function writeSpriteFamily(releaseDir: string, packed: readonly PackedSprites[], now?: Date): Promise<ReleaseManifest> {
  const previous = await readLocalManifest(releaseDir)
  if (!previous) throw new Error('No local release; run pnpm data:import first')
  let index: Record<string, unknown> = { atlases: {}, images: {} }
  if (previous.art) {
    const file = previous.files.find((entry) => entry.path === previous.art)!
    index = JSON.parse((await readVerifiedFile(releaseDir, file)).toString('utf8')) as Record<string, unknown>
  }
  const files: ReleaseFile[] = previous.files.filter((file) => file.path !== previous.art && !isSpriteFile(file.path))
  const sprites: Record<string, string> = {}
  for (const entry of [...packed].sort((a, b) => a.outfitId - b.outfitId)) {
    const pages = []
    for (const [n, page] of entry.pages.entries()) {
      const file = await writeReleaseFile(releaseDir, FAMILY_PAGES, `outfit-sprites-${entry.outfitId}-${n}`, 'webp', page.bytes)
      files.push(file)
      pages.push({ path: file.path, width: page.width, height: page.height })
    }
    const set: SpriteSet = { ...entry.set, pages }
    const json = JSON.stringify(set)
    // The published parser must accept every set before it's written.
    parseSpriteSet(JSON.parse(json) as unknown, `outfit-sprites/${entry.outfitId}`)
    const file = await writeReleaseFile(releaseDir, FAMILY_SETS, String(entry.outfitId), 'json', json)
    files.push(file)
    sprites[String(entry.outfitId)] = file.path
  }
  const { sprites: _previousSprites, ...rest } = index
  const nextIndex = Object.keys(sprites).length > 0 ? { ...rest, sprites } : rest
  const indexFile = await writeReleaseFile(releaseDir, 'data', 'art', 'json', JSON.stringify(nextIndex))
  files.push(indexFile)
  const manifest = await writeLocalManifest(releaseDir, { sources: previous.sources, sets: previous.sets, art: indexFile.path, files }, now)
  await removeUnlisted(releaseDir, 'data', manifest)
  await removeUnlisted(releaseDir, FAMILY_PAGES, manifest)
  await removeUnlisted(releaseDir, FAMILY_SETS, manifest)
  return manifest
}

/** Page bytes of one packed set, both ways, for the encoding decision. */
export async function measureEncodings(candidate: PackCandidate): Promise<Record<SpriteEncoding, number>> {
  const [lossless, lossy] = await Promise.all([packRevision(candidate, 'lossless'), packRevision(candidate, 'lossy')])
  const total = (packed: PackedSprites) => packed.pages.reduce((sum, page) => sum + page.bytes.byteLength, 0)
  return { lossless: total(lossless), lossy: total(lossy) }
}
