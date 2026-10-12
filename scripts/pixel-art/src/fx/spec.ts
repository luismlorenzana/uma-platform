// Ten damage kinds in uma-rpg packages/domain/src/rpg/kinds.ts (D86); element colours in battle/labels.tsx.
export const KINDS = ['greatsword', 'axe', 'lance', 'bow', 'katana', 'fire', 'ice', 'lightning', 'light', 'dark'] as const
export type Kind = (typeof KINDS)[number]
export const COLORS: Record<Kind, string> = {
  greatsword: '#c8deeb', axe: '#e0d3b3', lance: '#b9dcea', bow: '#e4c58a', katana: '#d5d5ed',
  fire: '#ff8a5c', ice: '#8fd3ff', lightning: '#ffd84d', light: '#fff2b0', dark: '#c79bff',
}
export const HIT_FRAMES = 4, FAMILIAR_FRAMES = 2, CELL = 32
export type Group = 'hit' | 'familiar'
export interface FrameSpec { id: string; group: Group; kind: Kind; frame: number; w: 32; h: 32 }
export const FRAME_SPECS: FrameSpec[] = KINDS.flatMap((kind) => [
  ...Array.from({ length: HIT_FRAMES }, (_, frame): FrameSpec => ({ id: `hit/${kind}-${frame}`, group: 'hit', kind, frame, w: 32, h: 32 })),
  ...Array.from({ length: FAMILIAR_FRAMES }, (_, frame): FrameSpec => ({ id: `familiar/${kind}-${frame}`, group: 'familiar', kind, frame, w: 32, h: 32 })),
])
