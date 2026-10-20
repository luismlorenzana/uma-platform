import { describe, expect, it, vi } from 'vitest'
import { contentUrls } from './urls.js'
describe('held content URLs', () => {
  it('deduplicates, protects held/newest entries, trims on idempotent release and disposes once', async () => {
    let n = 0
    const revoke = vi.fn(), read = vi.fn(async () => new Blob(['invented']))
    const urls = contentUrls(() => `blob:${++n}`, revoke, 2)
    const a = urls.hold('a'), b = urls.hold('b')
    expect(await Promise.all([urls.load('a', read), urls.load('a', read)])).toEqual(['blob:1', 'blob:1'])
    expect(read).toHaveBeenCalledOnce()
    await urls.load('b', read)
    const newest = await urls.load('c', read)
    expect(revoke).not.toHaveBeenCalledWith(newest)
    expect(revoke).not.toHaveBeenCalled()
    a(); a()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:1')
    b(); urls.dispose(); urls.dispose()
    expect(revoke).toHaveBeenCalledTimes(3)
  })
  it('creates no URL after disposal during a pending load', async () => {
    const create = vi.fn(() => 'blob:unexpected'), revoke = vi.fn()
    const urls = contentUrls(create, revoke, 2)
    let finish!: (blob: Blob) => void
    const pending = urls.load('a', () => new Promise((resolve) => { finish = resolve }))
    urls.dispose(); finish(new Blob(['invented']))
    await expect(pending).rejects.toThrow('cancelled')
    expect(create).not.toHaveBeenCalled(); expect(revoke).not.toHaveBeenCalled()
  })
})
