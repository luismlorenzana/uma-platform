// uma-quest's Q32 and Q33 (P147): four town kits by the Warrior kit's frames and four biome kits by the forest kit's
// roles. Each shipped atlas is the code's, passes uma-stage's parser with nothing missing, keeps its template's names,
// sizes, feet and blocking, tiles where it must, keeps props clear of their edges, and stays under 3 MB a page; every
// uma-art file published before is unchanged.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kitMissing, parseKitAtlas } from '@luismlorenzana/uma-stage/formats'
import { describe, expect, it } from 'vitest'
import { pack, type Atlas } from './atlas.js'
import { DECORATIONS } from './biome/spec.js'
import { drawWave, type DrawnFrame } from './farm/index.js'
import { KITS } from './kits.js'
import { decodePng } from './png.js'
import legacy from './testing/legacy-2.27.0.json'

const ART = fileURLToPath(new URL('../../../packages/art/', import.meta.url))
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')
const read = (id: string) => JSON.parse(readFileSync(join(ART, id, 'atlas.json'), 'utf8')) as Atlas
const NEW = KITS.filter((k) => k.id !== 'kit-farm')
const drawn = new Map(NEW.map((k) => [k.id, drawWave(k.specs, k.drawers)]))
const column = (w: number, h: number, x: number) => Array.from({ length: h }, (_, y) => y * w + x)
const row = (w: number, y: number) => Array.from({ length: w }, (_, x) => y * w + x)
function diff(a: Uint8Array, ai: number[], b: Uint8Array, bi: number[]): number {
  let s = 0
  for (let k = 0; k < ai.length; k++) for (let c = 0; c < 3; c++) s += Math.abs(a[ai[k]! * 4 + c]! - b[bi[k]! * 4 + c]!)
  return s / (ai.length * 3)
}
/** Whether two frames meet across a seam no worse than the frame's own joints. */
function meets(A: DrawnFrame, B: DrawnFrame, axis: 'x' | 'y'): { seam: number; limit: number } {
  const { w, h } = A.spec, a = A.canvas.rgba8(), b = B.canvas.rgba8()
  // The seam may differ as much as the frame's own neighbouring lines do: near its edges (what meets) and at its quarters.
  const n = axis === 'x' ? w : h, joints = [1, Math.floor(n / 4) - 1, Math.floor(n / 2) - 1, Math.floor((3 * n) / 4) - 1, n - 3]
  const line = (k: number) => (axis === 'x' ? column(w, h, k) : row(w, k))
  const inner = Math.max(...joints.map((k) => diff(a, line(k), a, line(k + 1))))
  return { seam: diff(a, line(n - 1), b, line(0)), limit: inner * 1.5 + 8 }
}

describe.each(NEW.map((k) => [k.id, k] as const))('%s (Q32, Q33)', (id, kit) => {
  const frames = drawn.get(id)!, { atlas, rgba } = pack(id, frames, kit.kind), shipped = read(id)

  it("is the code's: the shipped atlas.json and every pixel of atlas.png", () => {
    expect(shipped).toEqual(atlas)
    const png = readFileSync(join(ART, id, 'atlas.png')), { w, h, px } = decodePng(png)
    expect([w, h]).toEqual([2048, 2048])
    expect(sha(px)).toBe(sha(rgba))
    expect(png.length).toBeLessThan(3_000_000)
  }, 60_000)

  it("passes uma-stage's parser with nothing missing", () => {
    const parsed = parseKitAtlas(structuredClone(shipped))
    expect(parsed.kind).toBe(kit.kind)
    expect(kitMissing(parsed)).toEqual([])
  })

  it("keeps its template's names, roles, sizes, feet and blocking", () => {
    const template = read(kit.kind === 'town' ? 'kit-town-warrior' : 'kit-forest')
    const names = kit.kind === 'town' ? Object.keys(template.frames)
      : Object.keys(template.frames).filter((n) => !['tree-1', 'tree-2', 'tree-3', 'rock-1', 'rock-2', 'rock-3', 'bush-1', 'bush-2', 'stump', 'fallen-log', 'mushrooms', 'flowers', 'grass'].includes(n))
    for (const name of names) {
      const t = template.frames[name]!, f = shipped.frames[name]
      expect(f, name).toBeDefined()
      expect({ role: f!.role, w: f!.w, h: f!.h, foot: f!.foot, blocks: f!.blocks, weight: f!.weight }, name).toEqual({ role: t.role, w: t.w, h: t.h, foot: t.foot, blocks: t.blocks, weight: t.weight })
      if (t.light) expect(f!.light?.radius, name).toBe(t.light.radius)
    }
    if (kit.kind === 'town') expect(Object.keys(shipped.frames).sort()).toEqual(names.sort())
    else for (const d of DECORATIONS[id.slice(4) as keyof typeof DECORATIONS]) expect(shipped.frames[d.name], d.name).toMatchObject({ role: 'prop', w: d.w, h: d.h })
  })

  it('tiles where it must: floors and roofs both ways, walls, risers, stairs and the fight strips across', { timeout: 60_000 }, () => {
    const by = (re: RegExp) => frames.filter((f) => re.test(f.spec.name))
    const groups: [DrawnFrame[], ('x' | 'y')[]][] = [
      [by(/^floor-\d$/), ['x', 'y']], [by(/^wall-\d$/), ['x']], [by(/^wall-top$/), ['x', 'y']], [by(/^riser-\d$/), ['x']], [by(/^stairs$/), ['x']],
      [by(/^(building-wall|window)-\d$/), ['x']], [by(/^roof-\d$/), ['x', 'y']], [by(/^void$/), ['x', 'y']], [by(/^battle-(ground|back)$/), ['x']],
    ]
    const bad: string[] = []
    for (const [group, axes] of groups) for (const a of group) for (const b of group) {
      if (a.spec.w !== b.spec.w || a.spec.h !== b.spec.h) continue
      for (const axis of axes) { const m = meets(a, b, axis); if (m.seam > m.limit) bad.push(`${a.spec.name} ${axis} ${b.spec.name}: ${m.seam.toFixed(1)} > ${m.limit.toFixed(1)}`) }
    }
    expect(bad).toEqual([])
  })

  it('keeps every prop, sign and fight piece clear of its frame edge, standing on its foot', { timeout: 60_000 }, () => {
    const bad: string[] = []
    for (const f of frames) {
      if (!['prop', 'sign', 'battle-mid'].includes(f.spec.role)) continue
      const p = f.canvas.rgba8(), { w, h } = f.spec
      const touching = [...row(w, 0), ...row(w, h - 1), ...column(w, h, 0), ...column(w, h, w - 1)].filter((i) => p[i * 4 + 3] !== 0).length
      if (touching) bad.push(`${f.spec.name}: ${touching} on its edge`)
      if (f.spec.role === 'prop') {
        let lowest = 0
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (p[(y * w + x) * 4 + 3]! > 128) lowest = y
        if (lowest < f.spec.foot!.y - 10) bad.push(`${f.spec.name}: stands above its foot (${lowest} < ${f.spec.foot!.y})`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('uma-art 2.27.0 (Q32, Q33)', () => {
  it('leaves every file published before byte-identical, kit-farm included', () => {
    // The cabin families came after 2.27.0 and are frozen by scripts/pixel-art's cabins.test.ts (CY14).
    const now: Record<string, string> = {}, skip = new Set([...NEW.map((k) => k.id), 'cabin-icons', 'cabin-room', 'node_modules'])
    const walk = (d: string) => {
      for (const f of readdirSync(d).sort()) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) { if (!skip.has(f)) walk(p) }
        else if (/\.(png|json)$/.test(f) && f !== 'package.json') now[relative(ART, p)] = sha(readFileSync(p))
      }
    }
    walk(ART)
    expect(now).toEqual(legacy)
  })
})
