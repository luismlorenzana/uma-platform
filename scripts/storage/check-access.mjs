import { cloudClient, bucketURL, query } from './cloud.mjs'
import { BUCKETS } from './model.mjs'

const cloud = cloudClient()
for (const { name } of BUCKETS) {
  const page = await cloud(query(`${bucketURL(name)}/o`, { maxResults: '1', fields: 'items(name)' }))
  const path = page.items?.[0]?.name
  if (!path) { console.log(`No source object to probe in ${name}`); continue }
  try {
    await cloud(query(`${bucketURL(name)}/o/${encodeURIComponent(path)}`, { fields: 'size' }))
    throw new Error(`Collector can read source objects in ${name}`)
  } catch (error) {
    if (error.status !== 403) throw error
    console.log(`Source object reads correctly denied in ${name}`)
  }
}
