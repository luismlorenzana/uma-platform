import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildGlassFamily, GLASS, glassKey, litPixels, litWindow, unpinnedFaces, type GlassBaker, type GlassJob } from './glass'

const portrait = (red: number): Promise<Buffer> =>
  sharp({ create: { width: 32, height: 32, channels: 4, background: { r: red, g: 40, b: 90, alpha: 1 } } }).png().toBuffer()

const window = (): Promise<Buffer> =>
  sharp({ create: { width: GLASS.size, height: GLASS.size, channels: 3, background: '#335577' } }).webp().toBuffer()
const paneMap = (value: number): Promise<Buffer> =>
  sharp({ create: { width: GLASS.size, height: GLASS.size, channels: 3, background: { r: value, g: value, b: value } } }).webp({ lossless: true }).toBuffer()

/** Stands in for bake.py: every job gets a real WebP and an invented face share. */
function fakeBaker(baked: GlassJob[], faceShare = 0.1): GlassBaker {
  return async (jobs, onResult) => {
    for (const job of jobs) {
      baked.push(job)
      await writeFile(job.out, await window())
      await writeFile(job.order, await paneMap(125))
      onResult({ id: job.id, face_share: faceShare, pieces: 200 })
    }
  }
}

describe('glassKey', () => {
  const shape = { box: { left: 1, top: 2, size: 3 }, main: 'AABBCC', sub: '112233', pin: null }
  const source = Buffer.from('invented')

  it('stays the same for the same inputs and moves with anything that shapes the window', () => {
    const base = glassKey('recipe', source, shape)
    expect(glassKey('recipe', source, shape)).toBe(base)
    expect(glassKey('next', source, shape)).not.toBe(base)
    expect(glassKey('recipe', Buffer.from('changed'), shape)).not.toBe(base)
    expect(glassKey('recipe', source, { ...shape, main: 'CCBBAA' })).not.toBe(base)
    expect(glassKey('recipe', source, { ...shape, pin: { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2 } })).not.toBe(base)
  })
})

describe('unpinnedFaces', () => {
  it('names a face outside the usual share unless it has a pin', () => {
    expect(unpinnedFaces([
      { id: '1', faceShare: 0.01, pinned: false },
      { id: '2', faceShare: 0.1, pinned: false },
      { id: '3', faceShare: 0.3, pinned: false },
      { id: '4', faceShare: 0.3, pinned: true },
    ])).toEqual(['1', '3'])
  })
})

describe('buildGlassFamily', () => {
  let cacheDir: string
  const colors = new Map([['900101', { main: 'AABBCC', sub: '112233' }]])

  beforeEach(async () => {
    cacheDir = await mkdtemp(resolve(tmpdir(), 'uma-glass-'))
  })
  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true })
  })

  it('bakes once, then reads the cache', async () => {
    const portraits = [{ id: '900101', bytes: await portrait(10), cacheHit: true }, { id: '900102', bytes: await portrait(20), cacheHit: true }]
    const baked: GlassJob[] = []
    const first = await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker(baked) })
    expect(first).toMatchObject({ baked: 2, cacheHits: 0, failed: [], unpinned: [] })
    expect(first.images.map(({ id, width, height }) => [id, width, height])).toEqual([['900101', GLASS.size, GLASS.size], ['900102', GLASS.size, GLASS.size]])
    expect(baked[0]).toMatchObject({ main: 'AABBCC', sub: '112233', pin: null })
    expect(baked[1]).toMatchObject({ main: '8A9BB0', sub: 'D8B15A' })

    const second = await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker(baked) })
    expect(second).toMatchObject({ baked: 0, cacheHits: 2 })
    expect(baked).toHaveLength(2)
  })

  it('bakes a new outfit alone, and a pin replaces the old window', async () => {
    const first = { id: '900101', bytes: await portrait(10), cacheHit: true }
    const baked: GlassJob[] = []
    await buildGlassFamily({ cacheDir, portraits: [first], colors, baker: fakeBaker(baked) })

    const added = { id: '900102', bytes: await portrait(20), cacheHit: true }
    await buildGlassFamily({ cacheDir, portraits: [first, added], colors, baker: fakeBaker(baked) })
    expect(baked.map((job) => job.id)).toEqual(['900101', '900102'])

    const pin = { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2 }
    await buildGlassFamily({ cacheDir, portraits: [first], colors, pins: { '900101': pin }, baker: fakeBaker(baked) })
    expect(baked.at(-1)).toMatchObject({ id: '900101', pin })
    const files = (await readdir(resolve(cacheDir, 'outfit-glass'))).filter((file) => file.endsWith('.webp'))
    expect(files).toHaveLength(2)
    expect(files.filter((file) => file.endsWith('.order.webp'))).toHaveLength(1)
  })

  it('reads each window with its pane map, and rebakes a window whose map went missing', async () => {
    const portraits = [{ id: '900101', bytes: await portrait(10), cacheHit: true }]
    const baked: GlassJob[] = []
    const first = await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker(baked) })
    expect(first.orders.map(({ id, width, height }) => [id, width, height])).toEqual([['900101', GLASS.size, GLASS.size]])
    expect(baked[0]!.order).toBe(baked[0]!.out.replace(/\.webp$/, '.order.webp'))
    await rm(baked[0]!.order)
    await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker(baked) })
    expect(baked).toHaveLength(2)
  })

  it('names a misread face from the cache too, so a later run still reports it', async () => {
    const portraits = [{ id: '900101', bytes: await portrait(10), cacheHit: true }]
    expect((await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker([], 0.01) })).unpinned).toEqual(['900101'])
    expect((await buildGlassFamily({ cacheDir, portraits, colors, baker: fakeBaker([], 0.01) })).unpinned).toEqual(['900101'])
  })

  it('reports a failed bake and leaves that outfit out', async () => {
    const portraits = [{ id: '900101', bytes: await portrait(10), cacheHit: true }]
    const failing: GlassBaker = async (jobs, onResult) => {
      for (const job of jobs) onResult({ id: job.id, error: 'invented failure' })
    }
    const built = await buildGlassFamily({ cacheDir, portraits, colors, baker: failing })
    expect(built).toMatchObject({ images: [], baked: 0, failed: [{ id: '900101', reason: 'invented failure' }] })
  })
})

describe('litPixels', () => {
  // Four pixels: the lead, a pane early in the order, one late, and the face.
  const window = Uint8Array.from([200, 100, 50, 200, 100, 50, 200, 100, 50, 200, 100, 50])
  const order = Uint8Array.from([0, 25, 250, 255])
  const dark = (r: number, g: number, b: number) => {
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    return [Math.round((0.3 * r + 0.7 * y) * 0.16 + 9), Math.round((0.3 * g + 0.7 * y) * 0.16 + 11), Math.round((0.3 * b + 0.7 * y) * 0.16 + 18)]
  }
  const lit = [200, 100, 50]
  const shown = (n: number, steps = 31) => Array.from(litPixels(window, order, 1, n, steps))

  it('draws only the lead at 0 of 31', () => {
    expect(shown(0)).toEqual([...lit, ...dark(200, 100, 50), ...dark(200, 100, 50), ...dark(200, 100, 50)])
  })

  it('lights a pane once 250 × lit ÷ 30 reaches it', () => {
    expect(shown(2)).toEqual([...lit, ...dark(200, 100, 50), ...dark(200, 100, 50), ...dark(200, 100, 50)])
    expect(shown(3)).toEqual([...lit, ...lit, ...dark(200, 100, 50), ...dark(200, 100, 50)])
  })

  it('keeps the face for the last step', () => {
    expect(shown(30)).toEqual([...lit, ...lit, ...lit, ...dark(200, 100, 50)])
    expect(shown(31)).toEqual([...lit, ...lit, ...lit, ...lit])
    expect(shown(30, 30)).toEqual([...lit, ...lit, ...lit, ...lit])
  })

  it('reads a map with any number of channels', () => {
    const rgb = Uint8Array.from([0, 0, 0, 25, 25, 25, 250, 250, 250, 255, 255, 255])
    expect(Array.from(litPixels(window, rgb, 3, 3, 31))).toEqual(shown(3))
  })
})

describe('litWindow', () => {
  it('draws a window at its share lit, as a PNG of its size', async () => {
    const png = await litWindow(await window(), await paneMap(250), 30, 31)
    const { width, height } = await sharp(png).metadata()
    expect([width, height]).toEqual([GLASS.size, GLASS.size])
    const dim = await litWindow(await window(), await paneMap(250), 29, 31)
    const [bright, dull] = await Promise.all([png, dim].map(async (bytes) => (await sharp(bytes).stats()).channels[2]!.mean))
    expect(bright!).toBeGreaterThan(dull! * 2)
  })
})
