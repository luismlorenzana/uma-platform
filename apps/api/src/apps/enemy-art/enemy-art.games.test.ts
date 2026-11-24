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
  it('lists and counts only Cyberpunk even when other published games are returned by the store', async () => {
    const ids = ['quest', 'uma-quest', 'high-fantasy', 'other-world', 'cyberpunk']
    const objects = new Map(ids.map(id => [`${id}/index.json`, index(id, [look('red-one', 'red-guild')])]))
    const source = store(objects), reads: string[] = []
    const games = await enemyGames({
      list: async () => [...objects.keys()],
      read: async path => { reads.push(path); return source.read(path) },
    })
    expect(games.map(game => game.id)).toEqual(['cyberpunk'])
    expect(games[0]!.factions.flatMap(faction => faction.looks)).toHaveLength(1)
    expect(reads).toEqual(['cyberpunk/index.json'])
  })

  it('lists each published game with its looks by faction, in the index’s order, each at its pack path', async () => {
    const games = await enemyGames(store(new Map([
      ['cyberpunk/index.json', index('cyberpunk', [look('red-one', 'red-guild'), look('blue-one', 'blue-guild', OTHER), look('green-one', 'green-guild'), look('red-one-suit', 'red-guild', OTHER, { kind: 'casual' }), look('red-one-base', 'red-guild', OTHER, { kind: 'base' }), look('red-one-odd', 'red-guild', OTHER, { kind: 'odd' }), look('red-two-lt', 'red-guild', OTHER, { kind: 'lieutenant' })])],
      [`cyberpunk/images/red-one.${HASH.slice(0, 16)}.png`, json('not an index')],
    ])))
    expect(games.map((g) => [g.id, g.title, g.factions.map((f) => [f.id, f.title, f.looks.map((l) => l.id)])])).toEqual([
      ['cyberpunk', 'Uma Neon City', [['blue-guild', 'The Blue Guild', ['blue-one']], ['red-guild', 'The Red Guild', ['red-one', 'red-one-suit', 'red-one-base', 'red-one-odd', 'red-two-lt']], ['green-guild', 'Green Guild', ['green-one']]]],
    ])
    expect(games[0]!.factions[1]!.looks[0]).toEqual({
      id: 'red-one', character: 'Foe red-one', faction: 'red-guild', unitId: 'unit-red-one', look: 'station', title: 'Station uniform', path: `cyberpunk/images/red-one.${HASH.slice(0, 16)}.png`,
      bytes: 1200, sha256: HASH, width: 64, height: 96, approvedOn: '2026-01-02', publishedAt: '2026-01-03T10:00:00.000Z', kind: 'combat',
    })
    // A casual look keeps its kind (EA3), and so does a look both albums hold (P191); any other kind reads as combat.
    expect(games[0]!.factions[1]!.looks.map((l) => l.kind)).toEqual(['combat', 'casual', 'base', 'combat', 'lieutenant'])
  })

  it('drops a look that isn’t a hash-named PNG of its own, another game’s index, and a damaged file', async () => {
    const games = await enemyGames(store(new Map([
      ['cyberpunk/index.json', index('cyberpunk', [
        look('red-one', 'red-guild'), look('wrong-hash', 'red-guild', HASH, { path: `images/wrong-hash.${OTHER.slice(0, 16)}.png` }), look('outside', 'red-guild', HASH, { path: '../art/x.png' }),
        look('no-faction', ''), look('Not A Name', 'red-guild'), look('no-size', 'red-guild', HASH, { width: 0 }), 'words', null,
      ])],
      ['copied/index.json', index('cyberpunk', [look('red-one', 'red-guild')])],
      ['broken/index.json', new TextEncoder().encode('{ not json')],
      ['empty/index.json', index('empty', [])],
      ['universes/x/index.json', index('x', [look('red-one', 'red-guild')])],
    ])))
    expect(games.map((g) => [g.id, g.factions.flatMap((f) => f.looks.map((l) => l.id))])).toEqual([['cyberpunk', ['red-one']]])
    expect(await enemyGames(store(new Map()))).toEqual([])
    for (const invalid of [index('quest', [look('red-one', 'red-guild')]), new TextEncoder().encode('{ not json'), index('cyberpunk', [])]) {
      expect(await enemyGames(store(new Map([['cyberpunk/index.json', invalid]])))).toEqual([])
    }
  })

  it('serves only a game’s hash-named PNGs through its pack route', () => {
    const allow = [ENEMY_PACK_ALLOW]
    expect(safePackPath(`cyberpunk/images/red-one.${HASH.slice(0, 16)}.png`, allow)).toEqual({ path: `cyberpunk/images/red-one.${HASH.slice(0, 16)}.png`, immutable: true })
    for (const path of ['cyberpunk/index.json', 'cyberpunk/images/red-one.png', `../art/universes/x/images/a.${HASH.slice(0, 16)}.png`, `cyberpunk/images/a.${HASH.slice(0, 16)}.webp`])
      expect(safePackPath(path, allow)).toBeNull()
  })
})
