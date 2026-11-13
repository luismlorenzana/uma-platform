// The phone test (LK1, LR6): High for ten minutes, the budget's sustained run, then Medium and Saver for three each, so the
// tiers compare on a warm phone. Each step settles for two seconds before it records. `?minutes=` shortens the High
// step for a quick look (the others scale with it).
import type { TierName } from '@luismlorenzana/uma-stage/look'

export interface TestStep { readonly tier: TierName; readonly seconds: number }
export const PHONE_TEST: readonly TestStep[] = [{ tier: 'high', seconds: 600 }, { tier: 'medium', seconds: 180 }, { tier: 'saver', seconds: 180 }]
export const SETTLE_SECONDS = 2

/** The plan with High lasting `minutes` (the others in proportion); the full test when none is given. */
export function testPlan(minutes: number | null): TestStep[] {
  if (minutes === null || !(minutes > 0)) return [...PHONE_TEST]
  const k = (minutes * 60) / PHONE_TEST[0]!.seconds
  return PHONE_TEST.map((s) => ({ ...s, seconds: Math.max(5, Math.round(s.seconds * k)) }))
}

/** The budgets (LR6) a tier is held to: 30 fps sustained, about 400 MB of GPU memory; and the first load, about 15 MB. */
export const BUDGET = { sustained30: 0.95, gpuMB: 400, firstLoadMB: 15 } as const
export const meets = (s: { sustained30: number; gpuMB: number }): boolean => s.sustained30 >= BUDGET.sustained30 && s.gpuMB <= BUDGET.gpuMB

export const minutesLabel = (plan: readonly TestStep[]): string => `${Math.round((plan.reduce((a, s) => a + s.seconds + SETTLE_SECONDS, 0) / 60) * 10) / 10} minutes`
