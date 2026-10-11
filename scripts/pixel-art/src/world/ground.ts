import type { GroundStyle } from '../tiles/ground.ts'
import { groundTile } from '../tiles/ground.ts'
import type { Img } from '../tiles/image.ts'
import type { CalibrationBiome } from './spec.ts'

const GROUND: Record<CalibrationBiome, GroundStyle> = {
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

export function biomeGround(biome: CalibrationBiome, variant: number): Img {
  return groundTile(GROUND[biome], variant)
}
