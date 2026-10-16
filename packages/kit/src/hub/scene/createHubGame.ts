// Creates the Phaser game for the Hub map inside a host element (uma-racer's `hub/scene/createHubGame.ts`; P48). Loaded
// lazily by `HubCanvas`: Phaser never enters a game's entry chunk. Scale NONE at zoom 1/dpr (dpr capped at 2) with a
// ResizeObserver, and no audio. `canvas` forces the Canvas renderer (preview screenshots can't capture WebGL); `debug`
// exposes `window.__hub`.
import Phaser from 'phaser'
import { hubDpr } from '../grid.js'
import { HubScene, type HubSceneArt, type HubSceneState } from './HubScene.js'

export interface HubGame {
  update(state: HubSceneState): void
  setPaused(paused: boolean): void
  destroy(): void
}

export interface HubGameOptions {
  readonly art: HubSceneArt
  /** Force the Canvas renderer. */
  readonly canvas?: boolean
  /** Expose `window.__hub` (`scene`, `game`, `paused()`). */
  readonly debug?: boolean
}

export function createHubGame(host: HTMLElement, initial: HubSceneState, options: HubGameOptions): Promise<HubGame> {
  const dpr = hubDpr()
  const size = () => ({ w: Math.max(1, Math.round(host.clientWidth * dpr)), h: Math.max(1, Math.round(host.clientHeight * dpr)) })
  const { w, h } = size()
  const scene = new HubScene(options.art)
  const game = new Phaser.Game({
    type: options.canvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: host,
    width: w,
    height: h,
    backgroundColor: initial.ground.palette.background,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    render: { antialias: true },
    scene,
  })
  let state = initial
  let destroyed = false
  const observer = new ResizeObserver(() => {
    if (destroyed) return
    const next = size()
    game.scale.resize(next.w, next.h)
    game.scale.setZoom(1 / dpr)
    scene.configure(state, dpr, false)
  })

  return new Promise((resolve) => {
    game.events.once(Phaser.Core.Events.READY, () => {
      scene.configure(state, dpr, false)
      observer.observe(host)
      if (options.debug) (window as unknown as { __hub?: unknown }).__hub = { scene, game, paused: () => game.scene.isPaused('hub') }
      resolve({
        update(next) {
          state = next
          scene.configure(next, dpr, true)
        },
        // Pausing stops the scene's updates but keeps the last frame on screen (uma-rpg D39).
        setPaused(paused) {
          if (paused) game.scene.pause('hub')
          else game.scene.resume('hub')
        },
        destroy() {
          destroyed = true
          observer.disconnect()
          game.destroy(true)
          if (options.debug) delete (window as unknown as { __hub?: unknown }).__hub
        },
      })
    })
  })
}
