// `pnpm art:push <universe>… | --all [--only <id|outfit>,…] [--portraits] [--dry-run]`: publishes a universe's owner-approved looks to Uma Character Art,
// `gs://uma-platform-content/art/universes/<universe>/` (CA4, AP73–AP82). Only a look whose manifest entry says the owner
// approved it, and whose PNG still has the approved hash and size, goes up, byte for byte. Nothing is ever deleted there.
// It then flags each look as published beside the manifest, where the local gallery shows it. With `--portraits` it
// publishes the universe's approved dialogue portraits as their pieces instead (CA5, P169), and leaves the looks alone.
import { approvedDir, authoring, bucketRemote, BUCKET, isUniverse, mirror, push, universesIn } from './lib.js'
import { portraitsDir, portraitUniverses, pushPortraits } from './portraits.js'

const raw = process.argv.slice(2).filter((a) => a !== '--')
// `--only a,b` or `--only=a,b`: only those looks (by id or outfit) change; every other look stays as the bucket has it.
const onlyAt = raw.findIndex((a) => a === '--only' || a.startsWith('--only='))
const only = onlyAt === -1 ? [] : (raw[onlyAt]!.includes('=') ? raw[onlyAt]!.slice('--only='.length) : raw[onlyAt + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
if (onlyAt !== -1 && only.length === 0) throw new Error('--only needs look ids or outfits, joined by commas.')
const args = onlyAt === -1 ? raw : raw.filter((_, i) => i !== onlyAt && !(i === onlyAt + 1 && !raw[onlyAt]!.includes('=')))
const dryRun = args.includes('--dry-run'), portraits = args.includes('--portraits')
if (portraits && only.length) throw new Error('--portraits publishes a whole approved portrait collection; it takes no --only.')
const named = args.filter((a) => !a.startsWith('--'))
const all = portraits ? portraitUniverses() : universesIn()
const universes = args.includes('--all') ? all : named
if (universes.length === 0) throw new Error(`Name a universe, or --all: pnpm art:push <${all.join('|') || 'universe'}>… [--dry-run]`)
for (const u of universes) if (!isUniverse(u) || !all.includes(u)) throw new Error(`No approved ${portraits ? 'dialogue portraits' : 'collection'} for "${u}" in ${authoring}. There: ${all.join(', ') || 'none'}.`)

const now = new Date().toISOString()
if (portraits) {
  for (const universe of universes) {
    console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}'s dialogue portraits as pieces: ${portraitsDir(universe)} → gs://${BUCKET}/art/universes/${universe}/portraits/`)
    const r = pushPortraits(universe, portraitsDir(universe), mirror, bucketRemote(universe), now, { dryRun })
    const p = r.publication
    console.log(`  ${r.uploaded.length} piece${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published; ${p.bases} outfit crops and ${p.faces} faces make ${r.states} states`)
    console.log(`  Recipe: ${r.indexed ? (dryRun ? 'would be written' : 'written') : 'unchanged'}; flag: ${p.state}${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
  }
  process.exit(0)
}
let refused = 0
for (const universe of universes) {
  console.log(`${dryRun ? 'Would publish' : 'Publishing'} ${universe}: ${approvedDir(universe)} → gs://${BUCKET}/art/universes/${universe}/`)
  if (only.length) console.log(`  Only: ${only.join(', ')} (every other look stays as it is)`)
  const r = push(universe, approvedDir(universe), mirror, bucketRemote(universe), now, { dryRun, only })
  console.log(`  ${r.uploaded.length} look${r.uploaded.length === 1 ? '' : 's'} ${dryRun ? 'to send' : 'sent'}, ${r.unchanged} already published`)
  for (const id of r.uploaded) console.log(`    ${id}`)
  if (r.withdrawn.length) console.log(`  ${r.withdrawn.length} ${dryRun ? 'would leave' : 'left'} the index (no longer approved here; the files stay in the bucket): ${r.withdrawn.join(', ')}`)
  if (r.kept.length) console.log(`  ${r.kept.length} kept as published (outside --only, or the local copy is damaged): ${r.kept.join(', ')}`)
  for (const look of r.refused) console.log(`  Not sent, ${look.id}: ${look.why}`)
  refused += r.refused.length
  const c = r.publication.counts
  console.log(`  Flags: ${c.published} published, ${c.changed} changed, ${c.unpublished} not published, ${c.refused} refused${r.flagged.length ? `; wrote ${r.flagged.join(', ')}` : ''}`)
}
if (refused) process.exitCode = 1
