// Helpers shared by the Studio's home and its tier boards (P113).
import { BOARDS, CATEGORIES, FRANCHISES, WAYS, type BoardId, type BoardStates, type TierCatalog } from './tier-model.js'

export interface TierData {
  catalog: TierCatalog
  states: BoardStates
  imports: { franchise: string; source: string; filter: string; importedAt: string; units: number }[]
}
export const esc = (v: string | number): string => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export function el<T extends HTMLElement>(id: string): T { const n = document.getElementById(id); if (!n) throw new Error(`Missing ${id}`); return n as T }
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init), body = await r.json() as unknown
  if (!r.ok) throw new Error(typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : `Request failed (${r.status})`)
  return body as T
}
export const franchiseLabel = (v: string): string => FRANCHISES.find((f) => f.id === v)?.label ?? v
export const categoryLabel = (v: string): string => CATEGORIES.find((c) => c.id === v)?.label ?? v
export const wayLabel = (v: string): string => WAYS.find((w) => w.id === v)?.label ?? v
export const boardTitle = (id: BoardId | null): string => BOARDS.find((b) => b.id === id)?.title ?? ''
export const roleLabel = (v: string): string => ({ regular: 'Regular', elite: 'Elite', boss: 'Boss' })[v] ?? v

/** The Studio's one navigation bar: home, the seven boards, then the sprite tools. */
export function nav(current: string): string {
  const link = (href: string, label: string) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  return `${link('/', 'Home')}<span class="nav-group">Umas</span>${BOARDS.filter((b) => b.group === 'umas').map((b) => link(`/tiers/${b.id}`, b.short)).join('')}` +
    `<span class="nav-group">Bosses</span>${BOARDS.filter((b) => b.group === 'bosses').map((b) => link(`/tiers/${b.id}`, b.short)).join('')}` +
    `<span class="nav-group">Enemies</span>${BOARDS.filter((b) => b.group === 'enemies').map((b) => link(`/tiers/${b.id}`, b.short)).join('')}` +
    `<span class="nav-group">Sprites</span>${link('/queue', 'Queue')}${link('/sprites/', 'Desk')}${link('/field/', 'Field')}${link('/gates', 'Gates')}${link('/props', 'Props')}`
}
