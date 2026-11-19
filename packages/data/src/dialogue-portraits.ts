// The `dialogue-portraits` family (uma-farm F75; uma-platform P170; docs/sprites/dialogue-portraits.md): an Uma's
// dialogue portraits as the owner approved them in the Farm Life universe: one opaque base an outfit, her face neutral,
// and one square face an expression with alpha, drawn over any base at that base's face position. One manifest a
// character, by character id, in the art index's `dialoguePortraits` map; every picture lossless WebP. Private: it shows
// franchise characters.
//
// Drawing a state: the neutral state is the base alone. Any other draws its face over the base with its top-left corner
// at the base's `face` position, no scaling or rotation, straight alpha: each colour channel becomes
// round(base × (1 − a/255) + face × a/255) where the face's alpha a > 0, and the base unchanged elsewhere.
//
// Profile pictures (uma-farm F88, P180): each base may carry a `profile`, a small square head-and-shoulders crop of that
// base with her calm face, for lists of faces. Lossy WebP, cut from the base at `crop` (in the base's pixels) and scaled
// down to its own size; her face is centred, so a corner badge covers hair, shoulders or background, never her face.
// Older readers ignore it.

import { fail, fields, id, nonNegativeInteger, positiveInteger, recordOf, text, type Parser } from './parse.js'

/** The outfits Farm Life draws, in its order. A release may add more (the parser is open). */
export const DIALOGUE_PORTRAIT_OUTFITS = ['spring', 'summer', 'fall', 'winter', 'swimsuit', 'kimono', 'dinner', 'wedding', 'farm-work', 'garden-party', 'pajamas-playful', 'wedding-night'] as const
/** The expressions, `neutral` first: it is each base's own face, so it has no face picture. A release may add more. */
export const DIALOGUE_PORTRAIT_EXPRESSIONS = ['neutral', 'happy', 'laughing', 'surprised', 'thinking', 'sad', 'angry', 'worried', 'determined', 'pouting', 'shy', 'tender', 'flustered', 'loving', 'tearful-joy', 'sleepy'] as const
/** An outfit or expression name: lowercase words joined by hyphens. */
export const DIALOGUE_PORTRAIT_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export interface DialoguePortraitImage {
  /** The release file (lossless WebP), its size, and its bytes and SHA-256 as the release manifest lists them. */
  path: string
  width: number
  height: number
  bytes: number
  sha256: string
}
/** A base's profile picture: a square WebP cut from the base at `crop` (a square in the base's pixels), scaled down. */
export interface DialoguePortraitProfile extends DialoguePortraitImage {
  crop: { left: number; top: number; size: number }
}
export interface DialoguePortraitBase extends DialoguePortraitImage {
  /** Where every face's top-left corner sits on this base, in its pixels. */
  face: { left: number; top: number }
  /** Her profile picture in this outfit (P180); absent in releases made before it. */
  profile?: DialoguePortraitProfile
}
export interface DialoguePortraits {
  characterId: number
  /** Optional master-data outfit identity, separate from the base character's art. */
  outfitId?: number
  /** The universe's portrait revision these came from. */
  revision: number
  /** The day the owner approved them, as `YYYY-MM-DD`. */
  approvedOn: string
  /** Every base's size, and every face's. */
  base: { width: number; height: number }
  faceSize: { width: number; height: number }
  /** By outfit. */
  bases: Record<string, DialoguePortraitBase>
  /** By expression; never `neutral`. */
  faces: Record<string, DialoguePortraitImage>
}

const releasePath: Parser<string> = (value, path) => {
  const v = text(value, path)
  return /^art\/dialogue-portraits\/[a-z0-9][a-z0-9._-]*\.webp$/i.test(v) ? v : fail(path, 'a WebP under art/dialogue-portraits/')
}
const sha: Parser<string> = (value, path) => (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : fail(path, 'a lowercase hex SHA-256'))
const day: Parser<string> = (value, path) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : fail(path, 'a date as YYYY-MM-DD')
const size: Parser<{ width: number; height: number }> = (v, p) => ({ width: fields(v, p)('width', positiveInteger), height: fields(v, p)('height', positiveInteger) })
const image: Parser<DialoguePortraitImage> = (value, path) => {
  const f = fields(value, path)
  return { path: f('path', releasePath), width: f('width', positiveInteger), height: f('height', positiveInteger), bytes: f('bytes', positiveInteger), sha256: f('sha256', sha) }
}
const profile: Parser<DialoguePortraitProfile> = (value, path) => {
  const f = fields(value, path)
  const crop = f('crop', (v, p) => ({ left: fields(v, p)('left', nonNegativeInteger), top: fields(v, p)('top', nonNegativeInteger), size: fields(v, p)('size', positiveInteger) }))
  const out = { ...image(value, path), crop }
  if (out.width !== out.height) fail(path, 'a square profile picture')
  return out
}
const base: Parser<DialoguePortraitBase> = (value, path) => {
  const f = fields(value, path)
  const raw = (value as Record<string, unknown>).profile
  return {
    ...image(value, path), face: f('face', (v, p) => ({ left: fields(v, p)('left', nonNegativeInteger), top: fields(v, p)('top', nonNegativeInteger) })),
    ...(raw === undefined ? {} : { profile: profile(raw, `${path}.profile`) }),
  }
}
const named = <T>(what: string, value: Record<string, T>, path: string) => {
  for (const key of Object.keys(value)) if (!DIALOGUE_PORTRAIT_NAME.test(key) || key.length > 40) fail(`${path}.${key}`, `${what} named in lowercase words joined by hyphens`)
  return value
}

export const parseDialoguePortraits: Parser<DialoguePortraits> = (value, path) => {
  const f = fields(value, path)
  const p: DialoguePortraits = {
    characterId: f('characterId', id), revision: f('revision', positiveInteger), approvedOn: f('approvedOn', day),
    ...((value as Record<string, unknown>).outfitId === undefined ? {} : { outfitId: f('outfitId', id) }),
    base: f('base', size), faceSize: f('faceSize', size),
    bases: named('an outfit', f('bases', recordOf(base)), `${path}.bases`),
    faces: named('an expression', f('faces', recordOf(image)), `${path}.faces`),
  }
  if (Object.keys(p.bases).length === 0) fail(`${path}.bases`, 'at least one base')
  if (p.faceSize.width > p.base.width || p.faceSize.height > p.base.height) fail(`${path}.faceSize`, 'a face no larger than a base')
  for (const [outfit, b] of Object.entries(p.bases)) {
    if (b.width !== p.base.width || b.height !== p.base.height) fail(`${path}.bases.${outfit}`, `the ${p.base.width} × ${p.base.height} base`)
    if (b.face.left + p.faceSize.width > b.width || b.face.top + p.faceSize.height > b.height) fail(`${path}.bases.${outfit}.face`, 'a face square inside the base')
    const c = b.profile?.crop
    if (c && (c.left + c.size > b.width || c.top + c.size > b.height)) fail(`${path}.bases.${outfit}.profile.crop`, 'a crop square inside the base')
  }
  if (p.faces.neutral) fail(`${path}.faces.neutral`, 'no neutral face: neutral is each base’s own face')
  for (const [expression, face] of Object.entries(p.faces)) {
    if (face.width !== p.faceSize.width || face.height !== p.faceSize.height) fail(`${path}.faces.${expression}`, `the ${p.faceSize.width} × ${p.faceSize.height} face`)
  }
  return p
}

/** Every release file a character's portraits point at. */
export const dialoguePortraitPaths = (p: DialoguePortraits): string[] =>
  [...Object.values(p.bases), ...Object.values(p.bases).flatMap((b) => (b.profile ? [b.profile] : [])), ...Object.values(p.faces)].map((i) => i.path)

/** The outfits and expressions she has, in Farm Life's order, then any others by name; `neutral` always. */
export function dialoguePortraitChoices(p: DialoguePortraits): { outfits: string[]; expressions: string[] } {
  const ordered = (known: readonly string[], have: string[]) => [...known.filter((n) => have.includes(n)), ...have.filter((n) => !known.includes(n)).sort()]
  return { outfits: ordered(DIALOGUE_PORTRAIT_OUTFITS, Object.keys(p.bases)), expressions: ordered(DIALOGUE_PORTRAIT_EXPRESSIONS, ['neutral', ...Object.keys(p.faces)]) }
}

/**
 * What to draw for an outfit and an expression, falling back per picture: an outfit she hasn't got is her first in Farm
 * Life's order; an expression she hasn't got is `neutral`. `face` is null for neutral; otherwise draw it at `at` over
 * the base. Says which outfit and expression were drawn.
 */
export function dialoguePortraitFor(p: DialoguePortraits, outfit: string, expression: string): { base: DialoguePortraitBase; face: DialoguePortraitImage | null; at: { left: number; top: number }; outfit: string; expression: string } {
  const o = p.bases[outfit] ? outfit : dialoguePortraitChoices(p).outfits[0]!
  const b = p.bases[o]!
  const face = expression === 'neutral' ? null : p.faces[expression] ?? null
  return { base: b, face, at: b.face, outfit: o, expression: face ? expression : 'neutral' }
}

/**
 * Her profile picture for an outfit (P180): that outfit's when its base has one, else her first in Farm Life's order that
 * has one (spring first); null when none of her bases has a profile (a release made before them). Says which outfit.
 */
export function dialogueProfileFor(p: DialoguePortraits, outfit: string): { profile: DialoguePortraitProfile; outfit: string } | null {
  const own = p.bases[outfit]?.profile
  if (own) return { profile: own, outfit }
  const first = dialoguePortraitChoices(p).outfits.find((o) => p.bases[o]!.profile)
  return first ? { profile: p.bases[first]!.profile!, outfit: first } : null
}
