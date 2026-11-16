// Uma Enemy Art (EA1, P183): the owner-approved enemy looks ChatGPT drew for the games that have enemies (Uma Cyberpunk
// first, Uma Quest when its enemy authoring starts; Uma Farm has none), published by `pnpm art:push <universe> --enemies`
// to the app's own bucket under `enemy-art/<game>/`: an `index.json` (`kind: enemy-art`) and the approved PNGs, byte for
// byte, under hash names. Uma Enemy Art shows exactly what each index lists, read on every request, faction by faction in
// the index's order. Enemy and faction names come from the index; nothing here names one. EA3 (P186): a look of her
// casual collection is marked `kind: "casual"`; the page shows it beside her armour looks.
import type { BlobStore } from '../../store/blob-store'

export interface EnemyLook {
  id: string
  /** The enemy's name, as the index gives it. */
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
  /** Her armour and combat looks, or her casual collection's (EA3). */
  kind: 'combat' | 'casual'
}
export interface EnemyFaction { id: string; title: string; looks: EnemyLook[] }
export interface EnemyGame {
  id: string
  title: string
  publishedAt: string | null
  /** The factions with a look, in the index's order; a look of a faction the index doesn't list comes last, in its own. */
  factions: EnemyFaction[]
}

/** The only files the pack route serves: a look's PNG, named by its hash. */
export const ENEMY_PACK_ALLOW = /[a-z0-9-]+\/images\/[a-z0-9-]+\.[a-f0-9]{16}\.png/

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const decoder = new TextDecoder()
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const whole = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : null)
const words = (id: string) => id.split('-').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')

/** One look of an index, or null when its entry isn't a hash-named PNG of this game with its faction, size and hash. */
function lookOf(game: string, raw: unknown): EnemyLook | null {
  if (!object(raw)) return null
  const id = text(raw.id), character = text(raw.character), faction = text(raw.faction), path = text(raw.path), sha256 = text(raw.sha256)
  const bytes = whole(raw.bytes), width = whole(raw.width), height = whole(raw.height)
  if (!id || !KEBAB.test(id) || !character || !faction || !KEBAB.test(faction) || !path || !sha256 || !bytes || !width || !height) return null
  if (!/^[a-f0-9]{64}$/.test(sha256) || path !== `images/${id}.${sha256.slice(0, 16)}.png`) return null
  const look = text(raw.look) ?? 'look'
  return {
    id, character, faction, unitId: text(raw.unitId), look, title: text(raw.title) ?? words(look), path: `${game}/${path}`, bytes, sha256, width, height,
    approvedOn: text(raw.approvedOn), publishedAt: text(raw.publishedAt), kind: raw.kind === 'casual' ? 'casual' : 'combat',
  }
}

/** Every published game, by name: its looks grouped by faction, in the index's order. A game with no valid look is left out. */
export async function enemyGames(store: Pick<BlobStore, 'read' | 'list'>): Promise<EnemyGame[]> {
  const files = await store.list('')
  const ids = [...new Set(files.flatMap((p) => /^([a-z0-9]+(?:-[a-z0-9]+)*)\/index\.json$/.exec(p)?.[1] ?? []))].sort()
  const out: EnemyGame[] = []
  for (const id of ids) {
    const blob = await store.read(`${id}/index.json`)
    let index: unknown = null
    try { index = blob ? JSON.parse(decoder.decode(blob.bytes)) : null } catch { index = null }
    if (!object(index) || index.kind !== 'enemy-art' || index.game !== id || !Array.isArray(index.looks)) continue
    const looks = (index.looks as unknown[]).flatMap((raw) => lookOf(id, raw) ?? [])
    if (looks.length === 0) continue
    const listed = (Array.isArray(index.factions) ? index.factions as unknown[] : []).filter(object)
      .flatMap((f) => (typeof f.id === 'string' && KEBAB.test(f.id) ? [{ id: f.id, title: text(f.title) ?? words(f.id) }] : []))
    const known = new Set(listed.map((f) => f.id))
    const order = [...listed, ...[...new Set(looks.map((l) => l.faction))].filter((f) => !known.has(f)).map((f) => ({ id: f, title: words(f) }))]
    out.push({
      id, title: text(index.title) ?? `Uma ${words(id)}`, publishedAt: text(index.publishedAt),
      factions: order.map((f) => ({ ...f, looks: looks.filter((l) => l.faction === f.id) })).filter((f) => f.looks.length > 0),
    })
  }
  return out
}
