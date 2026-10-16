// @luismlorenzana/uma-kit/hub: the Hub map both games draw (uma-platform P48, sibling plan A3). Phaser loads only when a
// map mounts (`HubCanvas` imports the scene lazily).
export { HubMap, sceneKey, type HubMapPlace } from './HubMap.js'
export { HubCanvas, type HubCanvasProps } from './HubCanvas.js'
export { PlaceTargets, useHubGrid, type TargetModel } from './PlaceTargets.js'
export { Pips, type PipModel } from './Pips.js'
export { ART_TILE, artScale, BUILDING, hubDpr, hubGrid, placeAnchor, placeCell, TARGET_W, type HubGrid } from './grid.js'
export { neighbourPage, SWIPE_MIN_PX, swipeDirection, type Point } from './swipe.js'
export { E, layTerrain, N, pageSeed, S, TILE_PROPS, W, type Terrain, type TerrainOptions, type TerrainPlace } from './terrain.js'
export { PALETTES, type Palette } from './palettes.js'
export { drawMarker, MARKER_BASE, svgPen, type Ambient, type Pen, type Shape } from './markers.js'
export type { MapPlace, PageGround, PlaceAt, TileProp } from './types.js'
