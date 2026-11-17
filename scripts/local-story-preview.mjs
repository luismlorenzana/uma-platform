import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const targets = new Map([
  ['quest', 'server.mjs'],
  ['farm', 'server.mjs'],
  ['cyberpunk', 'server.ts'],
])
const name = process.argv[2]
const target = targets.get(name)
if (!target) throw new Error('Choose a story sandbox: quest, farm, or cyberpunk.')

const platform = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspace = resolve(process.env.UMA_WORKSPACE ?? dirname(platform))
const gameKey = `UMA_${name.toUpperCase()}_ROOT`
const game = resolve(process.env[gameKey] ?? join(workspace, `uma-${name}`))
const authoring = resolve(process.env.UMA_STORY_AUTHORING_ROOT ?? join(workspace, 'uma-story-authoring'))
const extracted = join(authoring, name, target)
const entry = existsSync(extracted) ? extracted : join(game, 'tools/story-sandbox', target)

process.env[gameKey] = game
if (name === 'cyberpunk') await import(pathToFileURL(join(game, 'node_modules/tsx/dist/loader.mjs')).href)
await import(pathToFileURL(entry).href)
