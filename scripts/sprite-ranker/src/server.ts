import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inside, loadCatalog } from './catalog.js'
import { RankingStore, ConflictError } from './store.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const content = resolve(process.env.UMA_RANKER_CONTENT_DIR ?? resolve(root, 'content'))
const releaseDir = resolve(content, 'release')
const port = Number(process.env.UMA_RANKER_PORT ?? 4318)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('UMA_RANKER_PORT must be 1–65535.')

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk as Uint8Array)
    size += bytes.length
    if (size > 1_000_000) throw new Error('JSON file is too large (limit 1 MB).')
    chunks.push(bytes)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function send(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(data))
}

async function main(): Promise<void> {
  const catalog = await loadCatalog(releaseDir)
  const store = new RankingStore(resolve(content, 'review/sprite-ranker/rankings.json'), catalog.umas)
  // A corrupt existing file must be surfaced on startup, never silently replaced with an empty board.
  await store.read()
  const images = new Set(catalog.umas.flatMap((uma) => [uma.portrait, uma.face]).filter((path): path is string => path !== null))
  const staticFiles: Record<string, [string, string]> = {
    '/': [resolve(here, '../src/index.html'), 'text/html; charset=utf-8'],
    '/style.css': [resolve(here, '../src/style.css'), 'text/css; charset=utf-8'],
    '/app.js': [resolve(here, 'app.js'), 'text/javascript; charset=utf-8'],
    '/model.js': [resolve(here, 'model.js'), 'text/javascript; charset=utf-8'],
  }
  const server = createServer((request, response) => {
    void (async () => {
      // Bind only to loopback and require same-origin writes, including against DNS rebinding.
      if (request.headers.host !== `127.0.0.1:${port}` && request.headers.host !== `localhost:${port}`) {
        send(response, 403, { error: 'Use the local app URL.' }); return
      }
      response.setHeader('x-content-type-options', 'nosniff')
      response.setHeader('content-security-policy', "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
      const path = new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname
      if (request.method === 'GET' && path === '/api/catalog') { send(response, 200, catalog); return }
      if (request.method === 'GET' && path === '/api/rankings') { send(response, 200, await store.read()); return }
      if (request.method === 'PUT' && path === '/api/rankings') {
        const origin = request.headers.origin
        if ((origin && origin !== `http://${request.headers.host}`) || request.headers['sec-fetch-site'] === 'cross-site' ||
            request.headers['content-type']?.split(';')[0] !== 'application/json') {
          send(response, 403, { error: 'Save from the local app.' }); return
        }
        send(response, 200, await store.save(await body(request))); return
      }
      if (request.method !== 'GET') { send(response, 405, { error: 'Method not allowed.' }); return }
      const asset = staticFiles[path]
      if (asset) {
        const bytes = await readFile(asset[0])
        response.writeHead(200, { 'content-type': asset[1], 'cache-control': 'no-cache' }); response.end(bytes); return
      }
      if (images.has(path)) {
        const bytes = await readFile(await inside(releaseDir, path.slice(1)))
        response.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'private, max-age=86400' }); response.end(bytes); return
      }
      send(response, 404, { error: 'Not found.' })
    })().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
      if (!response.headersSent) send(response, error instanceof ConflictError ? 409 : 400, { error: error instanceof Error ? error.message : 'Request failed.' })
      else response.end()
    })
  })
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => {
    console.log(`Uma Sprite Studio: http://127.0.0.1:${port}`)
    console.log(`${catalog.umas.length} outfits · JSON: ${resolve(content, 'review/sprite-ranker/rankings.json')}`)
  })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  console.error('This tool needs the local content/release. See scripts/sprite-ranker/README.md.')
  process.exitCode = 1
})
