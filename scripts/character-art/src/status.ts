// `pnpm art:status [<universe>…]`: every approved look's published flag against the bucket as it is now, printed and
// written where the local gallery reads it (`approved/publication.json`, `publication.js`), and the dialogue portraits' flag
// where a universe has them (`dialogue-portraits/publication.json`, CA5), and its enemy looks' flag in Uma Enemy Art where it
// has an enemy collection (`enemies/approved/publication.json`, EA1). Publishes nothing.
import { enemiesDir, enemyPrefix, enemyStatus, enemyUniverses } from './enemies.js'
import { approvedDir, authoring, bucketRemote, isUniverse, remoteAt, status, universesIn } from './lib.js'
import { portraitsDir, portraitStatus, portraitUniverses } from './portraits.js'

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
  if (portraitUniverses().includes(universe)) {
    const { publication: q, flagged: written } = portraitStatus(universe, portraitsDir(universe), bucketRemote(universe), now)
    console.log(`  Dialogue portraits: ${q.state}${q.publishedAt ? ` (${q.publishedAt.slice(0, 10)})` : ''}, ${q.states} states from ${q.bases} crops and ${q.faces} faces${q.note ? `: ${q.note}` : ''}`)
    if (written.length) console.log(`  Wrote ${written.join(', ')}`)
  }
  if (enemyUniverses().includes(universe)) {
    const { publication: e, flagged: written } = enemyStatus(universe, enemiesDir(universe), remoteAt(enemyPrefix(universe)), now)
    const c = e.counts
    console.log(`  Enemy looks (Uma Enemy Art): ${c.published} of ${e.looks.length} published${e.publishedAt ? ` (${e.publishedAt.slice(0, 10)})` : ''}, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused`)
    for (const look of e.looks) if (look.state !== 'published' && look.state !== 'refused') console.log(`    ${look.state.padEnd(11)} ${look.id}${look.note ? `: ${look.note}` : ''}`)
    if (written.length) console.log(`  Wrote ${written.join(', ')}`)
  }
}
