import type { GroundStyle } from '../tiles/ground.ts'
import { groundTile } from '../tiles/ground.ts'
import type { Img } from '../tiles/image.ts'
import { REST_GROUND } from './ground-rest.ts'
import type { Biome } from './spec.ts'

const GROUND: Partial<Record<Biome, GroundStyle>> = {
  meadow: {
    page: 'world:meadow',
    base: '#7fbf5a',
    grain: { light: '#8bc967', dark: '#72ae50', rate: 0.18 },
    ink: { d: '#619a43', l: '#9bd475', w: '#f6f0d6', y: '#f4d45a', c: '#4d8739' },
    marks: [['d.d', '.d.'], ['l', 'd'], ['.c.', 'cdc'], ['d.d']],
    darts: 52,
    spacing: 4,
    features: [[['.w.', 'wyw', '.d.']], [['.c.', 'clc', '.d.']]],
  },
  forest: {
    page: 'world:forest', base: '#387643',
    grain: { light: '#43844b', dark: '#306638', rate: 0.18 },
    ink: { d: '#295b31', l: '#518b50', r: '#6b6741', b: '#a78c52', y: '#c5ac69' },
    marks: [['.d', 'd.'], ['l', 'd'], ['b.', '.r'], ['.r.', 'rr.']], darts: 52, spacing: 4,
    features: [[['r...', '.rr.', '...r']], [['.b.', 'byb', '.r.']]],
  },
  coast: {
    page: 'world:coast', base: '#d7c99b',
    grain: { light: '#e3d8b2', dark: '#c9bc8d', rate: 0.14 },
    ink: { d: '#b8aa7c', l: '#f1e5c0', g: '#7e9c62', G: '#587d50', w: '#fff0d8' },
    marks: [['d.d'], ['.l', 'l.'], ['.G.', 'gGg'], ['d']], darts: 40, spacing: 4.6,
    features: [[['.w.', 'wlw']], [['.g.', 'gGg', '..G']]],
  },
  volcano: {
    page: 'world:volcano',
    base: '#30282c',
    grain: { light: '#3b3033', dark: '#241f24', rate: 0.26 },
    ink: { d: '#1c191e', s: '#4a3939', r: '#8f3028', R: '#c43b2b', o: '#ff7a36', y: '#ffc05a' },
    marks: [['d.s', '.d.'], ['sd', 'd.'], ['r', 'd'], ['s.s']],
    darts: 64,
    spacing: 3.6,
    features: [[['Rr..', '.Roy', '...r']], [['..r.', '.rRo', 'oyR.', '.r..']]],
  },
  glacier: {
    page: 'world:glacier',
    base: '#dcecf5',
    grain: { light: '#f3f9fc', dark: '#cbdfea', rate: 0.18 },
    ink: { d: '#b9d3e2', l: '#ffffff', b: '#8fc6e5', B: '#5ba5cf', c: '#d4e8f2' },
    marks: [['d.d'], ['l', 'c'], ['.d', 'd.'], ['c.c']],
    darts: 42,
    spacing: 4.5,
    features: [[['B...', '.bB.', '..b.']], [['...b', '..b.', '.b..', 'B...']]],
  },
}

export function biomeGround(biome: Biome, variant: number): Img {
  const style = GROUND[biome] ?? REST_GROUND[biome as keyof typeof REST_GROUND]
  if (!style) throw new Error(`Ground ${biome} is not drawn in this milestone`)
  return groundTile(style, variant)
}
