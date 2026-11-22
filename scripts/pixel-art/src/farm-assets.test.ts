import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const folder = new URL('../../../packages/art/', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, folder))
const sum = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
interface Export { file: string; width: number; height: number; sha256: string }
interface Scene { focal: number[]; files: Export[]; sourceSha256: string }
const manifest: { scenes: Record<string,Scene>; rings: Record<string,Export> } = JSON.parse(read('farm-scenes/manifest.json').toString('utf8'))
const atlas: { cell: number; width: number; height: number; frames: Record<string,{ x: number; y: number }> } = JSON.parse(read('farm-items/atlas.json').toString('utf8'))

describe('Farm art exports', () => {
  it('has separately hashed plates at both widths and all ten ring details', () => {
    expect(Object.keys(manifest.scenes)).toHaveLength(52)
    expect(Object.keys(manifest.rings)).toEqual(Array.from({ length: 10 }, (_, i) => `ring-g${i+1}`))
    const verify = (file: Export, budget: number) => {
      const bytes = read('farm-scenes/' + file.file)
      expect(bytes.length, file.file).toBeLessThanOrEqual(budget)
      expect(sum(bytes), file.file).toBe(file.sha256)
      expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
    }
    for (const scene of Object.values(manifest.scenes)) {
      expect(scene.sourceSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(scene.focal.every(value => value >= 0 && value <= 1)).toBe(true)
      expect(scene.files.map(file => file.width)).toEqual([896,1600])
      for (const file of scene.files) verify(file, file.width === 896 ? 180000 : 320000)
    }
    for (const ring of Object.values(manifest.rings)) verify(ring, 58000)
  })
  it('places every Farm icon in a distinct native cell', () => {
    const frames = Object.values(atlas.frames)
    expect(frames).toHaveLength(187)
    expect(new Set(frames.map(({x,y}) => `${x},${y}`)).size).toBe(frames.length)
    expect(frames.every(({x,y}) => x % atlas.cell === 0 && y % atlas.cell === 0 && x < atlas.width && y < atlas.height)).toBe(true)
    for (const id of Object.keys(manifest.rings)) expect(atlas.frames[id]).toBeDefined()
  })
})
