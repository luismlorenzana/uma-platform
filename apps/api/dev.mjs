// `pnpm --filter @uma-platform/api dev` on any platform (the Mac and the Windows PC): the API with the owner guard off
// and on its local port, watching for changes. A shell prefix (`AUTH_MODE=… nest start`) doesn't run under cmd.exe.
import { spawn } from 'node:child_process'

const env = { ...process.env, AUTH_MODE: process.env.AUTH_MODE ?? 'disabled', PORT: process.env.PORT ?? '8111' }
const child = spawn('nest', ['start', '--watch'], { stdio: 'inherit', env, shell: process.platform === 'win32' })
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
