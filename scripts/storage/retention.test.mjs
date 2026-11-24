import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POLICIES, assertSafePolicy, candidates, retentionPlan, applyPlan } from './retention.mjs'

const now = Date.parse('2026-02-15T00:00:00Z')
const old = '2026-01-01T00:00:00Z'
const versions = (name, count) => Array.from({ length: count }, (_, i) => ({ name, generation: String(9007199254741999n - BigInt(i)), size: '10', ...(i === 0 ? {} : { timeDeleted: old }) }))

test('only old noncurrent metadata beyond the newer-version floor qualifies', () => {
  const rule = POLICIES['uma-platform-content']
  const objects = versions('ranker/plan.json', 52)
  assert.equal(candidates(objects, rule, now).length, 2)
  objects[51].timeDeleted = '2026-02-10T00:00:00Z'
  assert.equal(candidates(objects, rule, now).length, 1)
  assert.equal(candidates(versions('ranker/boards/test.json', 50), rule, now).length, 0)
})

test('art, source archives, authoring originals, releases and live temporary uploads are protected', () => {
  const protectedPaths = ['art/universes/farm-life/images/test.png', 'enemy-art/cyberpunk/images/test.png', 'campaign/cyberpunk/releases/test.json', 'files/art/test.webp',
    'source-art/test.zip', 'authoring/sprites/test.png', 'authoring/character-universes/cyberpunk/test.png', 'stories/packs/test.json']
  for (const rules of Object.values(POLICIES)) {
    assert.equal(candidates(protectedPaths.flatMap(name => versions(name, 60)), rules, now).length, 0)
    assert.equal(candidates([{ name: 'gcloud/tmp/test.zip', generation: '1', size: '1' }], rules, now).length, 0)
  }
  assert.equal(candidates(versions('gcloud/tmp/test.zip', 3), POLICIES['uma-platform-authoring'], now).length, 2)
})

test('policy validation rejects every widening of the reviewed policy', () => {
  for (const [bucket, rules] of Object.entries(POLICIES)) {
    assert.doesNotThrow(() => assertSafePolicy(bucket, rules))
    for (const change of [rule => { rule.condition.isLive = true }, rule => { rule.condition.matchesPrefix = ['art/'] }, rule => { delete rule.condition.numNewerVersions }]) {
      const changed = structuredClone(rules); change(changed[0])
      assert.throws(() => assertSafePolicy(bucket, changed))
    }
  }
  assert.throws(() => assertSafePolicy('uma-platform-master-data', []))
})

test('planning fails closed on unfamiliar policy or missing recovery and application uses a metadata precondition', async () => {
  const bucket = 'uma-platform-authoring', rules = POLICIES[bucket]
  const metadata = { metageneration: '7', versioning: { enabled: true }, softDeletePolicy: { retentionDurationSeconds: '604800' } }
  const cloud = async url => url.includes('/o?') ? { items: versions('gcloud/tmp/test.zip', 3) } : metadata
  const plan = await retentionPlan(cloud, bucket, now)
  assert.deepEqual(plan.candidates, { objects: 2, bytes: 20, liveObjects: 0, protectedObjects: 0 })
  const calls = []
  await applyPlan(async (url, options) => { calls.push({ url, options }); return options ? {} : { ...metadata, lifecycle: { rule: rules } } }, plan)
  assert.equal(calls[0].options.method, 'PATCH')
  assert.equal(new URL(calls[0].url).searchParams.get('ifMetagenerationMatch'), '7')
  assert.deepEqual(Object.keys(calls[0].options.body), ['lifecycle'])
  await assert.rejects(retentionPlan(async () => ({ ...metadata, lifecycle: { rule: [{ action: { type: 'Delete' }, condition: { age: 1 } }] } }), bucket, now), /require review/)
  await assert.rejects(retentionPlan(async () => ({ ...metadata, softDeletePolicy: {} }), bucket, now), /recovery/)
})
