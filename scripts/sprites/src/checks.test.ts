import { describe, expect, it } from 'vitest'
import { checks, missingActions, profileCounts, profileTotals, runChecks, type CheckContext } from './checks.js'
import type { NativeFrame, Pixels } from './types.js'
import { queue, nextBatch, scope, stage, type Ranking } from './queue.js'

function fixture(): CheckContext {
  const data = Buffer.alloc(256 * 256 * 4)
  for (let y = 33; y <= 240; y++) for (let x = 100; x <= 155; x++) data.set([200, 150, 110, 255], (y * 256 + x) * 4)
  const p: Pixels = { data, width: 256, height: 256 }, face = { x: 120, y: 95, w: 8, h: 8 }
  const frame: NativeFrame = { file: 'body.png', headLocked: true, headOffset: { x: 0, y: 0 }, hold: 'none', air: false, hit: { x: 128, y: 161 } }
  const actions = Object.fromEntries(Object.entries(profileCounts('traveler')).map(([name, n]) => [name, { loop: true, events: {}, frames: Array.from({ length: n }, (_, i) => ({ ...frame, ...(name === 'turnaround' ? { view: ['front', 'back', 'left', 'right'][i] } : {}) })) }]))
  const atlas = { id: 900101, revision: 1, profile: 'traveler', cell: 256, logicalCell: 64, foot: { x: 128, y: 240 }, hit: { x: 128, y: 161 }, headBox: { x: 100, y: 33, w: 56, h: 100 }, faceBox: face, approvedKey: 'key.png', faces: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [String(i), { ...face, file: 'face.png' }])), actions }
  return { atlas, pixels: { 'key.png': { ...p, data: Buffer.from(p.data) }, 'body.png': p, 'face.png': { width: 8, height: 8, data: Buffer.alloc(8 * 8 * 4, 255) } }, hashes: { 'body.png': 'a', 'key.png': 'a' }, keyPins: { 'key.png': 'a' }, priorPins: { 'body.png': 'a' }, repeat: true,
    config: { schemaVersion: 2, atlasText: '', outputs: {}, handPalette: 'skin', facingScales: Object.fromEntries(Object.keys(atlas.actions).filter(k => k.includes('-')).map(k => [k, Array.from({ length: 6 }, () => ({ sx: 1, sy: 1 }))])) } }
}
describe('the catalog (format.md §7, P105)', () => {
  it('walks and runs a traveler in all four field facings: 29 actions, 130 frames, 7 patches', () => {
    const counts = profileCounts('traveler')
    expect(Object.keys(counts)).toHaveLength(29)
    expect([counts['walk-left'], counts['run-left']]).toEqual([6, 6])
    expect(profileTotals('traveler')).toEqual({ frames: 130, faces: 7 })
    expect(profileTotals('traveler', 'battle')).toEqual({ frames: 62, faces: 6 })
  })
  it('gives townsfolk walk-left in place of the battle walk, so they stay at 45 frames', () => {
    const counts = profileCounts('townsfolk')
    expect(counts['walk-left']).toBe(6)
    expect(counts.walk).toBeUndefined()
    expect(profileTotals('townsfolk')).toEqual({ frames: 45, faces: 2 })
  })
  it("names what a set drawn before P105 lacks", () => {
    const before = Object.fromEntries(Object.keys(profileCounts('traveler')).filter(name => !name.endsWith('-left')).map(name => [name, {}]))
    expect(missingActions('traveler', before)).toEqual(['walk-left', 'run-left'])
    expect(missingActions('traveler', profileCounts('traveler'))).toEqual([])
  })
  it('fails check 1 on a set without the left walks, and check 13 holds them to the left turnaround', () => {
    const c = fixture()
    delete c.atlas.actions['walk-left']
    expect(checks[1]!(c)).toContain('walk-left: expected 6 frames')
    const d = fixture()
    d.config.facingScales!['run-left']![2]!.sx = 1.1
    expect(checks[13]!(d)).toEqual(['run-left: cycle scale'])
    const e = fixture()
    e.atlas.actions.turnaround!.frames = e.atlas.actions.turnaround!.frames.filter(f => f.view !== 'left')
    expect(checks[13]!(e)).toEqual(['walk-left: standing height', 'run-left: standing height'])
  })
})

describe('fourteen pure checks', () => {
  it('accepts the invented complete profile', () => { expect(runChecks(fixture()).failures).toEqual([]) })
  const mutations: [number, (c: CheckContext) => void][] = [
    [1, c => { c.atlas.actions.idle!.events.impact = 99 }],
    [2, c => { c.pixels['face.png']!.width = 9 }],
    [3, c => { c.pixels['body.png']!.data.set([200, 150, 110, 255], 0) }],
    [4, c => { for (const a of Object.values(c.atlas.actions)) for (const f of a.frames) f.air = true }],
    [5, c => { c.keyPins['key.png'] = 'b' }],
    [6, c => { c.pixels['body.png']!.data[(95 * 256 + 120) * 4] = 0 }],
    [7, c => { c.atlas.faceBox.x = 200 }],
    [8, c => { c.atlas.actions.idle!.frames[0]!.grip = { x: 5, y: 5, angle: 0 } }],
    [9, c => { c.pixels['body.png']!.data.set([200, 150, 110, 40], (20 * 256 + 20) * 4) }],
    [10, c => { c.pixels['body.png']!.data.set([200, 150, 110, 255], (20 * 256 + 20) * 4) }],
    [11, c => { for (let x = 100; x < 110; x++) c.pixels['body.png']!.data.set([200, 150, 110, 255], (28 * 256 + x) * 4) }],
    [12, c => { c.priorPins['body.png'] = 'b' }],
    [13, c => { c.config.facingScales!['walk-front']![1]!.sx = 1.1 }],
    [14, c => { c.repeat = false }],
  ]
  it.each(mutations)('check %i rejects its failure', (n, mutate) => { const c = fixture(); mutate(c); expect(checks[n]!(c).length).toBeGreaterThan(0) })
})
describe('queue and stages', () => {
  const rows: Ranking[] = [
    { outfitId: 1, characterId: 1, tier: 'SS', bucket: 'front' }, { outfitId: 2, characterId: 2, tier: 'SS', bucket: 'pace' },
    { outfitId: 3, characterId: 3, tier: 'SS', bucket: 'pace-late' }, { outfitId: 4, characterId: 4, tier: 'SS', bucket: 'late' },
    { outfitId: 5, characterId: 5, tier: 'SS', bucket: 'late-end' }, { outfitId: 6, characterId: 6, tier: 'SS', bucket: 'front' },
    { outfitId: 7, characterId: 1, tier: 'A1', bucket: 'pace' }, { outfitId: 8, characterId: 8, tier: 'F', bucket: 'front' },
    { outfitId: 9, characterId: 8, tier: 'B', bucket: 'front' },
  ]
  it('takes one Way and character, tiers before roster order; override fills gaps', () => {
    expect(nextBatch(queue(rows, 'traveler'), 'traveler', new Set()).map(r => r.outfitId)).toEqual([1, 2, 3, 4, 5])
    expect(nextBatch(queue(rows, 'traveler', [6]), 'traveler', new Set()).map(r => r.outfitId)).toEqual([6, 2, 3, 4, 5])
    expect(nextBatch(rows, 'traveler', new Set([2, 3, 4, 5])).map(r => r.outfitId)).toEqual([1])
    expect(() => queue(rows, 'traveler', [8])).toThrow()
  })
  it('takes best-ranked townsfolk outfit for unselected characters', () => { expect(scope(rows, 'townsfolk').map(r => r.outfitId)).toEqual([9]) })
  it('uses an owner-selected townsfolk outfit without changing rankings or traveler scope', () => {
    const before = JSON.stringify(rows)
    expect(queue(rows, 'townsfolk', [8], [8]).map(r => r.outfitId)).toEqual([8])
    expect(scope(rows, 'townsfolk', [8])).toHaveLength(1)
    expect(scope(rows, 'traveler', [8])).toEqual(scope(rows, 'traveler'))
    expect(JSON.stringify(rows)).toBe(before)
    for (const invalid of [[8, 9], [8, 8], [1], [999]]) expect(() => scope(rows, 'townsfolk', invalid)).toThrow()
    expect(() => queue(rows, 'townsfolk', [9], [8])).toThrow()
  })
  it('changed hashes override every later stage', () => {
    expect(stage({ started: true, key: true, drawn: true, verified: true, approved: true, published: true, changed: true })).toBe('Changed since approval')
    expect(stage({ started: true, key: true, drawn: true, verified: true, approved: true })).toBe('Set approved')
  })
})
