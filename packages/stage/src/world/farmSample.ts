// The sample farm band (uma-platform ST2): a stand-in portrait farm, 9 tiles across and six bands deep, laid out as
// kit-farm.md KF2 draws it (three 3 × 3 plots a band, a path row under each, the Gate at the front). It has a building
// from each set, a two-column door, mounted pieces, a pond with a bank, overgrown lots, and every marker kind. For tests
// and the review page; a farm's real layout is its own (uma-farm F11). A lane down the third column joins the bands.
// No game content.
import type { FarmBuilding, FarmDesign } from '../formats/index.js'

const ROW = { fields: 'tttgggggg', forest: 'fffgggggg', pond: 'wwwgggggg', bank: 'ggggggggg', yard: 'gggvvvggg', path: 'ppppppppp' }
const house = (b: Omit<FarmBuilding, 'mounts'> & { mounts?: FarmBuilding['mounts'] }): FarmBuilding => ({ mounts: [], ...b })

export const SAMPLE_FARM: FarmDesign = {
  id: 'sample-band',
  cells: [
    ROW.fields, ROW.fields, ROW.fields, ROW.path,
    ROW.forest, ROW.forest, ROW.forest, ROW.path,
    ROW.pond, ROW.pond, ROW.bank, ROW.path,
    ROW.yard, ROW.yard, ROW.yard, ROW.path,
    ROW.bank, ROW.bank, ROW.bank, ROW.path,
    ROW.bank, ROW.bank, ROW.bank, ROW.path,
    'ggggpgggg',
  ],
  heights: [
    '111111111', '111111111', '111111111', '111111111',
    '111111111', '111111111', '111111111', '111111111',
    '000111111', '000111111', '111111111', '111111111',
    '111111111', '111111111', '111111111', '111111111',
    '111111111', '111111111', '111111111', '111111111',
    '111111111', '111111111', '111111111', '111111111',
    '111111111',
  ],
  buildings: [
    // The Mill: plaster and thatch, its sails mounted on the gable.
    house({ id: 'mill', walls: 'plaster', roof: 'thatch', x: 3, z: 0, w: 2, d: 2, storeys: 1, door: { column: 0 },
      mounts: [{ name: 'mill-sails', face: 'front', column: 1, level: 2 }] }),
    house({ id: 'sawmill', walls: 'plank', roof: 'shingle', x: 3, z: 4, w: 3, d: 2, storeys: 1, door: { column: 1 } }),
    // The Barn: two storeys, double doors two columns wide, a chimney on its roof.
    house({ id: 'barn', walls: 'plank', roof: 'red', x: 6, z: 4, w: 3, d: 2, storeys: 2, door: { column: 0, wide: true },
      mounts: [{ name: 'chimney', face: 'roof', column: 2, level: 1 }] }),
    house({ id: 'smokehouse', walls: 'plank', roof: 'slate', x: 3, z: 8, w: 2, d: 2, storeys: 1, door: { column: 1 },
      mounts: [{ name: 'chimney', face: 'roof', column: 0, level: 0.5 }] }),
    house({ id: 'warehouse', walls: 'plank', roof: 'red', x: 3, z: 12, w: 3, d: 2, storeys: 1, door: { column: 0, wide: true } }),
    // The Dorm: flower boxes hung under its ground-floor windows.
    house({ id: 'dorm', walls: 'plaster', roof: 'red', x: 6, z: 12, w: 3, d: 2, storeys: 2, door: { column: 1 },
      mounts: [{ name: 'flower-box', face: 'front', column: 0, level: 1 }, { name: 'flower-box', face: 'front', column: 2, level: 1 }] }),
    // The homestead (the romance core): the Farmhouse and two houses.
    house({ id: 'farmhouse', walls: 'plaster', roof: 'red', x: 0, z: 16, w: 3, d: 2, storeys: 2, door: { column: 1 },
      mounts: [{ name: 'chimney', face: 'roof', column: 0, level: 1.5 }] }),
    house({ id: 'house-1', walls: 'plaster', roof: 'thatch', x: 3, z: 16, w: 2, d: 2, storeys: 1, door: { column: 0 },
      mounts: [{ name: 'flower-box', face: 'front', column: 1, level: 1 }] }),
    house({ id: 'house-2', walls: 'plaster', roof: 'thatch', x: 6, z: 16, w: 2, d: 2, storeys: 1, door: { column: 1 } }),
    // The town edge: the Shop, its glazed door named by the design.
    house({ id: 'shop', walls: 'plaster', roof: 'shingle', x: 0, z: 20, w: 3, d: 2, storeys: 1, door: { column: 1, frame: 'door-shop' } }),
  ],
  props: [
    { name: 'crop-sprout', x: 0, z: 0 }, { name: 'scarecrow', x: 1, z: 0 }, { name: 'crop-leafy', x: 2, z: 0 },
    { name: 'crop-corn', x: 0, z: 1 }, { name: 'crop-staked-red', x: 1, z: 1 }, { name: 'crop-sunflower', x: 2, z: 1 },
    { name: 'weeds-1', x: 6, z: 0 }, { name: 'lot-stakes', x: 7, z: 1 }, { name: 'brambles', x: 8, z: 0 }, { name: 'weeds-2', x: 8, z: 2 },
    { name: 'tree-1', x: 0, z: 4 }, { name: 'tree-2', x: 1, z: 4 }, { name: 'tree-3', x: 0, z: 5 }, { name: 'mushroom-patch', x: 0, z: 6 },
    { name: 'log-pile', x: 5, z: 6 },
    { name: 'reeds', x: 0, z: 9 }, { name: 'dock', x: 1, z: 9 },
    { name: 'weeds-1', x: 6, z: 8 }, { name: 'lot-stakes', x: 7, z: 9 }, { name: 'bush-1', x: 8, z: 8 },
    { name: 'crates', x: 0, z: 12 }, { name: 'bin', x: 1, z: 12 }, { name: 'barrel', x: 0, z: 13 },
    { name: 'porch', x: 1, z: 18 }, { name: 'flowers-2', x: 5, z: 17 }, { name: 'bush-2', x: 8, z: 16 },
    { name: 'stall-awning', x: 2, z: 22 }, { name: 'lot-stakes', x: 4, z: 21 }, { name: 'weeds-2', x: 6, z: 20 }, { name: 'lot-stakes', x: 7, z: 21 },
    { name: 'fence-1', x: 0, z: 24 }, { name: 'fence-2', x: 1, z: 24 }, { name: 'flowers-1', x: 2, z: 24 }, { name: 'lantern', x: 3, z: 24 },
    { name: 'gate-arch', x: 4, z: 24 }, { name: 'lantern', x: 5, z: 24 }, { name: 'bush-2', x: 6, z: 24 }, { name: 'fence-broken', x: 7, z: 24 },
    { name: 'fence-1', x: 8, z: 24 },
  ],
  markers: [
    { kind: 'gate', id: 'gate', x: 4, z: 24 },
    { kind: 'path', id: 'crossing', x: 4, z: 11 },
    { kind: 'place', id: 'fields', x: 0, z: 2 }, { kind: 'slot', id: 'fields-1', x: 1, z: 2 }, { kind: 'slot', id: 'fields-2', x: 2, z: 2 },
    { kind: 'place', id: 'mill', x: 3, z: 2 }, { kind: 'slot', id: 'mill-1', x: 4, z: 2 },
    { kind: 'lot', id: 'coop', x: 6, z: 1 },
    { kind: 'place', id: 'forest', x: 0, z: 6 }, { kind: 'slot', id: 'forest-1', x: 1, z: 6 },
    { kind: 'place', id: 'sawmill', x: 3, z: 6 }, { kind: 'slot', id: 'sawmill-1', x: 4, z: 6 },
    { kind: 'place', id: 'barn', x: 6, z: 6 }, { kind: 'slot', id: 'barn-1', x: 8, z: 6 },
    { kind: 'place', id: 'fishery', x: 0, z: 10 }, { kind: 'slot', id: 'fishery-1', x: 1, z: 10 },
    { kind: 'place', id: 'smokehouse', x: 3, z: 10 }, { kind: 'slot', id: 'smokehouse-1', x: 4, z: 10 },
    { kind: 'lot', id: 'kitchen', x: 6, z: 9 },
    { kind: 'place', id: 'bin', x: 0, z: 14 }, { kind: 'slot', id: 'bin-1', x: 1, z: 14 },
    { kind: 'place', id: 'warehouse', x: 3, z: 14 }, { kind: 'slot', id: 'warehouse-1', x: 5, z: 14 },
    { kind: 'place', id: 'dorm', x: 6, z: 14 }, { kind: 'slot', id: 'dorm-1', x: 8, z: 14 },
    { kind: 'place', id: 'farmhouse', x: 0, z: 18 }, { kind: 'slot', id: 'farmhouse-1', x: 2, z: 18 },
    { kind: 'place', id: 'house-1', x: 3, z: 18 }, { kind: 'slot', id: 'house-1-1', x: 4, z: 18 },
    { kind: 'place', id: 'house-2', x: 6, z: 18 }, { kind: 'slot', id: 'house-2-1', x: 7, z: 18 },
    { kind: 'place', id: 'shop', x: 0, z: 22 }, { kind: 'slot', id: 'shop-1', x: 1, z: 22 },
    { kind: 'lot', id: 'festival', x: 3, z: 21 }, { kind: 'lot', id: 'expedition', x: 6, z: 21 },
  ],
}
