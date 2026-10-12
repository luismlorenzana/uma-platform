// H11: D86's five classes and ten Cleric statuses (uma-rpg rpg/kinds.ts and battle/labels.tsx).
export const CLASSES = ['brawler', 'mage', 'spellblade', 'cleric', 'summoner'] as const
export const STATUSES = ['armor-break', 'mind-break', 'enfeeble', 'shatter', 'hex', 'brave', 'faith', 'aegis', 'breaker', 'clarity'] as const
export type Class = (typeof CLASSES)[number]
export type Status = (typeof STATUSES)[number]
export type FrameSpec = { id: string; group: 'class'; key: Class; w: 24; h: 24 } | { id: string; group: 'status'; key: Status; w: 12; h: 12 }
export const FRAME_SPECS: FrameSpec[] = [
  ...CLASSES.map((key): FrameSpec => ({ id: `class/${key}`, group: 'class', key, w: 24, h: 24 })),
  ...STATUSES.map((key): FrameSpec => ({ id: `status/${key}`, group: 'status', key, w: 12, h: 12 })),
]
