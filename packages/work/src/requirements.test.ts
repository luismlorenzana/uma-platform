// Requirements netting, from uma-rpg (its D126; its `save/targets.test.ts` exercises it): each item netted once, parents
// first, and only what is still short passed down. Invented recipes only.
import { describe, expect, it } from 'vitest'
import { MAX_RECIPE_DEPTH, planRequirements, type Supply } from './requirements.js'

const RECIPES: Readonly<Record<string, Readonly<Record<string, number>>>> = { sword: { ingot: 2 }, shield: { ingot: 1 }, ingot: { ore: 1 } }
const recipe = (id: string) => RECIPES[id] ?? null
const none = (): Supply => ({ onHand: 0, coming: 0 })

describe('planRequirements', () => {
  it('nets each item once, parents first, and passes down only what is still short', () => {
    const supply = (id: string): Supply => ({ onHand: ({ sword: 1, ingot: 2 } as Record<string, number>)[id] ?? 0, coming: ({ ore: 1 } as Record<string, number>)[id] ?? 0 })
    const plan = planRequirements({ demand: new Map([['sword', 3], ['shield', 1]]), recipe, supply })
    expect(plan.get('sword')).toEqual({ id: 'sword', gross: 3, onHand: 1, coming: 0, net: 2 })
    // The ingot is netted after both its parents: 2 × 2 + 1 = 5 needed, 2 held, 3 to make.
    expect(plan.get('ingot')).toEqual({ id: 'ingot', gross: 5, onHand: 2, coming: 0, net: 3 })
    expect(plan.get('ore')).toEqual({ id: 'ore', gross: 3, onHand: 0, coming: 1, net: 2 })
    expect([...plan.keys()]).toEqual(['shield', 'sword', 'ingot', 'ore'])
  })

  it('stops a chain where the stock covers it, and keeps the lines it covered', () => {
    const plan = planRequirements({ demand: new Map([['sword', 2]]), recipe, supply: (id) => (id === 'ingot' ? { onHand: 4, coming: 0 } : none()) })
    expect(plan.get('ingot')).toMatchObject({ gross: 4, net: 0 })
    expect(plan.get('ore')).toEqual({ id: 'ore', gross: 0, onHand: 0, coming: 0, net: 0 })
  })

  it('ignores demand of zero or less, and a raw demand is netted on its own', () => {
    const plan = planRequirements({ demand: new Map([['sword', 0], ['ore', 3]]), recipe, supply: none })
    expect([...plan.values()]).toEqual([{ id: 'ore', gross: 3, onHand: 0, coming: 0, net: 3 }])
  })

  it('refuses a recipe table with a cycle', () => {
    const loop = (id: string): Record<string, number> | null => (id === 'a' ? { b: 1 } : id === 'b' ? { a: 1 } : null)
    expect(() => planRequirements({ demand: new Map([['a', 1]]), recipe: loop, supply: none })).toThrow(/too deep/)
    expect(MAX_RECIPE_DEPTH).toBe(16)
  })
})
