// Builds the stage's review pages into self-contained HTML under docs/stage/previews/: one file each, the script inlined,
// made from the package's own source (ST2's portrait farm band). `pnpm --filter @luismlorenzana/uma-stage review`.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const docs = resolve(here, '../../../docs/stage/previews')
await mkdir(docs, { recursive: true })

for (const page of ['farm-band']) {
  const outDir = resolve(here, '.cache', page)
  await rm(outDir, { recursive: true, force: true })
  await build({
    root: resolve(here, page),
    base: './',
    logLevel: 'warn',
    esbuild: { jsx: 'automatic' },
    build: { outDir, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false,
      rollupOptions: { output: { inlineDynamicImports: true },
        onwarn: (warning, warn) => { if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning) } } },
  })
  let html = await readFile(resolve(outDir, 'index.html'), 'utf8')
  // Inline the one script and any stylesheet, so the page opens from disk or GitHub with nothing beside it.
  html = await replaceAsync(html, /<script type="module" crossorigin src="\.\/([^"]+)"><\/script>/g,
    async (_, file) => `<script type="module">${(await readFile(resolve(outDir, file), 'utf8')).replaceAll('</script', '<\\/script')}</script>`)
  html = await replaceAsync(html, /<link rel="stylesheet" crossorigin href="\.\/([^"]+)">/g,
    async (_, file) => `<style>${await readFile(resolve(outDir, file), 'utf8')}</style>`)
  if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error(`${page}: an asset wasn't inlined`)
  await writeFile(resolve(docs, `${page}.html`), html)
  console.log(`docs/stage/previews/${page}.html: ${(html.length / 1024).toFixed(0)} KB`)
}

async function replaceAsync(text, pattern, replace) {
  const parts = await Promise.all([...text.matchAll(pattern)].map((match) => replace(...match)))
  let i = 0
  return text.replace(pattern, () => parts[i++])
}
