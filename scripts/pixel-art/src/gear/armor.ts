// Body armor, front view: garb (refined Fibers), leather armor (refined Hides & Scales), mail and plate (refined Ores).
// Four silhouettes: a robe with bell sleeves, a sleeveless strapped jerkin, a short-sleeved ring shirt, and a
// breastplate under round pauldrons. The grade's material colors the piece; trims, belts, studs and gems add up.
import { bloom } from '../items/refined/workbench-kit.ts'
import { Mask, shadeDome } from '../shape.ts'
import type { Sprite } from '../sprite.ts'
import { gemOf, jewel, legendaryHalo } from './fittings.ts'
import { BRONZE, CLOTHS, DARK_GRIP, GOLD, HIDES, IRON, LEATHER_GRIP, METALS, SILVER, use, type Hide, type Material } from './materials.ts'
import { mirrored } from './template.ts'

export function armorShadow(s: Sprite): void {
  s.shadow = { cx: 15.5, cy: 28, rx: 10, ry: 2, alpha: 75 }
}

// ---------------------------------------------------------------- garb

const GARB = mirrored(4, [
  '.........bbkknnn', // 4
  '........sbbbkknn', // 5
  '........ssbbbkkn', // 6
  '........sssbbbkk', // 7
  '.......ssssbbbbk', // 8
  '......sssss.bbbb', // 9
  '......sssss.bbbb', // 10
  '......sssss.bbbb', // 11
  '.....ssssss.bbbb', // 12
  '.....ssssss.bbbb', // 13
  '.....ssssss.bbbb', // 14
  '....ccccccc.wwww', // 15
  '............wwww', // 16
  '...........bbbbb', // 17
  '...........bbbbb', // 18
  '..........bbbbbb', // 19
  '..........bbbbbb', // 20
  '.........bbbbbbb', // 21
  '.........bbbbbbb', // 22
  '.........bbbbbbb', // 23
  '........bbbbbbbb', // 24
  '........bbbbbbbb', // 25
  '........hhhhhhhh', // 26
])

interface GarbStyle {
  /** Hem, cuff and collar band. */
  trim?: string
  sash: string
  /** Sash ends hanging from a knot. */
  knot?: boolean
  weave?: 'coarse' | 'twill' | 'knit' | 'fuzzy' | 'sheen'
  /** Embroidery on the skirt. */
  motif?: 'dots' | 'vine' | 'moon' | 'cloud'
  gem?: number
  fringe?: string
}

const GARBS: GarbStyle[] = [
  { sash: '#8a6440' },
  { sash: '#e2cf9a', weave: 'coarse' },
  { trim: '#7d6a4a', sash: '#8a6440', weave: 'twill' },
  { trim: '#5f8fe0', sash: '#5f8fe0', knot: true },
  { trim: '#b0413e', sash: '#b0413e', knot: true, weave: 'knit' },
  { trim: '#2f8a8a', sash: '#2f8a8a', knot: true, weave: 'fuzzy', motif: 'dots' },
  { trim: '#e8d2c4', sash: '#7a4a6a', knot: true, motif: 'vine', fringe: '#e8d2c4' },
  { trim: '#f4c534', sash: '#f4c534', knot: true, weave: 'sheen', motif: 'vine', gem: 1 },
  { trim: '#f4c534', sash: '#5b47a8', knot: true, weave: 'sheen', motif: 'moon', gem: 9 },
  { trim: '#f4c534', sash: '#ffffff', knot: true, motif: 'cloud', gem: 10 },
]

export function garb(s: Sprite, g: number): void {
  armorShadow(s)
  const st = GARBS[g - 1] ?? (GARBS[0] as GarbStyle)
  const m: Material = CLOTHS[g - 1] ?? (CLOTHS[0] as Material)
  const cloth = use(s, m)
  const t = GARB
  const trim = st.trim ? use(s, st.trim, { lift: 0.4, drop: 0.28 }) : cloth
  // The inside of the back, seen through the neckline.
  t.mask('n').each((x, y) => s.paint(x, y, cloth, 1))
  shadeDome(s, t.mask('bkwh'), cloth, { bias: 0.08, relief: 0.8, contact: false })
  for (const side of [0, 1]) {
    const sleeve = t.mask('sc')
    sleeve.each((x, y) => {
      if ((x < 16 ? 0 : 1) !== side) sleeve.set(x, y, false)
    })
    shadeDome(s, sleeve, cloth, { bias: side === 0 ? 0.1 : 0, relief: 0.9 })
  }
  // Folds down the skirt and the sleeves.
  for (const fx of [11, 14, 17, 20])
    for (let y = 18; y <= 25; y++) {
      if (t.at(fx, y) !== 'b' || ((fx === 11 || fx === 20) && y < 21)) continue
      s.shift(fx, y, -1)
      if (t.at(fx - 1, y) === 'b') s.shift(fx - 1, y, 1)
    }
  for (const [fx, y0] of [[7, 10], [24, 10]] as const) for (let y = y0; y <= 14; y++) s.shift(fx, y, -1)
  texture(s, st.weave, t.mask('bs'), cloth)
  // Collar, cuffs and hem.
  t.mask('k').each((x, y) => s.paint(x, y, trim, x < 16 ? 4 : 3))
  t.mask('c').each((x, y) => s.paint(x, y, trim, st.trim ? (x < 16 ? 4 : 2) : 2))
  t.mask('h').each((x, y) => s.paint(x, y, trim, st.trim ? (x < 16 ? 4 : 3) : 2))
  if (!st.trim) t.mask('k').each((x, y) => s.paint(x, y, cloth, x < 16 ? 4 : 2))
  // The sash, knotted at the front.
  const sash = use(s, st.sash, { lift: 0.4, drop: 0.28 })
  t.mask('w').each((x, y) => s.paint(x, y, sash, y === 15 ? (x < 16 ? 4 : 3) : x < 16 ? 3 : 2))
  if (st.knot) {
    for (const [x, y, tone] of [[14, 15, 5], [15, 15, 4], [14, 16, 3], [15, 16, 3], [14, 17, 4], [13, 18, 3], [14, 18, 3], [13, 19, 2], [15, 17, 2], [15, 18, 2], [16, 19, 3], [16, 20, 2]] as const)
      s.paint(x, y, sash, tone)
  }
  if (st.fringe) {
    const fringe = use(s, st.fringe, { lift: 0.4, drop: 0.3 })
    for (let x = 8; x <= 23; x += 2) s.paint(x, 27, fringe, x < 16 ? 4 : 3)
  }
  motif(s, st.motif, t.mask('b'), g)
  if (st.gem) jewel(s, 15, 8, 2, gemOf(st.gem))
  if (g >= 9 && m.glow) legendaryHalo(s, m.glow, 55)
}

function texture(s: Sprite, weave: GarbStyle['weave'], m: Mask, id: number): void {
  if (!weave) return
  m.each((x, y) => {
    if (s.mat[y * s.w + x] !== id) return
    const t = s.toneAt(x, y)
    if (weave === 'coarse' && (x + y) % 2 === 0 && y % 2 === 0) s.paint(x, y, id, t - 1)
    else if (weave === 'twill' && (x + y) % 3 === 0 && t >= 3) s.paint(x, y, id, t - 1)
    else if (weave === 'knit' && x % 2 === 0 && y % 3 === 0) s.paint(x, y, id, t - 1)
    else if (weave === 'fuzzy' && (x * 7 + y * 13) % 9 === 0) s.paint(x, y, id, Math.min(5, t + 1))
    else if (weave === 'sheen' && (x - y + 40) % 8 === 0 && t >= 3) s.paint(x, y, id, Math.min(5, t + 1))
  })
}

function motif(s: Sprite, kind: GarbStyle['motif'], body: Mask, g: number): void {
  if (!kind) return
  const color = kind === 'moon' ? '#fff6c8' : kind === 'cloud' ? '#ffffff' : kind === 'dots' ? '#e6e0c8' : '#f4c534'
  const id = use(s, color, { lift: 0.5, drop: 0.25 })
  const put = (x: number, y: number, tone = 4) => {
    if (body.get(x, y)) s.paint(x, y, id, tone)
  }
  if (kind === 'dots') for (const [x, y] of [[10, 22], [12, 20], [19, 20], [21, 22], [15, 24], [17, 23]] as const) put(x, y)
  if (kind === 'vine')
    for (let x = 8; x <= 23; x++) {
      const y = 24 + (x % 4 === 0 ? -1 : x % 4 === 2 ? 1 : 0)
      put(x, y, x < 16 ? 5 : 4)
    }
  if (kind === 'moon') {
    for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [0, 2], [1, 3], [2, 3]] as const) put(10 + dx, 20 + dy, 5)
    for (const [x, y] of [[19, 21], [21, 24], [16, 24], [18, 18]] as const) put(x, y, 5)
  }
  if (kind === 'cloud') {
    for (const [ox, oy] of [[10, 21], [17, 23]] as const)
      for (const [dx, dy] of [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] as const) put(ox + dx, oy + dy, dy === 0 ? 5 : 4)
  }
  if (g >= 9) bloom(s, 16, 21, 6, color, 40)
}


// ---------------------------------------------------------------- mail

const MAIL = mirrored(4, [
  '..........kknnnn', // 4
  '........mmmkknnn', // 5
  '.......mmmmmkkkk', // 6
  '........mmmmmmmm', // 7
  '.......mmmmmmmmm', // 8
  '......mmmmmmmmmm', // 9
  '......mmmm.mmmmm', // 10
  '......mmmm.mmmmm', // 11
  '......mmmm.mmmmm', // 12
  '.....cccc..mmmmm', // 13
  '...........mmmmm', // 14
  '..........wwwwww', // 15
  '...........mmmmm', // 16
  '..........mmmmmm', // 17
  '..........mmmmmm', // 18
  '..........mmmmmm', // 19
  '.........mmmmmmm', // 20
  '.........mmmmmmm', // 21
  '.........eeeeeee', // 22
  '.........e.e.e.e', // 23
])

interface MailStyle {
  collar: string
  belt: string
  /** Metal of the edging rings at cuffs and hem. */
  edge?: Material
  gem?: number
  medallion?: boolean
}

const MAILS: MailStyle[] = [
  { collar: '#d5c9a8', belt: '#8a6440' },
  { collar: '#d5c9a8', belt: '#6b4630' },
  { collar: '#7a5034', belt: '#6b4630' },
  { collar: '#7a5034', belt: '#5a3c2a', edge: BRONZE },
  { collar: '#3a3f5a', belt: '#4a3426', edge: GOLD },
  { collar: '#6b2a2a', belt: '#4a3426', edge: IRON },
  { collar: '#2a3a6b', belt: '#3a2a2a', edge: GOLD, gem: 6 },
  { collar: '#3a2a52', belt: '#2e2433', edge: GOLD, gem: 2, medallion: true },
  { collar: '#244a52', belt: '#2e2433', edge: SILVER, gem: 8, medallion: true },
  { collar: '#5a1e22', belt: '#2e2433', edge: GOLD, gem: 10, medallion: true },
]

export function mail(s: Sprite, g: number): void {
  armorShadow(s)
  const st = MAILS[g - 1] ?? (MAILS[0] as MailStyle)
  const metal: Material = METALS[g - 1] ?? (METALS[0] as Material)
  const id = use(s, metal)
  const t = MAIL
  const body = t.mask('mce')
  shadeDome(s, body, id, { bias: 0.1, relief: 0.8, contact: false })
  // Rings: each a lit crown over a dark gap, every other row shifted by one, so they interlock.
  body.each((x, y) => {
    const tone = s.toneAt(x, y)
    const lx = (x + (Math.floor(y / 2) % 2)) % 2
    const t = y % 2 === 0 ? (lx === 0 ? tone + 1 : tone - 1) : lx === 0 ? tone : tone - 1
    s.paint(x, y, id, Math.max(1, Math.min(5, t)))
  })
  // The gap under each arm, and the shadow where the sleeve meets the body.
  for (let y = 10; y <= 12; y++) {
    s.shift(9, y, -1)
    s.shift(22, y, -2)
  }
  if (st.edge) {
    const edge = use(s, st.edge)
    t.mask('ce').each((x, y) => s.paint(x, y, edge, x < 16 ? (y % 2 === 0 ? 5 : 4) : 3))
  }
  const collar = use(s, st.collar, { lift: 0.38, drop: 0.3 })
  shadeDome(s, t.mask('k'), collar, { bias: 0.15, relief: 0.6, contact: false })
  t.mask('n').each((x, y) => s.paint(x, y, collar, 1))
  const belt = use(s, st.belt, { lift: 0.35, drop: 0.3 })
  t.mask('w').each((x, y) => s.paint(x, y, belt, x < 16 ? 3 : 2))
  if (g >= 2) {
    const buckle = use(s, g >= 5 ? GOLD : BRONZE)
    for (const [x, tone] of [[14, 5], [15, 4], [16, 4], [17, 3]] as const) s.paint(x, 15, buckle, tone)
  }
  if (st.medallion) {
    const med = use(s, st.edge ?? GOLD)
    shadeDome(s, Mask.circle(16, 10.5, 2.6), med, { bias: 0.15, contact: false })
  }
  if (st.gem) jewel(s, st.medallion ? 15 : 15, st.medallion ? 9 : 5, 2, gemOf(st.gem))
  if (g >= 9 && metal.glow) {
    bloom(s, 16, 10.5, 4, metal.glow, 90)
    legendaryHalo(s, metal.glow, 55)
  }
}

// ---------------------------------------------------------------- plate

interface PlateStyle {
  rivets?: boolean
  /** Metal of the edging along the plates' rims. */
  edge?: Material
  emblem?: 'bar' | 'cross' | 'sun'
  gem?: number
  spikes?: boolean
}

const PLATES: PlateStyle[] = [
  {},
  { rivets: true },
  { rivets: true, emblem: 'bar' },
  { rivets: true, edge: BRONZE },
  { rivets: true, edge: GOLD, emblem: 'bar' },
  { rivets: true, edge: SILVER, emblem: 'cross' },
  { rivets: true, edge: GOLD, emblem: 'cross', gem: 6 },
  { rivets: true, edge: GOLD, emblem: 'sun', gem: 2, spikes: true },
  { rivets: true, edge: SILVER, emblem: 'sun', gem: 8, spikes: true },
  { rivets: true, edge: GOLD, emblem: 'sun', gem: 10, spikes: true },
]

export function plate(s: Sprite, g: number): void {
  armorShadow(s)
  const st = PLATES[g - 1] ?? (PLATES[0] as PlateStyle)
  const metal: Material = METALS[g - 1] ?? (METALS[0] as Material)
  const id = use(s, metal)
  const edge = st.edge ? use(s, st.edge) : id
  // Faulds: three lames below the waist, each lapping over the next.
  const lames = [
    Mask.polygon([[9, 22.5], [23, 22.5], [23.4, 25.6], [8.6, 25.6]]),
    Mask.polygon([[9.6, 20], [22.4, 20], [22.8, 23.2], [9.2, 23.2]]),
    Mask.polygon([[10.4, 17.6], [21.6, 17.6], [22, 20.6], [10, 20.6]]),
  ]
  for (const lame of lames) {
    shadeDome(s, lame, id, { bias: 0.05, relief: 0.5 })
    lame.each((x, y) => {
      if (!lame.get(x, y + 1)) s.paint(x, y, edge, st.edge ? (x < 16 ? 4 : 3) : 2)
    })
  }
  // The breastplate: a rounded chest with a ridge down the middle.
  const chest = Mask.polygon([[10.6, 5.6], [21.4, 5.6], [23, 9], [22.4, 14], [20.8, 18.6], [11.2, 18.6], [9.6, 14], [9, 9]])
  shadeDome(s, chest, id, { bias: 0.12, relief: 1.1 })
  chest.each((x, y) => {
    if (x === 15 && y > 6) s.paint(x, y, id, Math.min(5, s.toneAt(x, y) + 1))
    if (x === 16 && y > 6) s.paint(x, y, id, Math.max(2, s.toneAt(x, y) - 1))
  })
  if (st.edge) chest.each((x, y) => {
    if (!chest.get(x, y + 1)) s.paint(x, y, edge, x < 16 ? 4 : 3)
  })
  // The gorget: a collar ring around the neck.
  const gorget = Mask.ellipse(16, 5.6, 4.6, 2.2).subtract(Mask.ellipse(16, 5, 2.6, 1.2))
  shadeDome(s, gorget, st.edge ? edge : id, { bias: 0.2, relief: 0.6, contact: false })
  Mask.ellipse(16, 5, 2.6, 1.2).each((x, y) => s.paint(x, y, id, 1))
  // Pauldrons: round shoulder domes with a lame beneath.
  for (const [cx, side] of [[9.6, -1], [22.4, 1]] as const) {
    const lower = Mask.ellipse(cx + side * 0.4, 13.4, 3.2, 1.8)
    shadeDome(s, lower, id, { bias: side < 0 ? 0.1 : -0.05, relief: 0.6 })
    const dome = Mask.circle(cx, 9.6, 3.7)
    shadeDome(s, dome, id, { bias: side < 0 ? 0.18 : 0.02, relief: 1 })
    if (st.edge) dome.each((x, y) => {
      if (!dome.get(x, y + 1)) s.paint(x, y, edge, side < 0 ? 4 : 3)
    })
    if (st.spikes) {
      const sx = Math.floor(cx + side * 0.6), sy = 6
      s.paint(sx, sy, edge, 5)
      s.paint(sx, sy - 1, edge, 4)
    }
  }
  if (st.rivets)
    for (const [x, y] of [[11, 9], [20, 9], [12, 16], [19, 16]] as const) {
      s.paint(x, y, id, 5)
      s.paint(x, y + 1, id, 1)
    }
  if (st.emblem) {
    const em = st.edge ? edge : id
    const cells: [number, number, number][] =
      st.emblem === 'bar'
        ? [[15, 9, 5], [16, 9, 4], [15, 10, 5], [16, 10, 3], [15, 11, 4], [16, 11, 3], [15, 12, 4], [16, 12, 3]]
        : st.emblem === 'cross'
          ? [[15, 9, 5], [16, 9, 4], [13, 11, 5], [14, 11, 5], [15, 11, 5], [16, 11, 4], [17, 11, 3], [18, 11, 3], [15, 12, 4], [16, 12, 3], [15, 10, 5], [16, 10, 3], [15, 13, 4], [16, 13, 3], [15, 14, 4], [16, 14, 3]]
          : [[15, 8, 5], [16, 8, 4], [13, 10, 5], [18, 10, 3], [12, 11, 4], [19, 11, 3], [13, 12, 4], [18, 12, 3], [15, 14, 4], [16, 14, 3], [14, 10, 5], [17, 10, 4], [14, 12, 4], [17, 12, 3]]
    for (const [x, y, tone] of cells) s.paint(x, y, em, tone)
  }
  if (st.gem) jewel(s, 15, 10, 2, gemOf(st.gem))
  if (g >= 9 && metal.glow) {
    bloom(s, 16, 11, 4.5, metal.glow, 90)
    legendaryHalo(s, metal.glow, 55)
  }
}

// ---------------------------------------------------------------- leather armor

const JERKIN = mirrored(4, [
  '.........jjjcccc', // 4
  '.........jjjjnnn', // 5
  '........jjjjjknn', // 6
  '........jjjjjjkn', // 7
  '.......jjjjjjjjk', // 8
  '.......jjjjjjjjl', // 9
  '.......jjjjjjjjl', // 10
  '.......jjjjjjjjl', // 11
  '.......jjjjjjjjj', // 12
  '.......jjjjjjjjj', // 13
  '.......jjjjjjjjj', // 14
  '.......jjjjjjjjj', // 15
  '.......jjjjjjjjj', // 16
  '.......wwwwwwwww', // 17
  '.......wwwwwwwww', // 18
  '.......jjjj.jjjj', // 19
  '.......jjjj.jjjj', // 20
  '........jjj.jjjj', // 21
  '........jjj.jjjj', // 22
  '............jjjj', // 23
  '............jjjj', // 24
])

interface JerkinStyle {
  baldric?: boolean
  sideStraps?: boolean
  pauldron?: boolean
  gem?: number
}

const JERKINS: JerkinStyle[] = [
  {},
  { baldric: true },
  { baldric: true },
  { baldric: true, sideStraps: true },
  { baldric: true, sideStraps: true },
  { baldric: true, pauldron: true },
  { baldric: true, pauldron: true, gem: 7 },
  { baldric: true, pauldron: true, gem: 3 },
  { baldric: true, pauldron: true, gem: 9 },
  { baldric: true, pauldron: true, gem: 10 },
]

export function leather(s: Sprite, g: number): void {
  armorShadow(s)
  const st = JERKINS[g - 1] ?? (JERKINS[0] as JerkinStyle)
  const hide: Hide = HIDES[g - 1] ?? (HIDES[0] as Hide)
  const id = use(s, hide)
  const t = JERKIN
  const body = t.mask('jklc')
  shadeDome(s, body, id, { bias: 0.1, relief: 0.75, contact: false })
  // The back of the jerkin behind the neck: its collar, and the shadowed inside.
  t.mask('c').each((x, y) => s.paint(x, y, id, x < 16 ? 3 : 2))
  t.mask('n').each((x, y) => s.paint(x, y, id, 1))
  surface(s, hide, t.mask('j'), id)
  // Stitched seams down the front edges of the neckline and the hems of the tabs.
  const suede = use(s, hide.accent ?? hide.base, { lift: 0.3, drop: 0.28 })
  t.mask('k').each((x, y) => s.paint(x, y, suede, x < 16 ? 4 : 3))
  // Lacing across the front opening.
  const lace = use(s, hide.tie, { lift: 0.4, drop: 0.3 })
  t.mask('l').each((x, y) => s.paint(x, y, (x + y) % 2 === 0 ? lace : id, (x + y) % 2 === 0 ? 4 : 1))
  const strapMat = g >= 7 ? DARK_GRIP : LEATHER_GRIP
  const strap = use(s, strapMat)
  const buckleMat = g >= 5 ? GOLD : g >= 3 ? SILVER : BRONZE
  const buckle = use(s, buckleMat)
  // Belt and buckle.
  t.mask('w').each((x, y) => s.paint(x, y, strap, y === 17 ? (x < 16 ? 4 : 3) : 2))
  for (const [x, y, tone] of [[14, 17, 5], [15, 17, 4], [16, 17, 4], [17, 17, 3], [14, 18, 4], [17, 18, 2], [15, 18, 1], [16, 18, 1]] as const) s.paint(x, y, buckle, tone)
  if (st.sideStraps)
    for (const y of [11, 14]) {
      for (const x of [7, 8, 9, 22, 23, 24]) s.paint(x, y, strap, x < 16 ? 4 : 2)
      s.paint(9, y, buckle, 5)
      s.paint(22, y, buckle, 3)
    }
  if (st.baldric) {
    // A strap from the left shoulder across to the right hip.
    for (let k = 0; k <= 13; k++) {
      const x = 9 + k, y = 4 + k
      if (!body.get(x, y) || !body.get(x + 1, y + 1)) continue
      s.paint(x, y, strap, 4)
      s.paint(x + 1, y, strap, 3)
      s.paint(x + 1, y + 1, strap, 2)
    }
    for (const [x, y, tone] of [[13, 8, 5], [14, 8, 4], [13, 9, 4], [14, 9, 2]] as const) s.paint(x, y, buckle, tone)
  }
  if (st.pauldron) {
    const pad = Mask.ellipse(10.4, 5.8, 3, 2.2)
    shadeDome(s, pad, id, { bias: 0.18, relief: 0.8 })
    surface(s, hide, pad, id)
    pad.each((x, y) => {
      if (!pad.get(x, y + 1)) s.paint(x, y, strap, 3)
    })
  }
  if (st.gem) jewel(s, 13, 8, 2, gemOf(st.gem))
  if (g >= 9 && hide.glow) legendaryHalo(s, hide.glow, 55)
}

/** Each hide's surface, as on its refined roll. */
function surface(s: Sprite, hide: Hide, m: Mask, id: number): void {
  const markId = hide.mark ? use(s, hide.mark, { lift: 0.4, drop: 0.28 }) : id
  m.each((x, y) => {
    if (s.mat[y * s.w + x] !== id) return
    const t = s.toneAt(x, y)
    switch (hide.surface) {
      case 'suede':
        if ((x * 5 + y * 3) % 7 === 0 && t >= 3) s.paint(x, y, id, t + 1)
        break
      case 'pores':
        if ((x * 3 + y * 5) % 8 === 0) s.paint(x, y, id, t - 1)
        break
      case 'mottle':
        if (Math.sin(x * 1.3 + y * 0.7) + Math.sin(x * 0.5 - y * 1.9) > 1.1) s.paint(x, y, id, t - 1)
        break
      case 'scales':
      case 'bigscales':
      case 'iridescent':
      case 'dragon': {
        const w = hide.surface === 'scales' ? 3 : 4, h = hide.surface === 'scales' ? 2 : 3
        const row = Math.floor(y / h)
        const lx = (((x + (row % 2) * Math.floor(w / 2)) % w) + w) % w
        if (y % h === h - 1 && lx !== 0) {
          if (hide.surface === 'dragon') s.paint(x, y, markId, Math.min(5, t + 1))
          else s.paint(x, y, id, t - 1)
        } else if (y % h === 0 && lx === 1) s.paint(x, y, id, Math.min(5, t + 1))
        if (hide.surface === 'iridescent' && (x + y * 2) % 7 < 2 && t >= 3) s.paint(x, y, markId, t)
        break
      }
      case 'studs':
        if (x % 4 === 1 && y % 4 === 1) {
          s.paint(x, y, markId, 5)
          if (m.get(x + 1, y + 1)) s.paint(x + 1, y + 1, id, 1)
        }
        break
      case 'stripes':
        if ((x + y * 2) % 9 < 2 && y % 4 !== 3) s.paint(x, y, markId, Math.max(2, t - 1))
        break
      case 'plates':
        if (y % 4 === 0 || (x + Math.floor(y / 4) * 3) % 6 === 0) s.paint(x, y, id, t - 1)
        break
    }
  })
}
