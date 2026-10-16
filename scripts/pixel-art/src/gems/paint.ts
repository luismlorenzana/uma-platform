// Eight planet silhouettes: heart, drop, spear, star, shield, hexagonal tablet, bolt and crescent.
// Six-tone top-left lighting, rough → cut → mounted construction, and the shared legendary glints.
import { ramp } from '../color.ts'
import { GLINTS } from '../icon.ts'
import { rng } from '../rng.ts'
import { cutStone, Mask, shadeDome, shadeFacets, type Point } from '../shape.ts'
import { Sprite } from '../sprite.ts'
import { PLANETS, type Effect, type GemSpec } from './spec.ts'

export const SIZE = 32
export const ACCENT_START = 23
const CX = 15.5, CY = 15.5
const SHAPES: Record<Effect, readonly Point[]> = {
  hp: [[0, -.6], [.35, -1], [.75, -.95], [1, -.5], [.9, .05], [0, 1.1], [-.9, .05], [-1, -.5], [-.75, -.95], [-.35, -1]],
  mp: [[0, -1.25], [.65, -.35], [.85, .25], [.65, .8], [0, 1], [-.65, .8], [-.85, .25], [-.65, -.35]],
  atk: [[0, -1.25], [.65, -.5], [.65, .5], [0, 1.25], [-.65, .5], [-.65, -.5]],
  matk: Array.from({ length: 12 }, (_, i): Point => {
    const a = i * Math.PI / 6 - Math.PI / 2, r = i % 2 ? .53 : 1
    return [Math.cos(a) * r, Math.sin(a) * r]
  }),
  def: [[-.72, -.85], [.72, -.85], [1, -.55], [.9, .25], [.6, .7], [0, 1.15], [-.6, .7], [-.9, .25], [-1, -.55]],
  mdef: [[-.65, -.85], [.65, -.85], [1.1, 0], [.65, .85], [-.65, .85], [-1.1, 0]],
  speed: [[.3, -1.2], [-.95, .05], [-.2, .05], [-.5, 1.2], [1, -.35], [.25, -.35]],
  limit: [[.25, -1.1], [-.5, -.9], [-.95, -.3], [-.85, .45], [-.2, 1], [.55, .9], [.95, .4], [.3, .55], [-.15, .2], [-.2, -.4]],
}
const add = (s: Sprite, color: string) => s.addRamp(ramp(color, { lift: .36, drop: .27, hueShift: 9 }))
const transformed = (points: readonly Point[], scale: number, cx = CX, cy = CY): Point[] => points.map(([x, y]) => [cx + x * scale, cy + y * scale])
const inset = (points: readonly Point[], scale: number, cx: number, cy: number): Point[] => points.map(([x, y]) => [cx - .5 + (x - cx) * scale, cy - .7 + (y - cy) * scale])

/** Clip the facet painter back to the stone: concave stars/crescents must keep their cut-in silhouette. */
function cut(s: Sprite, id: number, points: Point[], table: number, cx = CX, cy = CY): void {
  const inner = inset(points, table, cx, cy), faces = new Sprite()
  shadeFacets(faces, points, cutStone(points, inner, 4), 0)
  const body = Mask.polygon(points)
  body.each((x, y) => s.paint(x, y, id, faces.toneAt(x, y)))
  const top = Mask.polygon(inner)
  top.each((x, y) => {
    if (!body.get(x, y)) return
    if (!top.get(x - 1, y) || !top.get(x, y - 1)) s.paint(x, y, id, 5)
    else if (x + y > cx + cy + 1) s.paint(x, y, id, 3)
  })
}

function mount(s: Sprite, points: readonly Point[], grade: number, cx = CX, cy = CY): number {
  const metal = add(s, grade === 7 ? '#b89462' : grade === 8 ? '#b7c9d7' : '#e4be59')
  const surround = Mask.polygon(points.map(([x, y]): Point => [cx + (x - cx) * 1.18, cy + (y - cy) * 1.18]))
  shadeDome(s, surround, metal, { contact: false, relief: .3 })
  return metal
}

/** Prongs follow actual stone boundary points, not an arbitrary square badge behind every shape. */
function prongs(s: Sprite, id: number, points: readonly Point[], grade: number): void {
  const every = grade >= 10 ? 2 : 3
  for (let i = 0; i < points.length; i += every) {
    const p = points[i]!, x = Math.floor(p[0]), y = Math.floor(p[1])
    s.paint(x, y, id, i < points.length / 2 ? 4 : 3)
    if (grade >= 8) s.paint(x, y - 1, id, 5)
  }
}

function moon(s: Sprite, effect: Effect, grade: number): void {
  const color = add(s, PLANETS[effect].color)
  const scale = [0, 5.6, 6.3, 7, 6.8, 7.3, 7.8, 7.1, 7.6, 7.1, 7.4][grade]!
  let points = transformed(SHAPES[effect], scale)
  if (grade <= 3) {
    const random = rng(`rough:${effect}:${grade}`)
    points = points.flatMap((p, i): Point[] => {
      const next = points[(i + 1) % points.length]!
      const k = .84 + random() * .2
      return [[CX + (p[0] - CX) * k, CY + (p[1] - CY) * k],
        [(p[0] + next[0]) / 2 + (random() - .5) * 1.6, (p[1] + next[1]) / 2 + (random() - .5) * 1.6]]
    })
    const rough = Mask.polygon(points)
    shadeDome(s, rough, color, { contact: false, relief: .6 })
    rough.each((x, y) => {
      if ((x * 7 + y * 11 + grade) % 13 === 0) s.shift(x, y, -2)
      else if ((x * 3 + y * 7) % 17 === 0) s.shift(x, y, 1)
    })
    return
  }
  const setting = grade >= 7 ? mount(s, points, grade) : undefined
  cut(s, color, points, grade === 4 ? .37 : grade === 5 ? .5 : .6)
  if (grade === 6 || grade >= 8) {
    // A second step of polish: a narrow nested table, structurally different from the previous cut.
    const inner = inset(points, .7, CX, CY)
    cut(s, color, inner, .65)
  }
  if (setting !== undefined) prongs(s, setting, points, grade)
}

function bridge(s: Sprite, effects: readonly [Effect, Effect], grade: number): void {
  const scale = grade === 7 ? 5.8 : 4.4
  const crystal: readonly Point[] = [[0, -1.2], [.65, -.55], [.65, .55], [0, 1.15], [-.65, .55], [-.65, -.55]]
  const twins = [{ cx: 10.5, cy: 16, effect: effects[0] }, { cx: 19.5, cy: 13.5, effect: effects[1] }]
  if (grade === 7) {
    const metal = add(s, '#b7c9d7')
    Mask.polygon([[10, 17], [21, 14], [21, 20], [11, 24], [8, 22]]).each((x, y) => s.paint(x, y, metal, y < 19 ? 4 : 2))
  }
  for (const { cx, cy, effect } of twins) {
    const points = transformed(crystal, scale, cx, cy)
    const setting = grade === 7 ? mount(s, points, 8, cx, cy) : undefined
    cut(s, add(s, PLANETS[effect].color), points, .48, cx, cy)
    if (setting !== undefined) prongs(s, setting, points, 7)
  }
}

export const sunRayCount = (grade: number): number => grade
function sun(s: Sprite, grade: number): void {
  const gold = add(s, '#f5c542'), rays = sunRayCount(grade)
  const radius = grade === 4 ? 8.5 : grade === 6 ? 9.3 : grade === 8 ? 10 : 10.6
  for (let i = 0; i < rays; i++) {
    const a = i * Math.PI * 2 / rays - Math.PI / 2
    const poly: Point[] = [
      [CX + Math.cos(a - .16) * 5, CY + Math.sin(a - .16) * 5],
      [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius],
      [CX + Math.cos(a + .16) * 5, CY + Math.sin(a + .16) * 5],
    ]
    Mask.polygon(poly).each((x, y) => s.paint(x, y, gold, Math.cos(a) + Math.sin(a) < 0 ? 5 : 3))
  }
  const prism: Point[] = [[CX, CY - 7], [CX + 5.7, CY - 2], [CX + 4, CY + 5], [CX, CY + 7.5], [CX - 4, CY + 5], [CX - 5.7, CY - 2]]
  const setting = grade >= 8 ? mount(s, prism, grade) : undefined
  cut(s, gold, prism, grade >= 8 ? .58 : .4)
  if (setting !== undefined) prongs(s, setting, prism, grade)
}

export function paintGem(s: Sprite, spec: GemSpec): void {
  if (spec.kind === 'moon') moon(s, spec.effects[0], spec.grade)
  else if (spec.kind === 'bridge') bridge(s, spec.effects, spec.grade)
  else sun(s, spec.grade)
}

export function drawGem(spec: GemSpec): Uint8Array {
  const sprite = new Sprite()
  sprite.shadow = { cx: 14.5, cy: 26.7, rx: 9.5, ry: 2, alpha: 70 }
  paintGem(sprite, spec)
  if (spec.grade >= 9) for (const [x, y, radius] of GLINTS) {
    for (let k = -radius; k <= radius; k++) for (const [gx, gy] of [[x + k, y], [x, y + k]] as const) {
      if (sprite.filled(gx, gy) || [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dx, dy]) => sprite.filled(gx + dx!, gy + dy!))) throw new Error(`${spec.id}: legendary glint overlaps ink at ${gx},${gy}`)
    }
    sprite.sparkle(x, y, radius)
  }
  const px = sprite.render()
  for (let y = ACCENT_START; y < SIZE; y++) for (let x = ACCENT_START; x < SIZE; x++) {
    const at = (y * SIZE + x) * 4
    if (px[at + 3] === 255) throw new Error(`${spec.id}: ink enters reserved corner at ${x},${y}`)
    px.fill(0, at, at + 4)
  }
  return px
}
