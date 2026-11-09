import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { buildKit, kitProject, sha } from './kits.js'

const dirs: string[] = []
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }) })
it('rebuilds the complete forest kit from pinned masters and keeps every frame separated', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'kit-test-')); dirs.push(dir)
  const { atlas, frames } = await buildKit(kitProject, 'kit-forest', dir)
  expect(frames).toHaveLength(37)
  expect(atlas.pages).toEqual([{ file: 'atlas.png', width: 2048, height: 2048 }])
  // Native byte comparison avoids Vitest walking millions of numeric Buffer properties on the CI runner.
  for (const file of ['atlas.json', 'atlas.png']) expect((await readFile(resolve(dir, file)))
    .equals(await readFile(resolve(kitProject, 'packages/art/kit-forest', file))), file).toBe(true)
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
  }
  const floors = frames.filter(f => f.spec.role === 'floor')
  const badSeams: string[] = []
  for (const a of floors) for (const b of floors) for (let n = 0; n < 128; n++) {
    if (!a.rgba.subarray((n * 128 + 127) * 4, (n * 128 + 128) * 4).equals(b.rgba.subarray(n * 128 * 4, (n * 128 + 1) * 4))) badSeams.push(`${a.spec.key}/${b.spec.key}:x:${n}`)
    if (!a.rgba.subarray((127 * 128 + n) * 4, (127 * 128 + n + 1) * 4).equals(b.rgba.subarray(n * 4, (n + 1) * 4))) badSeams.push(`${a.spec.key}/${b.spec.key}:y:${n}`)
  }
  for (const role of ['wall', 'riser']) {
    const variants = frames.filter(f => f.spec.role === role)
    for (const a of variants) for (const b of variants) for (let y = 0; y < a.spec.h; y++) {
      if (!a.rgba.subarray((y * a.spec.w + a.spec.w - 1) * 4, (y * a.spec.w + a.spec.w) * 4)
        .equals(b.rgba.subarray(y * b.spec.w * 4, (y * b.spec.w + 1) * 4))) badSeams.push(`${a.spec.key}/${b.spec.key}:x:${y}`)
    }
  }
  expect(badSeams).toEqual([])
// The full-source integration export has a separate CI budget.
}, 120000)
it('preserves every previously published uma-art 2.22 PNG and atlas record', async () => {
  const pins = JSON.parse(await readFile(resolve(kitProject, 'scripts/authored-art/legacy-2.22.json'), 'utf8')) as Record<string, string>
  for (const [file, hash] of Object.entries(pins)) expect(sha(await readFile(resolve(kitProject, file))), file).toBe(hash)
})
