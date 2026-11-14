// "Update ready · Restart" under the top safe area (both games' `UpdateNotice`; SD2). Never forced: the owner taps
// Restart, and a tap that hasn't saved yet finishes first.
//
// With `clearSides` (0.20.0, uma-farm's F74) it keeps clear of the left and right safe areas too, as on a landscape stage,
// where the notch and the home bar sit on the sides. Where those insets are 0 it sits where it always did.
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

const NOTICE_LOOK = 'z-50 flex min-h-14 items-center gap-3 rounded-sm border border-accent/40 bg-panel px-4 py-2 text-ink shadow-3'
const TOP = 'top-[calc(var(--inset-top,env(safe-area-inset-top))+0.75rem)]'
/** 0.75rem in from each side, past the side's safe area. */
const SIDES = 'right-[calc(var(--inset-right,env(safe-area-inset-right))+0.75rem)] left-[calc(var(--inset-left,env(safe-area-inset-left))+0.75rem)]'

export function UpdateNotice({ words = UPDATE_WORDS, lifecycle = appUpdateLifecycle, clearSides = false }: {
  words?: Partial<UpdateWords>
  lifecycle?: UpdateLifecycle
  /** Keep clear of the left and right safe areas as well as the top one (a landscape stage). Off by default (0.20.0). */
  clearSides?: boolean
}) {
  const update = useAppUpdate(lifecycle)
  if (update.status === 'current') return null
  const say = { ...UPDATE_WORDS, ...words }
  const working = update.status === 'activating' || update.status === 'restarting'
  return (
    <aside
      role="status"
      aria-label={say.label}
      data-kit="update-notice"
      data-clear-sides={clearSides || undefined}
      className={`fixed ${clearSides ? SIDES : 'inset-x-3'} ${TOP} ${NOTICE_LOOK}`}
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
