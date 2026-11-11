// The Uma Platform app's sub-apps stay separate (AP1): a file in apps/<web|api>/src/apps/<a>/ never imports from another
// sub-app's folder <b>/. Shared code (the shell, sign-in, the content client) lives outside src/apps/.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SPECIFIER = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g

async function files(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await files(path))
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) out.push(path)
  }
  return out
}

/** Every import from one sub-app's folder into another's, as "<file> → <specifier>". */
export async function crossings(appsDir) {
  const found = []
  for (const file of await files(appsDir)) {
    const own = relative(appsDir, file).split(sep)[0]
    if (!own || own === relative(appsDir, file)) continue // the registry itself, src/apps/index.ts
    for (const match of (await readFile(file, 'utf8')).matchAll(SPECIFIER)) {
      const spec = match[1] ?? match[2] ?? match[3]
      if (!spec?.startsWith('.')) continue
      const target = relative(appsDir, resolve(dirname(file), spec)).split(sep)
      if (target[0] !== '..' && target.length > 1 && target[0] !== own) found.push(`${relative(root, file)} → ${spec}`)
    }
  }
  return found
}

for (const side of ['web', 'api'])
  test(`apps/${side}: no sub-app imports another`, async () => {
    assert.deepEqual(await crossings(join(root, 'apps', side, 'src', 'apps')), [])
  })
