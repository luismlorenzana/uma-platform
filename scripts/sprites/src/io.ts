import { createHash, randomUUID } from 'node:crypto'
import { readFile, realpath, mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const content = resolve(process.env.UMA_CONTENT_DIR ?? resolve(repo, 'content'))
export const sprites = resolve(content, 'authoring/sprites')
export const hash = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex')
export async function readJson<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, 'utf8')) as T }
export async function maybeJson<T>(file: string, fallback: T): Promise<T> {
  try { return await readJson<T>(file) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback; throw error }
}
export function relativePath(root: string, file: string): string {
  if (!file || file.includes('\\') || file.startsWith('/') || file.split('/').some(p => !p || p === '..' || p === '.')) throw new Error('Invalid relative content path')
  const full = resolve(root, file)
  if (!full.startsWith(root + sep)) throw new Error('Path outside content')
  return full
}
export async function inside(root: string, file: string): Promise<string> {
  const full = relativePath(root, file), [base, target] = await Promise.all([realpath(root), realpath(full)])
  if (!target.startsWith(base + sep)) throw new Error('Symlink outside content')
  return target
}
export async function atomicJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
  await rename(temp, file)
}
export async function current(root: string, id: number): Promise<string> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid outfit id')
  const c = await readJson<{ revision: number }>(resolve(root, String(id), 'current.json'))
  if (!Number.isSafeInteger(c.revision) || c.revision < 1) throw new Error('Invalid revision')
  return resolve(root, String(id), `r${c.revision}`)
}
