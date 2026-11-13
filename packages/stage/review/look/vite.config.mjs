// LK1's look slice (P157, P159): a local review app, never built into git. It reads the private CC0 kits
// (content/authoring/licensed/), the private references (content/authoring/look/) and our private sprite sets
// (content/release/) straight from disk, so it serves to localhost only.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../../..')
const captures = resolve(repo, 'content/authoring/look/captures')
/** POST /__capture?name=… with a JPEG data URL saves a frame privately (content/authoring/look/captures/), for reviews. */
const capture = {
  name: 'look-capture',
  configureServer(server) {
    server.middlewares.use('/__capture', (req, res) => {
      const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? 'frame'
      if (!/^[a-z0-9-]{1,60}$/.test(name)) { res.statusCode = 400; res.end('bad name'); return }
      let body = ''
      req.on('data', (c) => { body += c })
      req.on('end', () => {
        mkdirSync(captures, { recursive: true })
        writeFileSync(resolve(captures, `${name}.jpg`), Buffer.from(body.replace(/^data:image\/jpeg;base64,/, ''), 'base64'))
        res.end('saved')
      })
    })
  },
}
export default defineConfig({
  root: here,
  plugins: [capture],
  server: { host: '127.0.0.1', port: 4410, strictPort: true, fs: { allow: [repo] } },
  define: { __REPO__: JSON.stringify(repo) },
})
