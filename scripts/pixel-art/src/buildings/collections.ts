// H156: three original 48px collections places. Old painters and game layouts stay untouched.
import type { Sprite } from '../sprite.ts'
import { BASE, col, dome, door, fill, glow, hline, line, M, rect, roofGable, roofSide, slab, vline, wall } from './kit.ts'
import type { Place } from './types.ts'

const GALLERY: Place = {
  id: 'gallery', name: 'Gallery', page: 'learning', at: { x: .5, y: .84 },
  paint(s) {
    s.shadow = { cx: 24, cy: BASE + .5, rx: 17, ry: 2.8, alpha: 72 }
    const stone = col(s, '#ddd8cf', { lift: .3 }), slate = col(s, '#60678d'), lead = col(s, '#393548')
    const timber = col(s, '#805949'), gold = col(s, '#d7ae62', { lift: .38 })
    slab(s, M.rect(11, 42, 36, BASE), stone)
    slab(s, M.rect(13, 40, 34, 41), stone)
    wall(s, stone, 15, 32, 27, 39, 'stone', 'gallery-stone')
    const gable = roofGable(s, slate, 11, 36, 27, 21, 2, { tex: 'slate', trim: stone, wallTop: 28 })
    slab(s, gable, stone)
    // Low buttresses frame a narrow front, without the Sanctum's broad columns or the old Chapel's belfry.
    for (const x of [12, 33]) {
      slab(s, M.poly([[x, 31], [x + 1, 29], [x + 2, 32], [x + 2, 40], [x, 40]]), stone)
      hline(s, stone, x, x + 2, 32, 4)
    }
    door(s, timber, 21, 40, 6, 8, { arch: true, open: true, frame: stone, leaves: 2 })
    // A large rose window high in the front gable: stone surround, lead came, eight jewel-coloured petals.
    dome(s, M.circle(24, 22, 7.5), stone, { contact: false, relief: .3 })
    fill(s, M.circle(24, 22, 6.3), lead, 1)
    const jewels = ['#d94179', '#387bdc', '#edb949', '#9153c2'].map(c => col(s, c, { lift: .28 }))
    M.circle(24, 22, 5.4).each((x, y) => {
      const dx = x + .5 - 24, dy = y + .5 - 22
      const spoke = Math.min(Math.abs(dx), Math.abs(dy), Math.abs(Math.abs(dx) - Math.abs(dy)) / Math.SQRT2) < .5
      const sector = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 4)) % 8
      s.paint(x, y, spoke ? lead : jewels[sector % 4]!, spoke ? 2 : dx + dy < -2 ? 4 : dx + dy < 2 ? 3 : 2)
    })
    dome(s, M.circle(24, 22, 1.4), gold, { contact: false, bias: .15 })
    hline(s, stone, 17, 30, 31, 4)
    glow(s, 24, 22, 9, 9, '#9eacff', 32)
  },
}

function banner(s: Sprite, x: number, direction: -1 | 1, cloth: number, pole: number): void {
  vline(s, pole, x, 10, 32, 3); s.paint(x, 9, pole, 5)
  for (let y = 12; y <= 23; y++) for (let n = 1; n <= 5; n++) {
    if (y > 21 && n === 3) continue
    s.paint(x + direction * n, y, cloth, n === 1 ? 4 : n === 5 ? 2 : 3)
  }
  hline(s, pole, Math.min(x, x + direction * 6), Math.max(x, x + direction * 6), 11, 4)
}

const TRIALS: Place = {
  id: 'trials', name: 'Trials', page: 'battle', at: { x: .2, y: .52 },
  paint(s) {
    const stone = col(s, '#aaadb1'), sand = col(s, '#b9a17b'), wood = col(s, '#886047')
    const steel = col(s, '#b8cad8'), gold = col(s, '#d9b369')
    banner(s, 7, 1, col(s, '#bc596d'), gold)
    banner(s, 40, -1, col(s, '#628dc7'), gold)
    const rim = M.ellipse(24, 30, 19, 9).subtract(M.ellipse(24, 30, 16, 6.5))
    const rear = M.from((x, y) => rim.get(Math.floor(x), Math.floor(y)) && y < 30)
    const front = M.from((x, y) => rim.get(Math.floor(x), Math.floor(y)) && y >= 30 && !(x >= 21 && x < 27 && y >= 34))
    const masonry = (mask: ReturnType<typeof M.empty>) => {
      for (let dy = 4; dy >= 1; dy--) mask.each((x, y) => s.paint(x, y + dy, stone, dy === 4 ? 1 : (y + dy) % 3 === 0 ? 2 : x < 24 ? 3 : 2))
      slab(s, mask, stone)
    }
    masonry(rear)
    dome(s, M.ellipse(24, 30, 16, 6.5), sand, { contact: false, relief: .12 })
    rect(s, sand, 21, 33, 26, BASE, 3)
    masonry(front)
    // Two low gateposts leave a real open entrance; the weapon rack stands beside it, not across it.
    for (const x of [18, 28]) {
      slab(s, M.rect(x, 36, x + 2, BASE), stone)
      hline(s, stone, x - 1, x + 3, 36, 5)
    }
    for (const x of [30, 41]) vline(s, wood, x, 34, BASE, x === 30 ? 4 : 2)
    vline(s, steel, 33, 29, 35, 4); s.paint(33, 28, steel, 5)
    hline(s, gold, 31, 35, 35, 4); vline(s, wood, 33, 36, 40, 3)
    vline(s, wood, 38, 28, 40, 3)
    dome(s, M.poly([[38, 24], [40, 28], [38, 30], [36, 28]]), steel, { contact: false })
    hline(s, wood, 30, 41, 39, 4); hline(s, wood, 30, 41, 40, 2)
  },
}

function dummy(s: Sprite, cx: number, straw: number, wood: number, binding: number): void {
  vline(s, wood, cx, 34, BASE, 4); vline(s, wood, cx + 1, 34, BASE, 2)
  slab(s, M.rect(cx - 2, 33, cx + 2, 38), straw)
  for (const y of [34, 37]) hline(s, binding, cx - 2, cx + 2, y, 2)
  hline(s, wood, cx - 4, cx + 4, 32, 4)
  for (const x of [cx - 4, cx + 4]) vline(s, straw, x, 32, 34, 3)
  dome(s, M.circle(cx + .5, 29.5, 2.7), straw, { contact: false, bias: .1 })
  line(s, binding, cx, 29, cx + 1, 30, 2)
}

const DRILL_YARD: Place = {
  id: 'drill-yard', name: 'Drills', page: 'battle', at: { x: .8, y: .52 },
  paint(s) {
    const wood = col(s, '#966b48'), roof = col(s, '#746b61'), dark = col(s, '#3e3431')
    const straw = col(s, '#d8b66b'), binding = col(s, '#a36051'), gold = col(s, '#e2b658', { lift: .4 })
    const bark = col(s, '#77513c'), end = col(s, '#d2a36a')
    fill(s, M.ellipse(24, 40, 20, 3), col(s, '#9d8661'), 2)
    // A low open timber shed: two posts, a deep interior, a plank roof and simple knee braces.
    wall(s, dark, 8, 27, 22, 38, 'boards', 'drill-shed')
    roofSide(s, roof, 5, 30, 13, 21, { back: 2, tex: 'plank', ridge: wood })
    for (const x of [7, 27]) {
      vline(s, wood, x, 22, 41, 4); vline(s, wood, x + 1, 22, 41, 2)
      line(s, wood, x, 26, x + (x === 7 ? 4 : -4), 22, 4)
    }
    hline(s, wood, 7, 28, 22, 2)
    dummy(s, 15, straw, wood, binding); dummy(s, 36, straw, wood, binding)
    // Three short wooden logs, with end grain; these are timber, not paper Training Log items.
    for (const [x, y, length] of [[5, 38, 8], [5, 42, 9], [9, 40, 8]] as const) {
      rect(s, bark, x, y - 2, x + length - 1, y, 3)
      hline(s, bark, x, x + length - 1, y - 2, 4)
      dome(s, M.ellipse(x + length, y - .5, 2.1, 1.7), end, { contact: false, relief: .35 })
      s.paint(x + length, y - 1, bark, 2)
    }
    // A hanging brass bell at the eave, its dark mouth and a single bright clapper below.
    hline(s, wood, 28, 32, 21, 4); vline(s, bark, 30, 22, 25, 3)
    dome(s, M.poly([[29, 25], [31, 25], [32, 28], [33, 29], [27, 29], [28, 28]]), gold, { contact: false })
    hline(s, gold, 27, 33, 30, 2); s.paint(30, 31, gold, 5)
  },
}

export const COLLECTIONS: Place[] = [GALLERY, TRIALS, DRILL_YARD]
