import { describe, expect, it } from 'vitest'
import { frameMs, nextFrame } from './SpritePlayer'

describe('the chibi sprite player (CA2)', () => {
  it('plays each frame for its own time, 120 ms when it has none', () => {
    expect([frameMs(220), frameMs(null), frameMs(undefined), frameMs(0)]).toEqual([220, 120, 120, 120])
  })
  it('loops a looping action and holds the last frame of one that doesn’t', () => {
    expect([nextFrame(0, 3, true), nextFrame(2, 3, true), nextFrame(2, 3, false), nextFrame(1, 3, false)]).toEqual([1, 0, 2, 2])
  })
})
