import { describe, expect, it } from 'vitest'
import { CatalogCache } from './catalog-cache'

describe('catalog cache', () => {
  it('shares concurrent loads, respects expiry and lets an explicit refresh bypass a fresh value', async () => {
    let now = 0, calls = 0
    const cache = new CatalogCache<number>(15, () => now), load = async () => ++calls
    expect(await Promise.all([cache.get(load), cache.get(load)])).toEqual([1, 1])
    expect(await cache.get(load)).toBe(1)
    now = 16
    expect(await cache.get(load)).toBe(2)
    expect(await cache.get(load, true)).toBe(3)
    expect(calls).toBe(3)
  })
  it('recovers from a failed refresh without serving or caching the failure', async () => {
    const cache = new CatalogCache<number>()
    await expect(cache.get(async () => { throw new Error('offline') })).rejects.toThrow('offline')
    expect(await cache.get(async () => 2)).toBe(2)
    await expect(cache.get(async () => { throw new Error('offline') }, true)).rejects.toThrow('offline')
    expect(await cache.get(async () => 3)).toBe(2)
  })
})
