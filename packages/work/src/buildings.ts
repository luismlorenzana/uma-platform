// A game's buildings as data (uma-platform SC1): slots and speed per level, the upgrade costs, and rooms where a
// building has them. `buildingTable` turns the table into the `BuildingRules` the engine reads, and checks it once.
import type { BuildingRules, UpgradeCost } from './kinds.js'

export interface BuildingDef {
  /** Rooms in order (uma-racer's Gym and Dojo); none elsewhere. */
  readonly rooms?: readonly string[]
  /** Slots per room (or in the building) at Lv 1, 2, 3 …: its length is the top level. */
  readonly slots: readonly number[]
  /** Speed at each level, as long as `slots`: an item's time is divided by it. */
  readonly speed: readonly number[]
  /** What reaching Lv 2, 3 … costs: one shorter than `slots`. */
  readonly upgrades: readonly UpgradeCost[]
}

/** The rules for a table of buildings, in the table's order (the tie-break order). Throws on a malformed table. */
export function buildingTable(defs: Readonly<Record<string, BuildingDef>>): BuildingRules {
  const ids = Object.freeze(Object.keys(defs))
  for (const id of ids) {
    const def = defs[id]!
    const levels = def.slots.length
    if (levels < 1 || def.speed.length !== levels || def.upgrades.length !== levels - 1) {
      throw new RangeError(`${id}: slots and speed need one value per level, and upgrades one fewer`)
    }
    if (!def.slots.every((n) => Number.isInteger(n) && n >= 0)) throw new RangeError(`${id}: slots are whole numbers ≥ 0`)
    if (!def.speed.every((n) => Number.isFinite(n) && n > 0)) throw new RangeError(`${id}: speed is above 0`)
  }
  const def = (building: string): BuildingDef => {
    if (!Object.prototype.hasOwnProperty.call(defs, building)) throw new RangeError(`No building ${building}`)
    return defs[building]!
  }
  const at = <T>(values: readonly T[], building: string, level: number): T => {
    if (!Number.isInteger(level) || level < 1 || level > values.length) throw new RangeError(`${building} has no Lv ${level}`)
    return values[level - 1]!
  }
  return Object.freeze({
    ids,
    rooms: (building: string) => def(building).rooms ?? [],
    slots: (building: string, level: number) => at(def(building).slots, building, level),
    speed: (building: string, level: number) => at(def(building).speed, building, level),
    maxLevel: (building: string) => def(building).slots.length,
    upgradeCost: (building: string, level: number) => at([{ money: 0, items: [] }, ...def(building).upgrades], building, level),
  })
}
