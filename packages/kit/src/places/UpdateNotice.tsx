// "Update ready · Restart" under the top safe area (both games' `UpdateNotice`; SD2). Never forced: the owner taps
// Restart, and a tap that hasn't saved yet finishes first.
import { useSyncExternalStore } from 'react'
import { appUpdateLifecycle, type UpdateLifecycle, type UpdateSnapshot } from './update-lifecycle.js'

export interface UpdateWords {
  readonly label: string
  readonly title: string
  readonly restart: string
  /** Under the title while nothing is running. */
  readonly idle: string
  /** While a tap is still saving. */
  readonly busy: string
  /** After Restart, while the new build gets ready. */
  readonly working: string
}

export const UPDATE_WORDS: UpdateWords = {
  label: 'App update ready',
  title: 'Update ready',
  restart: 'Restart',
  idle: 'Restart to use the new build.',
  busy: 'Your current action will finish and save first.',
  working: 'Updating…',
}

export function useAppUpdate(lifecycle: UpdateLifecycle = appUpdateLifecycle): UpdateSnapshot {
  return useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getSnapshot)
}

export function UpdateNotice({ words = UPDATE_WORDS, lifecycle = appUpdateLifecycle }: { words?: Partial<UpdateWords>; lifecycle?: UpdateLifecycle }) {
  const update = useAppUpdate(lifecycle)
  if (update.status === 'current') return null
  const say = { ...UPDATE_WORDS, ...words }
  const working = update.status === 'activating' || update.status === 'restarting'
  return (
    <aside
      role="status"
      aria-label={say.label}
      data-kit="update-notice"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex min-h-14 items-center gap-3 rounded-sm border border-accent/40 bg-panel px-4 py-2 text-ink shadow-3"
    >
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold">{say.title}</p>
        <p className="text-xs text-ink-soft">{working ? say.working : update.activeActions > 0 ? say.busy : say.idle}</p>
      </div>
      {!working && (
        <button type="button" onClick={() => lifecycle.requestRestart()} className="font-display min-h-11 shrink-0 rounded-sm bg-accent px-4 text-sm font-bold text-accent-ink">
          {say.restart}
        </button>
      )}
    </aside>
  )
}
