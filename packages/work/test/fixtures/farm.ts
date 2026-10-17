// A uma-racer-like game for the engine's tests: the Farm's fourteen buildings, a small invented catalogue, Farm Level,
// Prize Money with a ledger, Speed Tickets as a Warehouse item, and a stand-in session kind. Numbers follow uma-racer's
// rules (90 + 5(g − 1) base minutes to gather, a quarter of that to craft, 240 + 10(g − 1) to cook, × 1.2), so its
// worked examples read as written. Every item and Uma is invented.
import {
  buildingTable, newWorkState, payItems, warehouseTickets, workRefusal, type BuildingDef, type ItemQty, type ItemRequest, type PlannedItem,
  type UnlockRef, type UnlockRequest, type UpgradeCost, type WorkEnv, type WorkKindRules, type WorkState,
} from '../../src/index.js'

export type FarmKind = 'gather' | 'craft' | 'cook'
export type FarmRequest = ItemRequest<FarmKind>
export type SessionRequest = UnlockRequest<'session'>
export type FarmWorkRequest = FarmRequest | SessionRequest

export interface FarmUma {
  readonly farm: { readonly level: number; readonly exp: number }
  readonly build: { readonly constellationOpened: number }
}

export interface LedgerRow {
  readonly id: string
  readonly resource: 'prize-money'
  readonly delta: number
  readonly reason: 'upgrade'
  readonly at: number
}

export interface FarmState extends WorkState<FarmWorkRequest> {
  readonly profile: { readonly prizeMoney: number }
  readonly umas: Readonly<Record<string, FarmUma>>
  readonly ledger: readonly LedgerRow[]
}

// --- The catalogue --------------------------------------------------------------------------------------------------

const FAMILIES = ['sweets', 'fruits', 'fish', 'nuts-seeds', 'herbs-spices', 'grains', 'vegetables', 'mushrooms'] as const
type Family = (typeof FAMILIES)[number]

export const FAMILY_SITE: Readonly<Record<Family, string>> = {
  sweets: 'sugar-grove', fruits: 'orchard', fish: 'fishery', 'nuts-seeds': 'nut-grove', 'herbs-spices': 'herb-garden', grains: 'fields',
  vegetables: 'vegetable-garden', mushrooms: 'mushroom-cave',
}

const NAMED: Partial<Record<Family, { readonly raw?: readonly string[]; readonly crafted?: readonly string[] }>> = {
  vegetables: { raw: ['carrot', 'potato', 'cabbage'], crafted: ['chopped-carrot', 'diced-potato', 'shredded-cabbage'] },
  fruits: { raw: ['apple'], crafted: ['apple-preserve'] },
  fish: { raw: ['carp', 'trout'], crafted: ['carp-fillet'] },
  grains: { raw: ['wheat'], crafted: ['wheat-flour'] },
  sweets: { crafted: ['honey'] },
  'nuts-seeds': { crafted: ['peanut-butter'] },
  'herbs-spices': { crafted: ['dried-basil'] },
}

export interface FarmItem {
  readonly id: string
  readonly kind: 'raw' | 'crafted' | 'dish'
  readonly family: Family
  readonly grade: number
  readonly inputs: readonly ItemQty[]
}

export const rawId = (family: Family, g: number): string => NAMED[family]?.raw?.[g - 1] ?? `${family}-raw-${g}`
export const craftedId = (family: Family, g: number): string => NAMED[family]?.crafted?.[g - 1] ?? `${family}-crafted-${g}`
export const dishId = (family: Family, g: number): string => `dish-${family}-${g}`

const GRADES = [1, 2, 3] as const
export const ITEMS: ReadonlyMap<string, FarmItem> = new Map(FAMILIES.flatMap((family) => GRADES.flatMap((g): [string, FarmItem][] => {
  const side: Family = family === 'grains' ? 'vegetables' : 'grains'
  return [
    [rawId(family, g), { id: rawId(family, g), kind: 'raw', family, grade: g, inputs: [] }],
    [craftedId(family, g), { id: craftedId(family, g), kind: 'crafted', family, grade: g, inputs: [{ item: rawId(family, g), qty: 1 }] }],
    [dishId(family, g), {
      id: dishId(family, g), kind: 'dish', family, grade: g, inputs: [{ item: craftedId(family, g), qty: 4 }, { item: craftedId(side, g), qty: 1 }],
    }],
  ]
})))

// --- Time, Farm EXP and Farm Level ----------------------------------------------------------------------------------

/** Real seconds for `baseMinutes` at `speed`: × 1.2, whole seconds, then ÷ speed. */
export function workSeconds(baseMinutes: number, speed = 1): number {
  const atSpeedOne = Math.round(baseMinutes * 1.2 * 60)
  return speed === 1 ? atSpeedOne : Math.round(atSpeedOne / speed)
}
const baseMinutes = (kind: FarmKind, g: number): number => {
  const gather = 90 + 5 * (g - 1)
  return kind === 'gather' ? gather : kind === 'craft' ? gather / 4 : 240 + 10 * (g - 1)
}
export const farmItemSeconds = (kind: FarmKind, g: number, speed = 1): number => workSeconds(baseMinutes(kind, g), speed)

/** Farm EXP per item in quarter points: listed seconds × aptitude tenths ÷ 150. */
export const farmExpPerItem = (listedSeconds: number, tenths: number): number => Math.round((listedSeconds * tenths) / 150)

const QUARTERS = 4
const CAP = 50
const expToNext = (level: number): number => 480 + 5 * (level - 1)
export function farmExpAtLevel(level: number): number {
  let total = 0
  for (let at = 1; at < level; at += 1) total += expToNext(at)
  return total
}
const farmLevel = (quarters: number): number => {
  let level = 1
  while (level < CAP && quarters >= farmExpAtLevel(level + 1) * QUARTERS) level += 1
  return level
}
export const gradeOpensAt = (g: number): number => 5 * g - 4
const highestOpenGrade = (level: number): number => Math.min(10, Math.floor((level + 4) / 5))

// --- Umas -----------------------------------------------------------------------------------------------------------

const plainTenths: Readonly<Record<Family, number>> = Object.fromEntries(FAMILIES.map((f) => [f, 10])) as Record<Family, number>
const TENTHS: Readonly<Record<string, Readonly<Record<Family, number>>>> = {
  plain: plainTenths,
  /** Sweets ×1.8, Fish ×0.9, Fruits ×0.8, Herbs ×1.2, the rest ×1.0. */
  sprints: { ...plainTenths, sweets: 18, fish: 9, fruits: 8, 'herbs-spices': 12 },
  /** ×1.6 on everything. */
  strong: Object.fromEntries(FAMILIES.map((f) => [f, 16])) as Record<Family, number>,
  helper: plainTenths,
  student: plainTenths,
}

export const PLAIN = { id: 'plain' } as const
export const SPRINTS = { id: 'sprints' } as const
export const STRONG = { id: 'strong' } as const
export const HELPER = { id: 'helper' } as const
export const STUDENT = { id: 'student' } as const

// --- Buildings ------------------------------------------------------------------------------------------------------

const FACILITIES = ['observatory', 'lineage-hall', 'gym', 'dojo'] as const
const GYM_ROOMS = ['stamina', 'wit', 'power', 'speed', 'guts'] as const
const DOJO_ROOMS = ['speed', 'stamina', 'power', 'guts', 'wit', 'friend-group'] as const
const STAT_FAMILIES: readonly Family[] = ['sweets', 'fruits', 'fish', 'nuts-seeds', 'herbs-spices']

const cost = (money: number, families: readonly Family[], each: number, g: number): UpgradeCost =>
  ({ money, items: families.map((family) => ({ item: craftedId(family, g), qty: each })) })
const building = (slots: readonly number[], upgrades: readonly UpgradeCost[], rooms?: readonly string[]): BuildingDef =>
  ({ slots, speed: [1, 1, 1.25], upgrades, ...(rooms ? { rooms } : {}) })
const site = (family: Family, slots: readonly number[] = [2, 3, 3]): BuildingDef =>
  building(slots, [cost(1_200, [family], 4, 1), cost(2_400, [family], 4, 3)])

export const FARM_BUILDINGS = buildingTable({
  'sugar-grove': site('sweets'),
  orchard: site('fruits'),
  fishery: site('fish'),
  'nut-grove': site('nuts-seeds'),
  'herb-garden': site('herbs-spices'),
  fields: site('grains'),
  'vegetable-garden': site('vegetables', [4, 5, 5]),
  'mushroom-cave': site('mushrooms'),
  pantry: building([3, 5, 5], [cost(1_500, FAMILIES, 1, 1), cost(6_000, FAMILIES, 1, 3)]),
  kitchen: building([6, 8, 8], [cost(3_000, FAMILIES, 2, 1), cost(12_000, FAMILIES, 2, 3)]),
  observatory: building([2, 3, 3], [cost(1_200, ['vegetables'], 4, 1), cost(2_400, ['vegetables'], 4, 3)]),
  'lineage-hall': building([2, 3, 3], [cost(1_000, ['mushrooms'], 4, 1), cost(1_500, ['mushrooms'], 4, 3)]),
  gym: building([1, 2, 2], [cost(2_400, STAT_FAMILIES, 1, 1), cost(4_800, STAT_FAMILIES, 2, 3)], GYM_ROOMS),
  dojo: building([1, 2, 2], [cost(1_500, [...STAT_FAMILIES, 'grains'], 1, 1), cost(2_000, [...STAT_FAMILIES, 'grains'], 1, 3)], DOJO_ROOMS),
})

// --- Kinds ----------------------------------------------------------------------------------------------------------

function makesHere(kind: FarmKind, item: FarmItem, at: string): boolean {
  switch (kind) {
    case 'gather': return item.kind === 'raw' && FAMILY_SITE[item.family] === at
    case 'craft': return item.kind === 'crafted' && at === 'pantry'
    case 'cook': return item.kind === 'dish' && at === 'kitchen'
  }
}

function farmKind(kind: FarmKind): WorkKindRules<FarmState> {
  return {
    plan(state, outfitId, request, _now, context) {
      if (request.kind === 'session' || request.kind !== kind) return workRefusal('not-here')
      const item = ITEMS.get(request.item)
      if (item === undefined || !makesHere(kind, item, context.slot.building)) return workRefusal('not-here')
      if (!context.env.exp.gradeOpen(state, outfitId, kind, item.grade)) return workRefusal('grade', { level: gradeOpensAt(item.grade), grade: item.grade })
      const base = baseMinutes(kind, item.grade)
      const planned: PlannedItem = {
        seconds: workSeconds(base, context.speed),
        inputs: item.inputs,
        output: { item: item.id },
        exp: farmExpPerItem(workSeconds(base), TENTHS[outfitId]?.[item.family] ?? 10),
      }
      return Array.from({ length: request.count }, () => planned)
    },
    pay: payItems,
  }
}

/** The page's base minutes for a session unlock of grade g, kept at k = 1 so the worked examples read as written. */
export const baseSessionSeconds = (g: number, speed: number): number => Math.round(((180 + 15 * (g - 1)) * 60) / speed)
const nodeGrade = (n: number): number => (n <= 6 ? 1 : 2)

/**
 * A stand-in session kind. Two unlock shapes:
 * - `{ kind: 'node', target: 'n<k>' }` at the Observatory: the next node in order, after her opened nodes and every node
 *   her earlier entries make (counted as made), paid with `dish-vegetables-<g>`;
 * - `{ kind: 'dish', target: '<dish id>' }` at any facility: one session paid with that dish.
 * Paying a node opens it in her build; paying a dish unlock opens nothing.
 */
export const SESSION_KIND: WorkKindRules<FarmState> = {
  plan(state, outfitId, request, _now, context) {
    if (request.kind !== 'session' || !(FACILITIES as readonly string[]).includes(context.slot.building)) return workRefusal('not-here')
    const nodesAhead = context.earlier.flatMap((earlier) => (earlier.kind === 'session' ? earlier.unlocks : [])).filter((u) => u.kind === 'node').length
    let next = state.umas[outfitId]!.build.constellationOpened + nodesAhead + 1
    const items: PlannedItem[] = []
    for (const unlock of request.unlocks) {
      let dish: string
      if (unlock.kind === 'node') {
        if (context.slot.building !== 'observatory' || unlock.target !== `n${next}`) return { refused: true, code: 'needs-first', message: 'Needs node {n} first.', data: { n: next } }
        dish = dishId('vegetables', nodeGrade(next))
        next += 1
      } else {
        dish = unlock.target
      }
      const item = ITEMS.get(dish)
      if (item === undefined || item.kind !== 'dish') return workRefusal('not-here')
      items.push({ seconds: baseSessionSeconds(item.grade, context.speed), inputs: [{ item: dish, qty: 1 }], output: { unlock }, exp: 0 })
    }
    return items
  },
  pay(state, outfitId, outputs) {
    const opened = outputs.flatMap((output) => ('unlock' in output && output.unlock.kind === 'node' ? [output.unlock.target] : []))
    const uma = state.umas[outfitId]!
    const build = { ...uma.build, constellationOpened: uma.build.constellationOpened + opened.length }
    return { state: { ...state, umas: { ...state.umas, [outfitId]: { ...uma, build } } }, detail: { opened } }
  },
}

export interface FarmLevelUp {
  readonly farmExp: number
  readonly farmLevel: { readonly from: number; readonly to: number }
  readonly gradesOpened: readonly number[]
}

export const ENV: WorkEnv<FarmState> = {
  kinds: { gather: farmKind('gather'), craft: farmKind('craft'), cook: farmKind('cook'), session: SESSION_KIND },
  buildings: FARM_BUILDINGS,
  tickets: warehouseTickets('speed-ticket'),
  exp: {
    grant(state, outfitId, quarters) {
      const uma = state.umas[outfitId]
      if (!uma) throw new RangeError(`No Uma ${outfitId} for her work`)
      const exp = Math.max(uma.farm.exp, Math.min(farmExpAtLevel(CAP) * QUARTERS, uma.farm.exp + quarters))
      const farm = { level: farmLevel(exp), exp }
      const from = highestOpenGrade(uma.farm.level), to = highestOpenGrade(farm.level)
      const detail: FarmLevelUp = {
        farmExp: farm.exp - uma.farm.exp, farmLevel: { from: uma.farm.level, to: farm.level }, gradesOpened: Array.from({ length: to - from }, (_, i) => from + i + 1),
      }
      return { state: farm.exp === uma.farm.exp ? state : { ...state, umas: { ...state.umas, [outfitId]: { ...uma, farm } } }, detail }
    },
    gradeOpen: (state, outfitId, _kind, grade) => (state.umas[outfitId]?.farm.level ?? 1) >= gradeOpensAt(grade),
  },
  money: {
    balance: (state) => state.profile.prizeMoney,
    spend: (state, n) => ({ ...state, profile: { ...state.profile, prizeMoney: state.profile.prizeMoney - n } }),
  },
  ledger: {
    record: (state, entry) => ({ ...state, ledger: [...state.ledger, { id: entry.id, resource: 'prize-money', delta: entry.delta, reason: 'upgrade', at: entry.at }] }),
  },
  isWorker: (state, outfitId) => state.umas[outfitId] !== undefined,
}

// --- Accounts -------------------------------------------------------------------------------------------------------

/** An account with these Umas at Farm Lv 1, every building at Lv 1, no Prize Money and an empty Warehouse. */
export function farmAccount(outfitIds: readonly string[] = [PLAIN.id, SPRINTS.id, STRONG.id, HELPER.id, STUDENT.id]): FarmState {
  return {
    ...newWorkState(FARM_BUILDINGS),
    work: {},
    profile: { prizeMoney: 0 },
    umas: Object.fromEntries(outfitIds.map((id) => [id, { farm: { level: 1, exp: 0 }, build: { constellationOpened: 0 } }])),
    ledger: [],
  }
}

/** The state with an Uma at a Farm Level, holding exactly the EXP that level takes. */
export function atFarmLevel<S extends FarmState>(state: S, outfitId: string, level: number, extraQuarters = 0): S {
  const uma = state.umas[outfitId]!
  return { ...state, umas: { ...state.umas, [outfitId]: { ...uma, farm: { level, exp: farmExpAtLevel(level) * QUARTERS + extraQuarters } } } }
}

export const withStock = <S extends FarmState>(state: S, items: Readonly<Record<string, number>>): S => ({ ...state, items: { ...state.items, ...items } })
export const withLevel = <S extends FarmState>(state: S, at: string, level: number): S => ({ ...state, buildings: { ...state.buildings, [at]: { level } } })
export const withPrizeMoney = <S extends FarmState>(state: S, prizeMoney: number): S => ({ ...state, profile: { ...state.profile, prizeMoney } })

/** The state with her constellation opened to `n` nodes. */
export function withNodes<S extends FarmState>(state: S, outfitId: string, n: number): S {
  const uma = state.umas[outfitId]!
  return { ...state, umas: { ...state.umas, [outfitId]: { ...uma, build: { ...uma.build, constellationOpened: n } } } }
}

export const node = (n: number): UnlockRef => ({ kind: 'node', target: `n${n}` })
export const dishUnlock = (dish: string): UnlockRef => ({ kind: 'dish', target: dish })

/** The ledger's Prize Money total, for the audit: the rows move the balance by exactly what they say. */
export const ledgerTotal = (ledger: readonly LedgerRow[]): number => ledger.reduce((sum, row) => sum + row.delta, 0)
