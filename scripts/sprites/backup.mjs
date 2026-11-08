import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const source = resolve(process.env.UMA_CONTENT_DIR ?? resolve(root, 'content'), 'authoring')
const child = spawn('gcloud', ['storage', 'rsync', source, 'gs://uma-platform-authoring/authoring', '--recursive', '--exclude=.*(?:draw-things/(?:models|bin)/|node_modules/|\\.cache/).*'], {
  stdio: 'inherit', env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: 'uma-platform-lm' },
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
