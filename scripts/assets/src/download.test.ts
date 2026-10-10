import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadImages } from './download'

const tempDirs: string[] = []
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>'

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

async function cacheDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'uma-platform-assets-cache-'))
  tempDirs.push(dir)
  return dir
}

describe('downloadImages', () => {
  it('downloads, reuses the cache, and refreshes on request', async () => {
    const dir = await cacheDir()
    const fetcher = vi.fn(async () => new Response(SVG, { headers: { 'content-type': 'image/svg+xml' } }))
    const sources = [{ id: 'synthetic-1', url: 'https://example.test/one.svg' }]

    const first = await downloadImages(sources, { cacheDir: dir, kind: 'outfit-icons', fetcher })
    const second = await downloadImages(sources, { cacheDir: dir, kind: 'outfit-icons', fetcher })
    const third = await downloadImages(sources, { cacheDir: dir, kind: 'outfit-icons', fetcher, refresh: true })

    expect(first.images[0]).toMatchObject({ id: 'synthetic-1', cacheHit: false })
    expect(second.images[0]).toMatchObject({ id: 'synthetic-1', cacheHit: true })
    expect(third.images[0]).toMatchObject({ id: 'synthetic-1', cacheHit: false })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('never runs more downloads at once than the concurrency limit', async () => {
    const dir = await cacheDir()
    let active = 0
    let peak = 0
    const fetcher = vi.fn(async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active -= 1
      return new Response(SVG, { headers: { 'content-type': 'image/svg+xml' } })
    })
    const sources = Array.from({ length: 20 }, (_, index) => ({ id: `s${index}`, url: `https://example.test/${index}.svg` }))
    await downloadImages(sources, { cacheDir: dir, kind: 'outfit-icons', fetcher, concurrency: 3 })
    expect(fetcher).toHaveBeenCalledTimes(20)
    expect(peak).toBe(3)
  })

  it('rejects non-images and unsafe ids', async () => {
    const dir = await cacheDir()
    const textFetcher = vi.fn(async () => new Response('nope', { headers: { 'content-type': 'text/plain' } }))
    await expect(
      downloadImages([{ id: 'safe', url: 'https://example.test/nope' }], { cacheDir: dir, kind: 'support-card-icons', fetcher: textFetcher }),
    ).rejects.toThrow('expected an image')
    await expect(
      downloadImages([{ id: '../bad', url: 'https://example.test/nope' }], { cacheDir: dir, kind: 'support-card-icons', fetcher: textFetcher }),
    ).rejects.toThrow('Unsafe asset id')
  })

  it('skips a missing optional source instead of failing the whole family', async () => {
    const dir = await cacheDir()
    const fetcher = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith('missing.svg')
        ? new Response('gone', { status: 404 })
        : new Response(SVG, { headers: { 'content-type': 'image/svg+xml' } }))
    const result = await downloadImages(
      [
        { id: 'present', url: 'https://example.test/one.svg' },
        { id: 'absent', url: 'https://example.test/missing.svg' },
      ],
      { cacheDir: dir, kind: 'support-card-art', fetcher: fetcher as unknown as typeof fetch, optional: true },
    )
    expect(result.images.map((image) => image.id)).toEqual(['present'])
    expect(result.failures.map((failure) => failure.id)).toEqual(['absent'])
  })
})
