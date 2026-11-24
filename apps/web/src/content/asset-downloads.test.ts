import { describe, expect, it } from 'vitest'
import { AssetDownloads } from './asset-downloads'

describe('gallery image transfers', () => {
  it('bounds concurrent transfers, preserves results and releases a slot after failure', async () => {
    const queue = new AssetDownloads(2)
    let active = 0, max = 0
    const results = await Promise.allSettled([0, 1, 2, 3, 4].map(id => queue.run(async () => {
      active++; max = Math.max(max, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      if (id === 1) throw new Error('unavailable')
      return id
    })))
    expect(max).toBe(2)
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled'])
    expect(await queue.run(async () => 5)).toBe(5)
    expect(() => new AssetDownloads(0)).toThrow()
  })
})
