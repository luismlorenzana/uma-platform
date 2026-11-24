import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { cloudClient, bucketURL, query, listObjects, mapLimit } from './cloud.mjs'
import { BUCKETS, REPORT_BUCKET, REPORT_PREFIX, summarizeBucket, buildReport, totalBytes } from './model.mjs'

export async function collect(cloud, progress = () => undefined) {
  const results = await mapLimit(BUCKETS, 3, async config => {
    const metadata = await cloud(query(bucketURL(config.name), { fields: 'name,location,storageClass,versioning,softDeletePolicy,lifecycle' }))
    const [objects, softDeleted] = await Promise.all([listObjects(cloud, config.name, { versions: 'true' }),
      Number(metadata.softDeletePolicy?.retentionDurationSeconds ?? 0) > 0 ? listObjects(cloud, config.name, { softDeleted: 'true' }) : []])
    const result = summarizeBucket(config, metadata, objects, softDeleted)
    progress({ bucket: config.name, bytes: totalBytes(result.bucket.usage), objects: objects.length + softDeleted.length })
    return result
  })
  const snapshots = await listObjects(cloud, REPORT_BUCKET, { prefix: REPORT_PREFIX, fields: 'nextPageToken,items(name)' })
  const latest = snapshots.map(object => object.name).filter(name => /^reports\/storage\/snapshots\/[0-9TZ.:_-]+\.[a-f0-9-]+\.json$/.test(name)).sort().at(-1)
  const previous = latest ? await cloud(query(`${bucketURL(REPORT_BUCKET)}/o/${encodeURIComponent(latest)}`, { alt: 'media' })) : null
  if (previous && previous.schemaVersion !== 1) throw new Error('Previous storage snapshot has an unsupported format')
  return buildReport(results, previous)
}

export async function publishReport(cloud, report) {
  const name = `${REPORT_PREFIX}${report.generatedAt.replaceAll(':', '-')}.${randomUUID()}.json`
  await cloud(query(`https://storage.googleapis.com/upload/storage/v1/b/${REPORT_BUCKET}/o`, { uploadType: 'media', name, ifGenerationMatch: '0' }), { method: 'POST', body: report })
  return name
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(resolve(process.argv[1]))) {
  try {
    const cloud = cloudClient(), report = await collect(cloud, value => console.log(JSON.stringify(value)))
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const path = resolve(root, 'content/reports/storage/latest.json')
    await mkdir(dirname(path), { recursive: true }); await writeFile(path, JSON.stringify(report, null, 2) + '\n')
    const snapshot = resolve(dirname(path), 'snapshots', `${report.generatedAt.replaceAll(':', '-')}.${randomUUID()}.json`)
    await mkdir(dirname(snapshot), { recursive: true }); await writeFile(snapshot, JSON.stringify(report) + '\n')
    if (process.argv.includes('--publish')) console.log(`Published ${await publishReport(cloud, report)}`)
    console.log(JSON.stringify({ generatedAt: report.generatedAt, totalBytes: totalBytes(report.totals), buckets: report.buckets.length }))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
