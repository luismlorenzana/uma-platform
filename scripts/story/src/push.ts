// `pnpm story:push <book> [--from <dir>] [--dry-run]`: copies a book's drafts to Uma Story's review copy,
// `gs://uma-platform-content/story/<book>/` (US1, AP55–AP57). Only text that changed goes up (never a picture, a pack or
// an export), nothing is ever deleted there, and the bucket keeps every older version, so a push is also the backup.
// When the book has a check report (`checks.json`), it must describe the drafts as they are now, or the push is refused.
import { bucketRemote, BOOKS, BUCKET, folderOf, isBook, push } from './lib.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const book = args.find((a) => !a.startsWith('--'))
if (!isBook(book)) throw new Error(`Name the book: pnpm story:push <${BOOKS.join('|')}> [--from <dir>] [--dry-run]`)
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined
const dryRun = args.includes('--dry-run')
const dir = folderOf(book, from)

console.log(`${dryRun ? 'Would push' : 'Pushing'} the ${book} book: ${dir} → gs://${BUCKET}/story/${book}/`)
const result = push(book, dir, bucketRemote(book), new Date().toISOString(), { dryRun })
console.log(`  ${result.uploaded.length} draft${result.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${result.unchanged} unchanged`)
for (const path of result.uploaded.slice(0, 40)) console.log(`    ${path}`)
if (result.uploaded.length > 40) console.log(`    … and ${result.uploaded.length - 40} more`)
if (result.gone.length) console.log(`  ${result.gone.length} no longer in the folder, kept in the bucket: ${result.gone.join(', ')}`)
if (result.refused.length) console.log(`  ${result.refused.length} not sent, their names aren't lowercase store paths: ${result.refused.join(', ')}`)
console.log(`  Check report: ${result.report === 'sent' ? 'sent' : 'none yet'}`)
console.log(`  Verdicts: ${result.reviews}`)
