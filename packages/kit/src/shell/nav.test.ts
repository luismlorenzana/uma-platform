import { describe, expect, it } from 'vitest'
import { navState, peekPath, withParam } from './nav'

describe('shell navigation', () => {
  it('sets and clears one search param, keeping the path and the rest', () => {
    expect(withParam({ pathname: '/wilds', search: '' }, 'peek', 'mine')).toBe('/wilds?peek=mine')
    expect(withParam({ pathname: '/wilds', search: '?peek=mine&x=1' }, 'peek', null)).toBe('/wilds?x=1')
    expect(withParam({ pathname: '/town', search: '?sheet=menu' }, 'sheet', null)).toBe('/town')
    expect(peekPath('town', 'party hall')).toBe('/town?peek=party%20hall')
    expect(navState({ state: null })).toEqual({})
    expect(navState({ state: { back: true } }).back).toBe(true)
  })
})
