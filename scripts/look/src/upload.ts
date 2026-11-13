// `pnpm look:upload` (LK1, P161): the pack (content/authoring/look/pack/, from `pnpm look:pack`) to the platform app's
// private bucket under `look/pack/`, where the Look sub-app's signed-in route reads it for the phone test. Mirrors the
// folder (an old kit is removed). gcloud is scoped to the owner's default configuration and the games' project; never
// `config set`.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const pack = resolve(root, 'content/authoring/look/pack')
const bucket = process.env.CONTENT_BUCKET ?? 'uma-platform-content'
if (!existsSync(resolve(pack, 'index.json'))) throw new Error('No pack: run pnpm look:pack first')
execFileSync('gcloud', ['storage', 'rsync', pack, `gs://${bucket}/look/pack`, '--recursive', '--delete-unmatched-destination-objects'], {
  env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: process.env.CLOUDSDK_CORE_PROJECT ?? 'uma-rpg' },
  stdio: 'inherit',
})
console.log(`Uploaded the look pack to gs://${bucket}/look/pack/.`)
