// `pnpm illustrations:pack` (uma-farm F84, P176; docs/sprites/illustrations.md): a universe's published splash art →
// master data's `illustrations` family. The source is what the art pipeline published to the app's bucket: the universe's
// index (`art/universes/<universe>/index.json`, `kind: universe-art`), whose `kind: "splash"` entries are the owner-approved
// scenes, and their PNGs under `images/`, mirrored privately. Each scene's story moment comes from the private moments
// map, `content/authoring/illustrations/<universe>.json`, which names a scene by the universe's id; a scene it doesn't
// name takes its moment from the universe's splash brief, `docs/authoring/<universe>-splash-art/scene-set.json` (P203):
// the slot with her scene's own id, else the next slot of its outfit she hasn't used. A scene with neither stops the pack. Each character is matched to master data by her name; each file must still have the index's
// SHA-256 and size and be opaque. The scenes go to the release as lossy WebP (they are only ever shown whole, never drawn
// over), each checked to decode at its size within the quality floor.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { ILLUSTRATION_NAME } from '@luismlorenzana/uma-data'
import { decodeRgba, encodeLosslessOpaque, encodeLossyOpaque, isOpaque, psnr } from './enemy-images'
import type { PackedIllustrations } from './illustration-release'

/** The release's WebP quality: about a fifth of lossless's bytes for the Farm Life scenes. */
export const ILLUSTRATION_QUALITY = 92
/** The qualities a scene steps up through when it decodes under the floor at the one before (P203): the release's first, then
 *  higher lossy ones, then lossless, which lossy WebP's subsampled colour sometimes can't reach on a detailed scene. */
export const ILLUSTRATION_QUALITIES = [ILLUSTRATION_QUALITY, 94, 96, 98, 'lossless'] as const
export type IllustrationQuality = (typeof ILLUSTRATION_QUALITIES)[number]
/** The lowest colour PSNR (dB) a released scene may have against its approved PNG. */
export const ILLUSTRATION_PSNR_FLOOR = 38

/** One entry of a universe's published index, as `pnpm art:push` writes it. */
export interface UniverseArtEntry {
  id: string
  character: string
  outfit: string
  title: string
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  kind?: string
}
export interface UniverseArtIndex { schemaVersion: 1; kind: 'universe-art'; universe: string; revision: number; looks: UniverseArtEntry[] }
/** The private moments map: each scene, by the universe's id, to its story moment. */
export interface IllustrationMoments { universe: string; moments: Record<string, string> }
/** A slot of a universe's splash brief (`scene-set.json`): the scene's id of her own, its outfit and its story moment. */
export interface SceneSlot { id: string; outfit: string; moment: string }

export interface IllustrationPlan {
  characterId: number
  /** Her name in the universe. */
  name: string
  scenes: { id: string; universeId: string; title: string; outfit: string; moment: string; approvedOn: string; path: string; sha256: string; width: number; height: number }[]
}

export function readUniverseArtIndex(value: unknown, universe: string): UniverseArtIndex {
  const v = value as Partial<UniverseArtIndex> | null
  if (!v || v.kind !== 'universe-art' || v.schemaVersion !== 1 || v.universe !== universe || !Array.isArray(v.looks)) throw new Error(`Not the ${universe} universe's art index`)
  return v as UniverseArtIndex
}

export function readIllustrationMoments(value: unknown, universe: string): IllustrationMoments {
  const v = value as Partial<IllustrationMoments> | null
  if (!v || v.universe !== universe || typeof v.moments !== 'object' || v.moments === null) throw new Error(`Not the ${universe} universe's illustration moments`)
  for (const [scene, moment] of Object.entries(v.moments)) {
    if (typeof moment !== 'string' || !ILLUSTRATION_NAME.test(moment) || moment.length > 40) throw new Error(`${scene}: its moment isn't lowercase words joined by hyphens`)
  }
  return v as IllustrationMoments
}

/** The splash brief's slots, in its order: `{ scenes: [{ id, outfit, moment }] }`. */
export function readSceneSet(value: unknown): SceneSlot[] {
  const scenes = (value as { scenes?: unknown } | null)?.scenes
  if (!Array.isArray(scenes) || scenes.length === 0) throw new Error('Not a splash brief\'s scene set: no scenes')
  return scenes.map((raw, i) => {
    const v = raw as Partial<SceneSlot> | null
    for (const key of ['id', 'outfit', 'moment'] as const) {
      const value = v?.[key]
      if (typeof value !== 'string' || !ILLUSTRATION_NAME.test(value) || value.length > 40) throw new Error(`Scene set slot ${i + 1}: its ${key} isn't lowercase words joined by hyphens`)
    }
    return { id: v!.id!, outfit: v!.outfit!, moment: v!.moment! }
  })
}

/**
 * Each splash scene's moment, by the universe's id: the moments map's, when it names the scene; then, for the rest of a
 * character's scenes, the scene set's slot with her scene's own id, then the next slot of its outfit, in the set's order,
 * whose moment she hasn't used. `defaulted` lists the scenes the scene set named; `unmapped` the ones nothing fits.
 */
export function momentsOf(splash: readonly UniverseArtEntry[], moments: IllustrationMoments, slots: readonly SceneSlot[] = []): { moment: Map<string, string>; defaulted: string[]; unmapped: string[] } {
  const moment = new Map<string, string>(), defaulted: string[] = [], unmapped: string[] = []
  const characters = [...new Set(splash.map((l) => l.character))]
  for (const character of characters) {
    const mine = splash.filter((l) => l.character === character), used = new Set<string>(), prefix = `${keyOf(character)}-splash-`
    const own = (l: UniverseArtEntry) => (l.id.startsWith(prefix) ? l.id.slice(prefix.length) : l.id)
    for (const l of mine) { const m = moments.moments[l.id]; if (m) { moment.set(l.id, m); used.add(m) } }
    const take = (l: UniverseArtEntry, slot: SceneSlot | undefined) => { if (!slot) return; moment.set(l.id, slot.moment); used.add(slot.moment); defaulted.push(l.id) }
    for (const l of mine) if (!moment.has(l.id)) take(l, slots.find((s) => s.id === own(l) && s.outfit === l.outfit && !used.has(s.moment)))
    for (const l of mine) if (!moment.has(l.id)) take(l, slots.find((s) => s.outfit === l.outfit && !used.has(s.moment)))
    for (const l of mine) if (!moment.has(l.id)) unmapped.push(l.id)
  }
  return { moment, defaulted, unmapped }
}

/** A name as the art pipeline's key: "Kitasan Black" is `kitasan-black`. */
export const keyOf = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/**
 * Each character's splash scenes, in the index's order, with their moments and ids of her own (the universe's id without
 * its `<her key>-splash-` prefix); and why any is left out. A scene neither the moments map nor the scene set gives a
 * moment stops it (`momentsOf`).
 */
export function planIllustrations(index: UniverseArtIndex, moments: IllustrationMoments, characterIdOf: (name: string) => number | null, slots: readonly SceneSlot[] = []): { plans: IllustrationPlan[]; skipped: string[]; defaulted: string[] } {
  const splash = index.looks.filter((l) => l.kind === 'splash')
  const { moment, defaulted, unmapped } = momentsOf(splash, moments, slots)
  if (unmapped.length > 0) throw new Error(`No moment for ${unmapped.join(', ')}: the scene set has no free slot for its outfit; name each in content/authoring/illustrations/${index.universe}.json`)
  const plans = new Map<string, IllustrationPlan>(), skipped: string[] = []
  for (const look of splash) {
    if (!plans.has(look.character)) {
      const characterId = characterIdOf(look.character)
      if (characterId === null) { if (!skipped.some((s) => s.startsWith(`${look.character}:`))) skipped.push(`${look.character}: no master data character has that name`); continue }
      plans.set(look.character, { characterId, name: look.character, scenes: [] })
    }
    if (!look.approvedOn) throw new Error(`${look.id} has no approval date`)
    const prefix = `${keyOf(look.character)}-splash-`
    const id = look.id.startsWith(prefix) ? look.id.slice(prefix.length) : look.id
    const plan = plans.get(look.character)!
    if (plan.scenes.some((s) => s.id === id)) throw new Error(`${look.id}: ${look.character} has two scenes named ${id}`)
    plan.scenes.push({ id, universeId: look.id, title: look.title, outfit: look.outfit, moment: moment.get(look.id)!, approvedOn: look.approvedOn.slice(0, 10), path: look.path, sha256: look.sha256, width: look.width, height: look.height })
  }
  return { plans: [...plans.values()], skipped, defaulted }
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Packs one character from the mirrored universe folder: every file checked against the index, encoded, decoded back. */
export async function packIllustrations(dir: string, universe: string, plan: IllustrationPlan): Promise<PackedIllustrations & { quality: { scene: string; psnr: number; quality: IllustrationQuality }[] }> {
  const root = resolve(dir)
  const scenes: PackedIllustrations['scenes'] = [], quality: { scene: string; psnr: number; quality: IllustrationQuality }[] = []
  for (const s of plan.scenes) {
    const file = resolve(root, ...s.path.split('/'))
    if (!file.startsWith(root + sep)) throw new Error(`${s.path} leaves the universe's folder`)
    const png = await readFile(file)
    if (sha256(png) !== s.sha256) throw new Error(`${s.path} isn't the file the index approved (its SHA-256 differs)`)
    const rgba = await decodeRgba(png)
    if (rgba.width !== s.width || rgba.height !== s.height) throw new Error(`${s.path} is ${rgba.width}x${rgba.height}, not ${s.width}x${s.height}`)
    if (!isOpaque(rgba)) throw new Error(`${s.path} isn't opaque; an illustration fills the screen`)
    // The release's quality first; a scene under the floor there steps up until it decodes within it.
    let bytes: Buffer | null = null, db = 0, used: IllustrationQuality = ILLUSTRATION_QUALITY
    for (const q of ILLUSTRATION_QUALITIES) {
      const encoded = q === 'lossless' ? await encodeLosslessOpaque(rgba) : await encodeLossyOpaque(rgba, q), back = await decodeRgba(encoded)
      if (back.width !== s.width || back.height !== s.height) throw new Error(`${s.path} doesn't decode at its size`)
      db = psnr(rgba, back); used = q
      if (db >= ILLUSTRATION_PSNR_FLOOR) { bytes = encoded; break }
    }
    if (!bytes) throw new Error(`${s.path} encodes at ${db.toFixed(2)} dB even ${used === 'lossless' ? 'lossless' : `at quality ${used}`}, under the ${ILLUSTRATION_PSNR_FLOOR} dB floor`)
    quality.push({ scene: s.id, psnr: db, quality: used })
    scenes.push({ id: s.id, title: s.title, outfit: s.outfit, moment: s.moment, approvedOn: s.approvedOn, bytes, width: s.width, height: s.height })
  }
  return { characterId: plan.characterId, universe, scenes, quality }
}
