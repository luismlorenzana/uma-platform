// Frame contract: uma-rpg docs/design/world/map-art.md (D87/D90). IDs and base colours mirror
// uma-rpg packages/domain/src/world/biomes.ts; this is art metadata, never game rules or copied master data.
export const BIOME_IDS = ['meadow', 'forest', 'coast', 'swamp', 'jungle', 'desert', 'canyon', 'volcano', 'geyser', 'tundra', 'glacier', 'peaks', 'highlands', 'sky', 'underworld', 'moor', 'crystal', 'ruins', 'rift'] as const
export type Biome = (typeof BIOME_IDS)[number]
export const PHASE_ONE_BIOMES = ['meadow', 'forest', 'coast', 'volcano', 'glacier'] as const
export type PhaseOneBiome = (typeof PHASE_ONE_BIOMES)[number]
export const CALIBRATION_BIOMES = ['meadow', 'volcano', 'glacier'] as const
export type CalibrationBiome = (typeof CALIBRATION_BIOMES)[number]
export const LIQUIDS = ['water', 'lava', 'marsh', 'ice', 'void', 'cloud'] as const
export type Liquid = (typeof LIQUIDS)[number]
export const ROADS = ['dirt', 'stone', 'boards'] as const
export type Road = (typeof ROADS)[number]
export interface BiomeSpec { id: Biome; base: string; liquid: Liquid | null; road: Road; props: readonly string[] }

export const BIOMES: Record<Biome, BiomeSpec> = {
  meadow: { id: 'meadow', base: '#7fbf5a', liquid: 'water', road: 'dirt', props: ['oak', 'flowers', 'rock'] },
  forest: { id: 'forest', base: '#2f7d3b', liquid: 'water', road: 'dirt', props: ['pine', 'stump', 'mushrooms'] },
  coast: { id: 'coast', base: '#4bb3b0', liquid: 'water', road: 'boards', props: ['palm', 'shell-rock', 'driftwood'] },
  swamp: { id: 'swamp', base: '#6b7340', liquid: 'marsh', road: 'boards', props: ['dead-tree', 'reeds', 'log'] },
  jungle: { id: 'jungle', base: '#3fa34d', liquid: 'water', road: 'dirt', props: ['jungle-tree', 'fern', 'vine-rock'] },
  desert: { id: 'desert', base: '#d9b24c', liquid: 'water', road: 'dirt', props: ['cactus', 'bones', 'sandstone'] },
  canyon: { id: 'canyon', base: '#b5583a', liquid: null, road: 'stone', props: ['mesa', 'dry-bush', 'boulder'] },
  volcano: { id: 'volcano', base: '#c43b2b', liquid: 'lava', road: 'stone', props: ['vent', 'obsidian', 'charred-tree'] },
  geyser: { id: 'geyser', base: '#e0b98f', liquid: 'water', road: 'boards', props: ['geyser', 'mineral-mound', 'steam-vent'] },
  tundra: { id: 'tundra', base: '#a9c7d9', liquid: 'ice', road: 'dirt', props: ['snowy-pine', 'ice-rock', 'frozen-shrub'] },
  glacier: { id: 'glacier', base: '#dcecf5', liquid: 'ice', road: 'stone', props: ['ice-spire', 'snowdrift', 'ice-block'] },
  peaks: { id: 'peaks', base: '#6f7a8c', liquid: null, road: 'stone', props: ['crag', 'scree', 'stormstone'] },
  highlands: { id: 'highlands', base: '#9a86b5', liquid: 'water', road: 'dirt', props: ['standing-stone', 'heather', 'cairn'] },
  sky: { id: 'sky', base: '#efe0a8', liquid: 'cloud', road: 'boards', props: ['golden-tree', 'sky-crystal', 'cloud-tuft'] },
  underworld: { id: 'underworld', base: '#4a3366', liquid: 'void', road: 'stone', props: ['bone-pillar', 'soul-flame', 'skull-rock'] },
  moor: { id: 'moor', base: '#6d6880', liquid: 'marsh', road: 'dirt', props: ['bare-tree', 'gravestone', 'wisp'] },
  crystal: { id: 'crystal', base: '#59c9d9', liquid: 'water', road: 'stone', props: ['crystal-spire', 'crystal-cluster', 'glow-cap'] },
  ruins: { id: 'ruins', base: '#a39a86', liquid: 'water', road: 'stone', props: ['broken-column', 'rubble', 'statue-head'] },
  rift: { id: 'rift', base: '#3d3f8f', liquid: 'void', road: 'stone', props: ['rift-shard', 'star-mote', 'floating-rock'] },
}

const TALL = new Set(['oak', 'pine', 'palm', 'dead-tree', 'jungle-tree', 'cactus', 'mesa', 'charred-tree', 'geyser', 'snowy-pine', 'ice-spire', 'crag', 'standing-stone', 'golden-tree', 'bone-pillar', 'bare-tree', 'crystal-spire', 'broken-column', 'rift-shard'])
export const STAGE_KINDS = ['fight', 'elite', 'boss'] as const
export const STAGE_STATES = ['locked', 'open', 'cleared'] as const
export type StageKind = (typeof STAGE_KINDS)[number]
export type StageState = (typeof STAGE_STATES)[number]
export type Group = 'ground' | 'prop' | 'liquid' | 'road' | 'marker' | 'icon' | 'backdrop' | 'stage'
export interface FrameSpec { id: string; w: number; h: number; group: Group; biome?: Biome; anchorY?: number }

/** Part 1 publishes only five reviewed biomes; part 2 adds the rest and ocean, never placeholders. */
export function worldFrameSpecs(biomes: readonly Biome[] = PHASE_ONE_BIOMES, ocean = false, backdrops = false, buildings = false): FrameSpec[] {
  const frames: FrameSpec[] = []
  for (const biome of biomes) {
    for (let v = 0; v < 4; v++) frames.push({ id: `ground/${biome}-${v}`, w: 16, h: 16, group: 'ground', biome })
    for (const name of BIOMES[biome].props) {
      const h = TALL.has(name) ? 32 : 16
      frames.push({ id: `prop/${biome}/${name}`, w: 16, h, group: 'prop', biome, anchorY: h - 2 })
    }
  }
  if (ocean) for (let v = 0; v < 4; v++) frames.push({ id: `ground/ocean-${v}`, w: 16, h: 16, group: 'ground' })
  for (const liquid of LIQUIDS)
    for (let m = 1; m < 16; m++) frames.push({ id: `liquid/${liquid}-${m}`, w: 16, h: 16, group: 'liquid' })
  for (const road of ROADS)
    for (let m = 0; m < 16; m++) frames.push({ id: `road/${road}-${m}`, w: 16, h: 16, group: 'road' })
  for (const kind of STAGE_KINDS)
    for (const state of STAGE_STATES) frames.push({ id: `marker/${kind}-${state}`, w: 16, h: 16, group: 'marker' })
  for (let i = 0; i < 2; i++) frames.push({ id: `marker/frontier-${i}`, w: 16, h: 16, group: 'marker' })
  for (const name of ['spring', 'spring-dry', 'flag', 'flag-cleared']) frames.push({ id: `marker/${name}`, w: 16, h: 32, group: 'marker', anchorY: 30 })
  frames.push({ id: 'marker/capital', w: 48, h: 48, group: 'marker', anchorY: 44 })
  for (const biome of biomes) frames.push({ id: `icon/${biome}`, w: 16, h: 16, group: 'icon', biome })
  if (backdrops) for (const biome of biomes) frames.push({ id: `backdrop/${biome}`, w: 128, h: 48, group: 'backdrop', biome })
  if (buildings) {
    for (const biome of biomes) for (const kind of STAGE_KINDS) for (const state of STAGE_STATES)
      frames.push({ id: `stage/${biome}/${kind}-${state}`, w: 64, h: 64, group: 'stage', biome, anchorY: 58 })
    for (let i=0;i<2;i++) frames.push({ id: `stage/frontier-${i}`, w: 64, h: 64, group: 'stage' })
  }
  return frames
}
