// A safe app update (both games' `update-lifecycle`, identical; uma-platform SD2): a new build waits for the owner's
// Restart, and never reloads across an action that hasn't committed. Wrap each gameplay tap in `criticalAction` and the
// restart waits for it.

export type UpdateSource = 'waiting-worker' | 'new-controller'
export type UpdateStatus = 'current' | 'ready' | 'activating' | 'restarting'

export interface UpdateSnapshot {
  readonly status: UpdateStatus
  readonly source: UpdateSource | null
  readonly activeActions: number
  readonly restartRequested: boolean
}

type Effect = () => void | Promise<void>

const CURRENT: UpdateSnapshot = { status: 'current', source: null, activeActions: 0, restartRequested: false }

export class UpdateLifecycle {
  private snapshot: UpdateSnapshot = CURRENT
  private readonly listeners = new Set<() => void>()
  private activate: Effect | null = null
  private reload: Effect | null = null

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): UpdateSnapshot => this.snapshot

  private update(next: Partial<UpdateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next }
    for (const listener of this.listeners) listener()
  }

  /** A new service worker is waiting: Restart activates it. */
  workerWaiting(activate: Effect): void {
    this.activate = activate
    this.update({ status: 'ready', source: 'waiting-worker' })
    this.advance()
  }

  /** A new service worker took control: Restart reloads the page. */
  workerControlled(reload: Effect): void {
    this.reload = reload
    this.update({ status: 'ready', source: 'new-controller' })
    this.advance()
  }

  /** Holds any restart until the returned function runs (once). */
  beginCriticalAction(): () => void {
    this.update({ activeActions: this.snapshot.activeActions + 1 })
    let finished = false
    return () => {
      if (finished) return
      finished = true
      this.update({ activeActions: Math.max(0, this.snapshot.activeActions - 1) })
      this.advance()
    }
  }

  requestRestart(): void {
    if (this.snapshot.status === 'current' || this.snapshot.status === 'restarting') return
    this.update({ restartRequested: true })
    this.advance()
  }

  private advance(): void {
    if (!this.snapshot.restartRequested || this.snapshot.activeActions > 0) return
    if (this.snapshot.source === 'new-controller' && this.reload && this.snapshot.status !== 'restarting') {
      const reload = this.reload
      this.update({ status: 'restarting' })
      void Promise.resolve(reload())
      return
    }
    if (this.snapshot.source === 'waiting-worker' && this.activate && this.snapshot.status !== 'activating') {
      const activate = this.activate
      this.update({ status: 'activating' })
      void Promise.resolve(activate()).catch(() => {
        this.update({ status: 'ready', restartRequested: false })
      })
    }
  }
}

/** The page's one lifecycle. */
export const appUpdateLifecycle = new UpdateLifecycle()

/** Runs a gameplay action so an update's restart waits for it to commit. */
export async function criticalAction<T>(action: () => Promise<T>, lifecycle: UpdateLifecycle = appUpdateLifecycle): Promise<T> {
  const finish = lifecycle.beginCriticalAction()
  try {
    return await action()
  } finally {
    finish()
  }
}

/** What vite-plugin-pwa's `registerSW` (from `virtual:pwa-register`) takes and returns. */
export type RegisterSW = (options: {
  immediate?: boolean
  onNeedRefresh?: () => void
  onNeedReload?: () => void
}) => (reloadPage?: boolean) => Promise<void>

/** Connects the game's `registerSW` to the lifecycle, instead of vite-plugin-pwa's silent auto reload. */
export function watchAppUpdates(registerSW: RegisterSW, lifecycle: UpdateLifecycle = appUpdateLifecycle): void {
  let activate: () => Promise<void> = async () => {}
  activate = registerSW({
    immediate: true,
    onNeedRefresh: () => lifecycle.workerWaiting(() => activate()),
    onNeedReload: () => lifecycle.workerControlled(() => globalThis.location?.reload()),
  })
}
