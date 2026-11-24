import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { realpathSync } from 'node:fs'
import { cloudClient, bucketURL, query, listObjects } from './cloud.mjs'

const rankerRule = prefix => ({ action: { type: 'Delete' }, condition: { isLive: false, daysSinceNoncurrentTime: 30, numNewerVersions: 50,
  matchesPrefix: ['boards/', 'casts/', 'plan.json', 'profiles.json'].map(name => prefix + name), matchesSuffix: ['.json'] } })
export const POLICIES = {
  'uma-platform-content': [rankerRule('ranker/')],
  'uma-platform-authoring': [rankerRule('authoring/ranker/'), { action: { type: 'Delete' }, condition: { isLive: false, daysSinceNoncurrentTime: 7, matchesPrefix: ['gcloud/tmp/'] } }],
}

/** Validate a complete managed policy before it can be sent to Cloud Storage. No live-object deletion is permitted. */
export function assertSafePolicy(bucket, rules) {
  if (!POLICIES[bucket] || JSON.stringify(rules) !== JSON.stringify(POLICIES[bucket])) throw new Error('Retention policy is outside the reviewed scope')
  for (const rule of rules) {
    const condition = rule.condition
    if (rule.action.type !== 'Delete' || condition.isLive !== false || condition.daysSinceNoncurrentTime < 7) throw new Error('Unsafe retention condition')
    if (!condition.matchesPrefix?.length || condition.matchesPrefix.some(prefix => !/^(?:authoring\/)?ranker\/(?:boards\/|casts\/|plan\.json$|profiles\.json$)|^gcloud\/tmp\/$/.test(prefix))) throw new Error('Protected prefix in retention policy')
  }
}

export function candidates(objects, rules, now = Date.now()) {
  const byName = new Map()
  for (const object of objects) { if (!byName.has(object.name)) byName.set(object.name, []); byName.get(object.name).push(object) }
  const out = []
  for (const versions of byName.values()) {
    versions.sort((a, b) => BigInt(a.generation) > BigInt(b.generation) ? -1 : BigInt(a.generation) < BigInt(b.generation) ? 1 : 0)
    for (const [newer, object] of versions.entries()) {
      if (!object.timeDeleted) continue
      const age = (now - Date.parse(object.timeDeleted)) / 86400_000
      if (!Number.isFinite(age)) throw new Error('A noncurrent version has an invalid timestamp')
      if (rules.some(({ condition }) => condition.isLive === false && age >= condition.daysSinceNoncurrentTime && newer >= (condition.numNewerVersions ?? 0)
        && condition.matchesPrefix.some(prefix => object.name.startsWith(prefix)) && (!condition.matchesSuffix || condition.matchesSuffix.some(suffix => object.name.endsWith(suffix))))) out.push(object)
    }
  }
  return out
}

export async function retentionPlan(cloud, bucket, now = Date.now()) {
  const rules = POLICIES[bucket]; assertSafePolicy(bucket, rules)
  const metadata = await cloud(bucketURL(bucket))
  if (metadata.versioning?.enabled !== true || Number(metadata.softDeletePolicy?.retentionDurationSeconds ?? 0) < 604800) throw new Error('Versioning and seven-day recovery must be enabled')
  const existing = metadata.lifecycle?.rule ?? []
  // Fail closed on unfamiliar rules; do not replace a concurrently maintained policy.
  if (existing.some(rule => !rules.some(known => canonical(rule) === canonical(known)))) throw new Error('Existing lifecycle rules require review before this policy can be applied')
  const objects = await listObjects(cloud, bucket, { versions: 'true' }), selected = candidates(objects, rules, now)
  const protectedMatch = selected.some(object => !object.timeDeleted || !/^(?:(?:authoring\/)?ranker\/|gcloud\/tmp\/)/.test(object.name))
  if (protectedMatch) throw new Error('Retention plan matched protected data')
  return { bucket, metageneration: metadata.metageneration, before: metadata.lifecycle ?? { rule: [] }, after: { rule: rules },
    recovery: { versioning: metadata.versioning, softDeletePolicy: metadata.softDeletePolicy },
    candidates: { objects: selected.length, bytes: selected.reduce((sum, object) => sum + Number(object.size ?? 0), 0), liveObjects: 0, protectedObjects: 0 } }
}
const canonical = value => JSON.stringify(value, (_, child) => child && typeof child === 'object' && !Array.isArray(child) ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child)

export async function applyPlan(cloud, plan) {
  assertSafePolicy(plan.bucket, plan.after.rule)
  if (plan.candidates.liveObjects !== 0 || plan.candidates.protectedObjects !== 0) throw new Error('Protected data in retention plan')
  await cloud(query(bucketURL(plan.bucket), { ifMetagenerationMatch: String(plan.metageneration) }), { method: 'PATCH', body: { lifecycle: plan.after } })
  const after = await cloud(bucketURL(plan.bucket))
  if (canonical(after.lifecycle) !== canonical(plan.after) || canonical(after.versioning) !== canonical(plan.recovery.versioning)
    || canonical(after.softDeletePolicy) !== canonical(plan.recovery.softDeletePolicy)) throw new Error('Post-application policy verification failed')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(resolve(process.argv[1]))) {
  try {
    const cloud = cloudClient(), plans = []
    for (const bucket of Object.keys(POLICIES)) plans.push(await retentionPlan(cloud, bucket))
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..'), path = resolve(root, `content/reports/storage/retention-${Date.now()}.json`)
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(plans, null, 2) + '\n')
    for (const plan of plans) console.log(JSON.stringify({ bucket: plan.bucket, candidates: plan.candidates, rules: plan.after.rule }))
    if (process.argv.includes('--apply')) { for (const plan of plans) await applyPlan(cloud, plan); console.log('Targeted retention policies applied and verified.') }
    else console.log('Plan only. No lifecycle settings changed.')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
