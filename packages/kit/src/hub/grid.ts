// The Hub map's grid (uma-racer's `hub/grid.ts`, from uma-rpg's D61 and D64; P48):
// 16 px art tiles drawn at a whole number of device pixels per art pixel. Shared by the Phaser scene, which snaps every
// building to it, and the DOM place links, which sit on the same spots. Unlike uma-rpg's, the grid has an odd number of
// columns and is centred across the screen (by whole device pixels), so the trunk road and the places on it stand in the
// middle at any width and the two sides mirror each other.
//
// An `across` map (0.20.0, uma-farm's F74, a landscape stage) turns that about: an odd number of rows centred down the
// map (`top`), so the trunk road runs across the middle row, and columns from the left edge as far as the map is wide.
import type { PlaceAt } from './types.js'

/**
 * Which way a Hub map runs: `down` (the trunk road down the middle; the map scrolls up and down) or `across` (the road
 * across the middle; the map scrolls sideways, 0.20.0).
 */
export const HUB_FLOWS = ['down', 'across'] as const
export type HubFlow = (typeof HUB_FLOWS)[number]

export const ART_TILE = 16
/** A building sprite's size and ground line, in art pixels (uma-art's `buildings` atlas: 48 × 48, `anchorY` 44). */
export const BUILDING = { size: 48, anchorY: 44 } as const
/** A place link's width in CSS px: its building (three 24 px tiles), its longest name and four pips fit. */
export const TARGET_W = 112

/** The device pixel ratio the Hub renders at (2 at most: more costs fill rate for nothing visible). */
export const hubDpr = (): number => Math.min((typeof window === 'undefined' ? 1 : window.devicePixelRatio) || 1, 2)
/** CSS px per art pixel: 1.5 on 2× screens (3 device pixels), 2 on 1× ones. */
export const artScale = (dpr: number): number => (dpr >= 2 ? 1.5 : 2)

export interface HubGrid {
  readonly scale: number
  /** A tile's size in CSS px. */
  readonly tile: number
  /** Always odd, so one column is the middle. */
  readonly cols: number
  readonly rows: number
  /** How far the grid's left edge sits left of the screen's, in CSS px: half its overhang, on a whole device pixel. */
  readonly left: number
  /** An `across` grid's: how far its top edge sits above the map's, half its overhang, on a whole device pixel. */
  readonly top?: number
}

export function hubGrid(w: number, h: number, dpr: number, flow: HubFlow = 'down'): HubGrid {
  const scale = artScale(dpr)
  const tile = ART_TILE * scale
  if (flow === 'across') {
    const fit = Math.max(1, Math.ceil(h / tile))
    const rows = fit % 2 === 1 ? fit : fit + 1
    const top = Math.round(((rows * tile - h) / 2) * dpr) / dpr
    return { scale, tile, cols: Math.max(1, Math.ceil(w / tile)), rows, left: 0, top }
  }
  const fit = Math.max(1, Math.ceil(w / tile))
  const cols = fit % 2 === 1 ? fit : fit + 1
  const left = Math.round(((cols * tile - w) / 2) * dpr) / dpr
  return { scale, tile, cols, rows: Math.max(1, Math.ceil(h / tile)), left }
}

/** The cell a place stands on: its column and the row its ground line is in. */
export function placeCell(at: PlaceAt, cols: number, rows: number): { col: number; row: number } {
  return { col: Math.min(cols - 1, Math.max(0, Math.floor(at.x * cols))), row: Math.min(rows - 1, Math.max(0, Math.floor(at.y * rows))) }
}

/** Where a place's building meets the ground, in CSS px: its sprite spans its column ±1 and the two rows above. */
export function placeAnchor(at: PlaceAt, grid: HubGrid): { x: number; y: number } {
  const { col, row } = placeCell(at, grid.cols, grid.rows)
  const y = (row - 2) * grid.tile + BUILDING.anchorY * grid.scale
  return { x: (col + 0.5) * grid.tile - grid.left, y: grid.top === undefined ? y : y - grid.top }
}
