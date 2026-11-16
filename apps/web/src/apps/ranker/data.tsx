// The Ranker's data on the page (RK1): one load of the catalog, every board, the profiles and each game's enemy casting
// (P193); each edit shows at once and saves in the background, one save a board (or casting) at a time, always from the
// last revision the server returned. A save the server refuses as stale (409) replaces it with the server's copy and says
// so. Undo keeps each board's and each casting's history.
import type { BoardId, BoardState, BoardStates, CastGame, EnemyCast, TierCatalog, UmaProfiles } from '@uma-platform/tiers'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, request } from '../../api/client'

export interface RankerData {
  release: string
  builtAt: string
  catalog: TierCatalog
  states: BoardStates
  profiles: UmaProfiles
  casts: Record<CastGame, EnemyCast>
  imports: { franchise: string; source: string; filter: string; importedAt: string; units: number }[]
}
export type SaveState = 'saved' | 'saving' | 'failed'
/** What saves on its own: a board, or a game's casting (`cast:<game>`). */
type Key = BoardId | `cast:${CastGame}`
interface Ranker {
  data: RankerData | null
  error: string | null
  /** A short message: a reload after a conflict, a failed save. */
  notice: string | null
  saving: Partial<Record<Key | 'profiles', SaveState>>
  /** Replaces a board's entries, members or left-out list; undoable. */
  edit: (board: BoardId, next: BoardState) => void
  undo: (board: BoardId) => void
  canUndo: (board: BoardId) => boolean
  editProfiles: (next: UmaProfiles) => void
  /** Replaces a game's casting; undoable with `undo('cast:<game>')`. */
  editCast: (game: CastGame, next: EnemyCast) => void
  undoCast: (game: CastGame) => void
  canUndoCast: (game: CastGame) => boolean
  reload: () => Promise<void>
  dismiss: () => void
}
const Context = createContext<Ranker | null>(null)
export function useRanker(): Ranker {
  const ranker = useContext(Context)
  if (!ranker) throw new Error('useRanker must be used inside RankerProvider')
  return ranker
}

const same = (a: BoardState, b: BoardState) => JSON.stringify([a.entries, a.out]) === JSON.stringify([b.entries, b.out])
const sameCast = (a: EnemyCast, b: EnemyCast) => JSON.stringify([a.factions, a.umas]) === JSON.stringify([b.factions, b.umas])

export function RankerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RankerData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState<Ranker['saving']>({})
  const [history, setHistory] = useState<Partial<Record<BoardId, BoardState[]>>>({})
  const [castHistory, setCastHistory] = useState<Partial<Record<CastGame, EnemyCast[]>>>({})
  // What the server holds (its revision), and whether a save is in flight, per board and per casting.
  const server = useRef<Partial<Record<BoardId, BoardState>>>({})
  const castServer = useRef<Partial<Record<CastGame, EnemyCast>>>({})
  const flying = useRef<Set<string>>(new Set())
  const latest = useRef<RankerData | null>(null)
  latest.current = data

  const load = useCallback(async () => {
    try {
      const loaded = await request<RankerData>('/api/ranker')
      server.current = { ...loaded.states }
      castServer.current = { ...loaded.casts }
      setData(loaded)
      setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }, [])
  useEffect(() => { void load() }, [load])

  const flush = useCallback(async (board: BoardId) => {
    if (flying.current.has(board)) return
    flying.current.add(board)
    setSaving((s) => ({ ...s, [board]: 'saving' }))
    try {
      for (;;) {
        const want = latest.current?.states[board], base = server.current[board]
        if (!want || !base || same(want, base)) break
        try {
          const saved = await request<BoardState>(`/api/ranker/boards/${board}`, { method: 'PUT', body: JSON.stringify({ ...want, revision: base.revision }) })
          server.current[board] = saved
          setData((d) => d && { ...d, states: { ...d.states, [board]: same(d.states[board], saved) ? saved : { ...d.states[board], revision: saved.revision, updatedAt: saved.updatedAt } } })
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            const current = (e.body as { current: BoardState }).current
            server.current[board] = current
            setData((d) => d && { ...d, states: { ...d.states, [board]: current } })
            setHistory((h) => ({ ...h, [board]: [] }))
            setNotice('This board changed somewhere else, so it was reloaded. Your last change wasn’t saved.')
            break
          }
          throw e
        }
      }
      setSaving((s) => ({ ...s, [board]: 'saved' }))
    } catch (e) {
      setSaving((s) => ({ ...s, [board]: 'failed' }))
      setNotice(`Couldn’t save: ${e instanceof Error ? e.message : String(e)}`)
    } finally { flying.current.delete(board) }
  }, [])

  const edit = useCallback((board: BoardId, next: BoardState) => {
    const before = latest.current?.states[board]
    if (!before || before === next || same(before, next)) return
    setHistory((h) => ({ ...h, [board]: [...(h[board] ?? []).slice(-99), before] }))
    const updated = latest.current && { ...latest.current, states: { ...latest.current.states, [board]: next } }
    latest.current = updated
    setData(updated)
    void flush(board)
  }, [flush])

  const undo = useCallback((board: BoardId) => {
    const stack = history[board]
    const previous = stack?.[stack.length - 1]
    if (!previous || !latest.current) return
    setHistory((h) => ({ ...h, [board]: stack.slice(0, -1) }))
    const updated = { ...latest.current, states: { ...latest.current.states, [board]: { ...previous, revision: latest.current.states[board].revision } } }
    latest.current = updated
    setData(updated)
    void flush(board)
  }, [history, flush])

  const editProfiles = useCallback((next: UmaProfiles) => {
    const current = latest.current
    if (!current) return
    setData({ ...current, profiles: next })
    setSaving((s) => ({ ...s, profiles: 'saving' }))
    void request<UmaProfiles>('/api/ranker/profiles', { method: 'PUT', body: JSON.stringify({ ...next, revision: current.profiles.revision }) }).then(
      (saved) => { setData((d) => d && { ...d, profiles: saved }); setSaving((s) => ({ ...s, profiles: 'saved' })) },
      (e: unknown) => {
        setSaving((s) => ({ ...s, profiles: 'failed' }))
        if (e instanceof ApiError && e.status === 409) { setData((d) => d && { ...d, profiles: (e.body as { current: UmaProfiles }).current }); setNotice('The profiles changed somewhere else, so they were reloaded.') }
        else setNotice(`Couldn’t save the profile: ${e instanceof Error ? e.message : String(e)}`)
      },
    )
  }, [])

  const flushCast = useCallback(async (game: CastGame) => {
    const key: Key = `cast:${game}`
    if (flying.current.has(key)) return
    flying.current.add(key)
    setSaving((s) => ({ ...s, [key]: 'saving' }))
    try {
      for (;;) {
        const want = latest.current?.casts[game], base = castServer.current[game]
        if (!want || !base || sameCast(want, base)) break
        try {
          const saved = await request<EnemyCast>(`/api/ranker/casts/${game}`, { method: 'PUT', body: JSON.stringify({ ...want, revision: base.revision }) })
          castServer.current[game] = saved
          const update = (d: RankerData | null) => d && { ...d, casts: { ...d.casts, [game]: sameCast(d.casts[game], saved) ? saved : { ...d.casts[game], revision: saved.revision, updatedAt: saved.updatedAt } } }
          latest.current = update(latest.current)
          setData(update)
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) {
            const current = (e.body as { current: EnemyCast }).current
            castServer.current[game] = current
            const update = (d: RankerData | null) => d && { ...d, casts: { ...d.casts, [game]: current } }
            latest.current = update(latest.current)
            setData(update)
            setCastHistory((h) => ({ ...h, [game]: [] }))
            setNotice('The casting changed somewhere else, so it was reloaded. Your last change wasn’t saved.')
            break
          }
          throw e
        }
      }
      setSaving((s) => ({ ...s, [key]: 'saved' }))
    } catch (e) {
      setSaving((s) => ({ ...s, [key]: 'failed' }))
      setNotice(`Couldn’t save the casting: ${e instanceof Error ? e.message : String(e)}`)
    } finally { flying.current.delete(key) }
  }, [])

  const editCast = useCallback((game: CastGame, next: EnemyCast) => {
    const before = latest.current?.casts[game]
    if (!before || before === next || sameCast(before, next)) return
    setCastHistory((h) => ({ ...h, [game]: [...(h[game] ?? []).slice(-99), before] }))
    const updated = latest.current && { ...latest.current, casts: { ...latest.current.casts, [game]: next } }
    latest.current = updated
    setData(updated)
    void flushCast(game)
  }, [flushCast])

  const undoCast = useCallback((game: CastGame) => {
    const stack = castHistory[game]
    const previous = stack?.[stack.length - 1]
    if (!previous || !latest.current) return
    setCastHistory((h) => ({ ...h, [game]: stack.slice(0, -1) }))
    const updated = { ...latest.current, casts: { ...latest.current.casts, [game]: { ...previous, revision: latest.current.casts[game].revision } } }
    latest.current = updated
    setData(updated)
    void flushCast(game)
  }, [castHistory, flushCast])

  const reload = useCallback(async () => {
    await request('/api/ranker/reload', { method: 'POST' })
    await load()
  }, [load])

  const value = useMemo<Ranker>(() => ({
    data, error, notice, saving, edit, undo, canUndo: (board) => (history[board]?.length ?? 0) > 0, editProfiles,
    editCast, undoCast, canUndoCast: (game) => (castHistory[game]?.length ?? 0) > 0, reload, dismiss: () => setNotice(null),
  }), [data, error, notice, saving, edit, undo, history, editProfiles, editCast, undoCast, castHistory, reload])
  return (
    <Context.Provider value={value}>
      {children}
      {notice && (
        <div role="status" className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-md bg-ink p-3 text-sm text-page shadow-3">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-semibold">OK</button>
        </div>
      )}
    </Context.Provider>
  )
}
