// `pnpm illustrations:pack` (uma-farm F84, P176; docs/sprites/illustrations.md): a universe's published splash art →
// master data's `illustrations` family. The source is what the art pipeline published to the app's bucket: the universe's
// index (`art/universes/<universe>/index.json`, `kind: universe-art`), whose `kind: "splash"` entries are the owner-approved
// scenes, and their PNGs under `images/`, mirrored privately. Each scene's story moment comes from the private moments
// map, `content/authoring/illustrations/<universe>.json`, which names every scene by the universe's id; a scene without
// one stops the pack. Each character is matched to master data by her name; each file must still have the index's
// SHA-256 and size and be opaque. The scenes go to the release as lossy WebP (they are only ever shown whole, never drawn
// over), each checked to decode at its size within the quality floor.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { ILLUSTRATION_NAME } from '@luismlorenzana/uma-data'
import { decodeRgba, encodeLossyOpaque, isOpaque, psnr } from './enemy-images'
import type { PackedIllustrations } from './illustration-release'

/** The release's WebP quality: about a fifth of lossless's bytes for the Farm Life scenes. */
export const ILLUSTRATION_QUALITY = 92
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

/** A name as the art pipeline's key: "Kitasan Black" is `kitasan-black`. */
export const keyOf = (name: string) => name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/**
 * Each character's splash scenes, in the index's order, with their moments and ids of her own (the universe's id without
 * its `<her key>-splash-` prefix); and why any is left out. A scene the moments map doesn't name stops it.
 */
export function planIllustrations(index: UniverseArtIndex, moments: IllustrationMoments, characterIdOf: (name: string) => number | null): { plans: IllustrationPlan[]; skipped: string[] } {
  const splash = index.looks.filter((l) => l.kind === 'splash')
  const unmapped = splash.filter((l) => !moments.moments[l.id]).map((l) => l.id)
  if (unmapped.length > 0) throw new Error(`No moment for ${unmapped.join(', ')}; name each in content/authoring/illustrations/${index.universe}.json`)
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
    plan.scenes.push({ id, universeId: look.id, title: look.title, outfit: look.outfit, moment: moments.moments[look.id]!, approvedOn: look.approvedOn.slice(0, 10), path: look.path, sha256: look.sha256, width: look.width, height: look.height })
  }
  return { plans: [...plans.values()], skipped }
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** Packs one character from the mirrored universe folder: every file checked against the index, encoded, decoded back. */
export async function packIllustrations(dir: string, universe: string, plan: IllustrationPlan): Promise<PackedIllustrations & { quality: { scene: string; psnr: number }[] }> {
  const root = resolve(dir)
  const scenes: PackedIllustrations['scenes'] = [], quality: { scene: string; psnr: number }[] = []
  for (const s of plan.scenes) {
    const file = resolve(root, ...s.path.split('/'))
    if (!file.startsWith(root + sep)) throw new Error(`${s.path} leaves the universe's folder`)
    const png = await readFile(file)
    if (sha256(png) !== s.sha256) throw new Error(`${s.path} isn't the file the index approved (its SHA-256 differs)`)
    const rgba = await decodeRgba(png)
    if (rgba.width !== s.width || rgba.height !== s.height) throw new Error(`${s.path} is ${rgba.width}x${rgba.height}, not ${s.width}x${s.height}`)
    if (!isOpaque(rgba)) throw new Error(`${s.path} isn't opaque; an illustration fills the screen`)
    const bytes = await encodeLossyOpaque(rgba, ILLUSTRATION_QUALITY)
    const back = await decodeRgba(bytes)
    if (back.width !== s.width || back.height !== s.height) throw new Error(`${s.path} doesn't decode at its size`)
    const db = psnr(rgba, back)
    if (db < ILLUSTRATION_PSNR_FLOOR) throw new Error(`${s.path} encodes at ${db.toFixed(1)} dB, under the ${ILLUSTRATION_PSNR_FLOOR} dB floor`)
    quality.push({ scene: s.id, psnr: db })
    scenes.push({ id: s.id, title: s.title, outfit: s.outfit, moment: s.moment, approvedOn: s.approvedOn, bytes, width: s.width, height: s.height })
  }
  return { characterId: plan.characterId, universe, scenes, quality }
}
