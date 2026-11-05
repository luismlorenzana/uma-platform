// H11: D86's five classes and ten Cleric statuses (uma-rpg rpg/kinds.ts and battle/labels.tsx).
export const CLASSES = ['brawler', 'mage', 'spellblade', 'cleric', 'summoner'] as const
export const STATUSES = ['armor-break', 'mind-break', 'enfeeble', 'shatter', 'hex', 'brave', 'faith', 'aegis', 'breaker', 'clarity'] as const
// H54: classes v2's sixth class (uma-rpg D160). CLASSES keeps the five, which place the y=0 row by index.
export const TIER0 = ['recruit', 'duelist', 'acolyte', 'caller', 'apprentice'] as const
export const HYBRIDS = ['tomeblade', 'armsummoner'] as const
export type Class = (typeof CLASSES)[number] | 'paladin' | (typeof TIER0)[number] | (typeof HYBRIDS)[number]
export type Status = (typeof STATUSES)[number]
export const RACER_CURRENCIES = ['prize-money', 'speed-ticket', 'uma-ticket'] as const
export const CURRENCIES = [...RACER_CURRENCIES, 'laurel', 'card-ticket'] as const
export const YARD_MARKS = ['fatigue', 'rest'] as const
export type YardMark = (typeof YARD_MARKS)[number]
export const TIERS = ['1', '2', '3'] as const
export type Currency = (typeof CURRENCIES)[number]
export type RacerCurrency = (typeof RACER_CURRENCIES)[number]
export type Tier = (typeof TIERS)[number]
// H38: the Rift's four fronts and its eleven achievements (uma-rpg docs/design/rift.md §5, §7).
export const FRONTS = ['iron', 'arcane', 'duel', 'horde'] as const
export const ACHIEVEMENTS = ['seal-iron', 'seal-arcane', 'seal-duel', 'seal-horde', 'rift-conquered',
  'iron-will', 'arcane-purity', 'untouched', 'swift-convergence', 'bestiary', 'crossover'] as const
export type Front = (typeof FRONTS)[number]
export type Achievement = (typeof ACHIEVEMENTS)[number]
// H141: append-only star-chart crests and stat marks (uma-rpg PP30).
export const STAR_BODIES = ['planet', 'prowess', 'vigor', 'guard', 'template'] as const
export const STAT_MARKS = ['hp', 'mp', 'atk', 'matk', 'def', 'mdef', 'evasion', 'limit'] as const
export type StarBody = (typeof STAR_BODIES)[number]
export type StatMark = (typeof STAT_MARKS)[number]
export type FrameSpec = { id: string; group: 'class'; key: Class; w: 24; h: 24 }
  | { id: string; group: 'status'; key: Status; w: 12; h: 12 }
  | { id: string; group: 'currency'; key: Currency; w: 16; h: 16 }
  | { id: string; group: 'tier'; key: Tier; w: 12; h: 12 }
  | { id: string; group: 'front'; key: Front; w: 16; h: 16 }
  | { id: string; group: 'achievement'; key: Achievement; w: 24; h: 24 }
  | { id: string; group: 'star'; key: StarBody; w: 24; h: 24 }
  | { id: string; group: 'stat'; key: StatMark; w: 16; h: 16 }
  | { id: string; group: 'yard'; key: YardMark; w: 24; h: 24 }
export const FRAME_SPECS: FrameSpec[] = [
  ...CLASSES.map((key): FrameSpec => ({ id: `class/${key}`, group: 'class', key, w: 24, h: 24 })),
  ...STATUSES.map((key): FrameSpec => ({ id: `status/${key}`, group: 'status', key, w: 12, h: 12 })),
  ...RACER_CURRENCIES.map((key): FrameSpec => ({ id: `currency/${key}`, group: 'currency', key, w: 16, h: 16 })),
  ...TIERS.map((key): FrameSpec => ({ id: `tier/${key}`, group: 'tier', key, w: 12, h: 12 })),
  { id: 'currency/laurel', group: 'currency', key: 'laurel', w: 16, h: 16 },
  ...FRONTS.map((key): FrameSpec => ({ id: `front/${key}`, group: 'front', key, w: 16, h: 16 })),
  ...ACHIEVEMENTS.map((key): FrameSpec => ({ id: `achievement/${key}`, group: 'achievement', key, w: 24, h: 24 })),
  { id: 'class/paladin', group: 'class', key: 'paladin', w: 24, h: 24 },
  ...[...HYBRIDS, ...TIER0].map((key): FrameSpec => ({ id: `class/${key}`, group: 'class', key, w: 24, h: 24 })),
  ...STAR_BODIES.map((key): FrameSpec => ({ id: `star/${key}`, group: 'star', key, w: 24, h: 24 })),
  ...STAT_MARKS.map((key): FrameSpec => ({ id: `stat/${key}`, group: 'stat', key, w: 16, h: 16 })),
  { id: 'currency/card-ticket', group: 'currency', key: 'card-ticket', w: 16, h: 16 },
  ...YARD_MARKS.map((key): FrameSpec => ({ id: `yard/${key}`, group: 'yard', key, w: 24, h: 24 })),
]
