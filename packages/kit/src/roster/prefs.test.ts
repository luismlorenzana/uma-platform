import { beforeEach, describe, expect, it } from 'vitest'
import { configureKit } from '../ui/prefs.js'
import {
  loadAlbumPrefs,
  markSeen,
  MAX_SEEN_IDS,
  sanitizeQuery,
  saveAlbumPrefs,
  type AlbumPrefsSchema,
} from './prefs.js'
import type { AlbumQuery } from './query.js'

const fallback: AlbumQuery = {
  search: '',
  filters: {},
  sort: 'level',
  direction: 'desc',
  group: null,
  view: 'icons',
  mode: 'outfit',
}

const schema: AlbumPrefsSchema = {
  fallback,
  facets: [
    {
      key: 'surface',
      label: 'Surface',
      kind: 'enum',
      group: 'Aptitude',
      options: [
        { value: 'turf', label: 'Turf' },
        { value: 'dirt', label: 'Dirt' },
      ],
    },
    { key: 'level', label: 'Level', kind: 'range', group: 'Progress' },
    { key: 'owned', label: 'Owned', kind: 'boolean', group: 'Ownership' },
  ],
  sorts: [
    { key: 'level', label: 'Level', defaultDirection: 'desc' },
    { key: 'name', label: 'Name', defaultDirection: 'asc' },
  ],
  modes: ['outfit', 'character'],
}

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>()
  get length(): number {
    return this.#values.size
  }
  clear(): void {
    this.#values.clear()
  }
  getItem(key: string): string | null {
    return this.#values.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.#values.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.#values.delete(key)
  }
  setItem(key: string, value: string): void {
    this.#values.set(key, value)
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
  configureKit({ storagePrefix: 'test-game:' })
})

describe('album preferences', () => {
  it('sanitizes junk input against the declared schema', () => {
    const result = sanitizeQuery(
      {
        search: 'x'.repeat(130),
        filters: {
          surface: ['turf', 'unknown', 'turf', 4],
          level: { min: 3, max: Number.POSITIVE_INFINITY },
          owned: false,
          madeUp: ['x'],
        },
        sort: 'name',
        direction: 'sideways',
        group: 'madeUp',
        view: 'poster',
        mode: 'madeUp',
      },
      schema,
    )

    expect(result).toEqual({
      search: 'x'.repeat(120),
      filters: { surface: ['turf'], level: { min: 3, max: null } },
      sort: 'name',
      direction: 'asc',
      group: null,
      view: 'icons',
      mode: 'outfit',
    })
  })

  it('stores under the configured kit album key and survives malformed storage', () => {
    const prefs = { query: { ...fallback, search: 'alpha' }, views: [], seen: ['1'] }
    saveAlbumPrefs('stable', prefs)
    expect(globalThis.localStorage.getItem('test-game:album:stable')).not.toBeNull()
    expect(loadAlbumPrefs('stable', schema)).toEqual({ ...prefs, fresh: false })

    globalThis.localStorage.setItem('test-game:album:broken', '{')
    expect(loadAlbumPrefs('broken', schema)).toEqual({ query: fallback, views: [], seen: [], fresh: true })
  })

  it('keeps the newest unique seen ids at the cap', () => {
    const full = Array.from({ length: MAX_SEEN_IDS }, (_, index) => `old-${index}`)
    const result = markSeen(full, ['old-0', 'new-a', 'new-b'])
    expect(result).toHaveLength(MAX_SEEN_IDS)
    expect(result.slice(0, 2)).toEqual(['old-2', 'old-3'])
    expect(result.slice(-2)).toEqual(['new-a', 'new-b'])
  })
})
