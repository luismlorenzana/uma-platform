import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
export interface PropFrame {
  x: number; y: number; w: number; h: number; label: string
  grip?: { x: number; y: number }; scale?: number; angle0?: string; nock?: { x: number; y: number }; anchor?: { x: number; y: number }
}
export const artRoot = dirname(fileURLToPath(import.meta.resolve('@luismlorenzana/uma-art/package.json')))
export async function propArt() {
  const pack = JSON.parse(await readFile(resolve(artRoot, 'package.json'), 'utf8')) as { name: string; version: string }
  const maps: Record<string, Record<string, PropFrame & { file: string; rect: { x: number; y: number; w: number; h: number } }>> = {}
  for (const family of ['held', 'emote']) {
    const atlas = JSON.parse(await readFile(resolve(artRoot, family, 'atlas.json'), 'utf8')) as { frames: Record<string, PropFrame> }
    maps[family] = Object.fromEntries(Object.entries(atlas.frames).map(([key, f]) => [key.slice(family.length + 1), {
      ...f, file: `/studio-art/${family}/atlas.png`, rect: { x: f.x, y: f.y, w: f.w, h: f.h },
    }]))
  }
  return { held: maps.held!, emotes: maps.emote!, heldSource: { package: pack.name, version: pack.version } }
}
