import { describe, expect, it } from 'vitest'
import { Blinker } from './blink.js'
import { SetCache, KEEP_MS } from './cache.js'
import { blinksShow, facingOf, fieldPose } from './facing.js'
import { testSet } from './fixture.js'
import { AtlasPlayer } from './player.js'
import { rgb, tintAt } from './tint.js'
import { FOLLOW_GAP, Trail } from './trail.js'

describe('the atlas player (format.md §6–§7)', () => {
  it("loops a looping action at its frames' times", () => {
    const p = new AtlasPlayer(testSet())
    p.play('idle')
    p.tick(219)
    expect(p.frameIndex).toBe(0)
    p.tick(1)
    expect(p.frameIndex).toBe(1)
    p.tick(180 + 220 + 180)
    expect(p.frameIndex).toBe(0)
  })
  it('plays twice as fast at 2×', () => {
    const p = new AtlasPlayer(testSet())
    p.play('walk', { speed: 2 })
    p.tick(55)
    expect(p.frameIndex).toBe(1)
  })
  it('ends a once action on its last frame, and says so', () => {
    const p = new AtlasPlayer(testSet())
    p.play('swing')
    const events = p.tick(10_000)
    expect(p.done).toBe(true)
    expect(p.frameIndex).toBe(5)
    expect(events.map((e) => e.kind)).toEqual(['impact', 'end'])
  })
  it('replays the repeat range once for each extra hit, landing each one', () => {
    const p = new AtlasPlayer(testSet())
    p.play('swing', { repeats: 2 })
    const events = p.tick(10_000)
    expect(events.filter((e) => e.kind === 'impact')).toHaveLength(3)
  })
  it('holds until released, then releases the spell', () => {
    const p = new AtlasPlayer(testSet())
    p.play('cast')
    const first = p.tick(5_000)
    expect(first.map((e) => e.kind)).toEqual(['hold'])
    expect(p.held).toBe(true)
    expect([2, 3]).toContain(p.frameIndex)
    p.release()
    const after = p.tick(5_000)
    expect(after.map((e) => e.kind)).toContain('end')
    expect(p.frameIndex).toBe(5)
  })
  it('lies down and stays down on a one-frame hold', () => {
    const p = new AtlasPlayer(testSet())
    p.play('down')
    p.tick(60_000)
    expect(p.frameIndex).toBe(2)
    expect(p.held).toBe(true)
  })
  it('plays an action backwards for a revive, ending on its first frame with no other events', () => {
    const p = new AtlasPlayer(testSet())
    p.play('down', { reverse: true })
    expect(p.frameIndex).toBe(2)
    const events = p.tick(10_000)
    expect(p.frameIndex).toBe(0)
    expect(events.map((e) => e.kind)).toEqual(['end'])
  })
  it('shows a still and keeps it', () => {
    const p = new AtlasPlayer(testSet())
    expect(p.show('turnaround', 1)).toBe(true)
    p.tick(10_000)
    expect(p.frame?.view).toBe('back')
    expect(p.play('nope')).toBe(false)
  })
})

describe('blinks (CR7)', () => {
  it('blink every 2.4–5 s: half, closed, half', () => {
    const b = new Blinker(() => 0.5)
    expect(b.tick(3_000)).toBeNull()
    const seen: (string | null)[] = []
    for (let t = 0; t < 1_000; t += 10) seen.push(b.tick(10))
    expect(seen).toContain('blink-half')
    expect(seen).toContain('blink-closed')
  })
  it('double one blink in seven', () => {
    const b = new Blinker(() => 0.01)
    const seen: (string | null)[] = []
    for (let t = 0; t < 3_000; t += 10) seen.push(b.tick(10))
    const closes = seen.filter((p, i) => p === 'blink-closed' && seen[i - 1] !== 'blink-closed').length
    expect(closes).toBe(2)
  })
})

describe('facings in the field (CR4, CR10)', () => {
  it('face the larger axis of the move, and keep their facing at rest', () => {
    expect(facingOf(-1, 0.2, 'front')).toBe('left')
    expect(facingOf(1, 0, 'front')).toBe('right')
    expect(facingOf(0.1, -1, 'left')).toBe('back')
    expect(facingOf(0, 1, 'left')).toBe('front')
    expect(facingOf(0, 0, 'right')).toBe('right')
  })
  it("walk left with the battle set, the other ways with the field set, never mirrored", () => {
    const s = testSet()
    expect(fieldPose(s, 'left', true, false)).toEqual({ kind: 'play', action: 'walk' })
    expect(fieldPose(s, 'front', true, false)).toEqual({ kind: 'play', action: 'walk-front' })
    expect(fieldPose(s, 'left', true, true)).toEqual({ kind: 'play', action: 'run' })
    expect(fieldPose(s, 'right', true, true)).toEqual({ kind: 'play', action: 'run' }) // no run-right in this set: the battle run
  })
  it('stand on the turnaround still for the facing, the battle idle when facing left', () => {
    const s = testSet()
    expect(fieldPose(s, 'left', false, false)).toEqual({ kind: 'play', action: 'idle' })
    expect(fieldPose(s, 'back', false, false)).toEqual({ kind: 'still', action: 'turnaround', frame: 1 })
    expect(fieldPose(s, 'right', false, false)).toEqual({ kind: 'still', action: 'turnaround', frame: 3 })
  })
  it("walk and stand left with the set's own left-facing field frames once it has them (D17)", () => {
    const s = testSet()
    s.actions['walk-left'] = s.actions['walk-front']!
    s.actions['run-left'] = s.actions['walk-front']!
    expect(fieldPose(s, 'left', true, false)).toEqual({ kind: 'play', action: 'walk-left' })
    expect(fieldPose(s, 'left', true, true)).toEqual({ kind: 'play', action: 'run-left' })
    expect(fieldPose(s, 'left', false, false)).toEqual({ kind: 'still', action: 'turnaround', frame: 2 })
    delete s.actions['run-left']
    expect(fieldPose(s, 'left', true, true)).toEqual({ kind: 'play', action: 'walk-left' })
  })
  it('blink only facing left, on a locked frame', () => {
    expect(blinksShow('left', true)).toBe(true)
    expect(blinksShow('front', true)).toBe(false)
    expect(blinksShow('left', false)).toBe(false)
  })
})

describe('single file (DN24)', () => {
  it('starts in a line behind the leader', () => {
    const t = new Trail({ x: 5, z: 5 })
    expect(t.at(FOLLOW_GAP)).toEqual({ x: 5, z: 5 + FOLLOW_GAP })
  })
  it("walks the followers in the leader's steps, round a corner", () => {
    const t = new Trail({ x: 0, z: 0 })
    for (let i = 1; i <= 30; i++) t.push({ x: i * 0.1, z: 0 })
    for (let i = 1; i <= 30; i++) t.push({ x: 3, z: -i * 0.1 })
    const p = t.at(2 * FOLLOW_GAP)
    expect(p.x).toBeCloseTo(3, 9)
    expect(p.z).toBeCloseTo(-3 + 1.6, 9)
    const q = t.at(4 * FOLLOW_GAP)
    expect(q.x).toBeCloseTo(2.8, 9)
    expect(q.z).toBeCloseTo(0, 9)
  })
  it('stops when the leader stops', () => {
    const t = new Trail({ x: 0, z: 0 })
    t.push({ x: 1, z: 0 })
    const before = t.at(0.8)
    t.push({ x: 1, z: 0 })
    expect(t.at(0.8)).toEqual(before)
  })
})

describe('tint (HD10)', () => {
  it('is the base light away from live lights, warmer by a lantern', () => {
    const base: [number, number, number] = [0.9, 0.9, 0.9]
    expect(tintAt({ x: 0, y: 0, z: 0 }, base, [])).toEqual(base)
    const lit = tintAt({ x: 0, y: 0, z: 0 }, base, [{ x: 0.5, y: 1.2, z: 0, color: rgb('#ffc46b'), radius: 4, strength: 1 }])
    expect(lit[0]).toBeGreaterThan(base[0])
    expect(lit[0]).toBeGreaterThan(lit[2])
    expect(Math.max(...lit)).toBeLessThanOrEqual(1.2)
    expect(rgb('#ff8000')).toEqual([1, 128 / 255, 0])
  })
})

describe('the set cache (N5)', () => {
  it('loads a set once, and frees it a minute after its last Uma leaves', async () => {
    let loads = 0
    const freed: string[] = []
    const cache = new SetCache<string>(async (id) => { loads++; return `set-${id}` }, (v) => freed.push(v))
    expect(await cache.hold(1)).toBe('set-1')
    await cache.hold(1)
    expect(loads).toBe(1)
    cache.release(1, 0)
    expect(cache.sweep(KEEP_MS - 1)).toBe(0)
    cache.release(1, 0)
    expect(cache.sweep(KEEP_MS)).toBe(1)
    await Promise.resolve()
    expect(freed).toEqual(['set-1'])
    expect(cache.size).toBe(0)
  })
})
