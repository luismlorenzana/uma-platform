// The plain reader for a draft (US1): JSON as a tree that opens a level at a time, with every string wrapped so story
// text reads as prose; markdown as headings, lists and paragraphs. Text only: nothing in a draft is ever run or injected.
import { useState, type ReactNode } from 'react'

const scalar = (v: unknown): v is string | number | boolean | null => v === null || ['string', 'number', 'boolean'].includes(typeof v)
const HINT_KEYS = ['title', 'name', 'id', 'characterId', 'hero', 'kind', 'say', 'chapter', 'ladder', 'a']

/** A few words that tell one entry of a list from the next: a title, a name, an id. */
export function hintOf(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
  if (typeof value !== 'object' || value === null) return ''
  const record = value as Record<string, unknown>
  const key = HINT_KEYS.find((k) => scalar(record[k]) && record[k] !== null && record[k] !== '')
  const count = Object.keys(record).length
  if (!key) return `${count} field${count === 1 ? '' : 's'}`
  const text = String(record[key])
  return `${key}: ${text.length > 60 ? `${text.slice(0, 57)}…` : text}`
}

function Branch({ name, value, depth }: { name: string; value: object; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
  const entries: [string, unknown][] = Array.isArray(value) ? value.map((v, i) => [String(i + 1), v]) : Object.entries(value)
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="py-0.5">
      <summary className="rounded-xs py-0.5 hover:bg-sunken">
        <span className="font-semibold text-ink">{name}</span> <span className="text-[12px] text-ink-faint">{hintOf(value)}</span>
      </summary>
      {open && (
        <div className="ml-2 border-l border-hairline pl-3">
          {entries.length === 0 ? <span className="text-[13px] text-ink-faint">Empty</span> : entries.map(([key, child]) => <Node key={key} name={key} value={child} depth={depth + 1} />)}
        </div>
      )}
    </details>
  )
}

function Node({ name, value, depth }: { name: string; value: unknown; depth: number }) {
  if (typeof value === 'object' && value !== null) return <Branch name={name} value={value} depth={depth} />
  const long = typeof value === 'string' && (value.length > 70 || value.includes('\n'))
  return (
    <div className={`py-0.5 ${long ? '' : 'flex flex-wrap gap-x-2'}`}>
      <span className="text-ink-soft">{name}</span>
      {typeof value === 'string'
        ? <span className={`whitespace-pre-wrap break-words text-ink ${long ? 'block max-w-[75ch] leading-relaxed' : ''}`}>{value === '' ? <span className="text-ink-faint">empty</span> : value}</span>
        : <code className="text-[13px] text-ink">{String(value)}</code>}
    </div>
  )
}

/** A JSON draft as a tree. Text that isn't JSON says so, and shows as it is. */
export function JsonTree({ text }: { text: string }) {
  let value: unknown
  try { value = JSON.parse(text) } catch (error) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-danger">This file isn’t valid JSON: {error instanceof Error ? error.message : String(error)}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[13px] text-ink">{text}</pre>
      </div>
    )
  }
  if (typeof value !== 'object' || value === null) return <code className="text-sm">{String(value)}</code>
  const entries: [string, unknown][] = Array.isArray(value) ? value.map((v, i) => [String(i + 1), v]) : Object.entries(value)
  return <div className="story-json text-sm">{entries.map(([key, child]) => <Node key={key} name={key} value={child} depth={0} />)}</div>
}

/** Markdown as text: headings, list lines, tables kept in their columns, and paragraphs. No inline marks are read. */
export function MarkdownText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let paragraph: string[] = [], table: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length} className="max-w-[75ch] whitespace-pre-wrap leading-relaxed text-ink">{paragraph.join('\n')}</p>)
    if (table.length) blocks.push(<pre key={blocks.length} className="overflow-x-auto text-[12px] leading-relaxed text-ink">{table.join('\n')}</pre>)
    paragraph = []; table = []
  }
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^(#{1,4})\s+(.*)$/.exec(line), item = /^\s*[-*]\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      const level = heading[1]!.length
      blocks.push(<p key={blocks.length} role="heading" aria-level={level} className={`font-display font-bold text-ink ${level === 1 ? 'text-2xl' : level === 2 ? 'mt-3 text-xl' : 'mt-2 text-base'}`}>{heading[2]}</p>)
    } else if (line.trim() === '') flush()
    else if (line.trimStart().startsWith('|')) { if (paragraph.length) flush(); table.push(line) }
    else if (item) { flush(); blocks.push(<p key={blocks.length} className="max-w-[75ch] whitespace-pre-wrap pl-4 -indent-3 leading-relaxed text-ink">• {item[1]}</p>) }
    else { if (table.length) flush(); paragraph.push(line) }
  }
  flush()
  return <div className="flex flex-col gap-2 text-sm">{blocks}</div>
}

export function DraftReader({ path, text }: { path: string; text: string }) {
  return path.endsWith('.md') ? <MarkdownText text={text} /> : <JsonTree text={text} />
}
