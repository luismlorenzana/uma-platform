// A phone test's run (LK1, P161): what the Look page sends when a test ends. Checked here before it is stored: a known
// shape, bounded sizes, numbers that are numbers. Pure, so it is tested without the API.

/** The pack route's allowlist: the index, revalidated, and the hash-named kit, immutable. */
export const LOOK_PACK_ALLOW = ['index.json', /kit\.[a-f0-9]{16}\.glb/]

export interface LookTierRun {
  tier: string
  summary: Record<string, number>
  /** Per second: [frames, worst frame ms]. */
  seconds: [number, number][]
  stats: { calls: number; triangles: number; gpuMB: number; textures: number }
}
export interface LookRun {
  version: 1
  startedAt: string
  scene: string
  camera: string
  device: { userAgent: string; width: number; height: number; pixelRatio: number }
  load: { ms: number; bytes: number | null }
  tiers: LookTierRun[]
  /** How warm the phone felt at the end, in the owner's words: cool, warm or hot. */
  heat: 'cool' | 'warm' | 'hot' | null
  note: string
}

const fail = (message: string): never => { throw new Error(message) }
const obj = (v: unknown, what: string): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : fail(`${what} must be an object`))
const num = (v: unknown, what: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(`${what} must be a number`))
const str = (v: unknown, what: string, max = 200): string => (typeof v === 'string' && v.length <= max ? v : fail(`${what} must be text up to ${max} characters`))

export function parseRun(value: unknown): LookRun {
  const v = obj(value, 'A run')
  if (v.version !== 1) fail('A run is version 1')
  const device = obj(v.device, 'device'), load = obj(v.load, 'load')
  if (!Array.isArray(v.tiers) || v.tiers.length === 0 || v.tiers.length > 6) fail('tiers must list 1 to 6 runs')
  const tiers = (v.tiers as unknown[]).map((t, i): LookTierRun => {
    const tier = obj(t, `tiers[${i}]`), stats = obj(tier.stats, `tiers[${i}].stats`), summary = obj(tier.summary, `tiers[${i}].summary`)
    if (!Array.isArray(tier.seconds) || tier.seconds.length > 3600) fail(`tiers[${i}].seconds must list up to an hour`)
    return {
      tier: str(tier.tier, 'tier', 20),
      summary: Object.fromEntries(Object.entries(summary).slice(0, 30).map(([k, x]) => [str(k, 'a summary key', 40), num(x, `summary.${k}`)])),
      seconds: (tier.seconds as unknown[]).map((s, k) => { const p = Array.isArray(s) ? s : fail(`seconds[${k}]`); return [num(p[0], 'frames'), num(p[1], 'worst ms')] as [number, number] }),
      stats: { calls: num(stats.calls, 'calls'), triangles: num(stats.triangles, 'triangles'), gpuMB: num(stats.gpuMB, 'gpuMB'), textures: num(stats.textures, 'textures') },
    }
  })
  const heat = v.heat === null || v.heat === undefined ? null : v.heat === 'cool' || v.heat === 'warm' || v.heat === 'hot' ? v.heat : fail('heat is cool, warm or hot')
  return {
    version: 1,
    startedAt: str(v.startedAt, 'startedAt', 40),
    scene: str(v.scene, 'scene', 20),
    camera: str(v.camera, 'camera', 20),
    device: { userAgent: str(device.userAgent, 'userAgent', 400), width: num(device.width, 'width'), height: num(device.height, 'height'), pixelRatio: num(device.pixelRatio, 'pixelRatio') },
    load: { ms: num(load.ms, 'load.ms'), bytes: load.bytes === null ? null : num(load.bytes, 'load.bytes') },
    tiers,
    heat,
    note: v.note === undefined ? '' : str(v.note, 'note', 1000),
  }
}

/** A run's file name: its time, sortable, and a few random letters so two runs in a second don't collide. */
export function runName(at: Date, random: number): string {
  const stamp = at.toISOString().replace(/[:.]/g, '-').toLowerCase()
  return `${stamp}-${Math.floor(random * 36 ** 4).toString(36).padStart(4, '0')}.json`
}
