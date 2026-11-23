import { describe, expect, it } from 'vitest'
import { CharacterSpritePlayer } from './character-player.js'

describe('character sprite player', () => {
  it('holds the authored still and loops a native walk with unequal frame lengths', () => {
    const front = { x: 0, y: 1 }, left = { x: 2, y: 1 }, right = { x: 4, y: 1 }, back = { x: 6, y: 1 }
    const first = { x: 0, y: 4, durationMs: 80 }, second = { x: 2, y: 4, durationMs: 90 }
    const player = new CharacterSpritePlayer({
      cell: { width: 2, height: 3 }, foot: { x: 1, y: 2 }, page: { path: 'art/synthetic.webp', width: 8, height: 8 },
      standing: { front, left, right, back }, walking: { front: [first], left: [first, second], right: [second, first], back: [second] },
    })
    expect(player.update(0, 'right', false)).toMatchObject(right)
    expect(player.update(79, 'left', true)).toMatchObject({ x: first.x, y: first.y })
    expect(player.update(1, 'left', true)).toMatchObject({ x: second.x, y: second.y })
    expect(player.update(90, 'left', true)).toMatchObject({ x: first.x, y: first.y })
    expect(player.update(0, 'right', true)).toMatchObject({ x: second.x, y: second.y })
    expect(player.update(1000, 'back', false)).toMatchObject(back)
  })
})
