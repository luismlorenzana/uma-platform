/** The common progress fields used to order any Uma list or picker. */
export interface LevelRow {
  id: string
  name: string
  releasedAt: string
  /** Null means this Uma is not owned. */
  level: number | null
  /** Whether this Uma is currently available for work. */
  free?: boolean
  /** The game's work-specific level (Craft Level or Farm Level). */
  workLevel?: number | null
}

function descendingNullable(left: number | null | undefined, right: number | null | undefined): number {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  return right - left
}

/** Highest Uma Level, newest release, name, then stable id. Unowned Umas always come last. */
export function byLevel(left: LevelRow, right: LevelRow): number {
  return (
    descendingNullable(left.level, right.level) ||
    right.releasedAt.localeCompare(left.releasedAt) ||
    left.name.localeCompare(right.name) ||
    left.id.localeCompare(right.id)
  )
}

/** Free Umas first, then highest work level, then the shared Uma-level order. */
export function workOrder(left: LevelRow, right: LevelRow): number {
  return (
    Number(right.free === true) - Number(left.free === true) ||
    descendingNullable(left.workLevel, right.workLevel) ||
    byLevel(left, right)
  )
}

/** The one level label used by both games. */
export function formatLevel(level: number | null, tier: number = 1): string {
  if (level === null) return '—'
  return tier > 1 ? `T${tier} · Lv ${level}` : `Lv ${level}`
}
