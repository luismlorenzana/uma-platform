// Uma Enemy Art's data (EA1, P183): the published enemy looks, game by game, from its own API (`/api/enemy-art/games`).
// Enemy and faction names come from what is published; nothing here names one.
import { request } from '../../api/client'

export interface EnemyLook {
  id: string
  character: string
  faction: string
  unitId: string | null
  look: string
  title: string
  /** The picture's pack path, `<game>/images/<id>.<16 hex>.png`, read at `/api/enemy-art/content/…`. */
  path: string
  bytes: number
  sha256: string
  width: number
  height: number
  approvedOn: string | null
  publishedAt: string | null
}
export interface EnemyFaction { id: string; title: string; looks: EnemyLook[] }
export interface EnemyGame { id: string; title: string; publishedAt: string | null; factions: EnemyFaction[] }

/** The games that have enemies, in the tabs' order (the owner, 2026-11-15): Uma Cyberpunk first, then Uma Quest. Uma Farm
 *  has no enemy authoring. */
export const GAMES: readonly { id: string; title: string }[] = [{ id: 'cyberpunk', title: 'Uma Cyberpunk' }, { id: 'quest', title: 'Uma Quest' }]

export interface GameTab { id: string; title: string; game: EnemyGame | null; looks: number; factions: number }

export const lookCount = (game: EnemyGame): number => game.factions.reduce((n, f) => n + f.looks.length, 0)

/** A tab for each game with enemies, published or not, then one for any other game that is published. */
export function gameTabs(games: readonly EnemyGame[]): GameTab[] {
  const tab = (id: string, title: string, game: EnemyGame | null): GameTab => ({ id, title: game?.title ?? title, game, looks: game ? lookCount(game) : 0, factions: game?.factions.length ?? 0 })
  const planned = GAMES.map((g) => tab(g.id, g.title, games.find((p) => p.id === g.id) ?? null))
  return [...planned, ...games.filter((g) => !GAMES.some((p) => p.id === g.id)).map((g) => tab(g.id, g.title, g))]
}

/** The tab a link names, else the first with looks, else the first. */
export const chosenTab = (tabs: readonly GameTab[], wanted: string | null): GameTab | null =>
  tabs.find((t) => t.id === wanted) ?? tabs.find((t) => t.game) ?? tabs[0] ?? null

export const day = (iso: string | null): string => (iso ? iso.slice(0, 10) : '—')
export const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`

let loading: Promise<EnemyGame[]> | null = null
/** The published games, once a visit. */
export function loadGames(): Promise<EnemyGame[]> {
  if (!loading) {
    loading = request<EnemyGame[]>('/api/enemy-art/games')
    loading.catch(() => { loading = null })
  }
  return loading
}
