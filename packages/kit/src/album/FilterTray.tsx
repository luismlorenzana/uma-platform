import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '../ui/Button.js'
import { Chip } from '../ui/Chip.js'
import { Sheet } from '../ui/BottomSheet.js'
import { ChevronDownIcon, ChevronRightIcon } from '../ui/icons/index.js'
import {
  isActiveSelection,
  type AlbumQuery,
  type FacetDef,
  type FacetSelection,
  type RangeSelection,
} from '../roster/query.js'
import { albumWords, type AlbumWords } from './words.js'

const asArray = (selection: FacetSelection | undefined): readonly string[] => Array.isArray(selection) ? selection : []

const asRange = (selection: FacetSelection | undefined): RangeSelection =>
  typeof selection === 'object' && selection !== null && !Array.isArray(selection)
    ? selection as RangeSelection
    : { min: null, max: null }

export function FilterTray({
  open,
  onClose,
  facets,
  query,
  counts,
  pendingTotal,
  onPreview,
  onApply,
  hiddenKeys = [],
  header,
  words: wordOverrides,
}: {
  open: boolean
  onClose: () => void
  facets: readonly FacetDef[]
  query: AlbumQuery
  counts: Readonly<Record<string, Readonly<Record<string, number>>>>
  pendingTotal: number
  onPreview: (draft: AlbumQuery) => void
  onApply: (draft: AlbumQuery) => void
  hiddenKeys?: readonly string[]
  header?: ReactNode
  words?: Partial<AlbumWords>
}) {
  const words = albumWords(wordOverrides)
  const [draft, setDraft] = useState(query)
  const [openGroups, setOpenGroups] = useState<readonly string[]>([])

  useEffect(() => {
    if (open) setDraft(query)
  }, [open, query])

  useEffect(() => {
    if (open) onPreview(draft)
  }, [draft, onPreview, open])

  const visible = facets.filter((facet) => !hiddenKeys.includes(facet.key))
  const draftCount = visible.filter((facet) => isActiveSelection(draft.filters[facet.key])).length
  const groups = [...new Set(visible.map((facet) => facet.group))]
  const setFilter = (key: string, selection: FacetSelection | null) => {
    setDraft((current) => {
      const filters = { ...current.filters }
      if (selection === null || !isActiveSelection(selection)) delete filters[key]
      else filters[key] = selection
      return { ...current, filters }
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={words.filter}
      closeLabel={words.close}
      footer={
        <Button className="w-full" onClick={() => onApply(draft)}>
          {pendingTotal === 0 ? words.noResults : words.showResults(pendingTotal)}
          {draftCount > 0 ? ` · ${words.filterCount(draftCount)}` : ''}
        </Button>
      }
    >
      <div className="flex justify-end">
        <button
          type="button"
          className="min-h-11 px-1 text-[13px] font-semibold text-ink-soft"
          onClick={() => setDraft({ ...draft, filters: {} })}
        >
          {words.clearAll}
        </button>
      </div>

      {header}

      {groups.map((group) => {
        const groupFacets = visible.filter((facet) => facet.group === group)
        const groupActive = groupFacets.filter((facet) => isActiveSelection(draft.filters[facet.key])).length
        const expanded = openGroups.includes(group) || groupActive > 0
        return (
          <section key={group} className="border-b border-hairline py-2 last:border-b-0">
            <button
              type="button"
              aria-expanded={expanded}
              className="flex min-h-11 w-full items-center justify-between"
              onClick={() => setOpenGroups((current) =>
                current.includes(group) ? current.filter((entry) => entry !== group) : [...current, group])}
            >
              <span className="text-[15px] font-semibold">
                {group}
                {groupActive > 0 && <span className="ml-1 text-accent-strong">· {groupActive}</span>}
              </span>
              {expanded
                ? <ChevronDownIcon size={20} className="text-ink-faint" />
                : <ChevronRightIcon size={20} className="text-ink-faint" />}
            </button>

            {expanded && (
              <div className="flex flex-col gap-2 pb-2">
                {groupFacets.map((facet) => {
                  if (facet.kind === 'boolean') {
                    const count = counts[facet.key]?.true ?? 0
                    return (
                      <Chip
                        key={facet.key}
                        selected={draft.filters[facet.key] === true}
                        disabled={count === 0 && draft.filters[facet.key] !== true}
                        onClick={() => setFilter(facet.key, draft.filters[facet.key] === true ? null : true)}
                      >
                        {facet.label} <span className="text-ink-faint">{count}</span>
                      </Chip>
                    )
                  }
                  if (facet.kind === 'range') {
                    const range = asRange(draft.filters[facet.key])
                    return (
                      <div key={facet.key}>
                        <p className="text-micro mb-1">{facet.label}</p>
                        <div className="flex items-center gap-2">
                          {(['min', 'max'] as const).map((bound) => {
                            const placeholder = bound === 'min' ? words.from : words.to
                            return (
                              <input
                                key={bound}
                                type="number"
                                inputMode="numeric"
                                placeholder={placeholder}
                                aria-label={`${facet.label} ${placeholder}`}
                                value={range[bound] ?? ''}
                                onChange={(event) => {
                                  const raw = event.target.value
                                  const parsed = raw === '' ? null : Number(raw)
                                  setFilter(facet.key, {
                                    ...range,
                                    [bound]: parsed !== null && Number.isFinite(parsed) ? parsed : null,
                                  })
                                }}
                                className="min-h-11 w-24 rounded-sm border border-hairline bg-panel px-3"
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  }
                  const selected = asArray(draft.filters[facet.key])
                  return (
                    <div key={facet.key}>
                      <p className="text-micro mb-1">{facet.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(facet.options ?? []).map((option) => {
                          const count = counts[facet.key]?.[option.value] ?? 0
                          const isSelected = selected.includes(option.value)
                          return (
                            <Chip
                              key={option.value}
                              selected={isSelected}
                              disabled={count === 0 && !isSelected}
                              onClick={() => setFilter(
                                facet.key,
                                isSelected ? selected.filter((entry) => entry !== option.value) : [...selected, option.value],
                              )}
                            >
                              {option.label} <span className="text-ink-faint">{count}</span>
                            </Chip>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </Sheet>
  )
}
