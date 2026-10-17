// Which paths the content routes serve, and how they're cached (uma-platform SE2). Pure, so the rules are tested once.

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  json: 'application/json',
  webp: 'image/webp',
  png: 'image/png',
  avif: 'image/avif',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
}

export const contentTypeFor = (path: string): string => CONTENT_TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream'

/** No traversal, no empty or hidden segments; null when refused. */
function cleanPath(raw: string): string | null {
  const path = raw.replace(/^\/+/, '')
  if (path === '' || path.length > 300) return null
  return path.split('/').some((part) => part === '' || part === '.' || part === '..' || part.startsWith('.')) ? null : path
}

const RELEASE_ROOTS = ['files/', 'manifests/', 'channels/'] as const

/** A release path: under `files/`, `manifests/` or `channels/`. Null when refused. */
export function safeReleasePath(raw: string): string | null {
  const path = cleanPath(raw)
  return path !== null && RELEASE_ROOTS.some((root) => path.startsWith(root)) ? path : null
}

/** Hash-named release files never change; channels and manifests are revalidated. */
export const releaseCacheControl = (path: string): string =>
  path.startsWith('files/') ? 'private, max-age=31536000, immutable' : 'private, no-cache'

/** A name carrying its content hash: `<stem>.<8 or more hex>.<ext>`. */
export const isHashNamed = (path: string): boolean => /\.[a-f0-9]{8,64}\.[a-z0-9]+$/.test(path)

/**
 * A private pack's allowlist. A string allows that exact file: an index such as `enemies.json`, revalidated on every
 * read. A pattern allows hash-named files it matches whole, cached for good. Anything else is refused.
 */
export type PackAllow = readonly (string | RegExp)[]

export interface PackPath {
  readonly path: string
  readonly immutable: boolean
}

export function safePackPath(raw: string, allow: PackAllow): PackPath | null {
  const path = cleanPath(raw)
  if (path === null) return null
  if (allow.some((rule) => typeof rule === 'string' && rule === path)) return { path, immutable: false }
  const matched = allow.some((rule) => rule instanceof RegExp && new RegExp(`^(?:${rule.source})$`, rule.flags.replace('g', '')).test(path))
  return matched && isHashNamed(path) ? { path, immutable: true } : null
}

export const packCacheControl = (pack: PackPath): string => (pack.immutable ? 'private, max-age=31536000, immutable' : 'private, no-cache')
