// `pnpm look:measure [capture …]` (P157, LR11–LR12): measures the private references and any captures, prints each
// capture against the references' ranges, and writes `content/authoring/look/measures.json` and a private side-by-side
// board, `content/authoring/look/board.html` (the references are copyrighted frames: never in git).
import { readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, relative, resolve } from 'node:path'

/** A capture's label: its folder's folder and its name (`kit-forest/room-1x.png`), as many share a name. */
const label = (file: string) => `${basename(dirname(dirname(file)))}/${basename(file)}`
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { against, measure, type LookMeasures, type Rgba } from './measure.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const look = resolve(process.env.UMA_CONTENT_DIR ?? resolve(repo, 'content'), 'authoring/look')
/** Every frame is read at this width, so a 4K capture and a phone screenshot are measured alike. */
export const MEASURE_WIDTH = 640

async function load(file: string): Promise<Rgba> {
  const { data, info } = await sharp(file).resize({ width: MEASURE_WIDTH }).removeAlpha().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height }
}

/** The measures as flat rows, for tables. */
const ROWS: [string, (m: LookMeasures) => number, string][] = [
  ['Lightness, mean', (m) => m.lightness.mean, 'L* 0–100'],
  ['Lightness range (p5–p95)', (m) => m.lightness.range, 'contrast'],
  ['Deep shadow share', (m) => m.shadowShare, 'L* < 25'],
  ['Highlight share', (m) => m.highlightShare, 'L* > 85'],
  ['Chroma, mean', (m) => m.chroma.mean, 'colourfulness'],
  ['Warm light, cool shadow', (m) => m.warmCool, 'b* high − low'],
  ['Vignette', (m) => m.vignette, 'edge / middle (1 = none)'],
  ['Blurred share', (m) => m.blurShare, 'depth of field'],
  ['Focus band', (m) => m.focusBand, 'middle / outer sharpness'],
  ['Palette (90%)', (m) => m.palette, '4-bit colours'],
]

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(resolve(look, 'references.json'), 'utf8')) as { refs: { id: string; file: string; scene: string; light: string; what: string }[] }
  const refs = await Promise.all(manifest.refs.map(async (r) => ({ ...r, measures: measure(await load(resolve(look, r.file))) })))
  // Paths are read from where the command was run (pnpm runs the script in its package's folder).
  const from = process.env.INIT_CWD ?? process.cwd()
  const captures = await Promise.all(process.argv.slice(2).filter((a) => a !== '--').map(async (file) => ({ file: resolve(from, file), measures: measure(await load(resolve(from, file))) })))
  const table = ROWS.map(([name, get, unit]) => {
    const values = refs.map((r) => get(r.measures)).sort((a, b) => a - b)
    return { name, unit, refs: { min: values[0]!, median: values[Math.floor(values.length / 2)]!, max: values.at(-1)! },
      captures: captures.map((c) => ({ file: label(c.file), value: get(c.measures), ...against(get(c.measures), values) })) }
  })
  await writeFile(resolve(look, 'measures.json'), JSON.stringify({ measuredAt: new Date().toISOString(), width: MEASURE_WIDTH, refs: refs.map(({ id, measures }) => ({ id, measures })),
    captures: captures.map((c) => ({ file: relative(repo, c.file), measures: c.measures })), table }, null, 2) + '\n')
  for (const row of table) {
    const caps = row.captures.map((c) => `${c.file}: ${c.value} (${c.verdict})`).join('; ')
    console.log(`${row.name.padEnd(26)} refs ${row.refs.min}–${row.refs.max} (median ${row.refs.median})${caps ? `  |  ${caps}` : ''}`)
  }
  await writeFile(resolve(look, 'board.html'), board(refs, captures, table))
  console.log(`Board: ${relative(repo, resolve(look, 'board.html'))}`)
}

function board(refs: { id: string; file: string; scene: string; light: string; what: string; measures: LookMeasures }[], captures: { file: string; measures: LookMeasures }[], table: { name: string; unit: string; refs: { min: number; median: number; max: number }; captures: { file: string; value: number; verdict: string }[] }[]): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const fig = (src: string, title: string, sub: string) => `<figure><img loading="lazy" src="${esc(src)}" alt="${esc(title)}"><figcaption><b>${esc(title)}</b> ${esc(sub)}</figcaption></figure>`
  const rows = table.map((r) => `<tr><td>${esc(r.name)}<small>${esc(r.unit)}</small></td><td class="num">${r.refs.min} – ${r.refs.max}<small>median ${r.refs.median}</small></td>${r.captures.map((c) => `<td class="num ${c.verdict}">${c.value}<small>${c.verdict}</small></td>`).join('')}</tr>`).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Look Board (private)</title>
<style>:root{--page:#10141c;--panel:#18202c;--ink:#eef2f7;--soft:#a6b3c2;--ok:#4fb37a;--warn:#e0645c}body{margin:0;background:var(--page);color:var(--ink);font:14px/1.45 system-ui,sans-serif}main{max-width:1500px;margin:0 auto;padding:20px 16px}
h1{font-size:22px;margin:0 0 4px}p{color:var(--soft)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}figure{margin:0;background:var(--panel);border-radius:10px;overflow:hidden}figure img{width:100%;display:block}
figcaption{padding:8px 10px;font-size:12px;color:var(--soft)}figcaption b{color:var(--ink)}table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0 24px}td,th{padding:6px 8px;border-bottom:1px solid #ffffff14;text-align:left;vertical-align:top}
td small{display:block;color:var(--soft);font-size:11px}.num{text-align:right;font-variant-numeric:tabular-nums}.below,.above{color:var(--warn)}.within{color:var(--ok)}h2{font-size:16px;margin:24px 0 8px}</style></head><body><main>
<h1>Look board (private: never in git)</h1><p>The references the owner chose (LK0) beside our captures, and the look measures (LR12): each capture against the references' range. The measures flag flat, evenly lit, uniformly sharp frames; the owner's eye decides.</p>
<h2>Measures</h2><table><tr><th>Measure</th><th class="num">References</th>${captures.map((c) => `<th class="num">${esc(label(c.file))}</th>`).join('')}</tr>${rows}</table>
${captures.length ? `<h2>Our captures</h2><div class="grid">${captures.map((c) => fig(relative(look, c.file), label(c.file), '')).join('')}</div>` : ''}
<h2>References</h2><div class="grid">${refs.map((r) => fig(r.file, r.id, `${r.scene} · ${r.light} · ${r.what}`)).join('')}</div>
</main></body></html>\n`
}

if (import.meta.url === `file://${process.argv[1]}`) void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
