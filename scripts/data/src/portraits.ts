// `pnpm portraits:pack` (uma-farm F75, P170; docs/sprites/dialogue-portraits.md): a universe's published dialogue
// portraits → master data's `dialogue-portraits` family. The source is what the art pipeline published to the app's
// bucket, `art/universes/<universe>/portraits/` (an `index.json` of `kind: universe-portraits`, `bases/` and `faces/`),
// mirrored privately: everything in that index is owner-approved (its `approvedOn`). Each character is matched to master
// data by her name; each base's face position is the one its approved states place every face at; every file must still
// have the index's SHA-256 and size. PNGs go to the release as lossless WebP, checked to decode to their pixels. Each base
// also gives her profile picture (P180, profiles.ts): a square around her face, scaled to 192 px, lossy WebP.

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { decodeRgba, encodeLossless, imageDistance, type Rgba } from './enemy-images'
import { cropProblem, faceExtent, faceOnBase, packProfile, profileCrop, type ProfileCrop, type ProfileOverrides } from './profiles'
import type { PackedDialoguePortraits, PackedPortraitImage } from './dialogue-portrait-release'
import { characterArtKey, type CharacterArtIdentity } from '@luismlorenzana/uma-data'

interface IndexImage { id: string; character: string; path: string; sha256: string; width: number; height: number; bytes?: number }
export interface UniversePortraitsIndex {
  schemaVersion: 1
  kind: 'universe-portraits'
  universe: string
  revision: number
  approvedOn: string
  size: { width: number; height: number }
  faceSize: { width: number; height: number }
  characters: { id: string; name: string }[]
  bases: (IndexImage & { outfit: string })[]
  faces: (IndexImage & { expression: string })[]
  states: { character: string; outfit: string; expression: string; base: string; face: string | null; at: { x: number; y: number } | null }[]
}
export interface PortraitPlan {
  characterId: number
  outfitId?: number
  /** The universe's id for her (`kitasan-black`). */
  key: string
  bases: { outfit: string; path: string; sha256: string; width: number; height: number; face: { left: number; top: number } }[]
  faces: { expression: string; path: string; sha256: string; width: number; height: number }[]
}

export function readPortraitsIndex(value: unknown, universe: string): UniversePortraitsIndex {
  const v = value as Partial<UniversePortraitsIndex> | null
  if (!v || v.kind !== 'universe-portraits' || v.schemaVersion !== 1 || v.universe !== universe) throw new Error(`Not the ${universe} universe's portraits index`)
  for (const key of ['characters', 'bases', 'faces', 'states'] as const) if (!Array.isArray(v[key])) throw new Error(`The portraits index has no ${key}`)
  if (!v.size || !v.faceSize || typeof v.revision !== 'number' || typeof v.approvedOn !== 'string') throw new Error('The portraits index has no size, face size, revision or approval date')
  return v as UniversePortraitsIndex
}

/** Each character's bases with their face positions and her faces, matched to master data; and why any is left out. */
export function planPortraits(index: UniversePortraitsIndex, characterIdOf: (name: string) => number | CharacterArtIdentity | null): { plans: PortraitPlan[]; skipped: string[] } {
  const plans: PortraitPlan[] = [], skipped: string[] = []
  for (const c of index.characters) {
    const found = characterIdOf(c.name)
    if (found === null) { skipped.push(`${c.id}: no master data character is named ${c.name}`); continue }
    const identity = typeof found === 'number' ? { characterId: found } : found
    const positions = new Map<string, Set<string>>()
    for (const s of index.states) if (s.character === c.id && s.face && s.at) {
      const set = positions.get(s.base) ?? new Set<string>()
      set.add(`${s.at.x},${s.at.y}`)
      positions.set(s.base, set)
    }
    const all = [...positions.values()].flatMap((s) => [...s])
    const common = all.sort((a, b) => all.filter((x) => x === b).length - all.filter((x) => x === a).length)[0]
    const bases: PortraitPlan['bases'] = []
    for (const b of index.bases.filter((x) => x.character === c.id)) {
      const at = positions.get(b.id)
      if (at && at.size > 1) throw new Error(`${b.id}: its approved states place faces at ${[...at].join(' and ')}, not one place`)
      const where = at ? [...at][0] : common
      if (!where) { skipped.push(`${b.id}: no approved state places a face on it, and she has no face position to share`); continue }
      const [left, top] = where.split(',').map(Number) as [number, number]
      bases.push({ outfit: b.outfit, path: b.path, sha256: b.sha256, width: b.width, height: b.height, face: { left, top } })
    }
    if (bases.length === 0) { skipped.push(`${c.id}: no base`); continue }
    const faces = index.faces.filter((f) => f.character === c.id && f.expression !== 'neutral')
      .map((f) => ({ expression: f.expression, path: f.path, sha256: f.sha256, width: f.width, height: f.height }))
    plans.push({ ...identity, key: c.id, bases, faces })
  }
  return { plans, skipped }
}

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** How a base's profile came out: its square (by hand or not), its size and its quality. */
export interface ProfileReport { outfit: string; crop: ProfileCrop; override: boolean; bytes: number; psnr: number }

/**
 * Packs one character from the mirrored folder: every file checked against the index, encoded lossless, decoded back; and
 * each base's profile picture, its square from `overrides` (`<character id>/<outfit>`) or around her face.
 */
export async function packPortraits(dir: string, index: UniversePortraitsIndex, plan: PortraitPlan, overrides: ProfileOverrides | null = null): Promise<PackedDialoguePortraits & { profiles: ProfileReport[] }> {
  const root = resolve(dir)
  const image = async (path: string, want: { sha256: string; width: number; height: number }): Promise<PackedPortraitImage & { rgba: Rgba }> => {
    const file = resolve(root, ...path.split('/'))
    if (!file.startsWith(root + sep)) throw new Error(`${path} leaves the portraits folder`)
    const png = await readFile(file)
    if (sha256(png) !== want.sha256) throw new Error(`${path} isn't the file the index approved (its SHA-256 differs)`)
    const rgba = await decodeRgba(png)
    if (rgba.width !== want.width || rgba.height !== want.height) throw new Error(`${path} is ${rgba.width}x${rgba.height}, not ${want.width}x${want.height}`)
    const bytes = await encodeLossless(rgba)
    const back = imageDistance(await decodeRgba(bytes), rgba)
    if (back.alpha !== 0 || back.color !== 0) throw new Error(`${path} doesn't decode to its pixels`)
    return { bytes, width: rgba.width, height: rgba.height, rgba }
  }
  const faces: PackedDialoguePortraits['faces'] = {}, faceImages: Rgba[] = []
  for (const f of plan.faces) {
    const { rgba, ...packed } = await image(f.path, f)
    faces[f.expression] = packed
    faceImages.push(rgba)
  }
  const extent = faceExtent(faceImages, index.faceSize)
  const bases: PackedDialoguePortraits['bases'] = {}, profiles: ProfileReport[] = []
  for (const b of plan.bases) {
    const { rgba, ...packed } = await image(b.path, b)
    const label = `${characterArtKey(plan.characterId, plan.outfitId)}/${b.outfit}`, face = faceOnBase(extent, b.face)
    const given = overrides?.crops[label]
    const crop = given ?? profileCrop(face, { width: rgba.width, height: rgba.height })
    if (crop.left + crop.size > rgba.width || crop.top + crop.size > rgba.height) throw new Error(`${label}: its profile crop runs past the ${rgba.width}x${rgba.height} base`)
    // A square by hand must still hold her whole face; one made here must also keep it out of the badge corners.
    const problem = cropProblem(crop, face, !given)
    if (problem) throw new Error(`${label}: ${problem}; set its square in content/authoring/profiles/${index.universe}.json`)
    const profile = await packProfile(rgba, crop, label)
    bases[b.outfit] = { ...packed, face: b.face, profile: { bytes: profile.bytes, width: profile.width, height: profile.height, crop } }
    profiles.push({ outfit: b.outfit, crop, override: !!given, bytes: profile.bytes.byteLength, psnr: profile.psnr })
  }
  return { characterId: plan.characterId, ...(plan.outfitId === undefined ? {} : { outfitId: plan.outfitId }), revision: index.revision, approvedOn: index.approvedOn.slice(0, 10), base: index.size, faceSize: index.faceSize, bases, faces, profiles }
}
