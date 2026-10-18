// The job sheet is a link, with router ownership left in the game (SC2).
export interface JobQuery {
  readonly job: string | null; readonly uma: string | null; readonly count: number | null
  readonly queue: boolean; readonly slot: number | null; readonly back: string | null
}
export const JOB_QUERY_KEYS = ['job', 'uma', 'count', 'queue', 'slot', 'back'] as const
const whole = (value: string | null, min: number): number | null => {
  if (value === null || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= min ? n : null
}
export function inAppPath(value: string | null): string | null {
  return value !== null && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/[^/?#]*:/.test(value) ? value : null
}
export function readJobQuery(params: URLSearchParams): JobQuery | null {
  if (!params.has('job')) return null
  return { job: params.get('job') || null, uma: params.get('uma') || null, count: whole(params.get('count'), 1), queue: params.get('queue') === '1', slot: whole(params.get('slot'), 0), back: inAppPath(params.get('back')) }
}
export function withoutJobQuery(search: string): string {
  const params = new URLSearchParams(search)
  for (const key of JOB_QUERY_KEYS) params.delete(key)
  return params.size === 0 ? '' : `?${params}`
}
export function jobQuery(input: Partial<JobQuery> = {}): string {
  const params = new URLSearchParams({ job: input.job ?? '' })
  if (input.uma) params.set('uma', input.uma)
  if (input.count != null) params.set('count', String(input.count))
  if (input.queue) params.set('queue', '1')
  if (input.slot != null) params.set('slot', String(input.slot))
  const back = inAppPath(input.back ?? null)
  if (back) params.set('back', back)
  return `?${params}`
}
