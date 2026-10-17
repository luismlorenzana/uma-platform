// English is the default, never the contract. Games pass the words that differ (notably their work-level name), and
// may replace every other piece of album copy without forking a component.
export interface AlbumWords {
  readonly album: string
  readonly all: string
  readonly owned: string
  readonly locked: string
  readonly search: string
  readonly searchAlbum: (title: string) => string
  readonly sort: string
  readonly sortLabel: (label: string) => string
  readonly filters: string
  readonly filter: string
  readonly clearAll: string
  readonly activeFilters: string
  readonly view: string
  readonly iconView: string
  readonly cardView: string
  readonly listView: string
  readonly shown: (count: number) => string
  readonly nothingMatches: string
  readonly removeFilterToSee: (label: string, count: number) => string
  readonly quickPicks: string
  readonly savedViews: string
  readonly savedViewCount: (count: number) => string
  readonly savedViewHint: string
  readonly noSavedViews: string
  readonly nameThisView: string
  readonly save: string
  readonly deleteSavedView: (name: string) => string
  readonly sortHint: string
  readonly ascending: string
  readonly descending: string
  readonly from: string
  readonly to: string
  readonly noResults: string
  readonly showResults: (count: number) => string
  readonly filterCount: (count: number) => string
  readonly newBadge: string
  readonly level: string
  readonly choose: string
  readonly selected: string
  readonly confirmSelection: (count: number) => string
  readonly selectionLimit: (count: number) => string
  readonly close: string
}

export const ALBUM_WORDS: AlbumWords = {
  album: 'Album',
  all: 'All',
  owned: 'Owned',
  locked: 'Locked',
  search: 'Search',
  searchAlbum: (title) => `Search ${title}`,
  sort: 'Sort',
  sortLabel: (label) => `Sort: ${label}`,
  filters: 'Filters',
  filter: 'Filter',
  clearAll: 'Clear all',
  activeFilters: 'Active filters',
  view: 'View',
  iconView: 'Icon view',
  cardView: 'Card view',
  listView: 'List view',
  shown: (count) => `${count} shown`,
  nothingMatches: 'Nothing matches these filters',
  removeFilterToSee: (label, count) => `Remove ${label} to see ${count}.`,
  quickPicks: 'Quick picks',
  savedViews: 'Saved views',
  savedViewCount: (count) => `Saved views · ${count}`,
  savedViewHint: 'Filters, sort, grouping and density under a name',
  noSavedViews: 'No saved views yet.',
  nameThisView: 'Name this view',
  save: 'Save',
  deleteSavedView: (name) => `Delete ${name}`,
  sortHint: 'The tile shows the value you sort by',
  ascending: 'Ascending',
  descending: 'Descending',
  from: 'From',
  to: 'To',
  noResults: 'No results',
  showResults: (count) => `Show ${count}`,
  filterCount: (count) => `${count} filter${count === 1 ? '' : 's'}`,
  newBadge: 'NEW',
  level: 'Level',
  choose: 'Choose',
  selected: 'Selected',
  confirmSelection: (count) => `Choose ${count}`,
  selectionLimit: (count) => `Choose up to ${count}`,
  close: 'Close',
}

export const albumWords = (words?: Partial<AlbumWords>): AlbumWords => ({ ...ALBUM_WORDS, ...words })
