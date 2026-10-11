// Calibration subset of uma-rpg's world map art contract (docs/design/world/map-art.md).
// H06 expands this table to all nineteen biomes without changing the painters' public shape.

export const CALIBRATION_BIOMES = ['meadow', 'volcano', 'glacier'] as const
export type CalibrationBiome = (typeof CALIBRATION_BIOMES)[number]

export const LIQUIDS = ['water', 'lava', 'ice'] as const
export type Liquid = (typeof LIQUIDS)[number]

export const ROADS = ['dirt', 'stone'] as const
export type Road = (typeof ROADS)[number]

export interface CalibrationBiomeSpec {
  id: CalibrationBiome
  base: string
  liquid: Liquid
  road: Road
  props: readonly string[]
}

export const BIOMES: Record<CalibrationBiome, CalibrationBiomeSpec> = {
  meadow: {
    id: 'meadow',
    base: '#7fbf5a',
    liquid: 'water',
    road: 'dirt',
    props: ['oak', 'flowers', 'rock'],
  },
  volcano: {
    id: 'volcano',
    base: '#c43b2b',
    liquid: 'lava',
    road: 'stone',
    props: ['vent', 'obsidian', 'charred-tree'],
  },
  glacier: {
    id: 'glacier',
    base: '#dcecf5',
    liquid: 'ice',
    road: 'stone',
    props: ['ice-spire', 'snowdrift', 'ice-block'],
  },
}
