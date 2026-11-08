import { previews } from './previews.js'
previews().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
