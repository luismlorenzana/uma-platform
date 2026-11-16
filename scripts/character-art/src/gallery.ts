// `pnpm art:gallery`: the Local Art Gallery at http://127.0.0.1:4323 (CA4, AP80). It serves the universes' private
// authoring folder as it is, read only and to this machine alone, with a front page that lists each universe's approved
// gallery and how many of its looks are published. The pages also open straight from the file system; this is the one
// address to start from, and the one a session can show in the app's browser. A cast album (`<app>/cast/review.html`,
// P200) is built fresh from its folders on every visit, so a picture added to a character's folder shows on a refresh.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fileFor, indexPage, typeOf } from './gallery-lib.js'
import { authoring, SITE } from './lib.js'

const castAlbum = import(pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '../albums/cast-album.mjs')).href) as Promise<{ renderCastAlbum(appDir: string): Promise<{ html: string }> }>

const port = Number(process.env.PORT ?? 4323)
createServer((req, res) => {
  const send = (status: number, type: string, body: string | Uint8Array) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : body) }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain; charset=utf-8', 'Read only')
  const path = (req.url ?? '/').split('?')[0]!
  if (path === '/' || path === '/index.html') return send(200, 'text/html; charset=utf-8', indexPage(authoring, SITE))
  if (/\/cast\/(review\.html)?$/.test(path)) {
    const words = fileFor(authoring, path.replace(/(review\.html)?$/, 'album.json'))
    if (words) {
      castAlbum.then((m) => m.renderCastAlbum(dirname(dirname(words)))).then((page) => send(200, 'text/html; charset=utf-8', page.html), (error: unknown) => send(500, 'text/plain; charset=utf-8', String(error)))
      return
    }
  }
  const file = fileFor(authoring, path)
  if (!file) return send(404, 'text/plain; charset=utf-8', 'Not found')
  readFile(file).then((bytes) => send(200, typeOf(file), bytes), () => send(404, 'text/plain; charset=utf-8', 'Not found'))
}).listen(port, '127.0.0.1', () => { console.log(`Local Art Gallery: http://127.0.0.1:${port}  (${authoring})`) })
