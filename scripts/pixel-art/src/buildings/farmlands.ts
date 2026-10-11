// Farmlands: the eight farm sites and the two food stations. Warm reds and browns, golden crops, tilled soil.
import { rng } from '../rng.ts'
import type { Sprite } from '../sprite.ts'
import {
  BASE,
  chimney,
  col,
  crate,
  dome,
  door,
  dot,
  fill,
  glow,
  hline,
  line,
  M,
  patch,
  pick,
  plinth,
  rect,
  roofGable,
  roofSide,
  roundTree,
  sack,
  vline,
  wall,
  water,
  window,
} from './kit.ts'
import type { Mask } from '../shape.ts'
import type { Place } from './types.ts'

/** Round fruit or nuts dotted over a canopy: a lit pixel over a base pixel, kept apart from each other. */
function dotFruit(s: Sprite, id: number, canopy: Mask, seed: string, count: number, big = true): void {
  const r = rng(seed)
  const placed: [number, number][] = []
  const cells: [number, number][] = []
  canopy.each((x, y) => {
    if (canopy.get(x - 1, y) && canopy.get(x + 2, y) && canopy.get(x, y - 1) && canopy.get(x, y + 2)) cells.push([x, y])
  })
  let guard = 0
  while (placed.length < count && cells.length > 0 && guard++ < 400) {
    const [x, y] = cells[Math.floor(r() * cells.length)] ?? [0, 0]
    if (placed.some(([px, py]) => Math.abs(px - x) < 4 && Math.abs(py - y) < 3)) continue
    placed.push([x, y])
    s.paint(x, y, id, 4)
    if (big) {
      s.paint(x + 1, y, id, 3)
      s.paint(x, y + 1, id, 3)
      s.paint(x + 1, y + 1, id, 2)
    } else s.paint(x, y + 1, id, 2)
  }
}

/** A mushroom: a pale stem and a domed cap with a dark gill band and pale spots. */
function mushroom(s: Sprite, cap: number, stem: number, spot: number | undefined, cx: number, bot: number, capW: number, capH: number, stemH: number, seed: string): void {
  const sw = Math.max(2, Math.round(capW / 3))
  const sx = Math.round(cx - sw / 2)
  for (let y = bot - stemH; y <= bot; y++) for (let x = sx; x < sx + sw; x++) s.paint(x, y, stem, x === sx ? 5 : x === sx + sw - 1 ? 3 : 4)
  const capBot = bot - stemH
  const m = M.ellipse(cx, capBot + 0.5, capW / 2, capH).subtract(M.rect(0, capBot + 1, 47, 47))
  dome(s, m, cap, { contact: false, bias: 0.05 })
  // Gills: the underside seen as a thin dark band.
  for (let x = Math.ceil(cx - capW / 2 + 1); x < cx + capW / 2 - 1; x++) s.paint(x, capBot + 1, stem, 2)
  if (spot !== undefined) for (const [x, y] of pick(s, seed, m, Math.max(2, Math.round(capW / 3)), 3)) {
    if (!m.get(x, y + 1) || !m.get(x + 1, y)) continue
    s.paint(x, y, spot, 5)
    s.paint(x + 1, y, spot, 4)
  }
}

export const FARMLANDS: Place[] = [
  {
    id: 'fields',
    name: 'Fields',
    page: 'farmlands',
    at: { x: 0.24, y: 0.1 },
    paint: (s) => {
      // A raised plot of soil with five rows of ripe grain, and a stook of sheaves at the front corner.
      const soil = col(s, '#7a4e2f')
      const grain = col(s, '#e3b23c', { lift: 0.3, hueShift: 10 })
      patch(s, M.rect(3, 10, 44, 41), soil, 2, 2)
      for (let i = 0; i < 5; i++) {
        const top = 11 + i * 6
        for (let x = 4; x <= 43; x++) {
          const bump = x % 3 === 0 ? 0 : 1
          for (let y = top + bump; y <= top + 4; y++) {
            const k = y - top
            let tone = k <= 1 ? (x % 3 === 1 ? 5 : 4) : k === 2 ? 4 : k === 3 ? 3 : 2
            if (x === 43) tone = Math.min(tone, 2)
            if (x === 4) tone = Math.max(tone, 4)
            s.paint(x, y, grain, tone)
          }
          // The furrow under each row sits in the grain's shadow.
          s.paint(x, top + 5, soil, 1)
        }
      }
      // A stook: a sheaf tied at the waist, ears fanning out on top, stalks flaring at the foot.
      const straw = col(s, '#dcab42', { lift: 0.32 })
      const band = col(s, '#8a5a2a')
      const cx = 39.5
      for (let y = 26; y <= 43; y++) {
        const hw = y <= 31 ? 2 + (31 - y) * 0.6 : y <= 34 ? 2 : 2 + (y - 34) * 0.42
        for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
          const t = (x + 0.5 - cx) / hw
          let tone = t < -0.4 ? 4 : t < 0.35 ? 3 : 2
          if (y <= 31) tone = (x + y) % 2 === 0 ? 5 : t < 0.3 ? 4 : 3
          else if ((x + 1) % 2 === 0 && tone > 2) tone -= 1
          s.paint(x, y, straw, tone)
        }
      }
      hline(s, band, 37, 41, 33, 3)
      s.paint(37, 33, band, 4)
    },
  },
  {
    id: 'orchard',
    name: 'Orchard',
    page: 'farmlands',
    at: { x: 0.74, y: 0.12 },
    paint: (s) => {
      // Three round fruit trees hung with red apples, and a full basket between the front two.
      const leaf = col(s, '#56a63c', { hueShift: 10 })
      const bark = col(s, '#7a5232')
      const apple = col(s, '#dc3f37', { lift: 0.32 })
      const back = roundTree(s, leaf, bark, 24, 31, 10, 6, 'orchard-back')
      dotFruit(s, apple, back, 'orchard-back-fruit', 6)
      const left = roundTree(s, leaf, bark, 12, 43, 8.5, 6, 'orchard-left')
      dotFruit(s, apple, left, 'orchard-left-fruit', 5)
      const right = roundTree(s, leaf, bark, 36, 43, 8.5, 6, 'orchard-right')
      dotFruit(s, apple, right, 'orchard-right-fruit', 5)
      const wicker = col(s, '#b98a4c')
      rect(s, wicker, 21, 39, 27, 43, 3)
      for (let x = 21; x <= 27; x++) for (let y = 39; y <= 43; y++) s.paint(x, y, wicker, (x + y) % 2 === 0 ? 4 : 2)
      hline(s, wicker, 20, 28, 39, 5)
      for (const [x, y] of [[21, 37], [24, 36], [26, 38], [22, 38]] as const) {
        s.paint(x, y, apple, 4)
        s.paint(x + 1, y, apple, 3)
        s.paint(x, y + 1, apple, 3)
        s.paint(x + 1, y + 1, apple, 2)
      }
    },
  },
  {
    id: 'fishery',
    name: 'Fishery',
    page: 'farmlands',
    at: { x: 0.2, y: 0.3 },
    paint: (s) => {
      // A pond rimmed with sand, a plank dock reaching in from the right, a net drying on a rack behind.
      const sand = col(s, '#d4bc84')
      const bank = col(s, '#8a6a44')
      const pond = col(s, '#3a8ec6', { hueShift: 6 })
      const wood = col(s, '#a8743f')
      const netId = col(s, '#d6c8a2')
      // The net rack, behind the pond: a pole on two posts, a coarse mesh draped from it, floats along the top rope.
      vline(s, wood, 5, 9, 24, 4)
      vline(s, wood, 20, 9, 24, 2)
      hline(s, wood, 4, 21, 9, 4)
      hline(s, wood, 4, 21, 10, 2)
      for (let x = 6; x <= 19; x++) {
        const hem = 18 + Math.round(3 * Math.sin(((x - 5) / 15) * Math.PI))
        for (let y = 11; y <= hem; y++) {
          const mesh = (x + y) % 4 === 0 || (x - y + 40) % 4 === 0
          s.paint(x, y, netId, mesh ? (y < 14 ? 5 : 4) : 1)
        }
        if ((x + hem) % 2 === 0) s.paint(x, hem + 1, netId, 3)
      }
      const cork = col(s, '#e8603a', { lift: 0.3 })
      for (const x of [7, 10, 13, 16, 19]) s.paint(x, 11, cork, 4)
      const rim = M.ellipse(23.5, 32, 21, 10.8)
      rim.each((x, y) => s.paint(x, y, sand, y > 36 ? 3 : 4))
      const hole = M.ellipse(23.5, 32.4, 18.6, 8.6)
      hole.each((x, y) => {
        if (!hole.get(x, y - 1)) s.paint(x, y, bank, 3)
        else if (!hole.get(x, y - 2)) s.paint(x, y, bank, 2)
      })
      const wet = M.from((px, py) => hole.get(Math.floor(px), Math.floor(py)) && hole.get(Math.floor(px), Math.floor(py) - 2))
      water(s, wet, pond, 'fishery-water')
      // A rowboat at the left: a dark hull interior inside a lit gunwale, a seat across it.
      const boat = col(s, '#a8643a', { lift: 0.3 })
      const hull = M.ellipse(14, 34, 6.8, 3)
      const inner = M.ellipse(14, 33.6, 5, 1.7)
      hull.each((x, y) => s.paint(x, y, boat, inner.get(x, y) ? 1 : y < 34 ? 4 : y === 34 ? 3 : 2))
      vline(s, boat, 14, 33, 34, 4)
      hline(s, pond, 9, 19, 37, 2)
      // The dock: plank deck, a dark front edge, posts into the water.
      for (let y = 26; y <= 29; y++) for (let x = 28; x <= 45; x++) s.paint(x, y, wood, x % 3 === 0 ? 3 : y === 26 ? 5 : 4)
      hline(s, wood, 28, 45, 30, 2)
      for (const x of [29, 35, 41]) {
        vline(s, wood, x, 31, 33, 1)
        s.paint(x - 1, 34, pond, 5)
        s.paint(x + 1, 34, pond, 5)
      }
      // A wooden bucket on the dock with a fish tail sticking out.
      const pail = col(s, '#8a6038')
      rect(s, pail, 40, 22, 43, 25, 3)
      vline(s, pail, 40, 22, 25, 4)
      vline(s, pail, 43, 22, 25, 2)
      hline(s, pail, 40, 43, 23, 2)
      const fish = col(s, '#c2d0de', { lift: 0.35 })
      s.paint(41, 21, fish, 4)
      s.paint(42, 21, fish, 3)
      s.paint(40, 20, fish, 5)
      s.paint(43, 20, fish, 3)
    },
  },
  {
    id: 'herb-garden',
    name: 'Herb Garden',
    page: 'farmlands',
    at: { x: 0.76, y: 0.32 },
    paint: (s) => {
      // Three raised wooden beds of herbs: basil, sage, lavender, mint and flowering chives.
      const wood = col(s, '#a06c3c')
      const soil = col(s, '#5a3a24')
      const basil = col(s, '#5cb848', { hueShift: 10 })
      const sage = col(s, '#8fb07c')
      const lav = col(s, '#9b6fd6')
      const mint = col(s, '#3fa070')
      const chive = col(s, '#e47fb0')
      const bed = (x0: number, x1: number, top: number, bot: number) => {
        rect(s, soil, x0 + 1, top + 1, x1 - 1, bot - 4, 2)
        hline(s, wood, x0, x1, top, 5)
        vline(s, wood, x0, top, bot - 3, 4)
        vline(s, wood, x1, top, bot - 3, 3)
        hline(s, wood, x0, x1, bot - 3, 4)
        for (let y = bot - 2; y <= bot; y++) for (let x = x0; x <= x1; x++) s.paint(x, y, wood, x === x0 ? 4 : x === x1 ? 2 : y === bot ? 2 : 3)
        for (let x = x0 + 4; x < x1; x += 5) vline(s, wood, x, bot - 2, bot, 2)
      }
      const tuft = (id: number, cx: number, by: number, rx: number, ry: number) => {
        const m = M.ellipse(cx, by - ry + 0.5, rx, ry).union(M.ellipse(cx - rx * 0.5, by - ry * 0.7, rx * 0.6, ry * 0.75), M.ellipse(cx + rx * 0.5, by - ry * 0.7, rx * 0.6, ry * 0.75))
        dome(s, m, id, { contact: false, bias: 0.05 })
        for (const [x, y] of pick(s, `tuft-${cx}-${by}`, m, Math.round(rx * ry * 0.5), 3)) if (m.get(x, y + 1)) s.shift(x, y + 1, -1)
      }
      const spikes = (id: number, stem: number, x0: number, x1: number, by: number, h: number) => {
        for (let x = x0; x <= x1; x += 2) {
          const hh = h - ((x * 7) % 3)
          vline(s, stem, x, by - hh + 2, by, 3)
          s.paint(x, by - hh, id, 4)
          s.paint(x, by - hh + 1, id, 3)
          s.paint(x, by - hh - 1, id, 5)
        }
      }
      bed(5, 42, 13, 22)
      tuft(basil, 11, 18, 4.5, 4)
      spikes(lav, sage, 17, 25, 18, 9)
      tuft(sage, 31, 18, 4.5, 3.5)
      tuft(mint, 38, 18, 3.5, 3.5)
      bed(3, 21, 30, 42)
      tuft(mint, 8, 37, 4, 4)
      tuft(basil, 16, 37, 4, 4.5)
      bed(26, 44, 30, 42)
      spikes(chive, mint, 29, 35, 37, 8)
      tuft(sage, 40, 37, 3.5, 4)
      // Pink pom-poms on the chives.
      for (let x = 29; x <= 35; x += 2) {
        const hh = 8 - ((x * 7) % 3)
        s.paint(x - 1, 37 - hh, chive, 4)
        s.paint(x + 1, 37 - hh, chive, 3)
      }
    },
  },
  {
    id: 'vegetable-garden',
    name: 'Vegetable Garden',
    page: 'farmlands',
    at: { x: 0.22, y: 0.71 },
    paint: (s) => {
      // Tilled rows of cabbages, carrots and pumpkins, watched over by a scarecrow in a straw hat.
      const soil = col(s, '#7a4e2f')
      patch(s, M.rect(3, 15, 44, 41), soil, 2, 2)
      for (const y of [16, 23, 30, 37]) for (let x = 4; x <= 43; x++) s.paint(x, y, soil, (x + y) % 4 === 0 ? 1 : 2)
      const cabbage = col(s, '#8cc46a')
      const leaf = col(s, '#4f9e3a')
      const carrot = col(s, '#ec8a2c')
      const pumpkin = col(s, '#e8862a', { hueShift: 6 })
      for (let x = 7; x <= 41; x += 6) dome(s, M.ellipse(x, 20, 2.8, 2.4), cabbage, { contact: false })
      // The scarecrow.
      const pole = col(s, '#8a6038')
      const shirt = col(s, '#4b79bb')
      const burlap = col(s, '#dcc092')
      const straw = col(s, '#e8c048')
      const hatBand = col(s, '#c4443a')
      vline(s, pole, 23, 6, 30, 4)
      vline(s, pole, 24, 6, 30, 2)
      rect(s, shirt, 15, 12, 32, 14, 3)
      hline(s, shirt, 15, 32, 12, 4)
      hline(s, shirt, 15, 32, 14, 2)
      for (let y = 12; y <= 22; y++) for (let x = 19; x <= 28; x++) s.paint(x, y, shirt, x === 19 ? 4 : x === 28 ? 2 : y === 12 ? 4 : 3)
      vline(s, shirt, 23, 15, 22, 2)
      rect(s, burlap, 25, 17, 27, 19, 4)
      s.paint(26, 18, burlap, 2)
      for (const [x, y] of [[14, 12], [13, 13], [14, 14], [33, 12], [34, 13], [33, 14], [21, 23], [24, 23], [26, 23]] as const) s.paint(x, y, straw, 4)
      dome(s, M.circle(24, 8.5, 3.2), burlap, { contact: false })
      s.paint(23, 8, pole, 1)
      s.paint(25, 8, pole, 1)
      hline(s, straw, 18, 29, 5, 4)
      hline(s, straw, 19, 28, 6, 2)
      rect(s, straw, 21, 2, 26, 4, 4)
      hline(s, straw, 21, 26, 2, 5)
      vline(s, straw, 26, 2, 4, 3)
      hline(s, hatBand, 21, 26, 4, 3)
      // Carrots: feathery tops and orange shoulders.
      for (let x = 6; x <= 42; x += 4) {
        s.paint(x, 28, carrot, 4)
        s.paint(x + 1, 28, carrot, 3)
        s.paint(x, 26, leaf, 4)
        s.paint(x + 1, 25, leaf, 3)
        s.paint(x - 1, 25, leaf, 4)
        s.paint(x, 27, leaf, 3)
        s.paint(x + 1, 27, leaf, 2)
      }
      // Pumpkins among broad leaves.
      for (let x = 7; x <= 39; x += 8) {
        dome(s, M.ellipse(x + 4, 33.5, 2.5, 1.6), leaf, { contact: false })
        const p = M.ellipse(x, 34, 3.3, 2.6)
        dome(s, p, pumpkin, { contact: false })
        vline(s, pumpkin, x, 32, 36, 2)
        s.paint(x, 31, leaf, 3)
      }
      // Lettuces along the front.
      for (let x = 6; x <= 42; x += 5) dome(s, M.ellipse(x, 40, 2.3, 1.8), cabbage, { contact: false, bias: 0.1 })
    },
  },
  {
    id: 'mushroom-cave',
    name: 'Mushroom Cave',
    page: 'farmlands',
    at: { x: 0.78, y: 0.7 },
    paint: (s) => {
      // A mossy earth mound with a dark cave mouth, big spotted mushrooms at its foot and small ones on top.
      const earth = col(s, '#94704e', { lift: 0.3 })
      const moss = col(s, '#5f9c3c', { hueShift: 10 })
      const dark = col(s, '#2c2236')
      const mound = M.ellipse(24, 34, 20.5, 17).union(M.ellipse(15, 27, 10, 9), M.ellipse(32, 25, 11, 10)).subtract(M.rect(0, 44, 47, 47))
      dome(s, mound, earth, { relief: 0.9 })
      // Moss: a ragged cap over the top of the mound, dripping down.
      const r = rng('mushroom-moss')
      const mossMask = M.empty()
      for (let x = 0; x < 48; x++) {
        let top = -1
        for (let y = 0; y < 48; y++) if (mound.get(x, y)) {
          top = y
          break
        }
        if (top < 0) continue
        const depth = 4 + Math.floor(r() * 3) + (r() < 0.2 ? 3 : 0)
        for (let y = top; y < top + depth; y++) if (mound.get(x, y)) mossMask.set(x, y)
      }
      dome(s, mound, (x, y) => (mossMask.get(x, y) ? moss : earth), { relief: 0.9 })
      // Rocks set in the earth.
      for (const [x, y] of pick(s, 'mushroom-pebbles', mound, 10, 2)) if (!mossMask.get(x, y)) {
        s.shift(x, y, 1)
        s.shift(x + 1, y + 1, -1)
      }
      // The cave mouth: a dark arch, darkest at the top.
      const mouth = M.ellipse(24, 44, 7.5, 14).subtract(M.rect(0, 44, 47, 47))
      mouth.each((x, y) => s.paint(x, y, dark, y < 33 ? 1 : y < 38 ? 2 : 3))
      const rim = M.ellipse(24, 44, 9, 15.5).subtract(mouth).subtract(M.rect(0, 44, 47, 47))
      rim.each((x, y) => s.paint(x, y, earth, x < 24 ? 4 : 2))
      const capRed = col(s, '#d4473c', { lift: 0.3 })
      const capTan = col(s, '#c98d4c')
      const stem = col(s, '#ece0c4')
      mushroom(s, capRed, stem, stem, 9, 43, 13, 7, 6, 'mc-big')
      mushroom(s, capTan, stem, undefined, 39.5, 43, 9, 5, 4, 'mc-tan')
      mushroom(s, capRed, stem, stem, 34, 15, 7, 4, 3, 'mc-top')
      mushroom(s, capTan, stem, undefined, 14, 18, 5, 3, 2, 'mc-top2')
    },
  },
  {
    id: 'sugar-grove',
    name: 'Sugar Grove',
    page: 'farmlands',
    at: { x: 0.26, y: 0.9 },
    paint: (s) => {
      // A clump of jointed sugarcane, two straw beehives on a bench, and a honey pot.
      const cane = col(s, '#b4c44c', { hueShift: 10 })
      const blade = col(s, '#5fa63c', { hueShift: 10 })
      const stalks: [number, number][] = [[6, 18], [10, 10], [14, 6], [18, 12], [22, 16], [8, 22], [16, 20]]
      for (const [x, top] of stalks) {
        for (let y = top; y <= BASE; y++) {
          const node = (y - top) % 5 === 4
          s.paint(x, y, cane, node ? 2 : 4)
          s.paint(x + 1, y, cane, node ? 1 : 2)
          if (node) s.paint(x, y - 1, cane, 5)
        }
        // Long blades arching out from the top.
        line(s, blade, x, top, x - 4, top + 5, (k) => (k < 2 ? 4 : 3))
        line(s, blade, x + 1, top, x + 5, top + 4, (k) => (k < 2 ? 3 : 2))
        line(s, blade, x, top - 1, x - 1, top - 4, 4)
        line(s, blade, x + 1, top + 3, x + 4, top + 8, 2)
      }
      const wood = col(s, '#8a6038')
      const straw = col(s, '#dba84c', { lift: 0.3 })
      const dark = col(s, '#3a2a20')
      // The bench.
      hline(s, wood, 24, 45, 35, 5)
      hline(s, wood, 24, 45, 36, 3)
      hline(s, wood, 24, 45, 37, 2)
      for (const x of [25, 44]) vline(s, wood, x, 38, BASE, 2)
      const skep = (cx: number) => {
        const m = M.ellipse(cx, 35, 6, 10).subtract(M.rect(0, 35, 47, 47))
        dome(s, m, straw, { contact: false })
        // Coiled straw rings.
        m.each((x, y) => {
          if ((y - 26) % 3 === 2) s.shift(x, y, -1)
        })
        rect(s, dark, cx - 1, 32, cx, 34, 1)
      }
      skep(29)
      skep(40)
      // A honey pot: an amber crock with a cloth lid tied on, honey running down one side.
      const honey = col(s, '#ec9a26', { lift: 0.35 })
      const cloth = col(s, '#f2ead6', { lift: 0.3 })
      dome(s, M.ellipse(24, 40, 3.4, 3.4).union(M.rect(22, 41, 26, 43)), honey, { contact: false, bias: 0.1 })
      hline(s, cloth, 21, 27, 36, 5)
      hline(s, cloth, 21, 27, 37, 3)
      s.paint(21, 38, cloth, 3)
      s.paint(27, 38, cloth, 2)
      hline(s, col(s, '#c44a3a'), 22, 26, 38, 3)
      // Two bees.
      for (const [x, y] of [[34, 27], [45, 30]] as const) {
        dot(s, x, y, '#f2c230')
        dot(s, x + 1, y, '#2a2018')
        dot(s, x, y - 1, '#e8f0ff', 200)
      }
    },
  },
  {
    id: 'nut-grove',
    name: 'Nut Grove',
    page: 'farmlands',
    at: { x: 0.74, y: 0.9 },
    paint: (s) => {
      // Two broad, spreading nut trees with clusters of nuts, and a wicker basket heaped with them.
      const leaf = col(s, '#7e9e2c', { hueShift: 8, satShift: 0.02 })
      const bark = col(s, '#6b4a32')
      const nut = col(s, '#a8683a', { lift: 0.3 })
      const back = roundTree(s, leaf, bark, 15, 33, 12, 7, 'nut-back', { squash: 0.62, trunkW: 4, lobes: 8 })
      dotFruit(s, nut, back, 'nut-back-nuts', 6)
      const front = roundTree(s, leaf, bark, 33, 43, 12, 8, 'nut-front', { squash: 0.62, trunkW: 4, lobes: 8 })
      dotFruit(s, nut, front, 'nut-front-nuts', 6)
      const wicker = col(s, '#c09456')
      const basket = M.ellipse(10, 38, 6.5, 6).subtract(M.rect(0, 0, 47, 37))
      basket.each((x, y) => s.paint(x, y, wicker, (x + y) % 2 === 0 ? (x < 8 ? 4 : 3) : 2))
      hline(s, wicker, 4, 16, 37, 5)
      hline(s, wicker, 5, 15, 38, 2)
      for (const [x, y] of [[6, 35], [9, 34], [12, 35], [7.5, 32.5], [10.5, 32]] as const) dome(s, M.ellipse(x + 0.5, y + 0.5, 1.8, 1.6), nut, { contact: false })
      // Fallen nuts.
      for (const [x, y] of [[20, 42], [25, 43], [44, 42]] as const) {
        s.paint(x, y, nut, 4)
        s.paint(x + 1, y, nut, 2)
      }
    },
  },
  {
    id: 'pantry',
    name: 'Pantry',
    page: 'farmlands',
    at: { x: 0.3, y: 0.51 },
    paint: (s) => {
      // A cosy timber storehouse on a stone plinth, double doors, flour sacks by the wall and a crate of jars.
      const roof = col(s, '#b4503a')
      const boards = col(s, '#b07e4c')
      const stone = col(s, '#a29a8a')
      const wood = col(s, '#6e4628')
      const glass = col(s, '#3a4c6a')
      roofSide(s, roof, 4, 43, 9, 23, { back: 3, tex: 'tile' })
      wall(s, boards, 6, 41, 24, BASE, 'boards')
      plinth(s, stone, 6, 41, 39, BASE)
      door(s, wood, 19, BASE, 10, 14, { leaves: 2, frame: boards })
      window(s, wood, glass, 10, 28, 4, 4, { mullion: true, sill: true })
      window(s, wood, glass, 34, 28, 4, 4, { mullion: true, sill: true })
      // A sign over the door: a gold sheaf on a dark plank.
      rect(s, wood, 20, 24, 27, 27, 2)
      hline(s, wood, 20, 27, 24, 4)
      const sheaf = col(s, '#ecbc44', { lift: 0.35 })
      vline(s, sheaf, 23, 25, 27, 4)
      vline(s, sheaf, 24, 25, 27, 3)
      s.paint(22, 25, sheaf, 5)
      s.paint(25, 25, sheaf, 4)
      s.paint(21, 25, sheaf, 4)
      s.paint(26, 26, sheaf, 3)
      const burlap = col(s, '#e2d0a2')
      sack(s, burlap, 35, BASE, 7, 8)
      sack(s, burlap, 41, BASE, 7, 8)
      sack(s, burlap, 38, BASE - 6, 7, 7)
      const crateId = col(s, '#9a6a3c')
      crate(s, crateId, 4, BASE, 10, 6)
      const jarGlass = col(s, '#b6d0cc')
      const jam = [col(s, '#c8404c'), col(s, '#e8a032'), col(s, '#7a4ab0')]
      jam.forEach((id, i) => {
        const x = 5 + i * 3
        rect(s, id, x, 34, x + 1, 37, 3)
        s.paint(x, 35, id, 4)
        hline(s, jarGlass, x, x + 1, 33, 5)
        s.paint(x, 34, jarGlass, 5)
      })
    },
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    page: 'farmlands',
    at: { x: 0.7, y: 0.51 },
    paint: (s) => {
      // A plaster-and-timber cottage under a red gable, a tall chimney, and a domed bread oven outside.
      const roof = col(s, '#c4503c')
      const plaster = col(s, '#eedfbd')
      const beam = col(s, '#6a4430')
      const brick = col(s, '#b4643e')
      const stone = col(s, '#8e887c')
      const glass = col(s, '#3a4c6a')
      const gable = roofGable(s, roof, 14, 45, 25, 13, 9, { tex: 'shingle', wallTop: 27 })
      // The chimney rises from the right-hand slope.
      const smoke = chimney(s, stone, 36, 5, 14)
      wall(s, plaster, 16, 43, 26, BASE, 'plaster', 'kitchen-wall')
      fill(s, gable.subtract(M.rect(0, 0, 15, 47)).subtract(M.rect(44, 0, 47, 47)), plaster, 4)
      // Timber frame.
      for (const x of [16, 43]) vline(s, beam, x, 26, BASE, x === 16 ? 3 : 2)
      hline(s, beam, 16, 43, 26, 2)
      hline(s, beam, 16, 43, 34, 3)
      vline(s, beam, 24, 27, 33, 3)
      vline(s, beam, 35, 27, 33, 3)
      window(s, beam, glass, 19, 29, 3, 3, { lit: true })
      window(s, beam, glass, 38, 29, 3, 3, { lit: true })
      door(s, beam, 27, BASE, 6, 10, { arch: true })
      // A round gable vent.
      s.paint(29, 20, glass, 2)
      s.paint(30, 20, glass, 2)
      s.paint(29, 21, glass, 2)
      s.paint(30, 21, glass, 4)
      // The oven: a brick dome on a stone footing, a dark arched mouth with a fire burning low inside.
      rect(s, stone, 3, 40, 16, BASE, 3)
      hline(s, stone, 3, 16, 40, 4)
      vline(s, stone, 16, 40, BASE, 2)
      const oven = M.ellipse(9.5, 40, 6.5, 8).subtract(M.rect(0, 40, 47, 47))
      dome(s, oven, brick, { relief: 0.9, contact: false })
      oven.each((x, y) => {
        if ((y % 3 === 0 && (x + y) % 2 === 0) || (y % 3 !== 0 && (x + Math.floor(y / 3) * 2) % 5 === 0)) s.shift(x, y, -1)
      })
      const fire = col(s, '#f4902a', { lift: 0.45 })
      const mouth = M.ellipse(9.5, 41, 3, 5).subtract(M.rect(0, 41, 47, 47))
      mouth.each((x, y) => s.paint(x, y, brick, 1))
      for (const [x, y, t] of [[8, 40, 4], [9, 39, 5], [10, 40, 5], [11, 40, 3], [9, 40, 4], [10, 39, 4], [10, 38, 3]] as const) s.paint(x, y, fire, t)
      hline(s, stone, 6, 13, 41, 5)
      glow(s, 9.5, 39, 4, 3, '#ffb050', 70)
      const log = col(s, '#9a6a3c')
      for (const [x, y] of [[19, 42], [22, 42], [20.5, 39.5]] as const) {
        dome(s, M.circle(x, y, 1.6), log, { contact: false })
        s.paint(Math.floor(x), Math.floor(y), log, 5)
      }
      return { smoke }
    },
  },
]

