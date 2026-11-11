// The app icon (SH1): four rounded tiles, the platform's tile home, in light ink on a deep teal, drawn in code so it costs
// no art and exports the same bytes every time (adapted from uma-quest's scripts/make-icons.mjs at 47ca16d). iOS keeps
// the icon it saw at Add to Home Screen, so a change means a reinstall.
// Run: pnpm --filter @uma-platform/web icons (writes apps/web/public/icons/).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const GROUND = [0x16, 0x30, 0x2f]
const TILE = [0xf3, 0xef, 0xe4]
const SAMPLES = 4 // 4 × 4 samples a pixel for clean edges

/** Coverage at a point in the unit square: a 2 × 2 grid of rounded tiles inside the maskable safe zone (10 %–90 %). */
export function inTiles(x, y) {
  const start = 0.24, size = 0.24, gap = 0.04, radius = 0.05
  for (const ox of [start, start + size + gap])
    for (const oy of [start, start + size + gap]) {
      const dx = Math.max(ox + radius - x, 0, x - (ox + size - radius))
      const dy = Math.max(oy + radius - y, 0, y - (oy + size - radius))
      if (x >= ox && x <= ox + size && y >= oy && y <= oy + size && Math.hypot(dx, dy) <= radius) return true
    }
  return false
}

export function pixels(size) {
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3) // filter byte 0, then RGB
    for (let px = 0; px < size; px++) {
      let hits = 0
      for (let sy = 0; sy < SAMPLES; sy++)
        for (let sx = 0; sx < SAMPLES; sx++) if (inTiles((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size)) hits++
      const a = hits / (SAMPLES * SAMPLES)
      for (let c = 0; c < 3; c++) row[1 + px * 3 + c] = Math.round(GROUND[c] * (1 - a) + TILE[c] * a)
    }
    rows.push(row)
  }
  return Buffer.concat(rows)
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})
function crc32(buf) {
  let c = -1
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  len.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
export function png(size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 2, 0, 0, 0], 8) // 8-bit RGB, no interlace
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels(size), { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

export const ICONS = { 'icon-64.png': 64, 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')
  mkdirSync(out, { recursive: true })
  for (const [name, size] of Object.entries(ICONS)) writeFileSync(join(out, name), png(size))
  console.log(`icons → ${out}`)
}
