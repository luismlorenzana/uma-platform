// `pnpm art:status [<universe>…]`: every approved look's published flag against the bucket as it is now, printed and
// written where the local gallery reads it (`approved/publication.json`, `publication.js`). Publishes nothing.
import { approvedDir, authoring, bucketRemote, isUniverse, status, universesIn } from './lib.js'

const named = process.argv.slice(2).filter((a) => a !== '--' && !a.startsWith('--'))
const all = universesIn()
const universes = named.length ? named : all
if (universes.length === 0) throw new Error(`No approved collection in ${authoring}.`)
for (const u of universes) if (!isUniverse(u) || !all.includes(u)) throw new Error(`No approved collection for "${u}" in ${authoring}. There: ${all.join(', ') || 'none'}.`)

const now = new Date().toISOString()
for (const universe of universes) {
  const { publication: p, flagged } = status(universe, approvedDir(universe), bucketRemote(universe), now)
  const c = p.counts
  console.log(`${universe}: ${c.published} of ${p.looks.length} published${p.publishedAt ? ` (${p.publishedAt.slice(0, 10)})` : ''}, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused`)
  for (const look of p.looks) if (look.state !== 'published') console.log(`  ${look.state.padEnd(11)} ${look.id}${look.note ? `: ${look.note}` : ''}`)
  if (p.withdrawable.length) console.log(`  Published but no longer approved here (the next push takes them off the index): ${p.withdrawable.join(', ')}`)
  if (flagged.length) console.log(`  Wrote ${flagged.join(', ')}`)
}
