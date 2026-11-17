import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const platform = resolve(process.env.UMA_PLATFORM_ROOT ?? join(here, '../..'))
const workspace = resolve(process.env.UMA_WORKSPACE ?? dirname(platform))
const preview = resolve(process.env.UMA_ART_AUTHORING_ROOT ?? join(workspace, 'uma-art-authoring'))

// Keep existing authoring paths when album builders are called from a local study.
process.env.UMA_PLATFORM_ROOT ??= platform

export function loadArtModule(path) {
  const file = join(preview, path)
  if (!existsSync(file)) {
    throw new Error('Clone luismlorenzana/uma-art-authoring beside uma-platform, or set UMA_ART_AUTHORING_ROOT.')
  }
  return import(pathToFileURL(file).href)
}
