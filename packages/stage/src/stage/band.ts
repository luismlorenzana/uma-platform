// The band camera and the tap-or-pan gesture (uma-platform ST2; uma-farm F57's asks 7 and 8, FR6). The farm's camera
// pans only up and down: a drag moves it with the finger, a flick glides it and it settles with the top of the view on a
// band (4 tiles: a row of plots and its path), no zoom and no sideways pan. The engine snaps it to the device pixel grid
// as it does uma-quest's follow camera. Pure: the game or the stage feeds it pointer moves and frame times.
import { CAMERA_PITCH, follow, TEXELS_PER_UNIT } from './camera.js'

/** A band's depth in tiles (kit-farm KF2). */
export const BAND_TILES = 4
/** How far beyond the farm's back and front edges the view may go, in tiles (what stands on the back row rises above it). */
export const BAND_OVERSCAN = { top: 2, bottom: 1 } as const
/** How fast a glide slows, a second (an exponential's rate): a flick of v tiles a second carries about v / 4 tiles. */
export const BAND_FRICTION = 4
/** A drag past an edge moves the view this much of the finger's move. */
const EDGE_GIVE = 1 / 3

/** Ground tiles a device pixel spans in depth, through the camera's 35° pitch. */
export const tilesPerDevicePixel = (pitch = CAMERA_PITCH): number => 1 / (TEXELS_PER_UNIT * Math.sin(pitch))
/** The ground depth a drawing buffer `deviceHeight` pixels tall shows, in tiles. */
export const viewDepthOf = (deviceHeight: number, pitch = CAMERA_PITCH): number => deviceHeight * tilesPerDevicePixel(pitch)

export interface BandCameraOptions { band?: number; overscan?: { top: number; bottom: number }; friction?: number }

export class BandCamera {
  /** The ground z at the view's middle. */
  centre = 0
  private min = 0
  private max = 0
  private viewDepth = 1
  private target: number | null = null
  private rate = 8
  private readonly band: number
  private readonly overscan: { top: number; bottom: number }
  private readonly friction: number

  constructor(options: BandCameraOptions = {}) {
    this.band = options.band ?? BAND_TILES
    this.overscan = options.overscan ?? BAND_OVERSCAN
    this.friction = options.friction ?? BAND_FRICTION
  }

  /** The farm's depth and the view's ground depth, in tiles: sets the range and keeps the camera inside it. */
  setView(depth: number, viewDepth: number): void {
    this.viewDepth = viewDepth
    const min = -this.overscan.top + viewDepth / 2, max = depth + this.overscan.bottom - viewDepth / 2
    // A farm shorter than the view sits in its middle and doesn't pan.
    if (min > max) this.min = this.max = (min + max) / 2
    else { this.min = min; this.max = max }
    this.centre = this.clamp(this.centre)
    if (this.target !== null) this.target = this.nearestStop(this.target)
  }

  get range(): { min: number; max: number } { return { min: this.min, max: this.max } }
  /** The ground z at the view's top edge. */
  get top(): number { return this.centre - this.viewDepth / 2 }
  get settled(): boolean { return this.target === null }

  private clamp(z: number): number { return Math.min(this.max, Math.max(this.min, z)) }

  /** Where the camera may come to rest: the top of the view on a band's first row, and the two ends. */
  stops(): number[] {
    const out = new Set([this.min, this.max])
    const half = this.viewDepth / 2
    for (let top = Math.ceil((this.min - half) / this.band) * this.band; top + half <= this.max; top += this.band) out.add(top + half)
    return [...out].sort((a, b) => a - b)
  }

  nearestStop(z: number): number {
    const c = this.clamp(z)
    return this.stops().reduce((best, s) => (Math.abs(s - c) < Math.abs(best - c) ? s : best), this.min)
  }

  /** A finger's move, in tiles of ground (positive pulls the view toward the front); past an edge it gives a third. */
  drag(tiles: number): void {
    this.target = null
    const next = this.centre + tiles
    const over = next < this.min ? next - this.min : next > this.max ? next - this.max : 0
    this.centre = next - over * (1 - EDGE_GIVE)
  }

  /** The finger lifts moving at `velocity` tiles a second: the camera glides to the band stop nearest where it'd coast to. */
  release(velocity = 0): void {
    const coast = this.centre + velocity / this.friction
    this.target = this.nearestStop(coast)
    const gap = Math.abs(this.target - this.centre)
    // Leave at the finger's speed (an ease's speed is rate × gap), within reason.
    this.rate = gap > 1e-6 ? Math.min(14, Math.max(4, Math.abs(velocity) / gap)) : 8
  }

  /** Moves to show ground row `z` at the view's middle (the game's call), settling on the nearest stop. */
  goTo(z: number, instant = false): void {
    this.target = this.nearestStop(z)
    this.rate = 8
    if (instant) { this.centre = this.target; this.target = null }
  }

  /** Advances a frame; true while moving. */
  step(dt: number): boolean {
    if (this.target === null) return false
    this.centre = follow(this.centre, this.target, dt, this.rate)
    if (this.centre === this.target) { this.target = null; return false }
    return true
  }
}

// --- Tap or pan ----------------------------------------------------------------------------------------------------------

/** How far a finger may move, in CSS px, and still be a tap. */
export const TAP_SLOP = 8
/** The window a lift's velocity is read over, in ms. */
const VELOCITY_MS = 100

export type GestureEnd = { kind: 'tap'; x: number; y: number } | { kind: 'fling'; velocity: number } | { kind: 'none' }

/** One finger on the stage, in stage CSS px: a tap, or a vertical pan with its lift velocity (px a second, down positive). */
export class TapPan {
  private start: { x: number; y: number } | null = null
  private last = { x: 0, y: 0 }
  private panning = false
  private samples: { y: number; t: number }[] = []

  down(x: number, y: number, t: number): void {
    this.start = { x, y }
    this.last = { x, y }
    this.panning = false
    this.samples = [{ y, t }]
  }

  /** The vertical move to pan by since the last call, once the finger has left the tap's slop; else null. */
  move(x: number, y: number, t: number): number | null {
    if (!this.start) return null
    this.samples.push({ y, t })
    while (this.samples.length > 2 && t - this.samples[0]!.t > VELOCITY_MS) this.samples.shift()
    if (!this.panning && Math.hypot(x - this.start.x, y - this.start.y) > TAP_SLOP) { this.panning = true; this.last.y = this.start.y }
    if (!this.panning) return null
    const dy = y - this.last.y
    this.last = { x, y }
    return dy
  }

  up(x: number, y: number, t: number): GestureEnd {
    if (!this.start) return { kind: 'none' }
    const was = this.panning
    this.move(x, y, t)
    const first = this.samples[0]!, span = t - first.t
    this.start = null
    if (!was && !this.panning) return { kind: 'tap', x, y }
    return { kind: 'fling', velocity: span > 0 ? ((y - first.y) / span) * 1000 : 0 }
  }

  cancel(): void { this.start = null; this.panning = false }
  get active(): boolean { return this.start !== null }
}
