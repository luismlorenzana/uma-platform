import { parseArtImage, type ArtImage } from './art.js'
import type { CharacterArtIdentity } from './character-art.js'
import { arrayOf, fail, fields, nonNegativeInteger, positiveInteger, optional, recordOf, type Parser } from './parse.js'

export const CHARACTER_FACINGS = ['front', 'back', 'left', 'right'] as const
export type CharacterFacing = (typeof CHARACTER_FACINGS)[number]
export interface CharacterSpriteCell { x: number; y: number }
export interface CharacterSpriteFrame extends CharacterSpriteCell { durationMs: number }
export interface CharacterSpriteVariant {
  page: ArtImage
  cell: { width: number; height: number }
  foot: CharacterSpriteCell
  standing: Record<CharacterFacing, CharacterSpriteCell>
  walking: Record<CharacterFacing, CharacterSpriteFrame[]>
}

export interface CharacterSprites extends CharacterArtIdentity {
  variants: Record<string, CharacterSpriteVariant>
}

const point: Parser<CharacterSpriteCell> = (value, path) => {
  const f = fields(value, path)
  return { x: f('x', nonNegativeInteger), y: f('y', nonNegativeInteger) }
}

const frame: Parser<CharacterSpriteFrame> = (value, path) => ({
  ...point(value, path), durationMs: fields(value, path)('durationMs', positiveInteger),
})

function byFacing<T>(parse: Parser<T>): Parser<Record<CharacterFacing, T>> {
  return (value, path) => {
    const f = fields(value, path)
    return { front: f('front', parse), back: f('back', parse), left: f('left', parse), right: f('right', parse) }
  }
}

const variant: Parser<CharacterSpriteVariant> = (value, path) => {
  const f = fields(value, path)
  const page = f('page', parseArtImage)
  const cell = f('cell', (size, at) => {
    const c = fields(size, at)
    return { width: c('width', positiveInteger), height: c('height', positiveInteger) }
  })
  const foot = f('foot', point)
  if (foot.x >= cell.width || foot.y >= cell.height) fail(`${path}.foot`, 'a point inside the cell')
  const bounded: Parser<CharacterSpriteCell> = (raw, at) => {
    const pos = point(raw, at)
    if (pos.x + cell.width > page.width || pos.y + cell.height > page.height) fail(at, 'a cell inside the page')
    return pos
  }
  const walking = f('walking', byFacing((raw, at) => {
    const frames = arrayOf(frame)(raw, at)
    if (!frames.length) fail(at, 'at least one timed frame')
    frames.forEach((item, index) => bounded(item, `${at}[${index}]`))
    return frames
  }))
  return { page, cell, foot, standing: f('standing', byFacing(bounded)), walking }
}

export const parseCharacterSprites: Parser<CharacterSprites> = (value, path) => {
  const f = fields(value, path)
  const variants = f('variants', recordOf(variant))
  const keys = Object.keys(variants)
  if (!keys.length || keys.some(key => !/^[a-z][a-z0-9-]{0,39}$/.test(key))) fail(`${path}.variants`, 'one or more variant keys')
  return { characterId: f('characterId', positiveInteger), outfitId: f('outfitId', optional(positiveInteger)), variants }
}

export const characterSpritePaths = (set: CharacterSprites): string[] =>
  [...new Set(Object.values(set.variants).map(variant => variant.page.path))]
