// The `illustrations` family (uma-farm F84; uma-platform P176; docs/sprites/illustrations.md): an Uma's full-screen
// scene illustrations as the owner approved them in a universe (Farm Life's "splash" art), each tied to a story moment.
// One manifest a character, by character id, in the art index's `illustrations` map; every picture an opaque WebP at the
// art's own size. Private: it shows franchise characters.

import { arrayOf, fail, fields, id, positiveInteger, text, type Parser } from './parse.js'

/** The moments Farm Life's story opens onto an illustration, in story order. A release may add more (the parser is open). */
export const ILLUSTRATION_MOMENTS = ['meeting', 'beach', 'confession', 'confession-yes', 'wedding', 'wedding-night', 'wedding-night-end', 'night-in', 'companion'] as const
/** A scene id, an outfit or a moment: lowercase words joined by hyphens. */
export const ILLUSTRATION_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export interface Illustration {
  /** Her scene's id, unique among hers (`confession-loving`); a story names it to show this scene. */
  id: string
  /** The art's title (`The Confession (Kimono) — Loving`). */
  title: string
  /** The outfit she wears in it, as the dialogue portraits name outfits (`kimono`). */
  outfit: string
  /** The story moment it opens onto (`confession-yes`). */
  moment: string
  /** The day the owner approved it, as `YYYY-MM-DD`. */
  approvedOn: string
  /** The release file (WebP), its size, and its bytes and SHA-256 as the release manifest lists them. */
  path: string
  width: number
  height: number
  bytes: number
  sha256: string
}
export interface Illustrations {
  characterId: number
  /** The universe the art was published in (`farm-life`). */
  universe: string
  /** In the art pipeline's order: the order a gallery shows them. */
  scenes: Illustration[]
}

const name = (what: string, max: number): Parser<string> => (value, path) =>
  typeof value === 'string' && ILLUSTRATION_NAME.test(value) && value.length <= max ? value : fail(path, `${what} in lowercase words joined by hyphens`)
const releasePath: Parser<string> = (value, path) => {
  const v = text(value, path)
  return /^art\/illustrations\/[a-z0-9][a-z0-9._-]*\.webp$/i.test(v) ? v : fail(path, 'a WebP under art/illustrations/')
}
const sha: Parser<string> = (value, path) => (typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : fail(path, 'a lowercase hex SHA-256'))
const day: Parser<string> = (value, path) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? value : fail(path, 'a date as YYYY-MM-DD')
const scene: Parser<Illustration> = (value, path) => {
  const f = fields(value, path)
  return {
    id: f('id', name('an id', 80)), title: f('title', text), outfit: f('outfit', name('an outfit', 40)), moment: f('moment', name('a moment', 40)),
    approvedOn: f('approvedOn', day), path: f('path', releasePath), width: f('width', positiveInteger), height: f('height', positiveInteger),
    bytes: f('bytes', positiveInteger), sha256: f('sha256', sha),
  }
}

export const parseIllustrations: Parser<Illustrations> = (value, path) => {
  const f = fields(value, path)
  const ills: Illustrations = { characterId: f('characterId', id), universe: f('universe', name('a universe', 40)), scenes: f('scenes', arrayOf(scene)) }
  if (ills.scenes.length === 0) fail(`${path}.scenes`, 'at least one scene')
  const seen = new Set<string>()
  ills.scenes.forEach((s, i) => {
    if (seen.has(s.id)) fail(`${path}.scenes[${i}].id`, `an id not used before (${s.id})`)
    seen.add(s.id)
  })
  return ills
}

/** Every release file a character's illustrations point at. */
export const illustrationPaths = (ills: Illustrations): string[] => ills.scenes.map((s) => s.path)

/** Her illustration for a story moment: the first in her order with that moment, or null when she has none. */
export const illustrationFor = (ills: Illustrations, moment: string): Illustration | null => ills.scenes.find((s) => s.moment === moment) ?? null

/** Her illustration by its id, or null. */
export const illustrationById = (ills: Illustrations, sceneId: string): Illustration | null => ills.scenes.find((s) => s.id === sceneId) ?? null
