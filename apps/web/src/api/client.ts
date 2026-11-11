// Fetch client with a pluggable token provider (copied from uma-quest at 47ca16d, without its save calls). The API is
// same-origin: /api is proxied by Vite in dev and rewritten to Cloud Run by Firebase Hosting in production.
let tokenProvider: () => Promise<string | null> = async () => null
export function setTokenProvider(fn: () => Promise<string | null>): void {
  tokenProvider = fn
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenProvider()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export class ApiError extends Error {
  readonly path: string
  readonly status: number
  readonly body: unknown
  constructor(path: string, status: number, body: unknown) {
    super(`API ${status} on ${path}`)
    this.name = 'ApiError'
    this.path = path
    this.status = status
    this.body = body
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...init.headers } })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!res.ok) throw new ApiError(path, res.status, body)
  return body as T
}
