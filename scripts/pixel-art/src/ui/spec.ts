// H11: D86's five classes and ten Cleric statuses (uma-rpg rpg/kinds.ts and battle/labels.tsx).
export const CLASSES = ['brawler', 'mage', 'spellblade', 'cleric', 'summoner'] as const
export const STATUSES = ['armor-break', 'mind-break', 'enfeeble', 'shatter', 'hex', 'brave', 'faith', 'aegis', 'breaker', 'clarity'] as const
export type Class = (typeof CLASSES)[number]
export type Status = (typeof STATUSES)[number]
export const CURRENCIES = ['prize-money', 'speed-ticket', 'uma-ticket'] as const
export const TIERS = ['1', '2', '3'] as const
export type Currency = (typeof CURRENCIES)[number]
export type Tier = (typeof TIERS)[number]
export type FrameSpec = { id: string; group: 'class'; key: Class; w: 24; h: 24 }
  | { id: string; group: 'status'; key: Status; w: 12; h: 12 }
  | { id: string; group: 'currency'; key: Currency; w: 16; h: 16 }
  | { id: string; group: 'tier'; key: Tier; w: 12; h: 12 }
export const FRAME_SPECS: FrameSpec[] = [
  ...CLASSES.map((key): FrameSpec => ({ id: `class/${key}`, group: 'class', key, w: 24, h: 24 })),
  ...STATUSES.map((key): FrameSpec => ({ id: `status/${key}`, group: 'status', key, w: 12, h: 12 })),
  ...CURRENCIES.map((key): FrameSpec => ({ id: `currency/${key}`, group: 'currency', key, w: 16, h: 16 })),
  ...TIERS.map((key): FrameSpec => ({ id: `tier/${key}`, group: 'tier', key, w: 12, h: 12 })),
]
