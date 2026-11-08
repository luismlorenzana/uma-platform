import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { project } from './build.js'

export async function previews(root = project) {
  const dir = resolve(root, 'assets/previews'); await mkdir(dir, { recursive: true })
  const held = await readFile(resolve(root, 'packages/art/held/atlas.png')), emote = await readFile(resolve(root, 'packages/art/emote/atlas.png'))
  for (const [name, color] of Object.entries({ dark: '#142335', light: '#f1ece3', battle: '#26424b' })) {
    let canvas = sharp({ create: { width: 512, height: 576, channels: 4, background: color } })
    if (name === 'battle') {
      const lines = Array.from({ length: 16 }, (_, i) => `<path d="M${i * 32} 0V576M0 ${i * 36}H512"/>`).join('')
      const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="576"><rect width="512" height="160" fill="#20364b"/><g stroke="#38545d" stroke-width="1">${lines}</g></svg>`)
      canvas = canvas.composite([{ input: background }]); canvas = sharp(await canvas.png().toBuffer())
    }
    const native = await canvas.composite([{ input: held, left: 0, top: 0 }, { input: emote, left: 0, top: 512 }]).png().toBuffer()
    await writeFile(resolve(dir, `held-emote-${name}-1x.png`), native)
    await sharp(native).resize(1024, 1152, { kernel: 'nearest' }).png().toFile(resolve(dir, `held-emote-${name}-2x.png`))
  }
}
