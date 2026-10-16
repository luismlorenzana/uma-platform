// H29 / RPG D144. Original-art identities only; recipes and Extra Stats rules stay in the game.
export const EFFECTS = ['hp', 'mp', 'atk', 'matk', 'def', 'mdef', 'speed', 'limit'] as const
export type Effect = typeof EFFECTS[number]
export const PLANETS: Record<Effect, { color: string; virtue: string }> = {
  hp: { color: '#e8706a', virtue: 'Vigor' }, mp: { color: '#6aa8ff', virtue: 'Spirit' },
  atk: { color: '#ff9a4d', virtue: 'Strength' }, matk: { color: '#c48bff', virtue: 'Sorcery' },
  def: { color: '#9fb4cc', virtue: 'Fortitude' }, mdef: { color: '#5fd3c0', virtue: 'Resolve' },
  speed: { color: '#ffd84d', virtue: 'Swiftness' }, limit: { color: '#f0b8ff', virtue: 'Valor' },
}
export const STONES = ['Quartz', 'Amethyst', 'Citrine', 'Garnet', 'Emerald', 'Sapphire', 'Ruby', 'Diamond', 'Starstone', "Philosopher's Stone"] as const
export const RING: readonly Effect[] = ['hp', 'def', 'mdef', 'mp', 'matk', 'atk', 'speed', 'limit']
export const PAIRS = RING.map((a, i) => [a, RING[(i + 1) % RING.length]!] as const)
export type GemSpec = { id: string; name: string; grade: number } & (
  { kind: 'moon'; effects: readonly [Effect] } |
  { kind: 'bridge'; effects: readonly [Effect, Effect] } |
  { kind: 'sun'; effects: readonly Effect[] }
)
export const GEM_SPECS: readonly GemSpec[] = [
  ...EFFECTS.flatMap(effect => Array.from({ length: 10 }, (_, i): GemSpec => ({
    id: `gem-${effect}-${i + 1}`, name: `${STONES[i]} of ${PLANETS[effect].virtue}`, kind: 'moon', grade: i + 1, effects: [effect],
  }))),
  ...PAIRS.flatMap(([a, b]) => [3, 7].map((grade): GemSpec => ({
    id: `gem-${a}-${b}-${grade}`, name: `${STONES[grade - 1]} of ${PLANETS[a].virtue} & ${PLANETS[b].virtue}`, kind: 'bridge', grade, effects: [a, b],
  }))),
  ...[4, 6, 8, 10].map((grade): GemSpec => ({ id: `gem-sun-${grade}`, name: `${STONES[grade - 1]} of the Sun`, kind: 'sun', grade, effects: EFFECTS })),
]
