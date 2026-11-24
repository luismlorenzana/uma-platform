import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, summarizeBucket, buildReport, totalBytes } from './model.mjs'
import { listObjects, mapLimit } from './cloud.mjs'
import { collect, publishReport } from './collect.mjs'

test('world attribution keeps shared references separate and never emits object names', () => {
  assert.deepEqual(classify('uma-platform-content', 'art/universes/farm-life/images/invented.png'), { world: 'farm', purpose: 'character-art' })
  assert.deepEqual(classify('uma-platform-content', 'campaign/cyberpunk/campaign/files/invented.png'), { world: 'cyberpunk', purpose: 'campaign' })
  assert.deepEqual(classify('uma-platform-master-data', 'files/art/invented.png'), { world: 'shared', purpose: 'master-data' })
  assert.deepEqual(classify('uma-platform-authoring', 'authoring/traveler-keys/invented.png'), { world: 'quest', purpose: 'authoring-backup' })
  const result = summarizeBucket({ name: 'uma-platform-content', project: 'test' }, { location: 'TEST', storageClass: 'STANDARD' }, [
    { name: 'art/universes/farm-life/images/invented.png', size: '10', md5Hash: 'same' },
    { name: 'art/universes/farm-life/images/copy.png', size: '10', md5Hash: 'same' },
    { name: 'art/universes/farm-life/images/invented.png', size: '7', timeDeleted: '2026-01-01' },
  ], [{ name: 'ranker/test.json', size: '3' }])
  assert.equal(totalBytes(result.bucket.usage), 30)
  assert.equal(result.bucket.usage.liveObjects, 2)
  assert.equal(result.bucket.repeatedLiveBytes, 10)
  assert.equal(result.groups.reduce((n, group) => n + totalBytes(group.usage), 0), 30)
  assert.ok(!JSON.stringify(result).includes('invented.png'))
  assert.throws(() => summarizeBucket({ name: 'test' }, {}, [{ name: 'x', size: '-1' }], []))
})

test('growth compares complete snapshots and keeps one point per UTC day', () => {
  const make = size => summarizeBucket({ name: 'uma-farm-content', project: 'test' }, { location: 'TEST', storageClass: 'STANDARD' }, [{ name: 'test.json', size }], [])
  const first = buildReport([make(10)], null, '2026-01-01T01:00:00.000Z')
  const sameDay = buildReport([make(12)], first, '2026-01-01T02:00:00.000Z')
  const nextDay = buildReport([make(8)], sameDay, '2026-01-02T02:00:00.000Z')
  assert.equal(first.deltaBytes, null)
  assert.equal(sameDay.deltaBytes, 2)
  assert.equal(sameDay.history.length, 1)
  assert.equal(nextDay.deltaBytes, -4)
  assert.equal(nextDay.groups[0].deltaBytes, -4)
  assert.equal(nextDay.history.length, 2)
})

test('pagination follows empty pages and keeps versions distinct from soft-deleted queries', async () => {
  const urls = []
  const cloud = async url => { urls.push(new URL(url)); return urls.length === 1 ? { nextPageToken: 'next' } : { items: [{ name: 'test', size: '1' }] } }
  assert.equal((await listObjects(cloud, 'invented', { versions: 'true' })).length, 1)
  assert.equal(urls[1].searchParams.get('pageToken'), 'next')
  assert.equal(urls[0].searchParams.get('versions'), 'true')
  assert.equal(urls[0].searchParams.has('softDeleted'), false)
})

test('bounded collection fails as a whole when a bucket fails', async () => {
  let active = 0, max = 0
  assert.deepEqual(await mapLimit([1, 2, 3, 4], 2, async value => { active++; max = Math.max(max, active); await new Promise(resolve => setTimeout(resolve, 1)); active--; return value }), [1, 2, 3, 4])
  assert.equal(max, 2)
  await assert.rejects(collect(async () => { throw new Error('unavailable') }), /unavailable/)
})

test('publishing creates an immutable aggregate snapshot without overwriting an existing report', async () => {
  let call
  const report = { schemaVersion: 1, generatedAt: '2026-01-01T01:00:00.000Z' }
  await publishReport(async (url, options) => { call = { url: new URL(url), options } }, report)
  assert.equal(call.url.searchParams.get('ifGenerationMatch'), '0')
  assert.match(call.url.searchParams.get('name'), /^reports\/storage\/snapshots\//)
  assert.equal(call.options.method, 'POST')
  assert.equal(call.options.body, report)
})
