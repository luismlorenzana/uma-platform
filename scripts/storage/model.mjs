export const BUCKETS = [
  { name: 'uma-platform-content', project: 'uma-rpg' },
  { name: 'uma-platform-authoring', project: 'uma-platform-lm' },
  { name: 'uma-platform-master-data', project: 'uma-platform-lm' },
  { name: 'uma-farm-content', project: 'uma-rpg' },
  { name: 'uma-quest-content', project: 'uma-rpg' },
  { name: 'uma-rpg-content', project: 'uma-rpg' },
]

export const REPORT_BUCKET = 'uma-platform-content'
export const REPORT_PREFIX = 'reports/storage/snapshots/'
export const usage = () => ({ liveBytes: 0, liveObjects: 0, noncurrentBytes: 0, noncurrentObjects: 0, softDeletedBytes: 0, softDeletedObjects: 0 })
export const totalBytes = value => value.liveBytes + value.noncurrentBytes + value.softDeletedBytes
export function addUsage(target, value) { for (const key of Object.keys(target)) target[key] += value[key] }
const worldOf = id => ({ 'farm-life': 'farm', cyberpunk: 'cyberpunk', 'high-fantasy': 'quest', farm: 'farm', quest: 'quest', rpg: 'rpg' })[id] ?? 'shared'

/** Aggregate by known storage purpose, never by character names or individual object paths. */
export function classify(bucket, name) {
  const p = name.split('/')
  if (bucket === 'uma-platform-master-data') return { world: name.startsWith('source-art/adult-travelers/') ? 'quest' : 'shared', purpose: name.startsWith('source-art/') ? 'source-archives' : 'master-data' }
  if (bucket === 'uma-platform-authoring') return { world: name.startsWith('authoring/farm-story/') ? 'farm' : name.startsWith('authoring/traveler-keys/') ? 'quest' : 'shared', purpose: 'authoring-backup' }
  if (bucket !== 'uma-platform-content') return { world: worldOf(bucket.replace(/^uma-/, '').replace(/-content$/, '')), purpose: 'game-content' }
  if (p[0] === 'art' && p[1] === 'universes') return { world: worldOf(p[2]), purpose: 'character-art' }
  if (p[0] === 'enemy-art') return { world: worldOf(p[1]), purpose: 'enemy-art' }
  if (p[0] === 'campaign') return { world: worldOf(p[1]), purpose: 'campaign' }
  if (p[0] === 'story') return { world: worldOf(p[1]), purpose: 'stories' }
  if (p[0] === 'reports' && p[1] === 'storage') return { world: 'shared', purpose: 'reporting' }
  return { world: 'shared', purpose: p[0] === 'ranker' ? 'ranker' : 'other' }
}

export function summarizeBucket(config, metadata, objects, softDeleted) {
  const groups = new Map(), all = usage(), hashes = new Map()
  const count = (object, soft) => {
    const bytes = Number(object.size ?? 0)
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error(`Invalid object size in ${config.name}`)
    const { world, purpose } = classify(config.name, object.name)
    const id = `${config.name}:${world}:${purpose}`
    if (!groups.has(id)) groups.set(id, { id, bucket: config.name, world, purpose, usage: usage() })
    const value = groups.get(id).usage, state = soft ? 'softDeleted' : object.timeDeleted ? 'noncurrent' : 'live'
    value[`${state}Bytes`] += bytes; value[`${state}Objects`]++
    all[`${state}Bytes`] += bytes; all[`${state}Objects`]++
    if (state === 'live' && object.md5Hash) {
      const key = `${bytes}:${object.md5Hash}`
      hashes.set(key, { bytes, count: (hashes.get(key)?.count ?? 0) + 1 })
    }
  }
  for (const object of objects) count(object, false)
  for (const object of softDeleted) count(object, true)
  return {
    bucket: { ...config, location: metadata.location, storageClass: metadata.storageClass, versioned: metadata.versioning?.enabled === true,
      softDeleteDays: Number(metadata.softDeletePolicy?.retentionDurationSeconds ?? 0) / 86400,
      lifecycleRuleCount: metadata.lifecycle?.rule?.length ?? 0, usage: all,
      repeatedLiveBytes: [...hashes.values()].reduce((sum, value) => sum + value.bytes * (value.count - 1), 0) },
    groups: [...groups.values()],
  }
}

export function buildReport(results, previous = null, generatedAt = new Date().toISOString()) {
  const totals = usage(), buckets = results.map(result => result.bucket), groups = results.flatMap(result => result.groups)
  for (const bucket of buckets) addUsage(totals, bucket.usage)
  const oldGroups = new Map((previous?.groups ?? []).map(group => [group.id, group]))
  const oldBuckets = new Map((previous?.buckets ?? []).map(bucket => [bucket.name, bucket]))
  for (const group of groups) group.deltaBytes = previous ? totalBytes(group.usage) - totalBytes(oldGroups.get(group.id)?.usage ?? usage()) : null
  for (const bucket of buckets) bucket.deltaBytes = previous ? totalBytes(bucket.usage) - totalBytes(oldBuckets.get(bucket.name)?.usage ?? usage()) : null
  const worldBytes = {}
  for (const group of groups) worldBytes[group.world] = (worldBytes[group.world] ?? 0) + totalBytes(group.usage)
  const history = [...(previous?.history ?? []).filter(point => point.generatedAt.slice(0, 10) !== generatedAt.slice(0, 10)), { generatedAt, totalBytes: totalBytes(totals), worldBytes }].slice(-31)
  return { schemaVersion: 1, generatedAt, previousGeneratedAt: previous?.generatedAt ?? null, totals, buckets, groups, history,
    deltaBytes: previous ? totalBytes(totals) - totalBytes(previous.totals) : null }
}
