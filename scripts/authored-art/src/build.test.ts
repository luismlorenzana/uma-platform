import { afterEach, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { build, project, type Atlas } from './build.js'

const dirs: string[] = []
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }) })
it('rebuilds both authored families byte for byte from pinned original masters', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'authored-art-test-')); dirs.push(dir)
  expect(await build(project, dir)).toHaveLength(24)
  for (const family of ['held', 'emote']) for (const name of ['atlas.png', 'atlas.json']) {
    expect(await readFile(resolve(dir, family, name))).toEqual(await readFile(resolve(project, 'packages/art', family, name)))
  }
}, 30000)
it('keeps 16 held textures and eight readable bubbles inside their clear cells, with real grip/anchor metadata', async () => {
  for (const family of ['held', 'emote'] as const) {
    const root = resolve(project, 'packages/art', family), a = JSON.parse(await readFile(resolve(root, 'atlas.json'), 'utf8')) as Atlas
    const { data, info } = await sharp(resolve(root, 'atlas.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(Object.keys(a.frames)).toHaveLength(family === 'held' ? 16 : 8)
    for (const [key, f] of Object.entries(a.frames)) {
      expect(f.w).toBe(a.cell); expect(f.h).toBe(a.cell)
      const alpha = (x: number, y: number) => data[((f.y + y) * info.width + f.x + x) * 4 + 3]!
      for (let n = 0; n < a.cell; n++) expect([alpha(n, 0), alpha(n, a.cell - 1), alpha(0, n), alpha(a.cell - 1, n)]).toEqual([0, 0, 0, 0])
      const p = family === 'held' ? f.grip! : f.anchor!
      expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(a.cell)
      expect(p.y).toBeGreaterThan(0); expect(p.y).toBeLessThan(a.cell)
      if (family === 'held') {
        expect(f.angle0).toBe('image-left'); expect(f.scale).toBe(key.includes('tome-') ? .55 : 1)
        const neighbors: number[] = []
        for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) neighbors.push(alpha(Math.round(p.x) + x, Math.round(p.y) + y))
        expect(Math.max(...neighbors), key).toBeGreaterThanOrEqual(128)
      }
      if (key === 'held/bow-drawn') { expect(f.nock!.x).toBeGreaterThan(f.grip!.x + 30); expect(Math.abs(f.nock!.y - f.grip!.y)).toBeLessThan(3) }
    }
  }
})
it('preserves all published 2.21 family pixels and metadata', async () => {
  const baseline = JSON.parse(await readFile(resolve(project, 'scripts/authored-art/legacy-2.21.json'), 'utf8')) as Record<string, string>
  // uma-art 2.25.0 (P132) appends to the ui and buildings sheets; pixel-art's legacy-f25-2.24.0.json freezes their old
  // records, cutouts and whole old regions, so these two whole-file pins hand over to it.
  // uma-art 2.30.0 (uma-farm F83, P178) appends the ranch row to the items sheet; pixel-art's legacy-f83-2.29.0.json
  // freezes its earlier records and the whole old sheet.
  const grown = ['packages/art/ui/atlas.json', 'packages/art/ui/atlas.png', 'packages/art/buildings/atlas.json', 'packages/art/buildings/atlas.png',
    'packages/art/items/atlas.json', 'packages/art/items/atlas.png']
  for (const [file, digest] of Object.entries(baseline)) if (!grown.includes(file)) expect(createHash('sha256').update(await readFile(resolve(project, file))).digest('hex'), file).toBe(digest)
})
