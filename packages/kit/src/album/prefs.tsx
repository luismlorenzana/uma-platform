import { useCallback, useState } from 'react'
import {
  MAX_SAVED_VIEWS,
  MAX_VIEW_NAME,
  loadAlbumPrefs,
  markSeen,
  saveAlbumPrefs,
  type AlbumPrefs,
  type AlbumPrefsSchema,
} from '../roster/prefs.js'
import type { AlbumQuery } from '../roster/query.js'

export interface AlbumPrefsHandle extends AlbumPrefs {
  setQuery(query: AlbumQuery): void
  saveView(name: string): void
  deleteView(name: string): void
  /** Marks ids seen, so their NEW marks go. */
  see(ids: readonly string[]): void
}

/** One album's bounded device preferences, backed by `/roster`'s pure storage functions. */
export function useAlbumPrefs(album: string, schema: AlbumPrefsSchema): AlbumPrefsHandle {
  const [prefs, setPrefs] = useState<AlbumPrefs>(() => loadAlbumPrefs(album, schema))
  const update = useCallback((change: (current: AlbumPrefs) => AlbumPrefs) => {
    setPrefs((current) => {
      const next = change(current)
      saveAlbumPrefs(album, next)
      return next
    })
  }, [album])

  return {
    ...prefs,
    setQuery: (query) => update((current) => ({ ...current, query })),
    saveView: (name) => update((current) => {
      const trimmed = name.trim().slice(0, MAX_VIEW_NAME)
      if (trimmed.length === 0) return current
      const kept = current.views.filter((view) => view.name !== trimmed)
      if (kept.length >= MAX_SAVED_VIEWS) return current
      return { ...current, views: [...kept, { name: trimmed, query: current.query }] }
    }),
    deleteView: (name) => update((current) => ({
      ...current,
      views: current.views.filter((view) => view.name !== name),
    })),
    see: (ids) => update((current) =>
      ids.every((id) => current.seen.includes(id))
        ? current
        : { ...current, seen: markSeen(current.seen, ids) }),
  }
}
