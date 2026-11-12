import { describe, expect, it } from 'vitest'
import { TEST_ROOM, TEST_ROOM_LOOP, TEST_TOWN, TEST_TOWN_LOOP } from './designs.js'
import { roomGeometry, townGeometry } from './geometry.js'
import { standInKitAtlas } from './standInKit.js'
import { autoMove, heightAt, walk, walkWorld, type Spot } from './walk.js'

const room = walkWorld(TEST_ROOM, roomGeometry(TEST_ROOM, standInKitAtlas('biome')).blocked)
const town = walkWorld(TEST_TOWN, townGeometry(TEST_TOWN, standInKitAtlas('town')).blocked)
const go = (w: typeof room, from: Spot, x: number, y: number, seconds: number, dash = false): Spot => {
  let at = from
  for (let i = 0; i < seconds * 30; i++) at = walk(w, at, { x, y }, 1 / 30, dash)
  return at
}

describe('walking a built world (Q5)', () => {
  it('walks and stops at the walls', () => {
    const at = go(room, { x: 6.5, z: 9.5 }, 1, 0, 4)
    expect(at.x).toBeGreaterThan(12.5)
    expect(at.x).toBeLessThan(13)
  })
  it('dashes faster than it walks', () => {
    expect(go(room, { x: 6.5, z: 8.5 }, -1, 0, 0.3, true).x).toBeLessThan(go(room, { x: 6.5, z: 8.5 }, -1, 0, 0.3).x)
  })
  it('climbs only by the stairs, following their height', () => {
    const blocked = go(room, { x: 4.5, z: 5.5 }, 0, -1, 2)
    expect(heightAt(room, blocked.x, blocked.z)).toBe(0)
    expect(blocked.z).toBeGreaterThan(4)
    const up = go(room, { x: 7.0, z: 5.5 }, 0, -1, 2)
    expect(heightAt(room, up.x, up.z)).toBe(1)
    expect(heightAt(room, 6.5, 4.5)).toBeCloseTo(0.5, 9)
  })
  it("won't walk off a ledge or into the drop", () => {
    expect(heightAt(room, ...Object.values(go(room, { x: 4.5, z: 2.5 }, 0, 1, 2)) as [number, number])).toBe(1)
    expect(go(room, { x: 4.5, z: 8.5 }, -1, 0, 2).x).toBeGreaterThan(3)
  })
  it("walks round props that block, and over those that don't", () => {
    const at = go(room, { x: 3.5, z: 3.5 }, 0, -1, 1)
    expect(at.z).toBeGreaterThan(3)
  })
  it("walks Auto-walk's loops all the way round, in the room and the town", () => {
    for (const [w, loop, start] of [[room, TEST_ROOM_LOOP, { x: 5.5, z: 9.5 }], [town, TEST_TOWN_LOOP, { x: 10.5, z: 12.5 }]] as const) {
      let at: Spot = start, target = 0
      const seen = new Set<number>()
      for (let i = 0; i < 30 * 180; i++) {
        const step = autoMove(loop, at, target)
        target = step.target
        seen.add(target)
        at = walk(w, at, step.move, 1 / 30, false)
      }
      expect(seen.size).toBe(loop.length)
    }
  })
  it('keeps out of buildings in town', () => {
    const at = go(town, { x: 4.5, z: 6.5 }, 0, -1, 2)
    expect(at.z).toBeGreaterThan(6)
  })
})
