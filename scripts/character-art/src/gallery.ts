// `pnpm art:gallery`: the Local Art Gallery at http://127.0.0.1:4323 (CA4, AP80). It serves the universes' private
// authoring folder as it is, read only and to this machine alone, with a front page that lists each universe's approved
// gallery and how many of its looks are published. The pages also open straight from the file system; this is the one
// address to start from, and the one a session can show in the app's browser.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileFor, indexPage, typeOf } from './gallery-lib.js'
import { authoring, SITE } from './lib.js'

const port = Number(process.env.PORT ?? 4323)
createServer((req, res) => {
  const send = (status: number, type: string, body: string | Uint8Array) => { res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(req.method === 'HEAD' ? undefined : body) }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain; charset=utf-8', 'Read only')
  const path = (req.url ?? '/').split('?')[0]!
  if (path === '/' || path === '/index.html') return send(200, 'text/html; charset=utf-8', indexPage(authoring, SITE))
  const file = fileFor(authoring, path)
  if (!file) return send(404, 'text/plain; charset=utf-8', 'Not found')
  readFile(file).then((bytes) => send(200, typeOf(file), bytes), () => send(404, 'text/plain; charset=utf-8', 'Not found'))
}).listen(port, '127.0.0.1', () => { console.log(`Local Art Gallery: http://127.0.0.1:${port}  (${authoring})`) })
