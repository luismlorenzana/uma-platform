// A test enemy drawn in code (Q16 part A's dry run and the pipeline's tests): abstract shapes on her tier's canvas, a
// standing column with a head, a cape and an arm, facing right. Not character art and not a unit of the boards: its
// id, 799999, sits at the top of the enemy range, which the id ledger counts up to from 700001 and never reaches.
// A boss's battle pose is her layers composited, so it re-composites exactly by construction.

import { ENEMY_CANVAS, ENEMY_POSES, type Enemy, type EnemyAnchors, type EnemyPoint, type EnemyTier } from '@luismlorenzana/uma-data'
import { compositeOver, type Rgba } from './enemy-images'

export const FIXTURE_ENEMY_ID = 799999
export const fixtureRosterEntry = (tier: EnemyTier = 'boss', id = FIXTURE_ENEMY_ID): Enemy => ({ id, franchise: 'test', tier, name: 'Test Foe' })

export interface FixtureLayer { name: string; pivot: EnemyPoint; image: Rgba }
export interface FixturePose { image: Rgba; anchors: EnemyAnchors; layers?: FixtureLayer[] }
export interface FixtureEnemy {
  enemyId: number
  revision: number
  tier: EnemyTier
  canvas: { width: number; height: number }
  display: { figure: number; envelope?: number }
  poses: Record<string, FixturePose>
}

type Color = [number, number, number, number]
type Sdf = (x: number, y: number) => number

const blank = (width: number, height: number): Rgba => ({ data: new Uint8Array(width * height * 4), width, height })

/** Fills a signed-distance shape, antialiased over one pixel, source-over in straight alpha. */
function fill(image: Rgba, sdf: Sdf, [r, g, b, a]: Color): void {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const cover = Math.min(1, Math.max(0, 0.5 - sdf(x + 0.5, y + 0.5)))
      if (cover === 0) continue
      const i = (y * image.width + x) * 4, sa = (cover * a) / 255, da = image.data[i + 3]! / 255, oa = sa + da * (1 - sa)
      image.data[i] = Math.round((r * sa + image.data[i]! * da * (1 - sa)) / oa)
      image.data[i + 1] = Math.round((g * sa + image.data[i + 1]! * da * (1 - sa)) / oa)
      image.data[i + 2] = Math.round((b * sa + image.data[i + 2]! * da * (1 - sa)) / oa)
      image.data[i + 3] = Math.round(oa * 255)
    }
  }
}

const circle = (cx: number, cy: number, r: number): Sdf => (x, y) => Math.hypot(x - cx, y - cy) - r
const box = (cx: number, cy: number, hw: number, hh: number, round = 0): Sdf => (x, y) => {
  const dx = Math.abs(x - cx) - hw + round, dy = Math.abs(y - cy) - hh + round
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - round
}
const segment = (ax: number, ay: number, bx: number, by: number, r: number): Sdf => (x, y) => {
  const px = x - ax, py = y - ay, vx = bx - ax, vy = by - ay
  const t = Math.min(1, Math.max(0, (px * vx + py * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - vx * t, py - vy * t) - r
}

const CAPE: Color = [72, 52, 120, 235]
const BODY: Color = [196, 206, 222, 255]
const HEAD: Color = [232, 214, 196, 255]
const ARM: Color = [150, 168, 196, 255]
const STAFF: Color = [208, 176, 92, 220]

/** One pose's three parts at a lean (forward, in px) and a dip (down, in px), with the arm at `reach`. */
function parts(width: number, height: number, lean: number, dip: number, reach: number) {
  const cx = width * 0.45 + lean, foot = height - 40, top = height * 0.3 + dip
  const headY = top - 34, chestY = top + (foot - top) * 0.3
  const handX = cx + 70 + reach, handY = chestY + 20 - reach * 0.6
  const rear = blank(width, height), body = blank(width, height), front = blank(width, height)
  fill(rear, box(cx - 18, (top + foot) / 2 + 10, 58, (foot - top) / 2 - 6, 26), CAPE)
  fill(body, box(cx, (top + foot) / 2, 40, (foot - top) / 2, 18), BODY)
  fill(body, circle(cx + 4, headY, 30), HEAD)
  fill(front, segment(cx + 10, chestY, handX, handY, 13), ARM)
  fill(front, segment(handX - 6, handY + 60, handX + 6, handY - 90, 6), STAFF)
  const anchors: EnemyAnchors = {
    foot: { x: Math.round(cx), y: foot }, hit: { x: Math.round(cx), y: Math.round(chestY) },
    face: { x: Math.round(cx + 4), y: Math.round(headY) }, cast: { x: Math.round(handX + 6), y: Math.round(handY - 90) },
  }
  const pivots = { rear: { x: Math.round(cx - 18), y: Math.round(top + 10) }, body: { x: Math.round(cx), y: foot }, front: { x: Math.round(cx + 10), y: Math.round(chestY) } }
  return { layers: [{ name: 'rear', image: rear }, { name: 'body', image: body }, { name: 'front', image: front }], anchors, pivots }
}

const SHAPES: Record<string, [number, number, number]> = {
  battle: [0, 0, 0], action: [18, 4, 30], attack: [28, 6, 40], skill: [-6, -8, -20], break: [-10, 46, -40], phase: [4, -4, 10],
}
const DISPLAY: Record<EnemyTier, FixtureEnemy['display']> = { regular: { figure: 112 }, key: { figure: 140 }, boss: { figure: 180, envelope: 280 } }

/** The test enemy at a tier: every required pose, and a boss's battle pose in its three layers. */
export function fixtureEnemy(tier: EnemyTier = 'boss', enemyId = FIXTURE_ENEMY_ID): FixtureEnemy {
  const { width, height } = ENEMY_CANVAS[tier]
  const poses: Record<string, FixturePose> = {}
  for (const name of ENEMY_POSES[tier].required) {
    const [lean, dip, reach] = SHAPES[name]!
    const drawn = parts(width, height, lean, dip, reach)
    const pose: FixturePose = { image: compositeOver(drawn.layers.map((layer) => layer.image)), anchors: drawn.anchors }
    if (tier === 'boss' && name === 'battle') {
      pose.layers = drawn.layers.map((layer) => ({ name: layer.name, pivot: drawn.pivots[layer.name as keyof typeof drawn.pivots], image: layer.image }))
    }
    poses[name] = pose
  }
  return { enemyId, revision: 1, tier, canvas: { width, height }, display: DISPLAY[tier], poses }
}
