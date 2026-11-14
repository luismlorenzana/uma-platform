// `pnpm sprites:backup` (UA6, P96): copies `content/authoring/` to `gs://uma-platform-authoring/authoring`, adding and
// replacing, never deleting. It leaves out rebuildable models, binaries and caches, and the folders the owner keeps on
// this machine only (P165, P177): ChatGPT's character universe studies, trials and splash art work, whose approved art is published by
// `pnpm art:push` instead. On Windows gcloud is `gcloud.cmd`, which Node only starts through the shell, so every argument
// is quoted for cmd.exe there (as the Ranker's and Story's scripts do).
import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const DESTINATION = 'gs://uma-platform-authoring/authoring'
/** Folders at the top of `content/authoring/` that never leave this machine (the owner, 2026-11-13). */
export const LOCAL_ONLY = ['character-universes', 'character-art', 'character-art-trials', 'splash-art']
/** One regex for gcloud's `--exclude`, matched against each file's path; either slash, so it holds on Windows too. */
export const EXCLUDE = `.*(?:draw-things[/\\\\](?:models|bin)[/\\\\]|node_modules[/\\\\]|\\.cache[/\\\\]|(?:^|[/\\\\])(?:${LOCAL_ONLY.join('|')})[/\\\\]).*`

/** The command that copies `source` to the bucket, for this platform. */
export function backupCommand(source, platform = process.platform, extra = []) {
  const args = ['storage', 'rsync', source, DESTINATION, '--recursive', `--exclude=${EXCLUDE}`, ...extra]
  if (platform !== 'win32') return { file: 'gcloud', args, shell: false }
  if (args.some((a) => a.includes('"'))) throw new Error('A gcloud argument with a quote cannot be passed through cmd.exe.')
  return { file: 'gcloud.cmd', args: args.map((a) => `"${a}"`), shell: true }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const source = resolve(process.env.UMA_CONTENT_DIR ?? resolve(root, 'content'), 'authoring')
  const command = backupCommand(source, process.platform, process.argv.includes('--dry-run') ? ['--dry-run'] : [])
  const child = spawn(command.file, command.args, {
    stdio: 'inherit', shell: command.shell, env: { ...process.env, CLOUDSDK_ACTIVE_CONFIG_NAME: 'default', CLOUDSDK_CORE_PROJECT: 'uma-platform-lm' },
  })
  child.on('error', error => { console.error(error.message); process.exitCode = 1 })
  child.on('exit', code => { process.exitCode = code ?? 1 })
}
