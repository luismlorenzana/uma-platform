import { parseArtIndex, parseSpriteSet } from '@luismlorenzana/uma-data'
import { syntheticMasterData } from '@luismlorenzana/uma-data/testing'
import { writeDataSets } from '@uma-platform/data-pipeline/pack'
import { readLocalManifest, readVerifiedFile } from '@uma-platform/data-pipeline/release-dir'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import { hash } from './io.js'
import { approvedSets, layoutRects, packRevision, visibleRect, writeSpriteFamily } from './pack.js'
import { runtimeFiles, type NativeAtlas } from './types.js'

const folders: string[] = []
afterEach(async () => {
  for (const dir of folders.splice(0)) await rm(dir, { recursive: true, force: true })
})
async function temp(prefix: string) {
  const dir = await mkdtemp(resolve(tmpdir(), prefix))
  folders.push(dir)
  return dir
}

/** An invented 256 px frame: an opaque block standing on row 240, with one faint pixel just outside it. */
async function frame(left: number, top: number, width: number, colour: number): Promise<Buffer> {
  const data = Buffer.alloc(256 * 256 * 4)
  for (let y = top; y <= 240; y++) for (let x = left; x < left + width; x++) data.set([colour, 80, 160, 255], (y * 256 + x) * 4)
  data.set([colour, 80, 160, 40], ((top - 1) * 256 + left) * 4)
  return sharp(data, { raw: { width: 256, height: 256, channels: 4 } }).png().toBuffer()
}
async function patch(colour: number): Promise<Buffer> {
  return sharp({ create: { width: 10, height: 6, channels: 4, background: { r: colour, g: 1, b: 2, alpha: 1 } } }).png().toBuffer()
}

/** Writes one revision of an invented outfit and, if asked, a set approval over its current file hashes. */
async function revision(root: string, id: number, approve: boolean) {
  const dir = resolve(root, String(id), 'r1')
  await mkdir(resolve(dir, 'frames'), { recursive: true })
  await mkdir(resolve(dir, 'faces'), { recursive: true })
  const opaque = (left: number, top: number, width: number) => ({ left, right: left + width - 1, top, bottom: 240, width, height: 241 - top })
  const atlas: NativeAtlas = {
    id, revision: 1, profile: 'synthetic', cell: 256, logicalCell: 64, foot: { x: 128, y: 240 }, hit: { x: 128, y: 200 },
    headBox: { x: 110, y: 150, w: 30, h: 30 }, faceBox: { x: 118, y: 160, w: 10, h: 6 }, approvedKey: 'key.png',
    faces: { blink: { file: 'faces/blink.png', x: 118, y: 160, w: 10, h: 6 } },
    actions: {
      idle: { loop: true, events: {}, frames: [
        { file: 'key.png', ms: 200, headLocked: true, headOffset: { x: 0, y: 0 }, hold: 'none', air: false, hit: { x: 128, y: 200 }, bounds: opaque(120, 150, 16) },
        { file: 'frames/idle-1.png', ms: 200, headLocked: true, headOffset: { x: 0, y: 0 }, hold: 'none', air: false, hit: { x: 128, y: 200 }, bounds: opaque(120, 150, 16) },
      ] },
      hop: { loop: false, events: { hold: [0, 1], impact: 1 }, frames: [
        { file: 'frames/hop-0.png', ms: 90, headLocked: false, hold: 'back', air: true, hit: { x: 128, y: 200 }, bounds: opaque(100, 120, 40),
          grip: { x: 110, y: 200, angle: 60 }, handOcclusion: { x: 103, y: 193, w: 14, h: 14 } },
        { file: 'frames/hop-0.png', ms: 160, headLocked: false, hold: 'back', hit: { x: 128, y: 200 }, bounds: opaque(100, 120, 40) },
      ] },
      turnaround: { loop: false, events: {}, frames: [{ file: 'frames/turn-front.png', ms: null, headLocked: false, hold: 'none', hit: { x: 128, y: 200 }, view: 'front' }] },
    },
  }
  await writeFile(resolve(dir, 'key.png'), await frame(120, 150, 16, 200))
  await writeFile(resolve(dir, 'frames/idle-1.png'), await frame(120, 150, 16, 200))
  await writeFile(resolve(dir, 'frames/hop-0.png'), await frame(100, 120, 40, 90))
  await writeFile(resolve(dir, 'frames/turn-front.png'), await frame(124, 160, 9, 30))
  await writeFile(resolve(dir, 'faces/blink.png'), await patch(250))
  await writeFile(resolve(dir, 'atlas.json'), JSON.stringify(atlas))
  await writeFile(resolve(root, String(id), 'current.json'), JSON.stringify({ revision: 1 }))
  const hashes: Record<string, string> = {}
  for (const file of runtimeFiles(atlas)) hashes[file] = hash(await readFile(resolve(dir, file)))
  return { dir, atlas, gate: approve ? { decision: 'approved', at: '2099-01-01T00:00:00Z', hashes } : { decision: null } }
}

async function authoring() {
  const root = await temp('sprite-pack-')
  const approved = await revision(root, 900101, true)
  const pending = await revision(root, 900202, false)
  const changed = await revision(root, 900303, true)
  await writeFile(resolve(changed.dir, 'frames/hop-0.png'), await frame(100, 120, 40, 91))
  const gates = (gate: object) => ({ r1: { key: { decision: 'approved' }, set: gate } })
  await writeFile(resolve(root, 'reviews.json'), JSON.stringify({ schemaVersion: 1, outfits: {
    900101: gates(approved.gate), 900202: gates(pending.gate), 900303: gates(changed.gate) } }))
  return { root, approved }
}

describe('approvedSets', () => {
  it('takes only outfits approved against their current hashes, and says why it skips the rest', async () => {
    const { root } = await authoring()
    const { ready, skipped } = await approvedSets(root)
    expect(ready.map((entry) => entry.outfitId)).toEqual([900101])
    expect(skipped).toEqual([
      { outfitId: 900202, reason: 'r1: no set approval' },
      { outfitId: 900303, reason: 'r1: 1 file(s) changed since the set approval (e.g. frames/hop-0.png)' },
    ])
  })
})

describe('layoutRects', () => {
  it('places every rectangle once, padded, inside bounded pages, the same way every time', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ key: `k${i}`, w: 20 + (i * 37) % 90, h: 30 + (i * 53) % 120 }))
    const layout = layoutRects(items, 256, 2)
    expect(layout).toEqual(layoutRects([...items].reverse(), 256, 2))
    expect(layout.pages.length).toBeGreaterThan(1)
    const taken = new Map<number, { x: number; y: number; w: number; h: number }[]>()
    for (const item of items) {
      const place = layout.places.get(item.key)!
      const page = layout.pages[place.page]!
      expect(place.x - 2).toBeGreaterThanOrEqual(0)
      expect(place.x + item.w + 2).toBeLessThanOrEqual(page.width)
      expect(place.y + item.h + 2).toBeLessThanOrEqual(page.height)
      expect(Math.max(page.width, page.height)).toBeLessThanOrEqual(256)
      for (const other of taken.get(place.page) ?? []) {
        const apart = place.x + item.w + 2 <= other.x - 2 || other.x + other.w + 2 <= place.x - 2 ||
          place.y + item.h + 2 <= other.y - 2 || other.y + other.h + 2 <= place.y - 2
        expect(apart).toBe(true)
      }
      taken.set(place.page, [...(taken.get(place.page) ?? []), { ...place, w: item.w, h: item.h }])
    }
    expect(() => layoutRects([{ key: 'big', w: 300, h: 10 }], 256)).toThrow("doesn't fit")
  })
})

describe('packRevision', () => {
  it('trims to every visible pixel, shares identical frames, and keeps the opaque bounds and anchors', async () => {
    const { approved } = await authoring()
    const packed = await packRevision({ outfitId: 900101, dir: approved.dir, atlas: approved.atlas }, 'lossless')
    const [idle0, idle1] = packed.set.actions.idle!.frames
    // The faint pixel one row above the block is kept: the trim starts a row above the opaque bounds.
    expect(idle0).toMatchObject({ dx: 120, dy: 149, w: 16, h: 92, bounds: { top: 150, height: 91 } })
    expect({ ...idle1, ms: 200 }).toMatchObject({ page: idle0!.page, x: idle0!.x, y: idle0!.y })
    const [hop0, hop1] = packed.set.actions.hop!.frames
    expect(hop0).toMatchObject({ air: true, grip: { x: 110, y: 200, angle: 60 }, handOcclusion: { x: 103, y: 193, w: 14, h: 14 } })
    expect(hop1).toMatchObject({ air: false, x: hop0!.x, y: hop0!.y })
    expect(packed.set.actions.hop!.events).toEqual({ impact: 1, hold: [0, 1] })
    // A still without recorded bounds gets them from its pixels.
    expect(packed.set.actions.turnaround!.frames[0]).toMatchObject({ ms: null, view: 'front', bounds: { left: 124, right: 132, top: 160, bottom: 240 } })
    expect(packed.set.faces.blink).toMatchObject({ dx: 0, dy: 0, w: 10, h: 6, place: { x: 118, y: 160, w: 10, h: 6 } })
    expect(packed.pages).toHaveLength(1)
    const set = { ...packed.set, pages: [{ path: 'atlases/outfit-sprites-900101-0.0000000000000000.webp', width: packed.pages[0]!.width, height: packed.pages[0]!.height }] }
    expect(parseSpriteSet(JSON.parse(JSON.stringify(set)) as unknown, 'set')).toEqual(set)
    // The page holds the frame's pixels exactly where the set says.
    const page = await sharp(packed.pages[0]!.bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const source = await sharp(await readFile(resolve(approved.dir, 'frames/hop-0.png'))).ensureAlpha().raw().toBuffer()
    const at = (x: number, y: number) => [...page.data.subarray(((hop0!.y + y) * page.info.width + hop0!.x + x) * 4, ((hop0!.y + y) * page.info.width + hop0!.x + x) * 4 + 4)]
    const was = (x: number, y: number) => [...source.subarray(((hop0!.dy + y) * 256 + hop0!.dx + x) * 4, ((hop0!.dy + y) * 256 + hop0!.dx + x) * 4 + 4)]
    expect(at(5, 5)).toEqual(was(5, 5))
    expect(visibleRect({ data: source, width: 256, height: 256 })).toEqual({ x: 100, y: 119, w: 40, h: 122 })
  })

  it('refuses a frame whose recorded bounds disagree with its pixels', async () => {
    const { approved } = await authoring()
    approved.atlas.actions.idle!.frames[0]!.bounds = { left: 1, right: 2, top: 3, bottom: 4, width: 2, height: 2 }
    await expect(packRevision({ outfitId: 900101, dir: approved.dir, atlas: approved.atlas }, 'lossy')).rejects.toThrow('bounds disagree')
  })
})

describe('writeSpriteFamily', () => {
  it('adds the family to the local release beside everything else, and packs the same bytes twice', async () => {
    const { root, approved } = await authoring()
    const releaseDir = await temp('sprite-release-')
    const data = syntheticMasterData()
    const base = await writeDataSets({ releaseDir, sources: { 'synthetic/test': '1' }, sets: {
      characters: data.characters, outfits: data.outfits, 'support-cards': data.supportCards, skills: data.skills,
      scenarios: data.scenarios, races: data.races, tracks: data.tracks, courses: data.courses, objectives: data.objectives } })
    const { ready } = await approvedSets(root)
    const first = await writeSpriteFamily(releaseDir, [await packRevision(ready[0]!, 'lossy')])
    const second = await writeSpriteFamily(releaseDir, [await packRevision({ outfitId: 900101, dir: approved.dir, atlas: approved.atlas }, 'lossy')])
    expect(second.version).toBe(first.version)
    expect(first.sets).toEqual(base.sets)
    const index = parseArtIndex(JSON.parse((await readVerifiedFile(releaseDir, first.files.find((f) => f.path === first.art)!)).toString('utf8')) as unknown, 'art')
    expect(Object.keys(index.sprites!)).toEqual(['900101'])
    expect(first.files.filter((f) => f.path.includes('outfit-sprites')).map((f) => f.path.split('.')[0])).toEqual(['art/outfit-sprites/900101', 'atlases/outfit-sprites-900101-0'])
    expect((await readLocalManifest(releaseDir))!.version).toBe(first.version)
    const emptied = await writeSpriteFamily(releaseDir, [])
    expect(emptied.files.some((f) => f.path.includes('outfit-sprites'))).toBe(false)
  })
})
