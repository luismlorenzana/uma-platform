import { execFileSync } from 'node:child_process'

export function cloudClient() {
  // Fixed arguments only. cmd.exe is needed for the SDK's Windows wrapper; tokens stay in process memory.
  const args = ['--configuration=default', '--project=uma-rpg', 'auth', 'print-access-token', '--quiet']
  const token = execFileSync(process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud', args, { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  return async (url, { method = 'GET', body, contentType = 'application/json' } = {}) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': contentType }) },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(45_000) })
      if (response.ok) return response.status === 204 ? null : response.json()
      await response.arrayBuffer()
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 3) { await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt)); continue }
      const error = new Error(`Cloud request failed (${response.status}) at ${new URL(url).hostname}`)
      error.status = response.status
      throw error
    }
  }
}

export const bucketURL = name => `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(name)}`
export const query = (url, params) => `${url}?${new URLSearchParams(params)}`

export async function listObjects(cloud, bucket, options = {}) {
  const objects = []; let token
  do {
    const page = await cloud(query(`${bucketURL(bucket)}/o`, { maxResults: '1000',
      fields: 'nextPageToken,items(name,size,generation,timeDeleted,softDeleteTime,updated,md5Hash)', ...options, ...(token ? { pageToken: token } : {}) }))
    objects.push(...(page.items ?? [])); token = page.nextPageToken
  } while (token)
  return objects
}

export async function mapLimit(items, limit, work) {
  const results = new Array(items.length); let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await work(items[index]) }
  }))
  return results
}
