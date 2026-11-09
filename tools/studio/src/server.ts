import { artRoot, propArt } from './prop-art.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { BackupQueue } from './backup.js'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { atomicJson, buildProgress, content as defaultContent, hash, maybeJson, queue, readJson, type QueueOverride, type Ranking } from '@uma-platform/sprite-pipeline'
import { inside, loadCatalog } from './catalog.js'
import { RankingStore, ConflictError } from './store.js'
import { ReviewStore, ReviewConflict } from './review-store.js'
import { spriteReview } from './sprite-review.js'
import { loadEnemyCatalog } from './enemy-catalog.js'
import { EnemyRankingStore } from './enemy-store.js'
import { exportEnemyPlan } from './enemy-model.js'

const here = dirname(fileURLToPath(import.meta.url)), tool = resolve(here, '..')
const content = resolve(process.env.UMA_CONTENT_DIR ?? defaultContent), release = resolve(content, 'release'), root = resolve(content, 'authoring/sprites')
const port = Number(process.env.UMA_STUDIO_PORT ?? 4318)
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid Studio port')
async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let size = 0
  for await (const chunk of request) { const bytes = Buffer.from(chunk as Uint8Array); size += bytes.length; if (size > 1_000_000) throw new Error('Request too large'); chunks.push(bytes) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}
function send(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); response.end(JSON.stringify(data))
}
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp' }
async function serve(response: ServerResponse, file: string) {
  const type = types[extname(file)]; if (!type) throw new Error('Unsupported file')
  const bytes = await readFile(file); response.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' }); response.end(bytes)
}
async function main() {
  const catalog = await loadCatalog(release), rankings = new RankingStore(resolve(content, 'authoring/uma-art-roster.json'), catalog.umas), reviews = new ReviewStore(root)
  await rankings.read()
  const enemyCatalog = await loadEnemyCatalog(content), enemyRankings = new EnemyRankingStore(resolve(content, 'authoring/enemy-art-roster.json'), enemyCatalog)
  await enemyRankings.read()
  const enemyImages = new Set(enemyCatalog.units.flatMap(u => Object.values(u.images)))
  const backups = new BackupQueue(async () => { await promisify(execFile)(process.execPath, [resolve(tool, '../../scripts/sprites/backup.mjs')], { env: { ...process.env, UMA_CONTENT_DIR: content }, maxBuffer: 16 * 1024 * 1024 }) })
  const images = new Set(catalog.umas.flatMap(u => [u.portrait, u.face, ...(u.references?.map(r => r.path) ?? [])]).filter((p): p is string => !!p))
  let queueWrite: Promise<unknown> = Promise.resolve()
  const readQueue = async () => {
    const value = await maybeJson<QueueOverride>(resolve(root, 'queue.json'), { schemaVersion: 1, traveler: [], townsfolk: [] })
    return { value, stamp: hash(JSON.stringify(value)) }
  }
  const server = createServer((request, response) => { void (async () => {
    const host = request.headers.host
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) { send(response, 403, { error: 'Use the loopback Studio URL' }); return }
    response.setHeader('x-content-type-options', 'nosniff')
    response.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`), path = url.pathname
    if (request.method !== 'GET') {
      if ((request.headers.origin && request.headers.origin !== `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site' || request.headers['content-type']?.split(';')[0] !== 'application/json') { send(response, 403, { error: 'Save from the local Studio' }); return }
      if (request.method !== 'PUT') { send(response, 405, { error: 'Method not allowed' }); return }
      if (path === '/api/rankings') { send(response, 200, await rankings.save(await body(request))); return }
      if (path === '/api/enemies/rankings') { send(response, 200, await enemyRankings.save(await body(request))); return }
      if (path === '/api/reviews') { const saved = await reviews.save(await body(request)); await buildProgress(content); void backups.schedule(); send(response, 200, saved); return }
      if (path === '/api/queue') {
        const input = await body(request) as { stamp?: string; value?: QueueOverride }
        const work = queueWrite.then(async () => {
          const before = await readQueue()
          if (input.stamp !== before.stamp) throw new ReviewConflict('Queue changed; reload before saving')
          if (!input.value || input.value.schemaVersion !== 1 || !Array.isArray(input.value.traveler) || !Array.isArray(input.value.townsfolk)) throw new Error('Invalid queue')
          const roster = await readJson<{ rankings: Ranking[] }>(resolve(content, 'authoring/uma-art-roster.json'))
          for (const profile of ['traveler', 'townsfolk'] as const) queue(roster.rankings, profile, input.value[profile], input.value.townsfolkOutfits)
          await atomicJson(resolve(root, 'queue.json'), input.value)
          await buildProgress(content); return readQueue()
        }); queueWrite = work.catch(() => undefined); send(response, 200, await work); return
      }
      send(response, 404, { error: 'Unknown write route' }); return
    }
    if (path === '/api/prop-art') { send(response, 200, await propArt()); return }
    if (path === '/api/catalog') { send(response, 200, catalog); return }
    if (path === '/api/enemies/catalog') { send(response, 200, enemyCatalog); return }
    if (path === '/api/enemies/rankings') { send(response, 200, await enemyRankings.read()); return }
    if (path === '/api/enemies/export') {
      response.setHeader('content-disposition', 'attachment; filename="enemy-authoring-plan.json"')
      send(response, 200, exportEnemyPlan(enemyCatalog, await enemyRankings.read())); return
    }
    if (path.startsWith('/enemy-assets/')) {
      const relative = decodeURIComponent(path.slice('/enemy-assets/'.length))
      if (!enemyImages.has(relative)) { send(response, 404, { error: 'Not a catalog reference image' }); return }
      await serve(response, await inside(resolve(content, 'authoring/enemies'), relative)); return
    }
    if (path === '/api/rankings') { send(response, 200, await rankings.read()); return }
    if (path === '/api/authoring') { send(response, 200, await buildProgress(content, false)); return }
    if (path === '/api/queue') { send(response, 200, await readQueue()); return }
    if (path === '/api/backup') { send(response, 200, backups.status); return }
    if (path === '/api/reviews') { send(response, 200, await reviews.read()); return }
    if (path === '/api/sprite-review') { send(response, 200, await spriteReview(content, catalog, url.searchParams)); return }
    if (/^\/studio-art\/(held|emote)\/atlas\.(png|json)$/.test(path)) { await serve(response, await inside(artRoot, path.slice(12))); return }
    if (path.startsWith('/sprite-assets/')) { await serve(response, await inside(root, decodeURIComponent(path.slice(15)))); return }
    if (path.startsWith('/authoring-art/')) {
      const id = Number(path.split('/').pop()), progress = await buildProgress(content, false), key = progress.entries.find(e => e.outfitId === id)?.key
      if (!key) { send(response, 404, { error: 'No key yet' }); return }
      await serve(response, await inside(content, key)); return
    }
    if (images.has(path)) { await serve(response, await inside(release, path.slice(1))); return }
    const pages: Record<string, string> = { '/': 'src/index.html', '/enemies': 'public/enemies.html', '/enemies/': 'public/enemies.html', '/enemy-app.js': 'dist/enemy-app.js', '/enemy-model.js': 'dist/enemy-model.js', '/props': 'public/props.html', '/queue': 'public/queue.html', '/authoring': 'public/queue.html', '/gates': 'public/gates.html', '/style.css': 'src/style.css', '/app.js': 'dist/app.js', '/model.js': 'dist/model.js', '/sprites/placement.js': 'dist/held-placement.js' }
    if (pages[path]) { await serve(response, resolve(tool, pages[path])); return }
    if (path === '/sprites' || path === '/field') { response.writeHead(302, { location: path + '/' + url.search }); response.end(); return }
    if (path.startsWith('/sprites/')) { await serve(response, await inside(resolve(tool, 'public/desk'), decodeURIComponent(path.slice(9)) || 'index.html')); return }
    if (path.startsWith('/field/')) { await serve(response, await inside(resolve(tool, 'public/field'), decodeURIComponent(path.slice(7)) || 'index.html')); return }
    await serve(response, await inside(resolve(tool, 'public'), path.slice(1)))
  })().catch((error: unknown) => {
    if (response.headersSent) { response.end(); return }
    const status = error instanceof ReviewConflict || error instanceof ConflictError ? 409 : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 400
    send(response, status, { error: error instanceof Error ? error.message : 'Request failed' })
  }) })
  server.on('error', error => { console.error(error.message); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.log(`Sprite Studio: http://127.0.0.1:${port}`))
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
