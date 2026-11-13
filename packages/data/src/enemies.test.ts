// Q16 part A: the `enemies` set and the `enemy-keys` family, additive (uma-data 1.6.0).
import { describe, expect, it } from 'vitest'
import { createReleaseClient } from './client.js'
import { parseEnemyKey, type EnemyKey } from './enemy-keys.js'
import { parseOptionalSet } from './master.js'
import { parseReleaseManifest } from './release.js'
import { parseEnemy } from './sets/enemies.js'
import { buildMemoryRelease, createMemorySource, syntheticEnemies, syntheticEnemyKey } from './testing.js'

const clone = <T>(v: T): T => structuredClone(v)

describe('the enemies set', () => {
  it('parses a unit: a numeric id from 700001, a franchise code, a tier and a name', () => {
    expect(parseOptionalSet('enemies', { set: 'enemies', items: syntheticEnemies() })).toEqual(syntheticEnemies())
    expect(() => parseEnemy({ id: 100101, franchise: 'testa', tier: 'boss', name: 'X' }, 'e')).toThrow('enemy id')
    expect(() => parseEnemy({ id: 700010, franchise: 'Test A', tier: 'boss', name: 'X' }, 'e')).toThrow('franchise code')
    expect(() => parseEnemy({ id: 700010, franchise: 'testa', tier: 'elite', name: 'X' }, 'e')).toThrow()
    expect(() => parseOptionalSet('enemies', { set: 'enemies', items: [...syntheticEnemies(), syntheticEnemies()[0]] })).toThrow('unique id')
  })

  it('is optional in a release: one without it still parses, and the client says none', async () => {
    const plain = await buildMemoryRelease()
    const client = createReleaseClient({ source: createMemorySource(plain.objects) })
    const manifest = await client.manifest()
    expect(manifest.sets.enemies).toBeUndefined()
    expect(await client.enemies(manifest)).toBeNull()
    const withEnemies = await buildMemoryRelease(undefined, { enemies: syntheticEnemies() })
    const c2 = createReleaseClient({ source: createMemorySource(withEnemies.objects) }), m2 = await c2.manifest()
    expect(m2.sets.enemies).toMatch(/^data\/enemies\./)
    expect(await c2.enemies(m2)).toEqual(syntheticEnemies())
    // The master sets load as before, whatever the optional ones.
    expect((await c2.load()).data.outfits.length).toBeGreaterThan(0)
  })

  it('refuses a manifest whose enemies set points at a file it does not list', async () => {
    const withEnemies = await buildMemoryRelease(undefined, { enemies: syntheticEnemies() })
    const m = clone(withEnemies.manifest) as unknown as { sets: Record<string, string> }
    m.sets.enemies = 'data/enemies.ffffffffffffffff.json'
    expect(() => parseReleaseManifest(m, 'manifest')).toThrow('a path listed in files')
  })
})

describe('the enemy-keys family', () => {
  it('parses each tier: its canvas, its poses with anchors, a boss in 3 layers', () => {
    for (const tier of ['regular', 'key', 'boss'] as const) expect(parseEnemyKey(clone(syntheticEnemyKey(tier)), tier)).toEqual(syntheticEnemyKey(tier))
  })

  it("holds each tier to its poses: required present, nothing beyond the optional ones", () => {
    const key = syntheticEnemyKey('key'); delete key.poses.action
    expect(() => parseEnemyKey(key, 'k')).toThrow("a key's action pose")
    const reg = syntheticEnemyKey('regular'); reg.poses.attack = clone(reg.poses.battle!)
    expect(() => parseEnemyKey(reg, 'r')).toThrow("one of a regular's poses")
    const boss = syntheticEnemyKey('boss'); boss.poses.phase = clone(boss.poses.attack!)
    expect(parseEnemyKey(boss, 'b').poses.phase).toBeDefined()
  })

  it("holds every pose to its tier's canvas; a boss may widen hers to 1024", () => {
    const reg = syntheticEnemyKey('regular'); reg.canvas = { width: 640, height: 768 }
    expect(() => parseEnemyKey(reg, 'r')).toThrow("a regular's 512 × 768 canvas")
    const wide = syntheticEnemyKey('boss'), at = (p: { width: number; height: number }) => { p.width = 1024; p.height = 960 }
    wide.canvas = { width: 1024, height: 960 }
    for (const p of Object.values(wide.poses)) { at(p); for (const l of p.layers ?? []) at(l) }
    expect(parseEnemyKey(wide, 'b').canvas).toEqual({ width: 1024, height: 960 })
    const off = syntheticEnemyKey('key'); off.poses.action!.width = 600
    expect(() => parseEnemyKey(off, 'k')).toThrow('the 640 × 768 canvas')
  })

  it("puts layers only on a boss's battle pose, 3 to 5, uniquely named", () => {
    const bare = syntheticEnemyKey('boss'); delete bare.poses.battle!.layers
    expect(() => parseEnemyKey(bare, 'b')).toThrow("a boss's battle pose in layers")
    const two = syntheticEnemyKey('boss'); two.poses.battle!.layers!.pop()
    expect(() => parseEnemyKey(two, 'b')).toThrow('3–5 layers')
    const twin = syntheticEnemyKey('boss'); twin.poses.battle!.layers![2]!.name = 'rear'
    expect(() => parseEnemyKey(twin, 'b')).toThrow('a unique layer name')
    const keyed = syntheticEnemyKey('key') as EnemyKey; keyed.poses.battle!.layers = clone(syntheticEnemyKey('boss').poses.battle!.layers!).map((l) => ({ ...l, width: 640 }))
    expect(() => parseEnemyKey(keyed, 'k')).toThrow("layers only on a boss's battle pose")
  })

  it('needs either a foot or a hover, every anchor on the canvas, and display targets in range', () => {
    const both = syntheticEnemyKey('regular'); both.poses.battle!.anchors.hover = { x: 10, y: 10 }
    expect(() => parseEnemyKey(both, 'r')).toThrow('either foot or hover')
    const out = syntheticEnemyKey('regular'); out.poses.battle!.anchors.hit = { x: 600, y: 10 }
    expect(() => parseEnemyKey(out, 'r')).toThrow('a point on the canvas')
    const big = syntheticEnemyKey('boss'); big.display = { figure: 180, envelope: 320 }
    expect(() => parseEnemyKey(big, 'b')).toThrow('a figure up to 300 px')
    const path = syntheticEnemyKey('regular'); path.poses.battle!.path = 'art/outfit-sprites/x.webp'
    expect(() => parseEnemyKey(path, 'r')).toThrow('a WebP under art/enemy-keys/')
  })

  it('loads through the client by enemy id, its images listed in the manifest', async () => {
    const keys = [syntheticEnemyKey('regular'), syntheticEnemyKey('boss')]
    const release = await buildMemoryRelease(undefined, { enemies: syntheticEnemies(), enemyKeys: keys })
    const client = createReleaseClient({ source: createMemorySource(release.objects) })
    const { manifest, art } = await client.load()
    expect(Object.keys(art!.enemyKeys!)).toEqual(['700001', '700003'])
    expect(await client.enemyKey(manifest, art!, 700003)).toEqual(keys[1])
    expect(await client.enemyKey(manifest, art!, 700002)).toBeNull()
  })
})
