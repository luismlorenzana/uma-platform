// `pnpm story:pull <book> [--to <dir>] [--drafts] [--force]`: brings the owner's verdicts from Uma Story to the writer's
// folder (`reviews.json`, AP58), merged with any saved on this machine. With `--drafts` it also brings the drafts, for
// another machine (AP68): a local file that differs is kept and listed, unless `--force`.
import { bucketRemote, BOOKS, BUCKET, folderOf, isBook, pull } from './lib.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const book = args.find((a) => !a.startsWith('--'))
if (!isBook(book)) throw new Error(`Name the book: pnpm story:pull <${BOOKS.join('|')}> [--to <dir>] [--drafts] [--force]`)
const to = args.includes('--to') ? args[args.indexOf('--to') + 1] : undefined
const dir = folderOf(book, to)

console.log(`Pulling the ${book} book: gs://${BUCKET}/story/${book}/ → ${dir}`)
const result = pull(book, dir, bucketRemote(book), { drafts: args.includes('--drafts'), force: args.includes('--force') })
console.log(`  Verdicts: ${result.reviews}`)
if (args.includes('--drafts')) {
  console.log(`  ${result.written.length} draft${result.written.length === 1 ? '' : 's'} written, ${result.same} already the same`)
  if (result.conflicts.length) console.log(`  ${result.conflicts.length} kept as they are here, because they differ from the bucket's (--force takes the bucket's): ${result.conflicts.join(', ')}`)
}
