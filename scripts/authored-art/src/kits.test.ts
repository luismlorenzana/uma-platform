import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { buildKit, kitProject, sha } from './kits.js'

const dirs: string[] = []
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })
it.each([{ id: 'kit-forest', count: 37 }, { id: 'kit-town-warrior', count: 32 }])('rebuilds $id from pinned masters, with clear margins and compatible joins', async ({ id, count }) => {
  const dir = await mkdtemp(resolve(tmpdir(), 'kit-test-')); dirs.push(dir)
  const { atlas, frames } = await buildKit(kitProject, id, dir)
  expect(frames).toHaveLength(count)
  expect(atlas.pages).toEqual([{ file: 'atlas.png', width: 2048, height: 2048 }])
  // Native byte comparison avoids walking millions of numeric Buffer properties on CI.
  for (const file of ['atlas.json', 'atlas.png']) expect((await readFile(resolve(dir, file)))
    .equals(await readFile(resolve(kitProject, 'packages/art', id, file))), file).toBe(true)
  const rects = Object.values(atlas.frames)
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i]!, b = rects[j]!
    expect(a.x + a.w + 2 <= b.x || b.x + b.w + 2 <= a.x || a.y + a.h + 2 <= b.y || b.y + b.h + 2 <= a.y).toBe(true)
  }
  for (const f of frames.filter(f => f.spec.mode === 'cutout')) {
    let bottom = -1, dirty = 0, edge = 0
    for (let y = 0; y < f.spec.h; y++) for (let x = 0; x < f.spec.w; x++) {
      const i = (y * f.spec.w + x) * 4, alpha = f.rgba[i + 3]!
      if (alpha >= 128) bottom = Math.max(bottom, y)
      if (!alpha && (f.rgba[i] || f.rgba[i + 1] || f.rgba[i + 2])) dirty++
      if (alpha && (x === 0 || y === 0 || x === f.spec.w - 1 || y === f.spec.h - 1)) edge++
    }
    expect({ bottom, dirty, edge }, f.spec.key).toEqual({ bottom: f.spec.foot!.y, dirty: 0, edge: 0 })
    if (f.spec.role === 'sign') expect(f.spec.foot!.x).toBe(f.spec.w / 2)
  }
  const pixel = (b: Buffer, w: number, x: number, y: number) => b.subarray((y * w + x) * 4, (y * w + x + 1) * 4)
  const badSeams: string[] = []
  for (const a of frames.filter(f => f.spec.seam)) {
    const neighbors = a.spec.edgeGroup ? frames.filter(b => b.spec.edgeGroup === a.spec.edgeGroup) : [a]
    for (const b of neighbors) {
      for (let y = 0; y < a.spec.h; y++) if (!pixel(a.rgba, a.spec.w, a.spec.w - 1, y).equals(pixel(b.rgba, b.spec.w, 0, y))) badSeams.push(`${a.spec.key}/${b.spec.key}:x:${y}`)
      if (a.spec.seam === 'xy') for (let x = 0; x < a.spec.w; x++) if (!pixel(a.rgba, a.spec.w, x, a.spec.h - 1).equals(pixel(b.rgba, b.spec.w, x, 0))) badSeams.push(`${a.spec.key}/${b.spec.key}:y:${x}`)
    }
  }
  expect(badSeams).toEqual([])
  expect(atlas.frames.lantern!.light).toEqual({ color: '#ffc46b', radius: 4, flicker: true })
}, 120000)
it('preserves all previously published uma-art 2.23 PNGs and atlas records', async () => {
  const pins = JSON.parse(await readFile(resolve(kitProject, 'scripts/authored-art/legacy-2.23.json'), 'utf8')) as Record<string, string>
  expect(Object.keys(pins)).toHaveLength(26)
  // uma-art 2.25.0 (P132) appends to the ui and buildings sheets; pixel-art's legacy-f25-2.24.0.json freezes their old
  // records, cutouts and whole old regions, so these two whole-file pins hand over to it.
  const grown = ['packages/art/ui/atlas.json', 'packages/art/ui/atlas.png', 'packages/art/buildings/atlas.json', 'packages/art/buildings/atlas.png']
  for (const [file, hash] of Object.entries(pins)) if (!grown.includes(file)) expect(sha(await readFile(resolve(kitProject, file))), file).toBe(hash)
})
