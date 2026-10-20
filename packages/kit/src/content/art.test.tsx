// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { useArtUrl } from './art.js'

describe('shared art hook', () => {
  it('holds before loading, clears a previous outfit immediately, and ignores a late image after unmount', async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const events: string[] = [], releases = vi.fn()
    let finish!: (url: string) => void
    const wait = new Promise<string>((resolve) => { finish = resolve })
    const source = {
      artUrl: async (path: string) => { events.push(`load:${path}`); return path === 'a' ? 'blob:a' : wait },
      hold: (path: string) => { events.push(`hold:${path}`); return releases },
    }
    const container = document.createElement('div'), root = createRoot(container)
    function Image({ path }: { path: string }) { const url = useArtUrl(path, source); return url ? <img src={url} /> : <span>initial</span> }
    await act(async () => { root.render(<Image path="a" />) })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:a')
    expect(events.slice(0, 2)).toEqual(['hold:a', 'load:a'])
    await act(async () => { root.render(<Image path="b" />) })
    expect(container.querySelector('img')).toBeNull()
    await act(async () => { root.unmount(); finish('blob:b'); await wait })
    expect(releases).toHaveBeenCalledTimes(2)
  })
})
