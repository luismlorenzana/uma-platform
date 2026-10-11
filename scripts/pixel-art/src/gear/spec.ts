// The gear catalog as the art sees it: fifteen equipment types, each in ten grades. A type's grade-g piece is made from
// the refined material at materialByGrade[g - 1] (uma-rpg's gear design), and that material colors it.

export type Slot = 'weapon' | 'armor' | 'accessory'

export interface GearType {
  type: string
  label: string
  slot: Slot
  mainFamily: string
  materialByGrade: readonly string[]
}

const INGOTS = ['copper-ingot', 'tin-ingot', 'iron-ingot', 'silver-ingot', 'cobalt-ingot', 'gold-ingot', 'platinum-ingot', 'titanium-ingot', 'mythril-ingot', 'orichalcum-ingot']
const PLANKS = ['pine-plank', 'birch-plank', 'cedar-plank', 'maple-plank', 'oak-plank', 'cherry-plank', 'mahogany-plank', 'ebony-plank', 'elderwood-plank', 'yggdrasil-plank']
const CLOTH = ['linen', 'burlap', 'hemp-cloth', 'cotton-cloth', 'wool-cloth', 'alpaca-cloth', 'cashmere-cloth', 'silk', 'moonsilk', 'cloudweave']
const LEATHER = ['puffbun-leather', 'boarling-leather', 'wolfkin-leather', 'lizard-leather', 'ironback-leather', 'basilisk-leather', 'manticore-leather', 'behemoth-leather', 'wyvern-leather', 'dragonhide']
const CUT_GEMS = ['cut-quartz', 'cut-amethyst', 'cut-citrine', 'cut-garnet', 'cut-emerald', 'cut-sapphire', 'cut-ruby', 'cut-diamond', 'cut-starstone', 'cut-philosophers-stone']
const CARVINGS = ['shell-carving', 'ammonite-carving', 'trilobite-carving', 'bone-carving', 'tusk-carving', 'fang-carving', 'claw-carving', 'tooth-carving', 'titan-carving', 'unicorn-carving']

/** In atlas row order. */
export const GEAR_TYPES: readonly GearType[] = [
  { type: 'short-sword', label: 'Short Sword', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'bow', label: 'Bow', slot: 'weapon', mainFamily: 'woods', materialByGrade: PLANKS },
  { type: 'spear', label: 'Spear', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'axe', label: 'Axe', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'mage-staff', label: 'Mage Staff', slot: 'weapon', mainFamily: 'woods', materialByGrade: PLANKS },
  { type: 'arcane-staff', label: 'Arcane Staff', slot: 'weapon', mainFamily: 'woods', materialByGrade: PLANKS },
  { type: 'greatsword', label: 'Greatsword', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'cleric-staff', label: 'Cleric Staff', slot: 'weapon', mainFamily: 'woods', materialByGrade: PLANKS },
  { type: 'summoner-tome', label: 'Summoner Tome', slot: 'weapon', mainFamily: 'fibers', materialByGrade: CLOTH },
  { type: 'garb', label: 'Garb', slot: 'armor', mainFamily: 'fibers', materialByGrade: CLOTH },
  { type: 'leather', label: 'Leather Armor', slot: 'armor', mainFamily: 'hides-scales', materialByGrade: LEATHER },
  { type: 'mail', label: 'Mail', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'plate', label: 'Plate', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'ring', label: 'Ring', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'charm', label: 'Charm', slot: 'accessory', mainFamily: 'bones-horns', materialByGrade: CARVINGS },
]

export const GRADES = 10
