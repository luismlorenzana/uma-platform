import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GLINTS, drawIcon } from '../icon.ts'
import { encodePng } from '../png.ts'
import { Sprite } from '../sprite.ts'
import { decodePng, hash, savedAtlas } from '../testing/atlas.ts'
import baseline from './legacy-h73-2.12.0.json'
import { ACCESSORY_SETTINGS, ARMOR_FITTINGS, BRANCH_GEM, WEAPON_GEMS } from './made.ts'
import { MADE_PREVIEW_SCALES, madeComparisonIcons, madePreview } from './made-previews.ts'
import { TONICS } from './tonics.ts'
import type { ItemIcon } from './types.ts'

const root = new URL('../../../../', import.meta.url)
const rows = [
  { line: 'weapon-gem', y: 1088, icons: WEAPON_GEMS },
  { line: 'armor-fittings', y: 1120, icons: ARMOR_FITTINGS },
  { line: 'accessory-setting', y: 1152, icons: ACCESSORY_SETTINGS },
] as const
const all = [...WEAPON_GEMS, ...ARMOR_FITTINGS, ...ACCESSORY_SETTINGS, BRANCH_GEM]
const expectedIds = [...rows.flatMap(row => row.icons.map(icon => icon.id)), BRANCH_GEM.id]
const structure = (item: ItemIcon) => {
  const s = new Sprite()
  item.paint(s)
  return hash(JSON.stringify({ filled: [...s.mat].map(value => value < 0 ? 0 : 1), tone: [...s.tone] }))
}
const alpha = (px: Uint8Array) => Uint8Array.from(px.filter((_, index) => index % 4 === 3), value => value === 0 ? 0 : 1)
const silhouetteDifference = (a: Uint8Array, b: Uint8Array) => {
  const union = a.reduce((count, value, index) => count + (value || b[index] ? 1 : 0), 0)
  const differ = a.reduce((count, value, index) => count + (value === b[index] ? 0 : 1), 0)
  return differ / union
}

describe('H73 appended made items', () => {
  it('freezes every 2.12.0 frame, metadata field and RGBA pixel before the append point', () => {
    const { img, index } = savedAtlas('items')
    const retained = Object.fromEntries(Object.entries(index.frames).slice(0, baseline.frames))
    expect(Object.keys(retained)).toHaveLength(baseline.frames)
    expect(hash(JSON.stringify(retained))).toBe(baseline.metadata)
    expect(hash(img.crop(0, 0, baseline.width, baseline.height).px)).toBe(baseline.rgba)
    expect([index.width, index.height, index.cell]).toEqual([320, 1216, 32])
    expect(Object.keys(index.frames)).toHaveLength(362)
  })

  it('appends the four rows at exact positions and in exact atlas order', () => {
    const { index } = savedAtlas('items')
    expect(Object.keys(index.frames).slice(baseline.frames)).toEqual(expectedIds)
    for (const row of rows) row.icons.forEach((icon, col) => expect(index.frames[icon.id]).toEqual({
      x: col * 32, y: row.y, w: 32, h: 32, name: icon.name, kind: 'made', line: row.line, grade: col + 1,
    }))
    expect(index.frames[BRANCH_GEM.id]).toEqual({ x: 0, y: 1184, w: 32, h: 32, name: 'Branch Gem', kind: 'made', line: 'branch-gem', grade: 5 })
  })

  it('matches deterministic painters, atlas cells and every standalone PNG', () => {
    const { img, index } = savedAtlas('items')
    for (const icon of all) {
      const frame = index.frames[icon.id]!, a = drawIcon(icon), b = drawIcon(icon)
      expect(hash(a), icon.id).toBe(hash(b))
      expect(encodePng(32, 32, a).equals(encodePng(32, 32, b)), icon.id).toBe(true)
      expect(hash(img.crop(frame.x, frame.y, 32, 32).px), icon.id).toBe(hash(a))
      const standalone = decodePng(readFileSync(new URL(`assets/items/made/${icon.id}.png`, root)))
      expect([standalone.w, standalone.h], icon.id).toEqual([32, 32])
      expect(hash(standalone.px), icon.id).toBe(hash(a))
    }
  })

  it('keeps the border and complete bottom-right accent corner transparent', () => {
    for (const icon of all) {
      const px = drawIcon(icon)
      for (let i = 0; i < 32; i++) for (const [x, y] of [[i, 0], [0, i], [31, i], [i, 31]] as const)
        expect(px[(y * 32 + x) * 4 + 3], `${icon.id} border ${x},${y}`).toBe(0)
      for (let y = 23; y < 32; y++) for (let x = 23; x < 32; x++)
        expect(px[(y * 32 + x) * 4 + 3], `${icon.id} accent ${x},${y}`).toBe(0)
    }
  })

  it('has ten structural grades in each line independent of colour, with clear G9–10 glints', () => {
    for (const row of rows) {
      expect(new Set(row.icons.map(structure)), row.line).toHaveLength(10)
      for (const icon of row.icons) {
        const s = new Sprite(); icon.paint(s)
        const px = drawIcon(icon)
        if (icon.grade >= 9) for (const [gx, gy, size] of GLINTS) {
          expect([...px.subarray((gy * 32 + gx) * 4, (gy * 32 + gx + 1) * 4)], icon.id).toEqual([255, 255, 255, 255])
          for (let k = -size; k <= size; k++) for (const [x, y] of [[gx + k, gy], [gx, gy + k]] as const)
            expect(s.filled(x, y) || s.filled(x - 1, y) || s.filled(x + 1, y) || s.filled(x, y - 1) || s.filled(x, y + 1), `${icon.id} glint ${x},${y}`).toBe(false)
        } else for (const [gx, gy] of GLINTS) expect(px[(gy * 32 + gx) * 4 + 3], icon.id).toBe(0)
      }
    }
  })

  it('keeps G5 slot silhouettes distinct from one another and familiar icon families', () => {
    const made = [WEAPON_GEMS[4]!, ARMOR_FITTINGS[4]!, ACCESSORY_SETTINGS[4]!].map(icon => ({ name: icon.id, mask: alpha(drawIcon(icon)) }))
    const references = [...madeComparisonIcons().map(icon => ({ name: icon.name, mask: alpha(icon.px) })),
      { name: TONICS[4]!.id, mask: alpha(drawIcon(TONICS[4]!)) }]
    for (const [i, icon] of made.entries()) {
      for (const other of made.slice(i + 1)) expect(silhouetteDifference(icon.mask, other.mask), `${icon.name} vs ${other.name}`).toBeGreaterThanOrEqual(.25)
      for (const other of references) expect(silhouetteDifference(icon.mask, other.mask), `${icon.name} vs ${other.name}`).toBeGreaterThanOrEqual(.25)
    }
    const branch = alpha(drawIcon(BRANCH_GEM))
    for (const icon of made) expect(silhouetteDifference(branch, icon.mask), `branch-gem vs ${icon.name}`).toBeGreaterThanOrEqual(.25)
  })

  it.each(MADE_PREVIEW_SCALES)('reproduces the %i× white/dark review sheet', (scale) => {
    const preview = madePreview(scale)
    const saved = decodePng(readFileSync(new URL(`assets/previews/made-items-${scale}x.png`, root)))
    expect(hash(preview.px)).toBe(hash(saved.px))
    expect([preview.w, preview.h]).toEqual([10 * (32 * scale + 8) + 8, 10 * (32 * scale + 8) + 8])
    expect(preview.get(8, 8)).toEqual([255, 255, 255, 255])
    expect(preview.get(8, 8 + (32 * scale + 8))).toEqual([23, 32, 43, 255])
  })
})

