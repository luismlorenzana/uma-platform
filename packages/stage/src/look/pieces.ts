// The kit pieces the look slice's scenes use (LK1), by kit: `pnpm look:pack` packs exactly these from the private CC0
// kits (content/authoring/licensed/quaternius/, P159) into one glb, and `LookKit.piece` refuses any other name.
// Names only: the files stay private.

const walls = (kind: 'Plaster' | 'UnevenBrick') => [`Wall_${kind}_Straight`, `Wall_${kind}_Window_Wide_Flat`, `Wall_${kind}_Door_Round`, `Wall_${kind}_Window_Wide_Round`]

export const PIECES = {
  village: [
    ...walls('Plaster'), ...walls('UnevenBrick'), 'Wall_Plaster_WoodGrid',
    'Window_Wide_Flat1', 'Window_Wide_Round1', 'WindowShutters_Wide_Flat_Open', 'Door_1_Round',
    'Corner_Exterior_Brick', 'Corner_Exterior_Wood',
    'Floor_WoodDark', 'Floor_UnevenBrick',
    'Roof_RoundTiles_8x8', 'Roof_RoundTiles_6x6', 'Roof_RoundTiles_6x8', 'Roof_RoundTiles_6x4', 'Roof_RoundTiles_4x6', 'Roof_RoundTiles_4x4',
    'Roof_Front_Brick8', 'Roof_Front_Brick6', 'Roof_Front_Brick4',
    'Prop_Chimney', 'Prop_Crate', 'Prop_Wagon',
  ],
  nature: [
    'CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5',
    'Bush_Common_Flowers', 'Flower_3_Group', 'Flower_4_Group', 'Grass_Common_Tall', 'Rock_Medium_1',
  ],
} as const

export type KitName = keyof typeof PIECES
