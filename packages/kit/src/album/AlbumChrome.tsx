import { useCallback, useState, type ReactNode } from 'react'
import { MAX_VIEW_NAME, type SavedView } from '../roster/prefs.js'
import {
  ALBUM_VIEWS,
  isActiveSelection,
  type AlbumPreset,
  type AlbumQuery,
  type EmptyStateHint,
  type FacetDef,
  type SortDef,
} from '../roster/query.js'
import { Sheet } from '../ui/BottomSheet.js'
import { Button } from '../ui/Button.js'
import { Chip } from '../ui/Chip.js'
import { Tabs } from '../ui/Tabs.js'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CloseIcon,
  FilterIcon,
  ViewCardsIcon,
  ViewGridIcon,
  ViewListIcon,
} from '../ui/icons/index.js'
import { FilterTray } from './FilterTray.js'
import { SortSheet } from './SortSheet.js'
import { albumWords, type AlbumWords } from './words.js'

export type AlbumTab = 'all' | 'owned' | 'locked'

export interface AlbumTabs {
  readonly value: AlbumTab
  readonly counts: Readonly<Record<AlbumTab, number>>
  readonly onChange: (tab: AlbumTab) => void
  readonly label?: string
}

const VIEW_GLYPHS = { icons: ViewGridIcon, cards: ViewCardsIcon, list: ViewListIcon } as const

export interface AlbumChromeProps {
  readonly title: string
  readonly completion?: ReactNode
  readonly titleAccessory?: ReactNode
  readonly tabs?: AlbumTabs
  readonly facets: readonly FacetDef[]
  readonly sorts: readonly SortDef[]
  readonly presets?: readonly AlbumPreset[]
  readonly query: AlbumQuery
  readonly counts: Readonly<Record<string, Readonly<Record<string, number>>>>
  readonly total: number
  readonly parameter?: string | null
  readonly views?: readonly SavedView[]
  readonly emptyHint?: EmptyStateHint | null
  readonly hiddenFilterKeys?: readonly string[]
  readonly countFor: (draft: AlbumQuery) => number
  readonly onQueryChange: (query: AlbumQuery) => void
  readonly onParameterChange?: (parameter: string | null) => void
  readonly onSaveView?: (name: string) => void
  readonly onDeleteView?: (name: string) => void
  readonly children?: ReactNode
  readonly words?: Partial<AlbumWords>
  /** Picker chrome: no title, tabs, saved views or view switch. */
  readonly compact?: boolean
}

export function AlbumChrome({
  title,
  completion,
  titleAccessory,
  tabs,
  facets,
  sorts,
  presets = [],
  query,
  counts,
  total,
  parameter = null,
  views,
  emptyHint = null,
  hiddenFilterKeys,
  countFor,
  onQueryChange,
  onParameterChange,
  onSaveView,
  onDeleteView,
  children,
  words: wordOverrides,
  compact = false,
}: AlbumChromeProps) {
  const words = albumWords(wordOverrides)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [viewName, setViewName] = useState('')
  const [draftTotal, setDraftTotal] = useState(total)

  const activeFacets = facets.filter((facet) =>
    isActiveSelection(query.filters[facet.key]) && !(hiddenFilterKeys ?? []).includes(facet.key))
  const activeCount = activeFacets.length
  const sortLabel = sorts.find((sort) => sort.key === query.sort)?.label ?? words.sort
  const preview = useCallback((draft: AlbumQuery) => setDraftTotal(countFor(draft)), [countFor])
  const saving = !compact && views !== undefined && onSaveView !== undefined && onDeleteView !== undefined

  const removeFilter = (key: string) => {
    const filters = { ...query.filters }
    delete filters[key]
    onQueryChange({ ...query, filters })
  }

  const viewLabel = { icons: words.iconView, cards: words.cardView, list: words.listView }
  return (
    <div className="flex flex-col gap-2">
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-soft">
              {completion !== undefined && <span>{completion}</span>}
              <span className="text-ink">{words.shown(total)}</span>
              {titleAccessory}
            </p>
          </div>
          <div role="group" aria-label={words.view} className="flex shrink-0 gap-0.5 rounded-sm bg-sunken p-0.5">
            {ALBUM_VIEWS.map((view) => {
              const Glyph = VIEW_GLYPHS[view]
              const active = query.view === view
              return (
                <button
                  key={view}
                  type="button"
                  aria-pressed={active}
                  aria-label={viewLabel[view]}
                  onClick={() => onQueryChange({ ...query, view })}
                  className={`flex h-11 w-11 items-center justify-center rounded-xs ${
                    active ? 'bg-panel text-ink shadow-1' : 'text-ink-faint'
                  }`}
                >
                  <Glyph size={20} variant={active ? 'solid' : 'line'} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className={compact ? '' : 'sticky top-0 z-10 -mx-4 bg-page/90 px-4 py-2 backdrop-blur'}>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={query.search}
            onChange={(event) => onQueryChange({ ...query, search: event.target.value })}
            placeholder={words.search}
            aria-label={words.searchAlbum(title)}
            className="min-h-11 min-w-0 flex-1 rounded-sm border border-hairline bg-panel px-3 text-[15px]"
          />
          <Button variant="secondary" size="sm" onClick={() => setSortOpen(true)} aria-label={words.sortLabel(sortLabel)}>
            {query.direction === 'asc'
              ? <ArrowUpIcon size={16} title={words.ascending} />
              : <ArrowDownIcon size={16} title={words.descending} />}
            {!compact && <span className="max-w-[5.75rem] truncate">{sortLabel}</span>}
          </Button>
          <Button variant={activeCount > 0 ? 'primary' : 'secondary'} size="sm" onClick={() => setFilterOpen(true)}>
            <FilterIcon size={16} />
            {activeCount > 0 ? activeCount : compact ? null : words.filters}
          </Button>
        </div>

        {!compact && tabs !== undefined && (
          <Tabs
            className="mt-2"
            label={tabs.label ?? title}
            value={tabs.value}
            onChange={tabs.onChange}
            options={[
              { value: 'all', label: `${words.all} · ${tabs.counts.all}` },
              { value: 'owned', label: `${words.owned} · ${tabs.counts.owned}` },
              { value: 'locked', label: `${words.locked} · ${tabs.counts.locked}` },
            ]}
          />
        )}

        {activeFacets.length > 0 && (
          <div className={`${compact ? '' : '-mx-4 px-4'} mt-2 flex gap-1.5 overflow-x-auto`} aria-label={words.activeFilters}>
            {activeFacets.map((facet) => (
              <Chip key={facet.key} selected onClick={() => removeFilter(facet.key)}>
                {facet.label}
                <CloseIcon size={16} />
              </Chip>
            ))}
            <Chip onClick={() => onQueryChange({ ...query, filters: {} })}>{words.clearAll}</Chip>
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="rounded-md border border-hairline bg-panel p-4 text-center">
          <p className="font-display font-semibold">{words.nothingMatches}</p>
          {emptyHint !== null && (
            <p className="mt-1 text-[13px] text-ink-soft">{words.removeFilterToSee(emptyHint.label, emptyHint.count)}</p>
          )}
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => onQueryChange({ ...query, filters: {}, search: '' })}
          >
            {words.clearAll}
          </Button>
        </div>
      )}

      {children}

      <FilterTray
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        facets={facets}
        query={query}
        counts={counts}
        pendingTotal={draftTotal}
        hiddenKeys={hiddenFilterKeys}
        onPreview={preview}
        onApply={(draft) => {
          onQueryChange(draft)
          setFilterOpen(false)
        }}
        words={wordOverrides}
        header={!compact && (presets.length > 0 || saving) ? (
          <div className="mt-1 mb-2 grid gap-1.5">
            <p className="text-micro">{words.quickPicks}</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <Chip
                  key={preset.key}
                  onClick={() => {
                    onQueryChange(preset.apply(query))
                    setFilterOpen(false)
                  }}
                >
                  {preset.label}
                </Chip>
              ))}
              {saving && (
                <Chip onClick={() => { setFilterOpen(false); setViewsOpen(true) }}>
                  {views.length > 0 ? words.savedViewCount(views.length) : words.savedViews}
                </Chip>
              )}
            </div>
          </div>
        ) : undefined}
      />

      <SortSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        sorts={sorts}
        query={query}
        parameter={parameter}
        words={wordOverrides}
        onChange={(next) => {
          onParameterChange?.(next.parameter)
          onQueryChange({ ...query, sort: next.sort, direction: next.direction })
        }}
      />

      {saving && (
        <Sheet open={viewsOpen} onClose={() => setViewsOpen(false)} title={words.savedViews} closeLabel={words.close}>
          <p className="text-micro mb-3">{words.savedViewHint}</p>
          <div className="grid gap-1.5">
            {views.map((view) => (
              <div key={view.name} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { onQueryChange(view.query); setViewsOpen(false) }}
                  className="min-h-12 flex-1 rounded-sm border border-hairline bg-panel px-4 text-left text-[15px] font-semibold"
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  aria-label={words.deleteSavedView(view.name)}
                  onClick={() => onDeleteView(view.name)}
                  className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-faint"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            ))}
            {views.length === 0 && <p className="rounded-sm bg-sunken p-3 text-[13px] text-ink-soft">{words.noSavedViews}</p>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder={words.nameThisView}
              aria-label={words.nameThisView}
              maxLength={MAX_VIEW_NAME}
              className="min-h-11 min-w-0 flex-1 rounded-sm border border-hairline bg-panel px-3"
            />
            <Button
              size="sm"
              disabled={viewName.trim().length === 0}
              onClick={() => { onSaveView(viewName); setViewName('') }}
            >
              {words.save}
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
