// ST4's options on the band stage itself, headless: three.js builds the farm as usual, but the renderer is a stub (no
// WebGL in Node) and standees draw on a canvas that ignores every call. Each option has its block; with none passed, the
// stage behaves as 0.3.0 did.
import { Texture } from 'three'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FarmDesign } from '../formats/index.js'
import { standInSet } from '../sprites/standInSet.js'
import { SAMPLE_FARM } from '../world/farmSample.js'
import { standInFarmAtlas } from '../world/standInFarmAtlas.js'
import { BandStage, type BandStageOptions } from './bandStage.js'

const renders: number[] = []
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()
  class StubRenderer {
    outputColorSpace = ''
    info = { autoReset: true, reset() {}, render: { calls: 0 } }
    setPixelRatio() {}
    setSize() {}
    render() { renders.push(performance.now()) }
    dispose() {}
  }
  return { ...actual, WebGLRenderer: StubRenderer }
})

/** A 2D context that takes any call and hands back another like it (a gradient, a pattern). */
const context = (): unknown => new Proxy({} as Record<string | symbol, unknown>, { get: (t, k) => (k in t ? t[k] : () => context()), set: (t, k, v) => { t[k] = v; return true } })
const frames: { cb: FrameRequestCallback; id: number }[] = []
let nextFrame = 1
beforeAll(() => {
  Object.assign(globalThis, {
    document: { createElement: () => ({ width: 0, height: 0, getContext: context }) },
    requestAnimationFrame: (cb: FrameRequestCallback) => { frames.push({ cb, id: nextFrame }); return nextFrame++ },
    cancelAnimationFrame: (id: number) => { const i = frames.findIndex((f) => f.id === id); if (i >= 0) frames.splice(i, 1) },
  })
})
afterAll(() => { for (const k of ['document', 'requestAnimationFrame', 'cancelAnimationFrame']) delete (globalThis as Record<string, unknown>)[k] })
beforeEach(() => { renders.length = 0; frames.length = 0 })

const kit = () => ({ kit: standInFarmAtlas(), page: new Texture() })
function stage(options: Partial<BandStageOptions> = {}): BandStage {
  const s = new BandStage({} as HTMLCanvasElement, { saver: true, ...options })
  s.resize(390, 844, 2)
  s.setWorld(SAMPLE_FARM, kit())
  return s
}
const figure = (id: string, x: number, z: number) => ({ id, tile: { x, z }, set: null, face: null })
/** Runs frames by hand until `done` or a cap, `dt` seconds apart. */
function run(s: BandStage, frames: number, dt = 1 / 30, done = () => false): void { for (let i = 0; i < frames && !done(); i++) s.step(dt) }
/** The same farm with one more cell turned to water (level 0): a tile no walk can cross. */
function flooded(x: number, z: number): FarmDesign {
  const at = (rows: readonly string[], c: string) => rows.map((r, i) => (i === z ? r.slice(0, x) + c + r.slice(x + 1) : r))
  return { ...SAMPLE_FARM, cells: at(SAMPLE_FARM.cells, 'w'), heights: at(SAMPLE_FARM.heights!, '0') }
}
/** The farm's front rows from `from` on, moved up to the top: a shorter farm with its gate. */
function front(from: number): FarmDesign {
  const up = <T extends { z: number }>(items: readonly T[]) => items.filter((i) => i.z >= from).map((i) => ({ ...i, z: i.z - from }))
  return { ...SAMPLE_FARM, cells: SAMPLE_FARM.cells.slice(from), heights: SAMPLE_FARM.heights!.slice(from),
    buildings: up(SAMPLE_FARM.buildings), props: up(SAMPLE_FARM.props ?? []), markers: up(SAMPLE_FARM.markers) }
}

describe('1. which figures count for the fade', () => {
  // Behind the Sawmill (x 3–5, z 4–5): its roof hides her, so it fades while she counts (ST3).
  const behind = () => { const s = stage({ fade: true }); s.setFadeMarkers([]); s.addFigure(figure('miller', 4, 2)); return s }

  it('fades the roof over a figure that counts: every figure, until a game says otherwise', () => {
    const s = behind()
    run(s, 10)
    expect(s.debug.faded).toContain('sawmill')
  })

  it("leaves the roof whole over a figure that doesn't count, by ids or by a test", () => {
    const byIds = behind()
    byIds.setFadeFigures(['someone-else'])
    run(byIds, 10)
    expect(byIds.debug.faded).toEqual([])
    const byTest = behind()
    byTest.setFadeFigures((f) => f.id !== 'miller' && !f.moving)
    run(byTest, 10)
    expect(byTest.debug.faded).toEqual([])
    // Counting her again fades it back.
    byTest.setFadeFigures((f) => f.id === 'miller')
    run(byTest, 10)
    expect(byTest.debug.faded).toContain('sawmill')
  })

  it("recompiles a part's materials when it starts or stops fading, so one drawn opaque first can fade", () => {
    const s = behind()
    s.setFadeFigures([])
    run(s, 10)
    const sawmill = (s as unknown as { world: { parts: Map<string, { group: import('three').Group }> } }).world.parts.get('sawmill')!.group
    const versions = () => { const v: number[] = []; sawmill.traverse((o) => { const m = (o as import('three').Mesh).material as import('three').Material | undefined; if (m) v.push(m.version) }); return v }
    const opaque = versions()
    s.setFadeFigures(['miller'])
    run(s, 10)
    expect(s.debug.faded).toContain('sawmill')
    const faded = versions()
    expect(faded.every((v, i) => v > opaque[i]!)).toBe(true)
    s.setFadeFigures([])
    run(s, 10)
    expect(versions().every((v, i) => v > faded[i]!)).toBe(true)
  })

  it('hands the test her id, her tile and whether she walks', () => {
    const s = behind(), seen: unknown[] = []
    s.setFadeFigures((f) => { seen.push(f); return true })
    s.step()
    expect(seen).toContainEqual({ id: 'miller', tile: { x: 4, z: 2 }, moving: false })
  })
})

describe('2. the camera on setWorld', () => {
  it('returns to the top by default, and stays where it was with keepCamera', () => {
    const s = stage()
    const { min, max } = s.bandCamera.range
    s.scrollTo(max, true)
    expect(s.bandCamera.centre).toBe(max)
    s.setWorld(SAMPLE_FARM, kit())
    expect(s.bandCamera.centre).toBe(min)
    s.scrollTo(max, true)
    s.setWorld(SAMPLE_FARM, kit(), { keepCamera: true })
    expect(s.bandCamera.centre).toBe(max)
  })

  it('holds a kept camera inside a shorter farm', () => {
    const s = stage()
    s.scrollTo(s.bandCamera.range.max, true)
    const before = s.bandCamera.centre
    s.setWorld(front(12), kit(), { keepCamera: true })
    expect(s.bandCamera.range.max).toBeLessThan(before)
    expect(s.bandCamera.centre).toBe(s.bandCamera.range.max)
  })
})

describe('3. walks across setWorld', () => {
  // Along the bottom path row (z 23), left to right.
  const walking = () => {
    const s = stage()
    s.addFigure(figure('walker', 0, 23))
    const arrived = s.walkTo('walker', { x: 8, z: 23 })
    let result: boolean | null = null
    void arrived.then((r) => { result = r })
    run(s, 12)
    return { s, result: () => result, x: () => s.debug.figures[0]!.x }
  }

  it('stops every walk on a rebuild by default, placing her on her tile', async () => {
    const w = walking(), x = w.x()
    w.s.setWorld(SAMPLE_FARM, kit())
    await Promise.resolve()
    expect(w.result()).toBe(false)
    expect(w.s.debug.figures[0]).toMatchObject({ x: Math.floor(x) + 0.5, moving: false })
  })

  it('keeps a walk whose tiles still stand, and she arrives', async () => {
    const w = walking(), x = w.x()
    w.s.setWorld(flooded(5, 10), kit(), { keepWalks: true })
    expect(w.s.debug.figures[0]!.x).toBe(x)
    run(w.s, 300, 1 / 30, () => w.result() !== null)
    await Promise.resolve()
    expect(w.result()).toBe(true)
    expect(w.s.debug.figures[0]).toMatchObject({ x: 8.5, z: 23.5 })
  })

  it("stops a walk whose path a rebuild cut, so the game can walk her again from where she stands", async () => {
    const w = walking(), x = w.x()
    w.s.setWorld(flooded(6, 23), kit(), { keepWalks: true })
    await Promise.resolve()
    expect(w.result()).toBe(false)
    expect(w.s.debug.figures[0]).toMatchObject({ x: Math.floor(x) + 0.5, moving: false })
  })
})

describe('4. coming to rest', () => {
  /** Drives the loop's animation frames, `ms` apart. */
  const tick = (now: number) => { const f = frames.shift(); f?.cb(now) }

  it('draws the frame it comes to rest on even when the pacer would skip it, then says so once', () => {
    const settled: number[] = []
    const s = stage({ onSettled: () => settled.push(renders.length) })
    s.start()
    let now = performance.now()
    for (let i = 0; i < 20; i++) tick((now += 5))
    expect(settled.length).toBe(1)
    // A glide: frames every 5 ms, so the 30 fps pacer skips most of them.
    s.scrollTo(s.bandCamera.range.max)
    const drawnAt: boolean[] = []
    for (let i = 0; i < 400 && settled.length < 2; i++) { const before = renders.length; tick((now += 5)); drawnAt.push(renders.length > before) }
    expect(settled.length).toBe(2)
    expect(drawnAt.at(-1)).toBe(true)
    expect(drawnAt.filter((d) => !d).length).toBeGreaterThan(0)
    expect(s.atRest).toBe(true)
    // At rest, nothing more is said until something changes.
    for (let i = 0; i < 20; i++) tick((now += 5))
    expect(settled.length).toBe(2)
    s.addFigure(figure('late', 4, 23))
    for (let i = 0; i < 20; i++) tick((now += 5))
    expect(settled.length).toBe(3)
    s.stop()
  })

  it('is no different without onSettled: the pacer alone decides', () => {
    const s = stage()
    s.start()
    let now = performance.now()
    s.scrollTo(s.bandCamera.range.max)
    let drawn = 0
    for (let i = 0; i < 300; i++) { const before = renders.length; tick((now += 5)); if (renders.length > before) drawn++ }
    // 1.5 s of 5 ms frames at 30 fps: about 45 drawn, never all 300.
    expect(drawn).toBeLessThan(60)
    s.stop()
  })

  it('draws once more on stop({ draw: true }), and not on a plain stop()', () => {
    const s = stage()
    s.start()
    const before = renders.length
    s.stop()
    expect(renders.length).toBe(before)
    s.start()
    s.stop({ draw: true })
    expect(renders.length).toBe(before + 1)
    expect(frames.length).toBe(0)
  })
})

describe('6. a one-off action on a figure (ST6)', () => {
  /** A stand-in set with a three-frame `nod`, 100 ms a frame. */
  const withNod = () => {
    const src = standInSet(0), idle = src.set.actions.idle!.frames[0]!
    src.set.actions.nod = { loop: false, events: {}, frames: [0, 4, 0].map((dy) => ({ ...idle, ms: 100, dy })) }
    return src
  }
  const settle = () => new Promise((r) => setTimeout(r, 0))
  /** A stage with a live sprite figure 'a' standing near the top, and a standee 'b'. */
  async function live(options: Partial<BandStageOptions> = {}) {
    const s = stage(options)
    s.addFigure({ id: 'a', tile: { x: 4, z: 3 }, set: 'nod-set', loadSet: async () => withNod(), face: null })
    s.addFigure(figure('b', 5, 3))
    s.step(); await settle(); s.step()
    expect(s.debug.figures.find((f) => f.id === 'a')!.sprite).toBe(true)
    return s
  }
  const fig = (s: BandStage, id = 'a') => s.debug.figures.find((f) => f.id === id)!
  /** Runs frames until the promise settles (or 5 s of frames). */
  async function until(s: BandStage, p: Promise<boolean>): Promise<boolean | null> {
    let out: boolean | null = null
    void p.then((r) => { out = r })
    for (let i = 0; i < 150 && out === null; i++) { s.step(1 / 30); await Promise.resolve() }
    return out
  }

  it('plays the action once, then she goes back to her stance and facing', async () => {
    const s = await live()
    const stance = fig(s).action
    const played = s.emote('a', 'nod')
    s.step(1 / 30)
    expect(fig(s)).toMatchObject({ action: 'nod', emote: 'nod' })
    expect(s.atRest).toBe(false)
    expect(await until(s, played)).toBe(true)
    expect(fig(s)).toMatchObject({ action: stance, emote: null })
  })

  it('plays one pass of a looping action', async () => {
    const s = await live()
    const p = s.emote('a', 'idle')
    let frames = 0, out: boolean | null = null
    void p.then((r) => { out = r })
    while (out === null && frames < 200) { s.step(1 / 30); frames++; await Promise.resolve() }
    expect(out).toBe(true)
    // Four 220 ms frames: one pass is about 27 frames at 30 fps.
    expect(frames).toBeGreaterThanOrEqual(26)
    expect(frames).toBeLessThan(32)
  })

  it('plays nothing (false) for a standee, a set not live yet, an action she lacks, a walking figure or an unknown id', async () => {
    const s = await live()
    expect(await s.emote('b', 'nod')).toBe(false)
    expect(await s.emote('nobody', 'nod')).toBe(false)
    expect(await s.emote('a', 'dance')).toBe(false)
    void s.walkTo('a', { x: 4, z: 7 })
    s.step()
    expect(await s.emote('a', 'nod')).toBe(false)
    const fresh = stage()
    fresh.addFigure({ id: 'c', tile: { x: 4, z: 3 }, set: 'nod-set', loadSet: async () => withNod(), face: null })
    expect(await fresh.emote('c', 'nod')).toBe(false)
  })

  it('is cut short (false) by a walk, a placing, a removal, a new set, a rebuild, or another emote', async () => {
    const cuts: [string, (s: BandStage) => void][] = [
      ['walkTo', (s) => void s.walkTo('a', { x: 4, z: 7 })],
      ['placeFigure', (s) => s.placeFigure('a', { x: 4, z: 3 })],
      ['removeFigure', (s) => s.removeFigure('a')],
      ['setFigureSet', (s) => s.setFigureSet('a', 'another-set')],
      ['setWorld', (s) => s.setWorld(SAMPLE_FARM, kit())],
      ['emote', (s) => void s.emote('a', 'nod')],
    ]
    for (const [name, cut] of cuts) {
      const s = await live()
      let out: boolean | null = null
      void s.emote('a', 'nod').then((r) => { out = r })
      s.step(1 / 30)
      cut(s)
      await Promise.resolve()
      expect([name, out]).toEqual([name, false])
    }
  })

  it('carries on through a rebuild that keeps walks while her tile stands', async () => {
    const s = await live()
    const p = s.emote('a', 'nod')
    s.step(1 / 30)
    s.setWorld(flooded(0, 23), kit(), { keepWalks: true })
    expect(fig(s).emote).toBe('nod')
    expect(await until(s, p)).toBe(true)
  })

  it('counts as motion: the stage comes to rest only after it, on a frame showing her stance', async () => {
    let settled = 0, actionAtRest: string | null = null, held: BandStage | null = null
    const s = await live({ onSettled: () => { settled++; actionAtRest = held ? fig(held).action : null } })
    held = s
    run(s, 5)
    const before = settled, stance = fig(s).action
    const p = s.emote('a', 'nod')
    s.step(1 / 30)
    expect(settled).toBe(before)
    expect(await until(s, p)).toBe(true)
    s.step(1 / 30)
    expect(settled).toBe(before + 1)
    expect(actionAtRest).toBe(stance)
    expect(s.atRest).toBe(true)
  })
})
