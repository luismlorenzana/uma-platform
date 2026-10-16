// Device preferences (P48): conveniences remembered on this phone only, never synced. Every read and write survives
// blocked storage. Keys are prefixed per game (`configureKit`), so two games on one origin never collide.
const CHANGED = 'uma-kit:prefs-changed'
let prefix = 'uma-kit:'

/** Sets the storage prefix for the kit's own preferences (appearance, reduced motion), such as `uma-rpg:`. */
export function configureKit({ storagePrefix }: { storagePrefix: string }): void {
  prefix = storagePrefix
}
export const kitKey = (name: string): string => `${prefix}${name}`

export function readPref(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, value)
  } catch {
    // The default stands.
  }
  globalThis.dispatchEvent?.(new Event(CHANGED))
}

/** Calls `listener` when any preference changes, here or in another tab. */
export function subscribePrefs(listener: () => void): () => void {
  globalThis.addEventListener?.(CHANGED, listener)
  globalThis.addEventListener?.('storage', listener)
  return () => {
    globalThis.removeEventListener?.(CHANGED, listener)
    globalThis.removeEventListener?.('storage', listener)
  }
}
