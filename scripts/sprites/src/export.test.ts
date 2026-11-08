import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { exportRevision, parseConfig, repeatRevision } from './export.js'
import { hash } from './io.js'
import type { ExportConfig } from './types.js'

const folders: string[] = []
afterEach(async () => { for (const d of folders.splice(0)) await rm(d, { recursive: true, force: true }) })
it('rebuilds pinned synthetic crops deterministically and reports literal copies', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'sprite-export-test-')); folders.push(dir)
  const source = resolve(dir, 'source'); await mkdir(source)
  const master = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#dd9966' } }).png().toBuffer()
  await writeFile(resolve(source, 'master.png'), master)
  const atlas = { id: 900101, revision: 1, cell: 256, approvedKey: 'key.png', faces: {}, actions: { idle: { frames: [{ file: 'key.png' }] } } }
  const config: ExportConfig = { schemaVersion: 2, atlasText: JSON.stringify(atlas) + '\n', handPalette: 'skin', outputs: {
    'key.png': { source: 'master.png', sha256: hash(master), crop: { left: 8, top: 8, width: 16, height: 16 }, resize: { width: 8, height: 8 }, translate: { x: 124, y: 233 } },
    'composite.png': { source: 'master.png', sha256: hash(master), literal: 'Synthetic composite retained as a pinned input.' },
  } }
  const path = resolve(dir, 'config.json'); await writeFile(path, JSON.stringify(config))
  const one = await exportRevision(source, path, resolve(dir, 'one')), two = await exportRevision(source, path, resolve(dir, 'two'))
  expect(one).toEqual(two); expect(one.literals).toHaveLength(1)
  for (const f of Object.keys(one.hashes)) await writeFile(resolve(source, f), await readFile(resolve(dir, 'one', f)))
  expect((await repeatRevision(source, path)).byteIdentical).toBe(true)
  await writeFile(resolve(source, 'key.png'), new Uint8Array([1]))
  expect((await repeatRevision(source, path)).differences).toEqual(['key.png'])
  await expect(exportRevision(source, path, source)).rejects.toThrow('immutable')
  await writeFile(resolve(source, 'master.png'), new Uint8Array([2]))
  await expect(exportRevision(source, path, resolve(dir, 'three'))).rejects.toThrow('hash changed')
})
it('rejects traversal, unpinned sources, missing recipes and unexplained literals', () => {
  const c = { schemaVersion: 2, atlasText: JSON.stringify({ id: 1, revision: 1, cell: 256, approvedKey: 'key.png', actions: {}, faces: {} }), handPalette: 'skin', outputs: {} }
  expect(() => parseConfig(c)).toThrow('recipe')
  for (const r of [{ source: '../secret', sha256: 'a'.repeat(64) }, { source: 'key.png', sha256: 'x' }, { source: 'key.png', sha256: 'a'.repeat(64), literal: '' }]) {
    expect(() => parseConfig({ ...c, outputs: { 'key.png': r } })).toThrow()
  }
})
