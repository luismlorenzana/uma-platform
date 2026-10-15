// The gear catalog as the art sees it: forty-six rows (six retired), each in ten grades. A type's grade-g piece is made from
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
const LEATHER = ['puffbun-leather', 'boarling-leather', 'wolfkin-leather', 'lizard-leather', 'ironback-leather', 'basilisk-leather', 'manticore-leather', 'behemoth-leather', 'wyvern-leather', 'dragonhide']
const CUT_GEMS = ['cut-quartz', 'cut-amethyst', 'cut-citrine', 'cut-garnet', 'cut-emerald', 'cut-sapphire', 'cut-ruby', 'cut-diamond', 'cut-starstone', 'cut-philosophers-stone']
const CARVINGS = ['shell-carving', 'ammonite-carving', 'trilobite-carving', 'bone-carving', 'tusk-carving', 'fang-carving', 'claw-carving', 'tooth-carving', 'titan-carving', 'unicorn-carving']

/** In atlas row order. */
export const GEAR_TYPES: readonly GearType[] = [
  { type: 'greatsword', label: 'Greatsword', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'axe', label: 'Axe', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'lance', label: 'Lance', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'bow', label: 'Bow', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'katana', label: 'Katana', slot: 'weapon', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'tome-fire', label: 'Fire Tome', slot: 'weapon', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'tome-ice', label: 'Blizzard Tome', slot: 'weapon', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'tome-lightning', label: 'Thunder Tome', slot: 'weapon', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'tome-light', label: 'Light Tome', slot: 'weapon', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'tome-dark', label: 'Dark Tome', slot: 'weapon', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'garb', label: 'Garb', slot: 'armor', mainFamily: 'woods', materialByGrade: PLANKS },
  { type: 'leather', label: 'Leather Armor', slot: 'armor', mainFamily: 'hides-scales', materialByGrade: LEATHER },
  { type: 'mail', label: 'Mail', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'plate', label: 'Plate', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'ring', label: 'Ring', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'charm', label: 'Charm', slot: 'accessory', mainFamily: 'bones-horns', materialByGrade: CARVINGS },
  { type: 'orb-greatsword', label: 'Greatsword Orb', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'orb-axe', label: 'Axe Orb', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'orb-lance', label: 'Lance Orb', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'orb-bow', label: 'Bow Orb', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'orb-katana', label: 'Katana Orb', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'orb-fire', label: 'Fire Orb', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'orb-ice', label: 'Ice Orb', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'orb-lightning', label: 'Lightning Orb', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'orb-light', label: 'Light Orb', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'orb-dark', label: 'Dark Orb', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'helm', label: 'Helm', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'cuirass', label: 'Cuirass', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'greaves', label: 'Greaves', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'gauntlets', label: 'Gauntlets', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'circlet', label: 'Circlet', slot: 'armor', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'robe', label: 'Robe', slot: 'armor', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'leggings', label: 'Leggings', slot: 'armor', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'bracers', label: 'Bracers', slot: 'armor', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  // H28 appends only: preserve every position in the published 2.4.0 atlas, including retired rows.
  { type: 'boots', label: 'Boots', slot: 'armor', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'slippers', label: 'Slippers', slot: 'armor', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'talisman-vital', label: 'Vital Talisman', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'talisman-vampire', label: 'Vampire Talisman', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'talisman-bulwark', label: 'Bulwark Talisman', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'talisman-iron', label: 'Iron Talisman', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'talisman-thorn', label: 'Thorn Talisman', slot: 'accessory', mainFamily: 'ores', materialByGrade: INGOTS },
  { type: 'amulet-spring', label: 'Spring Amulet', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'amulet-siphon', label: 'Siphon Amulet', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'amulet-veil', label: 'Veil Amulet', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'amulet-ward', label: 'Ward Amulet', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
  { type: 'amulet-mirror', label: 'Mirror Amulet', slot: 'accessory', mainFamily: 'crystals', materialByGrade: CUT_GEMS },
]

export const GRADES = 10
