// The world's formats (uma-quest Q5, Q19; uma-platform ST2): kits, and room, town and farm designs. Pure: no three.js, no DOM, so a game's rules
// and its API can import them (`@luismlorenzana/uma-stage/formats`, ESM and CommonJS) without the stage.
export * from './kit.js'
export * from './design.js'
export * from './farm.js'
export * from './kitPack.js'
// ST4: what a farm's domain needs to test its designs without three.js: the check the stage builds by, the farm stand-in's
// atlas and the sample farm.
export { farmProblems } from '../world/farm.js'
export { SAMPLE_FARM } from '../world/farmSample.js'
export { standInFarmAtlas } from '../world/standInFarmAtlas.js'
