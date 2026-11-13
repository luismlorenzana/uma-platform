// The code-drawn kits' scene captures (Q32, Q33): uma-stage's StageEngine draws uma-quest's test room or test town from
// each kit; each capture is POSTed back here and written into assets/authored/<kit>/review/. Local only
// (`pnpm --filter @uma-platform/kit-art review:scenes`).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const authored = fileURLToPath(new URL('../../../assets/authored/', import.meta.url))
export default {
  server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
  plugins: [{
    name: 'save-capture',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const q = new URL(req.url, 'http://x').searchParams, name = q.get('name') ?? '', kit = q.get('kit') ?? ''
        if (!/^[a-z0-9-]+\.png$/.test(name) || !/^kit-[a-z0-9-]+$/.test(kit)) { res.statusCode = 400; res.end('bad name'); return }
        let body = ''
        req.on('data', (d) => { body += d })
        req.on('end', () => {
          writeFileSync(`${authored}${kit}/review/${name}`, Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'))
          res.end('saved ' + name)
        })
      })
    },
  }],
}
