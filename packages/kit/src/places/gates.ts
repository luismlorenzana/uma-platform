// The boot sequence as a pure machine (uma-platform SD2): splash → sign-in → boot → first launch → start page, in that
// order, always. Each game supplies what happens at each step; the order is the kit's.

export type Gate = 'splash' | 'sign-in' | 'boot' | 'failed' | 'first-launch' | 'start' | 'ready'

export interface GateState {
  /** Auth has said who is signed in (immediately with auth off). */
  readonly authReady: boolean
  readonly authRequired: boolean
  readonly signedIn: boolean
  /** The game's boot: not started, running, done, or failed. */
  readonly boot: 'idle' | 'running' | 'done' | 'failed'
  /** What the boot found: a new account that still needs its first-launch step. */
  readonly firstLaunch: boolean
  /** The start page has been opened (once per launch). */
  readonly started: boolean
}

export const INITIAL_GATES: GateState = Object.freeze({
  authReady: false, authRequired: false, signedIn: false, boot: 'idle', firstLaunch: false, started: false,
})

/** The gate the app shows for `state`. */
export function nextGate(state: GateState): Gate {
  if (!state.authReady) return 'splash'
  if (state.authRequired && !state.signedIn) return 'sign-in'
  if (state.boot === 'idle' || state.boot === 'running') return 'boot'
  if (state.boot === 'failed') return 'failed'
  if (state.firstLaunch) return 'first-launch'
  return state.started ? 'ready' : 'start'
}
