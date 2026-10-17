// Album preferences on this device: the query, saved views and the seen set behind NEW. Stored rows are untrusted;
// anything unknown falls back. The game's configureKit prefix keeps siblings on one origin separate.
import { kitKey, readPref, writePref } from '../ui/prefs.js'
import {
  ALBUM_VIEWS,
  isActiveSelection,
  type AlbumQuery,
  type AlbumView,
  type FacetDef,
  type FacetSelection,
  type SortDef,
  type SortDirection,
} from './query.js'

export const MAX_SAVED_VIEWS = 20
export const MAX_VIEW_NAME = 40
export const MAX_SEEN_IDS = 4000

export interface SavedView {
  readonly name: string
  readonly query: AlbumQuery
}

export interface AlbumPrefs {
  readonly query: AlbumQuery
  readonly views: readonly SavedView[]
  readonly seen: readonly string[]
  /** True when this device had nothing stored: the album seeds its seen set, so nothing old reads NEW. */
  readonly fresh: boolean
}

export interface AlbumPrefsSchema {
  readonly fallback: AlbumQuery
  readonly facets: readonly FacetDef[]
  readonly sorts: readonly SortDef[]
  readonly modes?: readonly string[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function selection(value: unknown, facet: FacetDef): FacetSelection | null {
  if (facet.kind === 'boolean') return typeof value === 'boolean' ? value : null
  if (facet.kind === 'range') {
    if (!isRecord(value)) return null
    const bound = (entry: unknown) => (typeof entry === 'number' && Number.isFinite(entry) ? entry : null)
    return { min: bound(value.min), max: bound(value.max) }
  }
  if (!Array.isArray(value)) return null
  const allowed = new Set((facet.options ?? []).map((option) => option.value))
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && allowed.has(entry)))].sort()
}

/** A stored query, with unknown facets, sorts, views and modes dropped. */
export function sanitizeQuery(raw: unknown, schema: AlbumPrefsSchema): AlbumQuery {
  const { fallback, facets, sorts, modes = [] } = schema
  if (!isRecord(raw)) return fallback
  const filters: Record<string, FacetSelection> = {}
  const stored = isRecord(raw.filters) ? raw.filters : {}
  for (const facet of facets) {
    const parsed = selection(stored[facet.key], facet)
    if (parsed !== null && isActiveSelection(parsed)) filters[facet.key] = parsed
  }
  const sort = sorts.find((entry) => entry.key === raw.sort)
  const direction: SortDirection =
    raw.direction === 'asc' || raw.direction === 'desc'
      ? raw.direction
      : (sort?.defaultDirection ?? fallback.direction)
  return {
    search: typeof raw.search === 'string' ? raw.search.slice(0, 120) : '',
    filters,
    sort: sort ? sort.key : fallback.sort,
    direction: sort ? direction : fallback.direction,
    group: typeof raw.group === 'string' && facets.some((facet) => facet.key === raw.group) ? raw.group : null,
    view: ALBUM_VIEWS.includes(raw.view as AlbumView) ? (raw.view as AlbumView) : fallback.view,
    mode: typeof raw.mode === 'string' && modes.includes(raw.mode) ? raw.mode : fallback.mode,
  }
}

const preferenceKey = (album: string): string => kitKey(`album:${album}`)

export function loadAlbumPrefs(album: string, schema: AlbumPrefsSchema): AlbumPrefs {
  const text = readPref(preferenceKey(album))
  let raw: unknown = null
  try {
    raw = text ? (JSON.parse(text) as unknown) : null
  } catch {
    // A malformed stored row is the same as no stored row.
  }
  if (!isRecord(raw)) return { query: schema.fallback, views: [], seen: [], fresh: true }
  const names = new Set<string>()
  const views: SavedView[] = []
  for (const entry of Array.isArray(raw.views) ? raw.views : []) {
    if (!isRecord(entry) || typeof entry.name !== 'string') continue
    const name = entry.name.trim()
    if (name.length === 0 || name.length > MAX_VIEW_NAME || names.has(name) || views.length === MAX_SAVED_VIEWS) {
      continue
    }
    names.add(name)
    views.push({ name, query: sanitizeQuery(entry.query, schema) })
  }
  const seen = Array.isArray(raw.seen)
    ? raw.seen.filter((id): id is string => typeof id === 'string').slice(-MAX_SEEN_IDS)
    : []
  return { query: sanitizeQuery(raw.query, schema), views, seen, fresh: false }
}

export function saveAlbumPrefs(album: string, prefs: Omit<AlbumPrefs, 'fresh'>): void {
  writePref(preferenceKey(album), JSON.stringify({ query: prefs.query, views: prefs.views, seen: prefs.seen }))
}

/** Newest ids win when the list is trimmed, so a fresh arrival never loses its NEW mark. */
export function markSeen(seen: readonly string[], ids: readonly string[]): string[] {
  const next = [...new Set([...seen, ...ids])]
  return next.length <= MAX_SEEN_IDS ? next : next.slice(next.length - MAX_SEEN_IDS)
}
