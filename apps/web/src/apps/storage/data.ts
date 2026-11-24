import { request } from '../../api/client'

export interface Usage { liveBytes: number; liveObjects: number; noncurrentBytes: number; noncurrentObjects: number; softDeletedBytes: number; softDeletedObjects: number }
export interface BucketReport { name: string; project: string; location: string; storageClass: string; versioned: boolean; softDeleteDays: number; lifecycleRuleCount: number; usage: Usage; repeatedLiveBytes: number; deltaBytes: number | null }
export interface GroupReport { id: string; bucket: string; world: string; purpose: string; usage: Usage; deltaBytes: number | null }
export interface StorageReport { schemaVersion: 1; generatedAt: string; previousGeneratedAt: string | null; totals: Usage; buckets: BucketReport[]; groups: GroupReport[]; deltaBytes: number | null; history: { generatedAt: string; totalBytes: number; worldBytes: Record<string, number> }[] }
export const worlds: Readonly<Record<string, string>> = { farm: 'Uma Farm', cyberpunk: 'Uma Cyberpunk', quest: 'Uma Quest', rpg: 'Uma RPG', shared: 'Shared' }
export const purposes: Readonly<Record<string, string>> = { 'character-art': 'Character art', 'enemy-art': 'Enemy art', campaign: 'Campaign assets', stories: 'Stories',
  'master-data': 'Master data', 'source-archives': 'Source archives', 'authoring-backup': 'Authoring backup', 'game-content': 'Game content', ranker: 'Ranker', reporting: 'Storage reports', other: 'Other' }
export const stored = (value: Usage): number => value.liveBytes + value.noncurrentBytes + value.softDeletedBytes
export function bytes(value: number): string {
  const size = Math.abs(value)
  const unit = size >= 1024 ** 3 ? 3 : size >= 1024 ** 2 ? 2 : size >= 1024 ? 1 : 0
  return `${(value / 1024 ** unit).toFixed(unit === 0 ? 0 : 2)} ${['B', 'KiB', 'MiB', 'GiB'][unit]}`
}
export const growth = (value: number | null): string => value === null ? '—' : `${value > 0 ? '+' : ''}${bytes(value)}`
export const loadReport = (refresh = false): Promise<StorageReport> => request(`/api/storage/report${refresh ? '?refresh=1' : ''}`)
export function trendPoints(history: StorageReport['history']): string {
  const max = Math.max(1, ...history.map(point => point.totalBytes))
  return history.map((point, index) => `${20 + index * 760 / Math.max(1, history.length - 1)},${140 - point.totalBytes / max * 120}`).join(' ')
}
