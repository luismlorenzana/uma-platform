import { safePackPath } from '@luismlorenzana/uma-server/content'
import { describe, expect, it } from 'vitest'
import { ENEMY_PACK_ALLOW, enemyGames } from './enemy-art.games'

// The app's `enemy-art/` folder as a map; invented enemies of invented factions, never a picture.
const json = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const store = (objects: ReadonlyMap<string, Uint8Array>) => ({
  read: async (path: string) => { const bytes = objects.get(path); return bytes ? { bytes, generation: '1' } : null },
  list: async (prefix: string) => [...objects.keys()].filter((p) => prefix === '' || p.startsWith(`${prefix}/`)).sort(),
})
const HASH = 'ab'.repeat(32), OTHER = 'cd'.repeat(32)
const look = (id: string, faction: string, sha256 = HASH, extra: Record<string, unknown> = {}) => ({
  id, character: `Foe ${id}`, faction, unitId: `unit-${id}`, look: 'station', title: 'Station uniform', path: `images/${id}.${sha256.slice(0, 16)}.png`,
  bytes: 1200, sha256, width: 64, height: 96, approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z', ...extra,
})
const index = (game: string, looks: unknown[], extra: Record<string, unknown> = {}) =>
  json({ schemaVersion: 1, kind: 'enemy-art', game, title: 'Uma Neon City', publishedAt: '2026-01-03T10:00:00.000Z', factions: [{ id: 'blue-guild', title: 'The Blue Guild' }, { id: 'red-guild', title: 'The Red Guild' }], looks, ...extra })

describe('Uma Enemy Art’s games (EA1)', () => {
  it('lists each published game with its looks by faction, in the index’s order, each at its pack path', async () => {
    const games = await enemyGames(store(new Map([
      ['neon-city/index.json', index('neon-city', [look('red-one', 'red-guild'), look('blue-one', 'blue-guild', OTHER), look('green-one', 'green-guild')])],
      [`neon-city/images/red-one.${HASH.slice(0, 16)}.png`, json('not an index')],
    ])))
    expect(games.map((g) => [g.id, g.title, g.factions.map((f) => [f.id, f.title, f.looks.map((l) => l.id)])])).toEqual([
      ['neon-city', 'Uma Neon City', [['blue-guild', 'The Blue Guild', ['blue-one']], ['red-guild', 'The Red Guild', ['red-one']], ['green-guild', 'Green Guild', ['green-one']]]],
    ])
    expect(games[0]!.factions[1]!.looks[0]).toEqual({
      id: 'red-one', character: 'Foe red-one', faction: 'red-guild', unitId: 'unit-red-one', look: 'station', title: 'Station uniform', path: `neon-city/images/red-one.${HASH.slice(0, 16)}.png`,
      bytes: 1200, sha256: HASH, width: 64, height: 96, approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z',
    })
  })

  it('drops a look that isn’t a hash-named PNG of its own, another game’s index, and a damaged file', async () => {
    const games = await enemyGames(store(new Map([
      ['neon-city/index.json', index('neon-city', [
        look('red-one', 'red-guild'), look('wrong-hash', 'red-guild', HASH, { path: `images/wrong-hash.${OTHER.slice(0, 16)}.png` }), look('outside', 'red-guild', HASH, { path: '../art/x.png' }),
        look('no-faction', ''), look('Not A Name', 'red-guild'), look('no-size', 'red-guild', HASH, { width: 0 }), 'words', null,
      ])],
      ['copied/index.json', index('neon-city', [look('red-one', 'red-guild')])],
      ['broken/index.json', new TextEncoder().encode('{ not json')],
      ['empty/index.json', index('empty', [])],
      ['universes/x/index.json', index('x', [look('red-one', 'red-guild')])],
    ])))
    expect(games.map((g) => [g.id, g.factions.flatMap((f) => f.looks.map((l) => l.id))])).toEqual([['neon-city', ['red-one']]])
    expect(await enemyGames(store(new Map()))).toEqual([])
  })

  it('serves only a game’s hash-named PNGs through its pack route', () => {
    const allow = [ENEMY_PACK_ALLOW]
    expect(safePackPath(`neon-city/images/red-one.${HASH.slice(0, 16)}.png`, allow)).toEqual({ path: `neon-city/images/red-one.${HASH.slice(0, 16)}.png`, immutable: true })
    for (const path of ['neon-city/index.json', 'neon-city/images/red-one.png', `../art/universes/x/images/a.${HASH.slice(0, 16)}.png`, `neon-city/images/a.${HASH.slice(0, 16)}.webp`])
      expect(safePackPath(path, allow)).toBeNull()
  })
})
