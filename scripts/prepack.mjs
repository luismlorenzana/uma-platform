// Every published package's `prepack` (P172): build the package before it's packed, unless the release workflow already
// built every package in dependency order (`UMA_PACKAGES_BUILT=1`) and its dist is there. `changeset publish` packs
// several packages at once, so their prepacks run in parallel; a rebuild starts with `rm -rf dist`, and a dependent
// compiling at that moment can't find the types it builds against (uma-data 1.7.0 and uma-stage 0.7.0, 2026-11-14).
// A manual `pnpm pack` or `pnpm publish` still builds first, as before.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

if (process.env.UMA_PACKAGES_BUILT === '1' && existsSync('dist')) {
  console.error('prepack: already built by the release workflow')
  process.exit(0)
}
const build = spawnSync('pnpm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(build.status ?? 1)
