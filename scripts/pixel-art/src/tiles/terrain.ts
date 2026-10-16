// The four Hub pages' terrain: ground styles, path materials and the wilds stream. One world, four moods:
// farmlands lush meadow and dirt paths, wilds dark rough grass and trails, learning a neat lawn and pale flagstones,
// town packed earth and cobbles.
import type { GroundStyle } from './ground.ts'
import { cobblePath, dirtPath, flagstonePath, racingPath, type PathPainter } from './paths.ts'
import { type WaterSpec, waterTile } from './water.ts'

export const PAGES = ['farmlands', 'wilds', 'learning', 'town', 'racing'] as const
export type Page = (typeof PAGES)[number]

export const GROUND: Record<Page, GroundStyle> = {
  racing: {
    page: 'racing',
    base: '#5ca66c',
    stripes: { width: 4, color: '#60aa70' },
    grain: { light: '#65ad74', dark: '#579f66', rate: 0.1 },
    ink: { d: '#549b63', l: '#6ab279' },
    marks: [['ld'], ['d.'], ['l']],
    darts: 25,
    spacing: 4,
    features: [[['l.l']], [['d.d']]],
  },
  farmlands: {
    page: 'farmlands',
    base: '#5d9f3f',
    grain: { light: '#64a744', dark: '#57963b', rate: 0.2 },
    ink: { d: '#4b8836', l: '#78b84f', w: '#f3f0dc', y: '#f2cf4a', p: '#e88fb1', P: '#c9688d' },
    marks: [['d.d', '.d.'], ['l.d', '.d.'], ['d.l', '.d.'], ['l', 'd']],
    darts: 60,
    spacing: 4,
    features: [[['.w..', 'wyw.', '.w.d', '..d.']], [['p.d', '.d.', 'l.p']]],
  },
  wilds: {
    page: 'wilds',
    base: '#3f7442',
    grain: { light: '#457a44', dark: '#3a6c3e', rate: 0.22 },
    ink: { d: '#2f5a36', l: '#578e4c', b: '#5b5a3a', B: '#4a4a31', s: '#8b887d', S: '#66645c', h: '#b1aea1' },
    marks: [['d.d', '.d.'], ['l.l', 'd.d', '.d.'], ['d.d.d', '.d.d.'], ['d.d', '.d.'], ['l', 'd'], ['bb.', '.Bb']],
    darts: 70,
    spacing: 3.8,
    features: [[['hs', 'sS']], [['.bb', 'bhs', 'BsS']]],
  },
  learning: {
    page: 'learning',
    base: '#4f9a58',
    grain: { light: '#54a05d', dark: '#4a9453', rate: 0.14 },
    ink: { d: '#438b4c', l: '#63ad6a', w: '#f5f4ea', y: '#efd468', c: '#d9d3f0' },
    marks: [['d.d'], ['l', 'd'], ['.d', 'd.']],
    darts: 30,
    spacing: 5,
    features: [[['.w.', 'wyw', '.d.']], [['c..', '.dc', '..d']]],
  },
  town: {
    page: 'town',
    base: '#9b8762',
    grain: { light: '#a28e69', dark: '#94805c', rate: 0.26 },
    ink: { d: '#83704f', D: '#715f43', l: '#b09b74', s: '#8f8c85', h: '#bebab1', S: '#68655f', g: '#6f9b45', G: '#557e36' },
    marks: [['ld'], ['l', 'd'], ['dd'], ['.d', 'd.']],
    darts: 50,
    spacing: 4,
    features: [[['g.g', 'GgG']], [['h.', 'sS', '..']]],
  },
}

export const PATH: Record<Page, PathPainter> = {
  racing: racingPath,
  farmlands: dirtPath({
    page: 'farmlands',
    half: 4.6,
    wobble: 0.7,
    edgeCells: 4,
    base: '#b0874f',
    shade: '#946f40',
    lit: '#c49b63',
    fringe: '#4d8a37',
    speck: { dark: '#9f7946', light: '#bf9660', rate: 0.14 },
    scatter: { stamps: [['ab', '.c'], ['ab']], ink: { a: '#d3b98e', b: '#a9865c', c: '#8a6a45' }, darts: 30, spacing: 10 },
  }),
  wilds: dirtPath({
    page: 'wilds',
    half: 4.2,
    wobble: 1.2,
    edgeCells: 8,
    base: '#8a6b47',
    shade: '#6d5337',
    lit: '#9d7d56',
    fringe: '#33603a',
    speck: { dark: '#775b3c', light: '#a08460', rate: 0.22 },
    scatter: { stamps: [['hs', 'sS'], ['hs'], ['g', 'G']], ink: { h: '#b4b1a5', s: '#8b887d', S: '#5f5d56', g: '#4f8446', G: '#3b6a3c' }, darts: 40, spacing: 4 },
  }),
  learning: flagstonePath({
    page: 'learning',
    half: 5,
    lines: [3, 8, 13],
    slabs: ['#d3cab1', '#cdc3a8', '#d8d0ba'],
    light: '#e4dcc8',
    shadow: '#bbaf94',
    joint: '#ada287',
    kerb: '#9c9278',
    kerbShade: '#7e7660',
  }),
  town: cobblePath({
    page: 'town',
    half: 5,
    wobble: 0.4,
    courses: [
      { offset: 0, widths: [4, 5, 3, 4] },
      { offset: 2, widths: [5, 4, 4, 3] },
      { offset: 1, widths: [3, 4, 5, 4] },
      { offset: 3, widths: [4, 4, 4, 4] },
    ],
    stones: [
      ['#d4d6d8', '#bcc0c4', '#a3a8ae', '#8a8f97', '#72767f'],
      ['#d8d2c9', '#c0b9af', '#a8a096', '#8e877e', '#756e66'],
      ['#cdd3d9', '#b4bcc5', '#9ba4ae', '#838c97', '#6b737f'],
    ],
    gap: '#78736b',
    rim: '#66615a',
    cast: '#857250',
  }),
}

export const STREAM: WaterSpec = {
  page: 'wilds',
  half: 3.6,
  bank: 1.5,
  wobble: 0.6,
  water: { deep: '#2f6898', shade: '#2b5f8a', base: '#3a7fb0', light: '#5a9dca', glint: '#9fd2ec' },
  mud: { shade: '#4a3a2a', base: '#5e4a35', lit: '#7d6446' },
  fringe: '#33603a',
  stones: { stamps: [['h'], ['hs']], ink: { h: '#a5a399', s: '#7f7d74' }, darts: 30, spacing: 5 },
}

export const WATER: PathPainter = waterTile(STREAM)
