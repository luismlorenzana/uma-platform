// ST2's cap on live sprite sets (uma-farm F57's ask 11, FR13): at most 8, nearest the camera's centre, stable.
import { describe, expect, it } from 'vitest'
import { LIVE_SETS, liveSets, type SetCandidate } from './cap.js'

const fig = (id: string, set: string | null, z: number, x = 4.5): SetCandidate => ({ id, set, x, z })
const row = (n: number, from = 0) => Array.from({ length: n }, (_, i) => fig(`u${i + from}`, `s${i + from}`, 10 + i + from))

describe('live sprite sets (F57 ask 11)', () => {
  it('keeps at most 8 sets live, nearest the centre first', () => {
    expect(LIVE_SETS).toBe(8)
    const live = liveSets(row(12), { x: 4.5, z: 10 })
    expect([...live]).toEqual(['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7'])
    expect(liveSets(row(12), { x: 4.5, z: 21 }).has('s11')).toBe(true)
  })

  it('counts a set once for every figure wearing it', () => {
    const twins = [fig('a', 'same', 10), fig('b', 'same', 11), ...row(8, 1)]
    expect(liveSets(twins, { x: 4.5, z: 10 }).size).toBe(8)
    expect(liveSets(twins, { x: 4.5, z: 10 }).has('s7')).toBe(true)
  })

  it('leaves figures with no set as standees', () => {
    expect([...liveSets([fig('a', null, 10), fig('b', 's', 30)], { x: 4.5, z: 10 })]).toEqual(['s'])
  })

  it('keeps a live set while its figure is in view, until one frees up', () => {
    const before = liveSets(row(8), { x: 4.5, z: 10 })
    const nearer = [fig('new', 'fresh', 10), ...row(8)]
    expect(liveSets(nearer, { x: 4.5, z: 10 }, 8, before).has('fresh')).toBe(false)
    const gone = [fig('new', 'fresh', 10), ...row(7)]
    expect(liveSets(gone, { x: 4.5, z: 10 }, 8, before).has('fresh')).toBe(true)
  })

  it('takes a smaller cap', () => expect(liveSets(row(5), { x: 0, z: 0 }, 2).size).toBe(2))
})
