// @luismlorenzana/uma-kit/hub: the Hub map both games draw (uma-platform P48, sibling plan A3). Phaser loads only when a
// map mounts (`HubCanvas` imports the scene lazily).
export { HubMap, type HubMapPlace } from './HubMap'
export { HubCanvas, type HubCanvasProps } from './HubCanvas'
export { PlaceTargets, useHubGrid, type TargetModel } from './PlaceTargets'
export { Pips, type PipModel } from './Pips'
export { ART_TILE, artScale, BUILDING, hubDpr, hubGrid, placeAnchor, placeCell, TARGET_W, type HubGrid } from './grid'
export { neighbourPage, SWIPE_MIN_PX, swipeDirection, type Point } from './swipe'
export { E, layTerrain, N, pageSeed, S, TILE_PROPS, W, type Terrain, type TerrainOptions, type TerrainPlace } from './terrain'
export { PALETTES, type Palette } from './palettes'
export { drawMarker, MARKER_BASE, svgPen, type Ambient, type Pen, type Shape } from './markers'
export type { MapPlace, PageGround, PlaceAt, TileProp } from './types'
