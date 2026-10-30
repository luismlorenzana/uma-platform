import { describe, expect, it } from 'vitest'
import { hex } from './color.ts'
import { ARM_COLORS, ELEMENTS } from './gear/symbols.ts'
import { Sprite } from './sprite.ts'
import { hash, savedAtlas } from './testing/atlas.ts'
import baseline from './testing/legacy-h138-2.17.0.json'
import { Img } from './tiles/image.ts'
import { uiFrames } from './ui/atlas.ts'
import { classEmblem } from './ui/classes.ts'
import { CLASS_LABELS } from './ui/classes-v3-preview.ts'
import { TIER0, type Class } from './ui/spec.ts'

const sprite = (key: Class) => { const s = new Sprite(24, 24); classEmblem(s, key); return s }
const signature = (img: Img) => Array.from({ length: 576 }, (_, i) => img.px[i * 4 + 3] === 255 ? '1' : '0').join('')
function coloredPixels(s: Sprite, color: string, [left, top, right, bottom]: readonly [number, number, number, number]) {
  const id = s.ramps.findIndex(tones => tones[3]!.join() === hex(color).join())
  if (id < 0) return 0
  return Array.from(s.mat).filter((value, i) => value === id && i % 24 >= left && i % 24 < right && Math.floor(i / 24) >= top && Math.floor(i / 24) < bottom).length
}

describe('H138 base classes, the five family emblems', () => {
  it('redraws exactly the five authorised cells and freezes all metadata and every other pixel from 2.17.0', () => {
    const { index, img } = savedAtlas('ui'), changed: string[] = []
    expect([index.width, index.height, Object.keys(index.frames).length]).toEqual([120, 164, 45])
    expect(Object.keys(index.frames)).toEqual(Object.keys(baseline.ui.frames))
    for (const [id, { rgba, ...record }] of Object.entries(baseline.ui.frames)) {
      expect(index.frames[id], id).toEqual(record)
      if (hash(img.crop(record.x, record.y, record.w, record.h).px) !== rgba) changed.push(id)
    }
    expect(changed).toEqual(TIER0.map(key => `class/${key}`))
    // Includes all gaps and empty cells, beyond the forty individually frozen frame cutouts.
    expect(hash(img.crop(0, 0, 120, 140).px)).toBe(baseline.ui.preservedRgba)
  })

  it('keeps five distinct native silhouettes beside their promotions, clear corners, shadow and family names', () => {
    const classes = uiFrames().filter(f => f.group === 'class')
    for (const key of TIER0) {
      const s = sprite(key), a = classes.find(f => f.key === key)!.img
      expect(s.shadow?.alpha, key).toBe(62)
      expect(hash(a.px), key).toBe(hash(sprite(key).render()))
      for (const [x, y] of [[0, 0], [23, 0], [0, 23], [23, 23]] as const) expect(a.get(x, y)[3], key).toBe(0)
      for (const b of classes.filter(f => f.key !== key)) expect(signature(a), `${key}/${b.key}`).not.toBe(signature(b.img))
    }
    expect(TIER0.map(key => CLASS_LABELS[key])).toEqual(['Warrior', 'Spellblade', 'Healer', 'Summoner', 'Mage'])
  })

  it('carries the shared familiar intact above the open tome, with the same pale body and two eyes', () => {
    const base = sprite('caller'), promoted = sprite('summoner')
    const a = new Img(24, 24, base.render()), b = new Img(24, 24, promoted.render())
    for (let y = 0; y < 13; y++) for (let x = 0; x < 24; x++) {
      expect(base.filled(x, y), `${x},${y}`).toBe(promoted.filled(x, y))
      if (base.filled(x, y)) expect(a.get(x, y)).toEqual(b.get(x, y))
    }
    // Open pages spread on both sides of the spirit, rather than the promotion's low rune ellipse.
    for (const x of [5, 18]) expect(base.filled(x, 15)).toBe(true)
    expect(promoted.filled(5, 15)).toBe(false)
    expect(base.filled(12, 4)).toBe(true)
  })

  it('places the three coloured weapons and three elements in their respective fans and triangle', () => {
    const warrior = sprite('recruit'), mage = sprite('apprentice')
    for (const [arm, box] of [
      ['axe', [0, 0, 10, 13]], ['greatsword', [10, 0, 15, 15]], ['lance', [17, 0, 24, 12]],
    ] as const) expect(coloredPixels(warrior, ARM_COLORS[arm].color, box), arm).toBeGreaterThan(3)
    for (const [element, box] of [
      ['fire', [8, 0, 16, 9]], ['ice', [1, 12, 11, 22]], ['lightning', [14, 12, 23, 22]],
    ] as const) expect(coloredPixels(mage, ELEMENTS[element].color, box), element).toBeGreaterThan(3)
  })

  it('pairs the upright blade with a violet guard and pale familiar, and a rose heart with a gold halo', () => {
    const blade = sprite('duelist'), healer = sprite('acolyte')
    expect(coloredPixels(blade, '#cadde8', [7, 2, 11, 17])).toBeGreaterThan(20)
    expect(coloredPixels(blade, '#a28ac8', [5, 12, 15, 18])).toBeGreaterThan(5)
    expect(coloredPixels(blade, '#b6d2ea', [12, 3, 21, 14])).toBeGreaterThan(10)
    expect(coloredPixels(healer, '#f0c8d8', [3, 8, 21, 22])).toBeGreaterThan(80)
    expect(coloredPixels(healer, '#d9b96b', [6, 1, 18, 8])).toBeGreaterThan(5)
    // Two lobes, a cleft and a narrow point: a heart rather than the retired shield or cross.
    expect(healer.filled(7, 8)).toBe(true); expect(healer.filled(16, 8)).toBe(true)
    expect(healer.filled(12, 8)).toBe(false)
    expect(healer.filled(11, 20)).toBe(true); expect(healer.filled(6, 20)).toBe(false)
    expect(healer.filled(11, 4)).toBe(false)
  })
})
