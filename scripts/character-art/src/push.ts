// `pnpm art:push <universe>… | --all [--dry-run]`: publishes a universe's owner-approved looks to Uma Character Art,
// `gs://uma-platform-content/art/universes/<universe>/` (CA4, AP73–AP82). Only a look whose manifest entry says the owner
// approved it, and whose PNG still has the approved hash and size, goes up, byte for byte. Nothing is ever deleted there.
// It then flags each look as published beside the manifest, where the local gallery shows it.
import { approvedDir, authoring, bucketRemote, BUCKET, isUniverse, mirror, push, universesIn } from './lib.js'

const args = process.argv.slice(2).filter((a) => a !== '--')
const dryRun = args.includes('--dry-run')
const named = args.filter((a) => !a.startsWith('--'))
const all = universesIn()
const universes = args.includes('--all') ? all : named
if (universes.length === 0) throw new Error(`Name a universe, or --all: pnpm art:push <${all.join('|') || 'universe'}>… [--dry-run]`)
for (const u of universes) if (!isUniverse(u) || !all.includes(u)) throw new Error(`No approved collection for "${u}" in ${authoring}. There: ${all.join(', ') || 'none'}.`)

const now = new Date().toISOString()
let refused = 0
for (const universe of universes) {
  console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}: ${approvedDir(universe)} → gs://${BUCKET}/art/universes/${universe}/`)
  const r = push(universe, approvedDir(universe), mirror, bucketRemote(universe), now, { dryRun })
  console.log(`  ${r.uploaded.length} look${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published`)
  for (const id of r.uploaded) console.log(`    ${id}`)
  if (r.withdrawn.length) console.log(`  ${r.withdrawn.length} ${dryRun ? 'would leave' : 'left'} the index (no longer approved here; the files stay in the bucket): ${r.withdrawn.join(', ')}`)
  if (r.kept.length) console.log(`  ${r.kept.length} kept as published (the local copy is damaged): ${r.kept.join(', ')}`)
  for (const look of r.refused) console.log(`  Not sent, ${look.id}: ${look.why}`)
  refused += r.refused.length
  const c = r.publication.counts
  console.log(`  Flags: ${c.published} published, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
}
if (refused) process.exitCode = 1
