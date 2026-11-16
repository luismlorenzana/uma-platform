import { describe, expect, it } from 'vitest'
import { bossCount, bossesOf, chosenTab, gameTabs, lookCount, plural, type EnemyGame, type EnemyLook } from './data'

// Invented enemies only.
const look = (id: string, faction: string, character = `Foe ${id}`, kind: EnemyLook['kind'] = 'combat'): EnemyLook => ({
  id, character, faction, kind, unitId: null, look: 'station', title: 'Station uniform', path: `cyberpunk/images/${id}.${'ab'.repeat(8)}.png`,
  bytes: 9, sha256: 'ab'.repeat(32), width: 32, height: 48, approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z',
})
const game = (id: string, title: string): EnemyGame => ({
  id, title, publishedAt: '2026-01-03T10:00:00.000Z',
  factions: [{ id: 'red-guild', title: 'The Red Guild', looks: [look('a', 'red-guild'), look('b', 'red-guild')] }, { id: 'blue-guild', title: 'The Blue Guild', looks: [look('c', 'blue-guild')] }],
})

describe('Uma Enemy Art’s bosses (P186)', () => {
  it('groups a faction’s looks by enemy, in first-seen order, her casual looks first', () => {
    const faction = { id: 'red-guild', title: 'The Red Guild', looks: [look('a-armor', 'red-guild', 'Foe A'), look('b-armor', 'red-guild', 'Foe B'), look('a-helm', 'red-guild', 'Foe A'), look('a-suit', 'red-guild', 'Foe A', 'casual')] }
    expect(bossesOf(faction).map((b) => [b.name, b.looks.map((l) => l.id)])).toEqual([['Foe A', ['a-suit', 'a-armor', 'a-helm']], ['Foe B', ['b-armor']]])
    expect(bossCount({ id: 'g', title: 'G', publishedAt: null, factions: [faction] })).toBe(2)
  })
})

describe('Uma Enemy Art’s tabs (EA1)', () => {
  it('shows Uma Cyberpunk and Uma Quest first, published or not, then any other published game', () => {
    expect(gameTabs([]).map((t) => [t.id, t.title, t.game, t.looks])).toEqual([['cyberpunk', 'Uma Cyberpunk', null, 0], ['quest', 'Uma Quest', null, 0]])
    const tabs = gameTabs([game('neon-city', 'Uma Neon City'), game('cyberpunk', 'Uma Cyberpunk')])
    expect(tabs.map((t) => [t.id, t.looks, t.factions])).toEqual([['cyberpunk', 3, 2], ['quest', 0, 0], ['neon-city', 3, 2]])
    expect(lookCount(game('cyberpunk', 'Uma Cyberpunk'))).toBe(3)
  })

  it('opens the tab a link names, else the first with looks', () => {
    const tabs = gameTabs([game('neon-city', 'Uma Neon City')])
    expect(chosenTab(tabs, null)?.id).toBe('neon-city')
    expect(chosenTab(tabs, 'quest')?.id).toBe('quest')
    expect(chosenTab(gameTabs([]), 'nowhere')?.id).toBe('cyberpunk')
    expect([plural(1, 'look'), plural(2, 'look')]).toEqual(['1 look', '2 looks'])
  })
})
