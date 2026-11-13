// The farm stand-in's layout (ST2; ST4: its own module): every wave-1 and wave-2 frame of the `farm` kit at its KF8 size,
// building pieces in their sets (KF3), packed on one page. Pure, no three.js and no DOM, so a game's domain can check its
// designs against it (`farmProblems(design, standInFarmAtlas())`) from `@luismlorenzana/uma-stage/formats`. The drawing is
// `standInFarm.ts`.
import { FARM_WAVE_1, FARM_WAVE_2, type KitAtlas, type KitFrame, type KitRole } from '../formats/index.js'
import { pack, STAND_IN_PAGE, T, tile, type Spec } from './standInShared.js'

const at = (name: string, w: number, h: number, blocks: boolean | undefined, foot?: [number, number], light?: KitFrame['light']): Spec =>
  ({ name, role: 'prop', w, h, foot: foot ?? [Math.round(w / 2), h - 6], ...(blocks !== undefined ? { blocks } : {}), ...(light ? { light } : {}) })
const FARM_SIZES: Readonly<Record<string, [number, number, boolean | undefined, [number, number]?, KitFrame['light']?]>> = {
  'tree-1': [256, 384, true], 'tree-2': [256, 384, true], 'tree-3': [256, 384, true], stump: [128, 96, true], 'rock-small': [96, 64, false],
  'mushroom-patch': [128, 64, false], 'herb-patch': [128, 64, false], scarecrow: [128, 256, true], dock: [256, 128, false], reeds: [128, 128, false],
  // Mounted pieces stand at their foot: the sails turn on their hub, the boxes hang from their top.
  'mill-sails': [384, 384, undefined, [192, 192]], chimney: [64, 192, undefined], 'forge-chimney': [96, 256, undefined, undefined, { color: '#ff8a3d', radius: 3, flicker: true }],
  smoker: [128, 192, true], furnace: [192, 256, true, undefined, { color: '#ff7b2e', radius: 4, flicker: true }], 'log-pile': [256, 128, true], 'saw-bench': [192, 128, true],
  bin: [128, 128, true], crates: [192, 160, true], barrel: [96, 128, true], sack: [96, 96, true], 'gate-arch': [384, 384, false],
  'fence-1': [128, 128, true], 'fence-2': [128, 128, true], 'fence-broken': [128, 128, false], 'stall-awning': [256, 192, false], awning: [384, 192, undefined, [192, 8]],
  porch: [256, 192, false], 'flower-box': [128, 64, undefined, [64, 8]], 'herb-box': [128, 64, undefined, [64, 8]], 'lot-stakes': [384, 128, false],
  'weeds-1': [128, 128, false], 'weeds-2': [128, 128, false], brambles: [192, 160, true], 'flowers-1': [128, 64, false], 'flowers-2': [128, 64, false],
  'bush-1': [160, 128, true], 'bush-2': [160, 128, true], lantern: [64, 192, true, undefined, { color: '#ffc46b', radius: 4, flicker: true }],
  'mine-mouth': [384, 384, undefined], 'ore-cart': [192, 160, true], 'quarry-rock-1': [192, 192, true], 'quarry-rock-2': [192, 192, true], 'stone-stack': [192, 128, true],
  grindstone: [160, 160, true], anvil: [160, 128, true], 'ring-bench': [192, 128, true], trough: [192, 96, true], 'hay-bale': [160, 128, true],
  'cafe-table': [192, 160, true], bunting: [384, 192, false], flagpole: [64, 384, true], signpost: [96, 192, true], 'notice-board': [128, 192, true],
  'crop-sprout': [128, 64, false], 'crop-growing': [128, 96, false], 'crop-withered': [128, 96, false], 'crop-root': [128, 96, false], 'crop-leafy': [128, 96, false],
  'crop-herb': [128, 96, false], 'crop-grain': [128, 160, false], 'crop-rice': [128, 128, false], 'crop-staked-red': [128, 192, false], 'crop-staked-green': [128, 192, false],
  'crop-staked-purple': [128, 192, false], 'crop-corn': [128, 192, false], 'crop-sunflower': [128, 192, false], 'crop-spear': [128, 128, false], 'crop-gourd': [128, 96, false],
}
const SET_OF = /^(?:building-wall|window|door-wide|door|roof)-([a-z]+)(?:-\d+)?$/
function farmSpec(name: string): Spec {
  const sized = FARM_SIZES[name]
  if (sized) return at(name, ...sized)
  if (name === 'door-shop') return { name, role: 'door', w: T, h: 2 * T, set: 'plaster' }
  const set = SET_OF.exec(name)?.[1]
  if (set) {
    const role: KitRole = name.startsWith('building-wall') ? 'building-wall' : name.startsWith('window') ? 'window' : name.startsWith('door') ? 'door' : 'roof'
    return { name, role, w: name.startsWith('door-wide') ? 2 * T : T, h: role === 'door' ? 2 * T : T, set }
  }
  if (name === 'wall-rock') return { name, role: 'wall', w: T, h: 2 * T }
  if (name === 'wall-top-rock') return { name, role: 'wall-top', w: T, h: T }
  return tile(name, name.startsWith('riser') ? 'riser' : 'floor')
}
/** The farm's stand-in atlas, with both its waves (`kitMissing(kit, FARM_WAVE_2)` is empty). */
export function standInFarmAtlas(): KitAtlas {
  const { frames, height } = pack([...FARM_WAVE_1, ...FARM_WAVE_2].map(farmSpec), true)
  return { formatVersion: 1, id: 'kit-standin-farm', kind: 'farm', tile: 128, pages: [{ file: 'standin.png', width: STAND_IN_PAGE, height }], frames }
}
