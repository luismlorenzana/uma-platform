// The Uma Platform app's sub-apps stay separate (AP1): a file in apps/<web|api>/src/apps/<a>/ never imports from another
// sub-app's folder <b>/. Shared code (the shell, sign-in, the content client) lives outside src/apps/.
// Inside Uma Story the books stay separate too (AP53): a book's folder imports the shell and the Cast book, never the
// other game's book; the shell imports no book, and the Cast book only the shell.
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

/** The folders directly inside a directory. */
async function folders(dir) {
  return (await readdir(dir, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/** Every import from one sub-app's folder into another's (a file in it, or the folder itself), as "<file> → <specifier>". */
export async function crossings(appsDir) {
  const found = [], subApps = await folders(appsDir)
  for (const file of await files(appsDir)) {
    const own = relative(appsDir, file).split(sep)[0]
    if (!own || own === relative(appsDir, file)) continue // the registry itself, src/apps/index.ts
    for (const match of (await readFile(file, 'utf8')).matchAll(SPECIFIER)) {
      const spec = match[1] ?? match[2] ?? match[3]
      if (!spec?.startsWith('.')) continue
      const target = relative(appsDir, resolve(dirname(file), spec)).split(sep)
      if (subApps.includes(target[0]) && target[0] !== own) found.push(`${relative(root, file)} → ${spec}`)
    }
  }
  return found
}

for (const side of ['web', 'api'])
  test(`apps/${side}: no sub-app imports another`, async () => {
    assert.deepEqual(await crossings(join(root, 'apps', side, 'src', 'apps')), [])
  })

/** What each of Uma Story's folders may import from, besides itself. Any other folder is a game's book: shell and cast. */
const BOOK_MAY = { shell: [], cast: ['shell'] }

/** Every import from one of Uma Story's folders into one it may not read, as "<file> → <specifier>". */
export async function bookCrossings(storyDir) {
  const found = [], books = await folders(storyDir)
  for (const file of await files(storyDir)) {
    const own = relative(storyDir, file).split(sep)[0]
    if (!own || own === relative(storyDir, file)) continue // the sub-app's own root files: its routes and home
    const may = BOOK_MAY[own] ?? ['shell', 'cast']
    for (const match of (await readFile(file, 'utf8')).matchAll(SPECIFIER)) {
      const spec = match[1] ?? match[2] ?? match[3]
      if (!spec?.startsWith('.')) continue
      const target = relative(storyDir, resolve(dirname(file), spec)).split(sep)
      if (books.includes(target[0]) && target[0] !== own && !may.includes(target[0])) found.push(`${relative(root, file)} → ${spec}`)
    }
  }
  return found
}

for (const side of ['web', 'api'])
  test(`apps/${side}: in Uma Story, no book imports the other game's`, async () => {
    assert.deepEqual(await bookCrossings(join(root, 'apps', side, 'src', 'apps', 'story')), [])
  })

test('the book rule catches a crossing, and lets a book read the shell and the cast', async (t) => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const dir = await mkdtemp(join(tmpdir(), 'story-books-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const put = async (path, text) => { await mkdir(dirname(join(dir, path)), { recursive: true }); await writeFile(join(dir, path), text) }
  await put('index.tsx', "import './quest'\nimport './farm'\n")
  await put('shell/api.ts', 'export const a = 1\n')
  await put('cast/index.tsx', "import { a } from '../shell/api'\nexport default a\n")
  await put('quest/index.tsx', "import { a } from '../shell/api'\nimport cast from '../cast'\nexport default [a, cast]\n")
  await put('farm/index.tsx', "import { a } from '../shell/api'\nexport default a\n")
  assert.deepEqual(await bookCrossings(dir), [])
  await put('farm/Routes.tsx', "import quest from '../quest'\nexport default quest\n")
  await put('shell/Bad.tsx', "import cast from '../cast'\nexport default cast\n")
  await put('cast/Bad.tsx', "const farm = () => import('../farm')\nexport default farm\n")
  assert.deepEqual((await bookCrossings(dir)).map((line) => line.split(sep).join('/').replace(/^.*story-books-[^/]+\//, '')).sort(),
    ['cast/Bad.tsx → ../farm', 'farm/Routes.tsx → ../quest', 'shell/Bad.tsx → ../cast'])
})
