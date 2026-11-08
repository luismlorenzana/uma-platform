import { afterEach, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { atomicJson, hash, gateStatus, keyFiles, runtimeFiles, type NativeAtlas } from '@uma-platform/sprite-pipeline'
import { ReviewStore } from './review-store.js'

const folders: string[] = []
afterEach(async () => { for (const d of folders.splice(0)) await rm(d, { recursive: true, force: true }) })
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), 'studio-review-test-')); folders.push(root)
  const dir = resolve(root, '900101/r1'); await mkdir(dir, { recursive: true })
  await atomicJson(resolve(root, '900101/current.json'), { revision: 1 })
  const frame = { file: 'key.png', headLocked: false, hold: 'none', hit: { x: 128, y: 161 } }
  const atlas: NativeAtlas = { id: 900101, revision: 1, profile: 'synthetic', cell: 256, logicalCell: 64, foot: { x: 128, y: 240 }, hit: frame.hit,
    headBox: { x: 90, y: 40, w: 90, h: 90 }, faceBox: { x: 100, y: 80, w: 20, h: 20 }, approvedKey: 'key.png', faces: {},
    actions: { idle: { loop: true, events: {}, frames: [frame] }, turnaround: { loop: false, events: {}, frames: [{ ...frame, file: 'turn.png' }] } } }
  await atomicJson(resolve(dir, 'atlas.json'), atlas)
  for (const file of ['key.png', 'turn.png', 'identity.md']) await writeFile(resolve(dir, file), `invented ${file}`)
  const hashes = Object.fromEntries(await Promise.all(runtimeFiles(atlas).map(async f => [f, hash(await readFile(resolve(dir, f)))])))
  await atomicJson(resolve(dir, 'verification.json'), { checks: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, true])), files: hashes })
  await atomicJson(resolve(root, 'reviews.json'), { schemaVersion: 1, outfits: {} })
  return { root, dir, atlas, store: new ReviewStore(root) }
}
it('binds both gates to all covered files and detects changed identity or frame bytes', async () => {
  const f = await fixture(), initial = await f.store.read()
  const key = await f.store.save({ stamp: initial.stamp, gate: 'key', decision: 'approved', note: 'Synthetic approval', outfits: [{ id: 900101, revision: 1 }] })
  const gates = key.reviews.outfits['900101']!.r1!
  expect(Object.keys(gates.key.hashes!)).toEqual(keyFiles(f.atlas))
  const set = await f.store.save({ stamp: key.stamp, gate: 'set', decision: 'approved', note: '', outfits: [{ id: 900101, revision: 1 }] })
  expect(Object.keys(set.reviews.outfits['900101']!.r1!.set.hashes!)).toEqual(runtimeFiles(f.atlas))
  await writeFile(resolve(f.dir, 'identity.md'), 'changed checklist')
  expect((await gateStatus(f.dir, gates.key, keyFiles(f.atlas))).changed).toBe(true)
  await writeFile(resolve(f.dir, 'key.png'), 'changed frame')
  expect((await gateStatus(f.dir, set.reviews.outfits['900101']!.r1!.set, runtimeFiles(f.atlas))).approved).toBe(false)
})
it('rejects concurrent stale writes, stale verification, missing keys and malformed decisions', async () => {
  const f = await fixture(), initial = await f.store.read(), outfit = [{ id: 900101, revision: 1 }]
  await expect(f.store.save({ stamp: initial.stamp, gate: 'set', decision: 'approved', note: '', outfits: outfit })).rejects.toThrow('key')
  const saved = await f.store.save({ stamp: initial.stamp, gate: 'key', decision: 'approved', note: '', outfits: outfit })
  await expect(f.store.save({ stamp: initial.stamp, gate: 'key', decision: 'approved', note: '', outfits: outfit })).rejects.toThrow('changed')
  await writeFile(resolve(f.dir, 'turn.png'), 'changed')
  await expect(f.store.save({ stamp: saved.stamp, gate: 'set', decision: 'approved', note: '', outfits: outfit })).rejects.toThrow()
  await expect(f.store.save({ stamp: saved.stamp, gate: 'key', decision: 'changes', note: '', outfits: outfit })).rejects.toThrow('note')
  await expect(f.store.save({ stamp: saved.stamp, gate: 'key', decision: 'approved', note: '', outfits: [{ id: '../escape', revision: 1 }] })).rejects.toThrow()
})
