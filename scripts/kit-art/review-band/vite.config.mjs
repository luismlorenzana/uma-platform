// The sample band's capture page (KF13): BandStage renders the real kit-farm; each capture is POSTed back here and
// written into assets/authored/kit-farm/review/. Local only (`pnpm --filter @uma-platform/kit-art review:band`).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const review = fileURLToPath(new URL('../../../assets/authored/kit-farm/review/', import.meta.url))
export default {
  server: { fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
  plugins: [{
    name: 'save-capture',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') ?? ''
        if (!/^[a-z0-9-]+\.png$/.test(name)) { res.statusCode = 400; res.end('bad name'); return }
        let body = ''
        req.on('data', (d) => { body += d })
        req.on('end', () => {
          writeFileSync(review + name, Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'))
          res.end('saved ' + name)
        })
      })
    },
  }],
}
