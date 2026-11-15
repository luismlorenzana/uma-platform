// Profile pictures (uma-farm F88, P180; docs/sprites/dialogue-portraits.md): each dialogue portrait base gives a small
// square head-and-shoulders crop with her calm face, for lists of faces. Made in code from the approved base, never drawn:
// the crop is a square around her face (where her expression faces draw, measured from their alpha), the face a fixed share
// of its width and at its centre, so every corner shows hair, shoulders or background and a corner badge never covers
// her face. A private override file can set any base's square by hand. The crop is scaled down to 192 px and stored as
// lossy WebP, checked against the scaled crop within a quality floor.

import sharp from 'sharp'
import { decodeRgba, encodeLossyOpaque, psnr, type Rgba } from './enemy-images'

/** The profile picture's side, in pixels. */
export const PROFILE_SIZE = 192
/** Its WebP quality: 9–12 KB a picture on Farm Life's first three Umas, 35–39 dB. */
export const PROFILE_QUALITY = 90
/** The lowest colour PSNR (dB) a released profile may have against its scaled crop. */
export const PROFILE_PSNR_FLOOR = 34
/** Her face's share of the crop's side: the rest is margin, about 29% a side. */
export const PROFILE_FACE_SHARE = 0.42
/** The corner square a badge may cover, as a share of the side; her face must stay out of all four. */
export const PROFILE_BADGE_SHARE = 0.28
/** A face pixel counts from this alpha (the layers' soft edges don't widen the face). */
const FACE_ALPHA = 32
/** Where the face drawing sits in the face square for a character with no expression faces to measure (shares of its side,
 *  measured on Farm Life's first three Umas). */
const DEFAULT_FACE = { left: 41 / 224, top: 34 / 224, right: 182 / 224, bottom: 164 / 224 }

export interface ProfileCrop { left: number; top: number; size: number }
export interface Box { left: number; top: number; right: number; bottom: number }
/** The private override file, `content/authoring/profiles/<universe>.json`: a base's square by hand, keyed
 *  `<character id>/<outfit>`, in the base's pixels. */
export interface ProfileOverrides { universe: string; crops: Record<string, ProfileCrop> }

export function readProfileOverrides(value: unknown, universe: string): ProfileOverrides {
  const v = value as Partial<ProfileOverrides> | null
  if (!v || v.universe !== universe || typeof v.crops !== 'object' || v.crops === null) throw new Error(`Not the ${universe} universe's profile overrides`)
  for (const [key, c] of Object.entries(v.crops)) {
    if (!/^\d+\/[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(key)) throw new Error(`${key}: a profile override is keyed <character id>/<outfit>`)
    if (![c?.left, c?.top, c?.size].every((n) => Number.isSafeInteger(n) && (n as number) >= 0) || c.size < PROFILE_SIZE / 2) throw new Error(`${key}: a crop is { left, top, size } in whole pixels, at least ${PROFILE_SIZE / 2} square`)
  }
  return v as ProfileOverrides
}

/** Where her expression faces draw, in the face square's pixels: the box of every face pixel of every face. */
export function faceExtent(faces: readonly Rgba[], faceSize: { width: number; height: number }): Box {
  let box: Box | null = null
  for (const f of faces) for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    if (f.data[(y * f.width + x) * 4 + 3]! < FACE_ALPHA) continue
    box = box ? { left: Math.min(box.left, x), top: Math.min(box.top, y), right: Math.max(box.right, x), bottom: Math.max(box.bottom, y) } : { left: x, top: y, right: x, bottom: y }
  }
  return box ?? {
    left: Math.round(DEFAULT_FACE.left * faceSize.width), top: Math.round(DEFAULT_FACE.top * faceSize.height),
    right: Math.round(DEFAULT_FACE.right * faceSize.width), bottom: Math.round(DEFAULT_FACE.bottom * faceSize.height),
  }
}

/** Her face on a base, in the base's pixels: the extent placed at the base's face position. */
export const faceOnBase = (extent: Box, face: { left: number; top: number }): Box =>
  ({ left: face.left + extent.left, top: face.top + extent.top, right: face.left + extent.right, bottom: face.top + extent.bottom })

/** The square: her face at its centre and `PROFILE_FACE_SHARE` of its side, moved only as far as needed to stay on the base. */
export function profileCrop(face: Box, base: { width: number; height: number }): ProfileCrop {
  const w = face.right - face.left + 1, h = face.bottom - face.top + 1
  const size = Math.min(Math.round(Math.max(w, h) / PROFILE_FACE_SHARE), base.width, base.height)
  const cx = (face.left + face.right + 1) / 2, cy = (face.top + face.bottom + 1) / 2
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max)
  return { left: clamp(Math.round(cx - size / 2), base.width - size), top: clamp(Math.round(cy - size / 2), base.height - size), size }
}

/** Why a crop doesn't hold her face clear of the corners, or null: the face inside it and out of every badge corner. */
export function cropProblem(crop: ProfileCrop, face: Box, badges = true): string | null {
  const l = face.left - crop.left, t = face.top - crop.top, r = face.right - crop.left, b = face.bottom - crop.top
  if (l < 0 || t < 0 || r >= crop.size || b >= crop.size) return 'her face runs past the crop'
  if (!badges) return null
  const corner = Math.floor(crop.size * PROFILE_BADGE_SHARE), far = crop.size - corner
  // The face's box clips a corner square when it reaches into both that corner's columns and its rows.
  const hits = [[l < corner, t < corner], [r >= far, t < corner], [l < corner, b >= far], [r >= far, b >= far]].some(([x, y]) => x && y)
  return hits ? `her face reaches a corner a badge may cover (${Math.round(PROFILE_BADGE_SHARE * 100)}% of the side)` : null
}

/** The crop cut from the base and scaled down to the profile's size. */
export async function cutProfile(base: Rgba, crop: ProfileCrop): Promise<Rgba> {
  const raw = sharp(Buffer.from(base.data.buffer, base.data.byteOffset, base.data.byteLength), { raw: { width: base.width, height: base.height, channels: 4 } })
  const png = await raw.extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
    .resize(PROFILE_SIZE, PROFILE_SIZE, { kernel: 'lanczos3' }).png().toBuffer()
  return decodeRgba(png)
}

/** One profile picture: the scaled crop as lossy WebP, decoded back at its size within the floor. */
export async function packProfile(base: Rgba, crop: ProfileCrop, label: string): Promise<{ bytes: Buffer; width: number; height: number; crop: ProfileCrop; psnr: number }> {
  const cut = await cutProfile(base, crop)
  const bytes = await encodeLossyOpaque(cut, PROFILE_QUALITY)
  const back = await decodeRgba(bytes)
  if (back.width !== PROFILE_SIZE || back.height !== PROFILE_SIZE) throw new Error(`${label}: its profile doesn't decode at ${PROFILE_SIZE} px`)
  const db = psnr(cut, back)
  if (db < PROFILE_PSNR_FLOOR) throw new Error(`${label}: its profile encodes at ${db.toFixed(1)} dB, under the ${PROFILE_PSNR_FLOOR} dB floor`)
  return { bytes, width: PROFILE_SIZE, height: PROFILE_SIZE, crop, psnr: db }
}
