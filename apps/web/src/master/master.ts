// Copied from uma-quest at 47ca16d: the master data release's version on Home, which proves the path from the release
// through platform-api's proxy.
import { useSyncExternalStore } from 'react'
import { CONTENT } from '../content/client'

export type MasterState = { status: 'idle' | 'loading' } | { status: 'ready'; version: string } | { status: 'error'; message: string }

let state: MasterState = { status: 'idle' }
const listeners = new Set<() => void>()
function set(next: MasterState): void {
  state = next
  for (const listener of listeners) listener()
}

export function loadMaster(): void {
  if (state.status === 'loading' || state.status === 'ready') return
  set({ status: 'loading' })
  CONTENT.manifest().then(
    (manifest) => set({ status: 'ready', version: manifest.version }),
    (err: unknown) => set({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
  )
}

export function useMaster(): MasterState {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, () => state, () => state)
}
