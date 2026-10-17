import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { byLevel, type LevelRow } from '../roster/level.js'
import {
  emptyStateHint,
  runAlbumQuery,
  type AlbumQuery,
  type AlbumRow,
  type FacetDef,
  type SortDef,
  type SortDirection,
} from '../roster/query.js'
import { Sheet } from '../ui/BottomSheet.js'
import { Button } from '../ui/Button.js'
import { FaceTile, type FaceTileBadges } from './art.js'
import { AlbumChrome } from './AlbumChrome.js'
import { orderPickerRows, togglePickerSelection } from './grid.js'
import { VirtualGrid } from './VirtualGrid.js'
import { albumWords, type AlbumWords } from './words.js'

export interface UmaPickerRow extends AlbumRow, LevelRow {
  readonly tier?: number
}

/** A caller-owned context sort, such as a work level or stock for the selected recipe. */
export interface UmaPickerSort<T extends UmaPickerRow> {
  readonly key: string
  readonly label: string
  readonly direction: SortDirection
  readonly value: (row: T) => number | string | null
  readonly describe?: (row: T) => ReactNode
}

export interface UmaPickerProps<T extends UmaPickerRow> {
  readonly open: boolean
  readonly rows: readonly T[]
  readonly title: string
  readonly facets?: readonly FacetDef[]
  readonly sorts?: readonly UmaPickerSort<T>[]
  /** The opening order. `byLevel` is the shared default; work pickers pass `workOrder`. */
  readonly order?: (left: T, right: T) => number
  readonly disabled?: (row: T) => string | null
  readonly max?: number
  readonly selectedIds?: readonly string[]
  readonly renderBadges?: (row: T) => FaceTileBadges | undefined
  readonly renderChips?: (row: T) => ReactNode
  readonly describe?: (row: T) => ReactNode
  readonly onPick: (ids: readonly string[]) => void
  readonly onClose: () => void
  readonly words?: Partial<AlbumWords>
}

const DEFAULT_SORT = '__album_default_order__'
const NO_IDS: readonly string[] = []

export function UmaPicker<T extends UmaPickerRow>({
  open,
  rows,
  title,
  facets = [],
  sorts = [],
  order = byLevel,
  disabled = () => null,
  max = 1,
  selectedIds = NO_IDS,
  renderBadges,
  renderChips,
  describe,
  onPick,
  onClose,
  words: wordOverrides,
}: UmaPickerProps<T>) {
  const words = albumWords(wordOverrides)
  const cap = Math.max(1, Math.floor(Number.isFinite(max) ? max : 1))
  const selectedKey = selectedIds.join('\u0000')
  const openingQuery = useMemo<AlbumQuery>(() => ({
    search: '',
    filters: {},
    sort: DEFAULT_SORT,
    direction: 'desc',
    group: null,
    view: 'icons',
    mode: null,
  }), [])
  const [query, setQuery] = useState(openingQuery)
  const [parameter, setParameter] = useState<string | null>(null)
  const [selected, setSelected] = useState<readonly string[]>(selectedIds.slice(0, cap))

  useEffect(() => {
    if (!open) return
    setQuery(openingQuery)
    setParameter(null)
    setSelected(selectedIds.slice(0, cap))
  }, [cap, open, openingQuery, selectedKey])

  const prepared = useMemo(() => {
    const defaultRows = [...rows].sort(order)
    const rank = new Map(defaultRows.map((row, index) => [row.id, -index]))
    return rows.map((row): AlbumRow => ({
      id: row.id,
      search: row.search,
      facets: row.facets,
      sorts: {
        ...row.sorts,
        [DEFAULT_SORT]: rank.get(row.id) ?? -rows.length,
        ...Object.fromEntries(sorts.map((sort) => [sort.key, sort.value(row)])),
      },
    }))
  }, [order, rows, sorts])
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])
  const sortDefs: readonly SortDef[] = useMemo(() => [
    { key: DEFAULT_SORT, label: words.level, defaultDirection: 'desc' },
    ...sorts.map((sort) => ({ key: sort.key, label: sort.label, defaultDirection: sort.direction })),
  ], [sorts, words.level])
  const result = runAlbumQuery(prepared, facets, query)
  const ranked = new Map(result.rows.map((row, index) => [row.id, index]))
  const visible = result.rows.flatMap((row) => {
    const original = byId.get(row.id)
    return original === undefined ? [] : [original]
  })
  const ordered = orderPickerRows(
    visible,
    (left, right) => (ranked.get(left.id) ?? 0) - (ranked.get(right.id) ?? 0),
    disabled,
  )
  const activeSort = sorts.find((sort) => sort.key === query.sort)

  const choose = (row: T) => {
    if (disabled(row) !== null) return
    if (cap === 1) {
      onPick([row.id])
      onClose()
      return
    }
    setSelected((current) => togglePickerSelection(current, row.id, cap))
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={words.close}
      footer={cap > 1 ? (
        <div>
          <Button
            className="w-full"
            disabled={selected.length === 0}
            onClick={() => { onPick(selected); onClose() }}
          >
            {words.confirmSelection(selected.length)}
          </Button>
          <p className="mt-1 text-center text-[12px] text-ink-soft">{words.selectionLimit(cap)}</p>
        </div>
      ) : undefined}
    >
      <AlbumChrome
        compact
        title={title}
        facets={facets}
        sorts={sortDefs}
        query={query}
        counts={result.counts}
        total={result.total}
        parameter={parameter}
        emptyHint={emptyStateHint(prepared, facets, query)}
        countFor={(draft) => runAlbumQuery(prepared, facets, draft).total}
        onQueryChange={setQuery}
        onParameterChange={setParameter}
        words={wordOverrides}
      >
        <VirtualGrid
          items={ordered}
          columns={5}
          rowHeight={126}
          keyOf={(row) => row.id}
          renderItem={(row) => {
            const reason = disabled(row)
            const isSelected = selected.includes(row.id)
            const note = reason ?? describe?.(row) ?? activeSort?.describe?.(row)
            return (
              <button
                type="button"
                disabled={reason !== null}
                aria-pressed={cap > 1 ? isSelected : undefined}
                aria-label={reason === null ? row.name : `${row.name}. ${reason}`}
                onClick={() => choose(row)}
                className="block w-full min-w-0 text-center disabled:opacity-55"
              >
                <FaceTile
                  outfitId={row.id}
                  size={68}
                  badges={renderBadges?.(row)}
                  selected={isSelected}
                  label={row.name}
                />
                <span className="font-display mt-1 block truncate text-[11px] font-semibold">{row.name}</span>
                {note !== undefined && <span className="line-clamp-2 block text-[10px] leading-3 text-ink-soft">{note}</span>}
                {renderChips !== undefined && <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">{renderChips(row)}</span>}
              </button>
            )
          }}
        />
      </AlbumChrome>
    </Sheet>
  )
}
