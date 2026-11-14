// The `dialogue-portraits` family (uma-farm F75; uma-platform P170; docs/sprites/dialogue-portraits.md): an Uma's
// dialogue portraits as the owner approved them in the Farm Life universe: one opaque base an outfit, her face neutral,
// and one square face an expression with alpha, drawn over any base at that base's face position. One manifest a
// character, by character id, in the art index's `dialoguePortraits` map; every picture lossless WebP. Private: it shows
// franchise characters.
//
// Drawing a state: the neutral state is the base alone. Any other draws its face over the base with its top-left corner
// at the base's `face` position, no scaling or rotation, straight alpha: each colour channel becomes
// round(base × (1 − a/255) + face × a/255) where the face's alpha a > 0, and the base unchanged elsewhere.

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
export interface DialoguePortraitBase extends DialoguePortraitImage {
  /** Where every face's top-left corner sits on this base, in its pixels. */
  face: { left: number; top: number }
}
export interface DialoguePortraits {
  characterId: number
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
const base: Parser<DialoguePortraitBase> = (value, path) => {
  const f = fields(value, path)
  return { ...image(value, path), face: f('face', (v, p) => ({ left: fields(v, p)('left', nonNegativeInteger), top: fields(v, p)('top', nonNegativeInteger) })) }
}
const named = <T>(what: string, value: Record<string, T>, path: string) => {
  for (const key of Object.keys(value)) if (!DIALOGUE_PORTRAIT_NAME.test(key) || key.length > 40) fail(`${path}.${key}`, `${what} named in lowercase words joined by hyphens`)
  return value
}

export const parseDialoguePortraits: Parser<DialoguePortraits> = (value, path) => {
  const f = fields(value, path)
  const p: DialoguePortraits = {
    characterId: f('characterId', id), revision: f('revision', positiveInteger), approvedOn: f('approvedOn', day),
    base: f('base', size), faceSize: f('faceSize', size),
    bases: named('an outfit', f('bases', recordOf(base)), `${path}.bases`),
    faces: named('an expression', f('faces', recordOf(image)), `${path}.faces`),
  }
  if (Object.keys(p.bases).length === 0) fail(`${path}.bases`, 'at least one base')
  if (p.faceSize.width > p.base.width || p.faceSize.height > p.base.height) fail(`${path}.faceSize`, 'a face no larger than a base')
  for (const [outfit, b] of Object.entries(p.bases)) {
    if (b.width !== p.base.width || b.height !== p.base.height) fail(`${path}.bases.${outfit}`, `the ${p.base.width} × ${p.base.height} base`)
    if (b.face.left + p.faceSize.width > b.width || b.face.top + p.faceSize.height > b.height) fail(`${path}.bases.${outfit}.face`, 'a face square inside the base')
  }
  if (p.faces.neutral) fail(`${path}.faces.neutral`, 'no neutral face: neutral is each base’s own face')
  for (const [expression, face] of Object.entries(p.faces)) {
    if (face.width !== p.faceSize.width || face.height !== p.faceSize.height) fail(`${path}.faces.${expression}`, `the ${p.faceSize.width} × ${p.faceSize.height} face`)
  }
  return p
}

/** Every release file a character's portraits point at. */
export const dialoguePortraitPaths = (p: DialoguePortraits): string[] => [...Object.values(p.bases), ...Object.values(p.faces)].map((i) => i.path)

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
