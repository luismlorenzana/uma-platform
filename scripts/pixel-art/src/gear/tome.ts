// The summoner tome (refined Fibers): a thick book standing face on, its cloth cover in the grade's cloth, the page
// block showing on the top and the fore-edge. A summoning sigil on the cover grows from a blind-stamped ring to a gilded
// circle with a stone, glowing on legendary grades; corners, bands and a clasp arrive on the way.
import { hex } from '../color.ts'
import { bloom } from '../items/refined/workbench-kit.ts'
import type { Sprite } from '../sprite.ts'
import { gemOf, glowPixels, jewel, legendaryHalo } from './fittings.ts'
import { BRONZE, CLOTHS, GOLD, METALS, use, type Material } from './materials.ts'

export const clothOf = (g: number): Material => CLOTHS[g - 1] ?? (CLOTHS[0] as Material)

/** Metal for corners, sigils and clasps. */
const TOME_METAL: Material[] = [BRONZE, BRONZE, BRONZE, BRONZE, METALS[4] as Material, GOLD, GOLD, GOLD, METALS[3] as Material, GOLD]

const X0 = 8, X1 = 21, Y0 = 9, Y1 = 26, DEPTH = 4

export function summonerTome(s: Sprite, g: number): void {
  s.shadow = { cx: 16, cy: 27.4, rx: 10, ry: 2, alpha: 80 }
  const m = clothOf(g)
  const cloth = use(s, m)
  const pages = use(s, g >= 9 ? '#f4efe2' : '#ece2c6', { lift: 0.4, drop: 0.22 })
  const metal = use(s, TOME_METAL[g - 1] ?? BRONZE)
  // Top of the book: back board, page block, front board.
  for (let k = 1; k <= DEPTH; k++) {
    const y = Y0 - k
    for (let x = X0 + k; x <= X1 + k; x++) {
      const board = k === 1 || k === DEPTH
      if (board || x === X1 + k) s.paint(x, y, cloth, k === DEPTH ? 3 : x === X1 + k ? 2 : 4)
      else s.paint(x, y, pages, x === X0 + k ? 3 : 4)
    }
  }
  // Fore-edge: page lines between the boards.
  for (let k = 1; k <= DEPTH; k++) {
    const x = X1 + k
    for (let y = Y0 - k; y <= Y1 - k; y++) {
      const board = k === DEPTH || k === 1
      if (board) s.paint(x, y, cloth, 2)
      else s.paint(x, y, pages, y === Y1 - k ? 2 : (y + k) % 3 === 0 ? 2 : 3)
    }
  }
  // The front cover: spine rounded on the left, a hinge groove, then the board.
  for (let y = Y0; y <= Y1; y++)
    for (let x = X0; x <= X1; x++) {
      let t = 3
      if (x === X0) t = 2
      else if (x === X0 + 1) t = 4
      else if (x === X0 + 2) t = 2
      else if (y === Y0) t = 4
      else if (y === Y1 || x === X1) t = 2
      s.paint(x, y, cloth, t)
    }
  weave(s, g, cloth)
  // A raised frame on finer covers.
  if (g >= 2) {
    for (let x = X0 + 4; x <= X1 - 2; x++) {
      s.paint(x, Y0 + 2, cloth, 2)
      s.paint(x, Y1 - 2, cloth, 4)
    }
    for (let y = Y0 + 2; y <= Y1 - 2; y++) {
      s.paint(X0 + 4, y, cloth, 2)
      s.paint(X1 - 2, y, cloth, 4)
    }
  }
  // Spine bands.
  if (g >= 4)
    for (const y of [Y0 + 3, Y1 - 3]) {
      s.paint(X0, y, metal, 3)
      s.paint(X0 + 1, y, metal, 5)
      s.paint(X0 + 2, y, metal, 3)
    }
  // Corner guards.
  if (g >= 3)
    for (const [cx, cy, sx, sy] of [[X1, Y0, -1, 1], [X1, Y1, -1, -1], [X0 + 3, Y0, 1, 1], [X0 + 3, Y1, 1, -1]] as const) {
      if (cx === X0 + 3 && g < 6) continue
      for (const [dx, dy] of [[0, 0], [sx, 0], [0, sy], [2 * sx, 0], [0, 2 * sy]] as const) s.paint(cx + dx, cy + dy, metal, dy * sy < 1 && dx * sx < 1 ? 5 : 3)
    }
  // A clasp: a metal plate on the cover's edge.
  if (g >= 5) {
    const yc = Math.round((Y0 + Y1) / 2)
    for (let y = yc - 2; y <= yc + 2; y++) {
      s.paint(X1 - 1, y, metal, y === yc - 2 ? 5 : 4)
      s.paint(X1, y, metal, y === yc + 2 ? 2 : 3)
    }
    s.paint(X1 - 1, yc, metal, 2)
  }
  sigil(s, g, cloth, metal)
  if (g >= 9 && m.glow) legendaryHalo(s, m.glow, 60)
}

/** Each cloth's surface on the cover. */
function weave(s: Sprite, g: number, cloth: number): void {
  for (let y = Y0 + 1; y < Y1; y++)
    for (let x = X0 + 3; x < X1; x++) {
      const t = s.toneAt(x, y)
      if (t !== 3) continue
      if (g === 2 && (x + y) % 2 === 0 && y % 2 === 0) s.paint(x, y, cloth, 2)
      else if (g === 3 && (x + y) % 4 === 0) s.paint(x, y, cloth, 2)
      else if (g === 5 && x % 2 === 0 && y % 3 === 0) s.paint(x, y, cloth, 2)
      else if (g === 6 && (x * 7 + y * 13) % 11 === 0) s.paint(x, y, cloth, 4)
      else if ((g === 8 || g === 9) && (x - y + 40) % 9 === 0) s.paint(x, y, cloth, 4)
    }
}

const RING = [
  [-1, -4], [0, -4], [1, -4], [2, -3], [3, -2], [4, -1], [4, 0], [4, 1], [3, 2], [2, 3], [1, 4], [0, 4], [-1, 4], [-2, 3], [-3, 2], [-4, 1], [-4, 0], [-4, -1], [-3, -2], [-2, -3],
] as const

/** The summoning sigil: a circle with a sign inside, stamped, inked, then inlaid in metal and lit by a stone. */
function sigil(s: Sprite, g: number, cloth: number, metal: number): void {
  const cx = Math.round((X0 + 3 + X1) / 2) - 1, cy = Math.round((Y0 + Y1) / 2)
  const m = clothOf(g)
  // Blind-stamped at first (a dark groove with a lit lower lip), then inlaid in metal.
  const inlaid = g >= 3
  const cells: [number, number][] = []
  const ink = (dx: number, dy: number) => cells.push([cx + dx, cy + dy])
  for (const [dx, dy] of RING) ink(dx, dy)
  // The sign inside: a triangle, then a four-pointed star.
  if (g <= 4) for (const [dx, dy] of [[0, -2], [-1, -1], [1, -1], [-1, 0], [1, 0], [-2, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]] as const) ink(dx, dy)
  else for (const [dx, dy] of [[0, -3], [0, -2], [-3, 0], [-2, 0], [3, 0], [2, 0], [0, 3], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]] as const) ink(dx, dy)
  // Rays beyond the ring.
  if (g >= 6) for (const [dx, dy] of [[0, -6], [-6, 0], [6, 0], [0, 6]] as const) ink(dx, dy)
  const has = (x: number, y: number) => cells.some(([cx2, cy2]) => cx2 === x && cy2 === y)
  // Inlay sits in a cut groove: a dark edge below and right of each line.
  if (inlaid) for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]] as const) if (!has(x + dx, y + dy) && s.mat[(y + dy) * s.w + x + dx] === cloth) s.paint(x + dx, y + dy, cloth, 1)
  for (const [x, y] of cells) {
    if (inlaid) s.paint(x, y, metal, x + y < cx + cy - 2 ? 5 : x + y > cx + cy + 2 ? 3 : 4)
    else {
      s.paint(x, y, cloth, 1)
      if (!has(x, y + 1) && s.mat[(y + 1) * s.w + x] === cloth) s.paint(x, y + 1, cloth, 4)
    }
  }
  if (g >= 7) jewel(s, cx - 1, cy - 1, 3, gemOf(g === 7 ? 7 : g === 8 ? 6 : g === 9 ? 9 : 10))
  else if (g >= 5) {
    s.paint(cx, cy, metal, 5)
  }
  if (g >= 9 && m.glow) {
    glowPixels(s, cells.filter(([x, y]) => (x - cx) ** 2 + (y - cy) ** 2 > 8), m.glow, 40)
    bloom(s, cx + 0.5, cy + 0.5, 5, m.glow, 70)
    s.overlay(cx - 1, cy - 1, hex('#ffffff', 200))
  }
}
