import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ICON, ICON_COLUMNS, ROOM_SIZE, draw, mountOf, packIcons, packRoom, type Drawn } from './cabins/atlas.ts'
import { DECOR_COLORS, DECOR_STYLES, FURNITURE, GIFTS, ITEMS, KEEPSAKES, LINE_SLOTS, type Furniture } from './cabins/items.ts'
import { toHsl } from './cabins/kit.ts'
import { decodePng, hash, savedAtlas } from './testing/atlas.ts'
import type { Img } from './tiles/image.ts'

const root = new URL('../../../', import.meta.url)
const icons = packIcons(), room = packRoom()
const silhouette = (img: Img) => Array.from({ length: img.w * img.h }, (_, i) => img.px[i * 4 + 3] === 255)
const apart = (a: Img, b: Img) => {
  const x = silhouette(a), y = silhouette(b)
  return x.filter((v, i) => v !== y[i]).length / x.filter((v, i) => v || y[i]).length
}
const pairs = <T>(list: readonly T[]) => list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b] as const))
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

/** Opaque pixels in the accent's colour family: its hue, saturated, near its lightness. */
function accentPixels(img: Img, accent: string): number {
  const [ah, , al] = toHsl(accent)
  let n = 0
  for (let i = 0; i < img.w * img.h; i++) {
    if (img.px[i * 4 + 3]! < 200) continue
    const c = `#${[0, 1, 2].map((k) => img.px[i * 4 + k]!.toString(16).padStart(2, '0')).join('')}`
    const [h, s, l] = toHsl(c)
    if (hueGap(h, ah) <= 15 && s >= .35 && Math.abs(l - al) <= .22) n++
  }
  return n
}

describe('CY14: the cabins\' furniture, keepsakes and gifts (uma-cyberpunk, P164)', () => {
  it('copies the game\'s item table: 30 furniture in six lines, six keepsakes, twelve gifts, unique ids', () => {
    expect(FURNITURE).toHaveLength(30)
    expect(KEEPSAKES).toHaveLength(6)
    expect(GIFTS).toHaveLength(12)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(48)
    for (const style of DECOR_STYLES) expect(FURNITURE.filter((f) => f.style === style).map((f) => f.slot)).toEqual([...LINE_SLOTS])
    expect(FURNITURE.map((f) => f.id)).toEqual(DECOR_STYLES.flatMap((s) => LINE_SLOTS.map((slot) => `${s}-${slot}`)))
  })

  it('packs every item once at 64 px, eight across in the item table\'s order, with its fields', () => {
    const saved = savedAtlas('cabin-icons')
    expect([saved.index.width, saved.index.height]).toEqual([512, 384])
    expect(Object.keys(saved.index.frames)).toEqual(ITEMS.map((i) => i.id))
    ITEMS.forEach((item, i) => {
      const f = saved.index.frames[item.id]!
      expect({ x: f.x, y: f.y, w: f.w, h: f.h }, item.id).toEqual({ x: (i % ICON_COLUMNS) * ICON, y: Math.floor(i / ICON_COLUMNS) * ICON, w: ICON, h: ICON })
      expect(f.name).toBe(item.name)
      expect(f.kind).toBe(item.kind)
      if (item.kind === 'furniture') expect([f.slot, f.style]).toEqual([item.slot, item.style])
      else if (item.kind === 'keepsake') expect([f.slot, f.style, f.gift]).toEqual(['keepsake', undefined, undefined])
      else expect([f.gift, f.slot]).toEqual([item.gift, undefined])
    })
    expect(saved.index.frames).toEqual(JSON.parse(JSON.stringify(icons.frames)))
    expect(hash(saved.img.px)).toBe(hash(icons.atlas.px))
  })

  it('packs the 30 furniture pieces once at room size, one row per slot, with mount and foot', () => {
    const saved = savedAtlas('cabin-room')
    expect([saved.index.width, saved.index.height]).toEqual([900, 642])
    expect(Object.keys(saved.index.frames).sort()).toEqual(FURNITURE.map((f) => f.id).sort())
    const tops = { bed: 0, desk: 150, floor: 300, wall: 450, light: 546 }
    for (const f of FURNITURE) {
      const fr = saved.index.frames[f.id]!, n = ROOM_SIZE[f.slot]
      expect({ x: fr.x, y: fr.y, w: fr.w, h: fr.h }, f.id).toEqual({ x: DECOR_STYLES.indexOf(f.style) * n, y: tops[f.slot], w: n, h: n })
      expect([fr.name, fr.slot, fr.style, fr.mount]).toEqual([f.name, f.slot, f.style, mountOf(f)])
    }
    expect(FURNITURE.filter((f) => mountOf(f) === 'ceiling').map((f) => f.id)).toEqual(['neon-light', 'cozy-light', 'sporty-light', 'tech-light', 'wild-light'])
    expect(saved.index.frames).toEqual(JSON.parse(JSON.stringify(room.frames)))
    expect(hash(saved.img.px)).toBe(hash(room.atlas.px))
  })

  it('draws the same pixels every time, at both sizes', () => {
    for (const item of [FURNITURE[0]!, FURNITURE[17]!, FURNITURE[29]!, KEEPSAKES[2]!, GIFTS[9]!]) {
      expect(hash(draw(item, ICON).img.px), item.id).toBe(hash(icons.drawn.get(item.id)!.img.px))
      if (item.kind === 'furniture') expect(hash(draw(item, ROOM_SIZE[item.slot]).img.px), item.id).toBe(hash(room.drawn.get(item.id)!.img.px))
    }
    expect(hash(packIcons().atlas.px)).toBe(hash(icons.atlas.px))
    expect(hash(packRoom().atlas.px)).toBe(hash(room.atlas.px))
  })

  it('keeps every piece, its outline, halo, shadow and light clear of its cell\'s edge', () => {
    const check = (id: string, img: Img) => {
      for (let k = 0; k < img.w; k++) for (const [x, y] of [[k, 0], [k, img.h - 1], [0, k], [img.w - 1, k]] as const) expect(img.get(x, y)[3], `${id} at ${x},${y}`).toBe(0)
    }
    for (const [id, d] of icons.drawn) check(`icon ${id}`, d.img)
    for (const [id, d] of room.drawn) check(`room ${id}`, d.img)
  })

  it('carries each style\'s accent in every furniture piece, at both sizes, with real shading', () => {
    for (const f of FURNITURE) {
      const accent = DECOR_COLORS[f.style][1]
      expect(accentPixels(icons.drawn.get(f.id)!.img, accent), `${f.id} icon`).toBeGreaterThanOrEqual(6)
      expect(accentPixels(room.drawn.get(f.id)!.img, accent), `${f.id} room`).toBeGreaterThanOrEqual(20)
    }
    for (const [id, d] of icons.drawn) {
      const colors = new Set<string>()
      for (let i = 0; i < ICON * ICON; i++) if (d.img.px[i * 4 + 3] === 255) colors.add(d.img.px.subarray(i * 4, i * 4 + 3).join())
      expect(colors.size, id).toBeGreaterThanOrEqual(8)
    }
  })

  it('gives every piece its own silhouette: within each slot, within each line, among keepsakes and gifts', () => {
    const icon = (id: string) => icons.drawn.get(id)!.img
    for (const slot of LINE_SLOTS) {
      const list = FURNITURE.filter((f) => f.slot === slot)
      for (const [a, b] of pairs(list)) {
        expect(apart(icon(a.id), icon(b.id)), `${a.id}/${b.id} icons`).toBeGreaterThanOrEqual(.25)
        expect(apart(room.drawn.get(a.id)!.img, room.drawn.get(b.id)!.img), `${a.id}/${b.id} room`).toBeGreaterThanOrEqual(.25)
      }
    }
    for (const style of DECOR_STYLES) for (const [a, b] of pairs(FURNITURE.filter((f) => f.style === style))) expect(apart(icon(a.id), icon(b.id)), `${a.id}/${b.id}`).toBeGreaterThanOrEqual(.25)
    for (const list of [KEEPSAKES.map((k) => k.id), GIFTS.map((g) => g.id)]) for (const [a, b] of pairs(list)) expect(apart(icon(a), icon(b)), `${a}/${b}`).toBeGreaterThanOrEqual(.25)
  })

  it('puts each room piece\'s foot inside its cell, on its lowest solid row; a rug\'s foot is its whole cell', () => {
    const solidBelow = (d: Drawn, y: number) => { const n = d.img.w; for (let i = (y + 1) * n; i < n * n; i++) if (d.filled[i]) return true; return false }
    const solidIn = (d: Drawn, y: number, x0: number, x1: number) => { for (let x = x0; x <= x1; x++) if (d.filled[y * d.img.w + x]) return true; return false }
    const lowRows = (d: Drawn, y: number, x: number) => d.filled[y * d.img.w + x] === 1 || d.filled[(y - 1) * d.img.w + x] === 1
    for (const f of FURNITURE as readonly Furniture[]) {
      const fr = room.frames[f.id]!, d = room.drawn.get(f.id)!, n = ROOM_SIZE[f.slot], { x, y, w } = fr.foot
      expect(x >= 0 && w >= 1 && x + w <= n && y >= 0 && y < n, `${f.id} foot ${x},${y},${w}`).toBe(true)
      if (f.slot === 'floor') expect(fr.foot, f.id).toEqual({ x: 0, y: n - 1, w: n })
      else {
        expect(solidBelow(d, y), `${f.id}: solid below its foot`).toBe(false)
        // The foot row holds solid pixels, and the span's ends are solid in the two lowest rows.
        expect(solidIn(d, y, x, x + w - 1) && lowRows(d, y, x) && lowRows(d, y, x + w - 1), `${f.id}: foot row`).toBe(true)
      }
      // A standing piece meets the floor near its cell's bottom, leaving room for its shadow.
      if (f.slot === 'bed' || f.slot === 'desk') expect(y, f.id).toBeGreaterThan(n * .85)
    }
  })

  it('exports both families from uma-art', () => {
    const pkg = JSON.parse(readFileSync(new URL('packages/art/package.json', root), 'utf8')) as { exports: Record<string, string>; files: string[] }
    for (const family of ['cabin-icons', 'cabin-room']) {
      for (const file of ['atlas.png', 'atlas.json']) expect(pkg.exports[`./${family}/${file}`]).toBe(`./${family}/${file}`)
      expect(pkg.files).toContain(family)
    }
  })

  it('writes the contact sheets, the room sheets, six mock cabins and a review page naming every piece', () => {
    const size = (name: string) => { const img = decodePng(readFileSync(new URL(`assets/previews/${name}`, root))); return [img.w, img.h] }
    for (const scale of [1, 2, 4]) for (const ground of ['night', 'light']) expect(size(`cabin-icons-${ground}-${scale}x.png`)).toEqual([6 * (64 * scale + 8) + 8, 9 * (64 * scale + 8) + 8])
    for (const scale of [1, 2]) expect(size(`cabin-room-${scale}x.png`)).toEqual([(3 * 150 + 2 * 96) * scale + 6 * 8, 6 * (150 * scale + 8) + 8])
    for (const style of DECOR_STYLES) expect(size(`cabin-diorama-${style}.png`)).toEqual([640, 360])
    const html = readFileSync(new URL('assets/previews/cabins.html', root), 'utf8')
    for (const item of ITEMS) {
      expect(html, item.id).toContain(`<code>${item.id}</code>`)
      expect(html, item.name).toContain(item.name)
    }
    expect(existsSync(new URL('assets/previews/cabin-icons-night-4x.png', root))).toBe(true)
  })
})
