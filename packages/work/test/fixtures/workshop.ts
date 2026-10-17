// A uma-rpg-like game for the "fit" test: gathering sites, the Workbench (refining up to ×40), the Forge (gear behind a
// grade gate) and the Lapidary (Star Gems), each with 3/4/5 slots and speed at Lv 3, upgrades in Laurels and refined
// items, Speed Tickets in the wallet and Craft Level from 2 EXP a job minute. Every item and number is invented in
// uma-rpg's shape.
import {
  buildingTable, newWorkState, payItems, workRefusal, type BuildingDef, type ItemQty, type ItemRequest, type PlannedItem, type WorkEnv,
  type WorkKindRules, type WorkOutput, type WorkState,
} from '../../src/index.js'

export type WorkshopKind = 'gather' | 'refine' | 'craft' | 'cut'
export type WorkshopRequest = ItemRequest<WorkshopKind>

export interface Craft {
  readonly level: number
  readonly exp: number
}

export interface WorkshopState extends WorkState<WorkshopRequest> {
  readonly wallet: { readonly laurels: number; readonly timeTickets: number }
  readonly umas: Readonly<Record<string, { readonly craft: Craft }>>
  readonly gear: Readonly<Record<string, number>>
  readonly gems: Readonly<Record<string, number>>
}

// --- Items ----------------------------------------------------------------------------------------------------------

const GRADES = [1, 2, 3, 4, 5] as const
type Family = 'stones' | 'woods'
const SITE: Readonly<Record<Family, string>> = { stones: 'quarry', woods: 'grove' }
const RAW: Readonly<Record<Family, string>> = { stones: 'stone', woods: 'log' }
const REFINED: Readonly<Record<Family, string>> = { stones: 'block', woods: 'plank' }

export interface WorkshopItem {
  readonly id: string
  readonly family: Family
  readonly grade: number
  readonly refined: boolean
  /** A refined item's raw pair. */
  readonly pair: string | null
}
export const ITEMS: ReadonlyMap<string, WorkshopItem> = new Map((['stones', 'woods'] as const).flatMap((family) => GRADES.flatMap((g): [string, WorkshopItem][] => [
  [`${RAW[family]}-${g}`, { id: `${RAW[family]}-${g}`, family, grade: g, refined: false, pair: null }],
  [`${REFINED[family]}-${g}`, { id: `${REFINED[family]}-${g}`, family, grade: g, refined: true, pair: `${RAW[family]}-${g}` }],
])))

/** Gear at the Forge and Star Gems at the Lapidary: a grade and refined inputs per piece. */
export const MADE: ReadonlyMap<string, { readonly grade: number; readonly inputs: readonly ItemQty[]; readonly at: 'forge' | 'lapidary' }> = new Map([
  ['sword-g1', { grade: 1, at: 'forge', inputs: [{ item: 'block-1', qty: 2 }, { item: 'plank-1', qty: 1 }] }],
  ['sword-g2', { grade: 2, at: 'forge', inputs: [{ item: 'block-2', qty: 2 }, { item: 'plank-2', qty: 1 }] }],
  ['gem-g1', { grade: 1, at: 'lapidary', inputs: [{ item: 'block-1', qty: 1 }] }],
])

// --- Pacing ---------------------------------------------------------------------------------------------------------

export const GATHER_MINUTES = 60
export const REFINE_MINUTES = 15
export const MAKE_MINUTES = 120
/** 2 Craft EXP a minute of the job's own minutes. */
export const jobExp = (minutes: number): number => 2 * minutes
const CRAFT_CAP = 50
export const craftExpToNext = (level: number): number => 1425 + 15 * level
export const gradeUnlockLevel = (g: number): number => 5 * g - 4
const seconds = (minutes: number, speed: number): number => Math.round((minutes * 60) / speed)

/** Craft EXP in: levels up, banking EXP at the cap. */
export function grantCraft(craft: Craft, exp: number): Craft {
  let { level } = craft
  let bank = craft.exp + exp
  while (level < CRAFT_CAP && bank >= craftExpToNext(level)) {
    bank -= craftExpToNext(level)
    level += 1
  }
  return { level, exp: bank }
}

// --- Facilities -----------------------------------------------------------------------------------------------------

const facility = (families: readonly [Family, Family]): BuildingDef => ({
  slots: [3, 4, 5],
  speed: [1, 1, 1.25],
  upgrades: [
    { money: 150, items: families.map((f) => ({ item: `${REFINED[f]}-2`, qty: 1 })) },
    { money: 500, items: families.map((f) => ({ item: `${REFINED[f]}-5`, qty: 2 })) },
  ],
})

export const WORKSHOP_BUILDINGS = buildingTable({
  quarry: facility(['stones', 'woods']),
  grove: facility(['woods', 'stones']),
  workbench: facility(['stones', 'woods']),
  forge: facility(['stones', 'woods']),
  lapidary: facility(['stones', 'woods']),
})

// --- Kinds ----------------------------------------------------------------------------------------------------------

const many = (item: PlannedItem, count: number): readonly PlannedItem[] => Array.from({ length: count }, () => item)

const gatherKind: WorkKindRules<WorkshopState> = {
  plan(state, outfitId, request, _now, { slot, speed, env }) {
    const item = ITEMS.get(request.item)
    if (request.kind !== 'gather' || item === undefined || item.refined || SITE[item.family] !== slot.building) return workRefusal('not-here')
    if (!env.exp.gradeOpen(state, outfitId, 'gather', item.grade)) return workRefusal('grade', { level: gradeUnlockLevel(item.grade) })
    return many({ seconds: seconds(GATHER_MINUTES, speed), inputs: [], output: { item: item.id }, exp: jobExp(GATHER_MINUTES) }, request.count)
  },
  pay: payItems,
}

const refineKind: WorkKindRules<WorkshopState> = {
  maxItems: 40,
  plan(state, outfitId, request, _now, { slot, speed, env }) {
    const item = ITEMS.get(request.item)
    if (request.kind !== 'refine' || item === undefined || !item.refined || slot.building !== 'workbench') return workRefusal('not-here')
    if (!env.exp.gradeOpen(state, outfitId, 'refine', item.grade)) return workRefusal('grade', { level: gradeUnlockLevel(item.grade) })
    return many({ seconds: seconds(REFINE_MINUTES, speed), inputs: [{ item: item.pair!, qty: 1 }], output: { item: item.id }, exp: jobExp(REFINE_MINUTES) }, request.count)
  },
  pay: payItems,
}

/** The Forge's gear goes to `gear`, the Lapidary's gems to `gems`, never the Warehouse. */
function payInto(part: 'gear' | 'gems') {
  return <T extends WorkshopState>(state: T, _outfitId: string, outputs: readonly WorkOutput[]): { readonly state: T } => {
    const into: Record<string, number> = { ...state[part] }
    for (const output of outputs) if ('item' in output) into[output.item] = (into[output.item] ?? 0) + 1
    return { state: { ...state, [part]: into } }
  }
}

function makeKind(kind: 'craft' | 'cut', at: 'forge' | 'lapidary'): WorkKindRules<WorkshopState> {
  return {
    plan(state, outfitId, request, _now, { slot, speed, env }) {
      const made = MADE.get(request.item)
      if (request.kind !== kind || made === undefined || made.at !== at || slot.building !== at) return workRefusal('not-here')
      if (!env.exp.gradeOpen(state, outfitId, kind, made.grade)) return workRefusal('grade', { level: gradeUnlockLevel(made.grade) })
      return many({ seconds: seconds(MAKE_MINUTES, speed), inputs: made.inputs, output: { item: request.item }, exp: jobExp(MAKE_MINUTES) }, request.count)
    },
    pay: payInto(kind === 'craft' ? 'gear' : 'gems'),
  }
}

export const WORKSHOP_ENV: WorkEnv<WorkshopState> = {
  kinds: { gather: gatherKind, refine: refineKind, craft: makeKind('craft', 'forge'), cut: makeKind('cut', 'lapidary') },
  buildings: WORKSHOP_BUILDINGS,
  tickets: {
    balance: (state) => state.wallet.timeTickets,
    spend: (state, n) => ({ ...state, wallet: { ...state.wallet, timeTickets: state.wallet.timeTickets - n } }),
  },
  exp: {
    grant(state, outfitId, exp) {
      const uma = state.umas[outfitId]
      if (!uma) throw new RangeError(`No Uma ${outfitId}`)
      const craft = grantCraft(uma.craft, exp)
      return { state: { ...state, umas: { ...state.umas, [outfitId]: { ...uma, craft } } }, detail: { levelsUp: craft.level - uma.craft.level } }
    },
    gradeOpen: (state, outfitId, _kind, grade) => (state.umas[outfitId]?.craft.level ?? 1) >= gradeUnlockLevel(grade),
  },
  money: {
    balance: (state) => state.wallet.laurels,
    spend: (state, n) => ({ ...state, wallet: { ...state.wallet, laurels: state.wallet.laurels - n } }),
  },
  isWorker: (state, outfitId) => state.umas[outfitId] !== undefined,
}

export function workshop(outfitIds: readonly string[] = ['ace', 'bee', 'cal']): WorkshopState {
  return {
    ...newWorkState(WORKSHOP_BUILDINGS),
    work: {},
    wallet: { laurels: 0, timeTickets: 0 },
    umas: Object.fromEntries(outfitIds.map((id) => [id, { craft: { level: 1, exp: 0 } }])),
    gear: {},
    gems: {},
  }
}

export const stocked = <S extends WorkshopState>(state: S, items: Readonly<Record<string, number>>): S => ({ ...state, items: { ...state.items, ...items } })
export const withWallet = <S extends WorkshopState>(state: S, wallet: Partial<WorkshopState['wallet']>): S => ({ ...state, wallet: { ...state.wallet, ...wallet } })
export const withCraft = <S extends WorkshopState>(state: S, outfitId: string, craft: Craft): S => ({ ...state, umas: { ...state.umas, [outfitId]: { craft } } })
