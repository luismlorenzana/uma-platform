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
  /** Her armour and combat looks, her casual collection's (EA3), or one both albums hold, the base of both (P191). */
  kind: 'combat' | 'casual' | 'base' | 'lieutenant'
}
export interface EnemyFaction { id: string; title: string; looks: EnemyLook[] }
export interface EnemyGame { id: string; title: string; publishedAt: string | null; factions: EnemyFaction[] }

/** The owner's current Enemy Art gallery selection (P219). */
export const GAMES: readonly { id: string; title: string }[] = [{ id: 'cyberpunk', title: 'Uma Cyberpunk' }]

export interface GameTab { id: string; title: string; game: EnemyGame | null; looks: number; factions: number }

export const lookCount = (game: EnemyGame): number => game.factions.reduce((n, f) => n + f.looks.length, 0)

/** One enemy's looks in her faction: the group the page titles with her name (P186). */
export interface Boss { name: string; looks: EnemyLook[]; role: 'boss' | 'lieutenant' }
/** A faction's enemies in the order they first appear, each with her looks: her base first (P191), then her casual ones,
 *  then her armour looks, each in the published order. */
export function bossesOf(faction: EnemyFaction): Boss[] {
  const out: Boss[] = []
  for (const look of faction.looks) {
    const boss = out.find((b) => b.name === look.character) ?? (out.push({ name: look.character, looks: [], role: 'boss' }), out[out.length - 1]!)
    boss.looks.push(look)
  }
  const rank = { base: 0, casual: 1, combat: 2, lieutenant: 2 } as const
  for (const boss of out) { boss.looks = [...boss.looks].sort((a, b) => rank[a.kind] - rank[b.kind]); if (boss.looks.every((l) => l.kind === 'lieutenant')) boss.role = 'lieutenant' }
  // A faction's bosses first, then its lieutenants (EA4), each in the order they first appear.
  return [...out.filter((b) => b.role === 'boss'), ...out.filter((b) => b.role === 'lieutenant')]
}
export const bossCount = (game: EnemyGame): number => game.factions.reduce((n, f) => n + bossesOf(f).filter((b) => b.role === 'boss').length, 0)
export const lieutenantCount = (game: EnemyGame): number => game.factions.reduce((n, f) => n + bossesOf(f).filter((b) => b.role === 'lieutenant').length, 0)

/** Only the selected gallery games, including an empty Cyberpunk tab before any looks are published. */
export function gameTabs(games: readonly EnemyGame[]): GameTab[] {
  const tab = (id: string, title: string, game: EnemyGame | null): GameTab => ({ id, title: game?.title ?? title, game, looks: game ? lookCount(game) : 0, factions: game?.factions.length ?? 0 })
  return GAMES.map((g) => tab(g.id, g.title, games.find((p) => p.id === g.id) ?? null))
}

/** The tab a link names, else the first with looks, else the first. */
export const chosenTab = (tabs: readonly GameTab[], wanted: string | null): GameTab | null =>
  tabs.find((t) => t.id === wanted) ?? tabs.find((t) => t.game) ?? tabs[0] ?? null

export const day = (iso: string | null): string => (iso ? iso.slice(0, 10) : '—')
export const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`

let loading: Promise<EnemyGame[]> | null = null
/** The published games, once a visit. */
export function loadGames(refresh = false): Promise<EnemyGame[]> {
  if (refresh) loading = null
  if (!loading) {
    loading = request<EnemyGame[]>(`/api/enemy-art/games${refresh ? '?refresh=1' : ''}`).then(games => games.filter(game => GAMES.some(selected => selected.id === game.id)))
    loading.catch(() => { loading = null })
  }
  return loading
}
