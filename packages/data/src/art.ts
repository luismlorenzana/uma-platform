// The art index: where each record's images live in a release (docs/master-data.md#art).

import { fields, nonNegativeInteger, object, positiveInteger, recordOf, arrayOf, fail, type Parser } from './parse.js'

/**
 * Icon atlases: square frames packed into WebP pages, keyed by:
 * - `outfit-icons`: outfit id
 * - `support-card-icons`: support card id
 * - `skill-icons`: skill icon id (`Skill.iconId` / `globalIconId`)
 * - `scenario-icons`: scenario id
 */
export const ATLAS_FAMILIES = ['outfit-icons', 'support-card-icons', 'skill-icons', 'scenario-icons'] as const
export type AtlasFamily = (typeof ATLAS_FAMILIES)[number]

/**
 * Per-record WebP images, keyed by:
 * - `outfit-portraits`: outfit id (the stand: a waist-up 3D render, ≤512 px)
 * - `outfit-busts`: outfit id (head and shoulders, ≤256 px square)
 * - `outfit-faces`: outfit id (face crop, ≤192 px square)
 * - `support-card-art`: support card id (full illustration, ≤600 px)
 * - `outfit-chibis`: `<outfitId>-a` or `<outfitId>-b` (two poses, ≤256 px)
 * - `character-dresses`: `<characterId>-gym|summer|winter|casual` (≤512 px)
 * - `character-faces`: character id (race token face, ≤128 px square)
 * - `outfit-glass`: outfit id (the bust as a stained-glass window, ≤512 px square, opaque)
 * - `outfit-glass-order`: outfit id (the window's pane map, its size, lossless gray: each pixel its pane's place in the
 *   reveal, 0 the lead, 1–250 the panes outside in, 255 the face)
 * - `outfit-renders`: outfit id (the full-body 3D render, head to toe, ≤1024 px tall, transparent, lossless; since 1.5.0)
 */
export const IMAGE_FAMILIES = [
  'outfit-portraits',
  'outfit-busts',
  'outfit-faces',
  'support-card-art',
  'outfit-chibis',
  'character-dresses',
  'character-faces',
  'outfit-glass',
  'outfit-glass-order',
  'outfit-renders',
] as const
export type ImageFamily = (typeof IMAGE_FAMILIES)[number]

export interface AtlasFrame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export interface Atlas {
  frameWidth: number
  frameHeight: number
  /** `path` is a release file path. */
  pages: { path: string; width: number; height: number }[]
  frames: Record<string, AtlasFrame>
}

export interface ArtImage {
  /** A release file path. */
  path: string
  width: number
  height: number
}

/**
 * A family missing from the index, or a key missing from a family, means the release has no art for it; games fall
 * back to their own drawing. Families a client doesn't know are dropped when parsing.
 */
export interface ArtIndex {
  atlases: Partial<Record<AtlasFamily, Atlas>>
  images: Partial<Record<ImageFamily, Record<string, ArtImage>>>
  /** Outfit id to a verified outfit-sprites JSON file. Absent in older releases. */
  sprites?: Record<string, string>
  /** Enemy id to her `enemy-keys` manifest (docs/sprites/enemy-keys.md). Absent before 1.6.0 and until one is published. */
  enemyKeys?: Record<string, string>
  /** A character id to her `dialogue-portraits` manifest (docs/sprites/dialogue-portraits.md). Absent before 1.7.0 and
   *  until one is published. */
  dialoguePortraits?: Record<string, string>
  /** A character id to her `illustrations` manifest (docs/sprites/illustrations.md). Absent before 1.8.0 and until one is
   *  published. */
  illustrations?: Record<string, string>
}

const parseFrame: Parser<AtlasFrame> = (value, path) => {
  const f = fields(value, path)
  return {
    page: f('page', nonNegativeInteger),
    x: f('x', nonNegativeInteger),
    y: f('y', nonNegativeInteger),
    width: f('width', positiveInteger),
    height: f('height', positiveInteger),
  }
}

const releasePath: Parser<string> = (value, path) =>
  typeof value === 'string' && /^[a-z0-9][a-z0-9._/-]*$/i.test(value) && !value.includes('..')
    ? value
    : fail(path, 'a release file path')

const parsePage: Parser<Atlas['pages'][number]> = (value, path) => {
  const f = fields(value, path)
  return { path: f('path', releasePath), width: f('width', positiveInteger), height: f('height', positiveInteger) }
}

export const parseAtlas: Parser<Atlas> = (value, path) => {
  const f = fields(value, path)
  const atlas: Atlas = {
    frameWidth: f('frameWidth', positiveInteger),
    frameHeight: f('frameHeight', positiveInteger),
    pages: f('pages', arrayOf(parsePage)),
    frames: f('frames', recordOf(parseFrame)),
  }
  for (const [key, frame] of Object.entries(atlas.frames)) {
    if (frame.page >= atlas.pages.length) fail(`${path}.frames.${key}.page`, `a page below ${atlas.pages.length}`)
  }
  return atlas
}

export const parseArtImage: Parser<ArtImage> = (value, path) => {
  const f = fields(value, path)
  return { path: f('path', releasePath), width: f('width', positiveInteger), height: f('height', positiveInteger) }
}

export const parseArtIndex: Parser<ArtIndex> = (value, path) => {
  const f = fields(value, path)
  const atlases: ArtIndex['atlases'] = {}
  const rawAtlases = f('atlases', object)
  for (const family of ATLAS_FAMILIES) {
    if (rawAtlases[family] !== undefined) atlases[family] = parseAtlas(rawAtlases[family], `${path}.atlases.${family}`)
  }
  const images: ArtIndex['images'] = {}
  const rawImages = f('images', object)
  for (const family of IMAGE_FAMILIES) {
    if (rawImages[family] !== undefined) {
      images[family] = recordOf(parseArtImage)(rawImages[family], `${path}.images.${family}`)
    }
  }
  const { sprites, enemyKeys, dialoguePortraits, illustrations } = object(value, path)
  return { atlases, images, ...(sprites === undefined ? {} : { sprites: recordOf(releasePath)(sprites, `${path}.sprites`) }),
    ...(enemyKeys === undefined ? {} : { enemyKeys: recordOf(releasePath)(enemyKeys, `${path}.enemyKeys`) }),
    ...(dialoguePortraits === undefined ? {} : { dialoguePortraits: recordOf(releasePath)(dialoguePortraits, `${path}.dialoguePortraits`) }),
    ...(illustrations === undefined ? {} : { illustrations: recordOf(releasePath)(illustrations, `${path}.illustrations`) }) }
}

/** Every release file path the index points at. */
export function artPaths(index: ArtIndex): string[] {
  const paths: string[] = []
  for (const atlas of Object.values(index.atlases)) paths.push(...atlas.pages.map((page) => page.path))
  for (const family of Object.values(index.images)) paths.push(...Object.values(family).map((image) => image.path))
  paths.push(...Object.values(index.sprites ?? {}))
  paths.push(...Object.values(index.enemyKeys ?? {}))
  paths.push(...Object.values(index.dialoguePortraits ?? {}))
  paths.push(...Object.values(index.illustrations ?? {}))
  return paths
}
