// @vitest-environment jsdom
// AppFrame's tint (0.12.0) lives on `<html data-tint>` while the frame is mounted, so portalled sheets tint too; `day`
// and unmounting remove it, and a frame without a tint never sets it.
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { AppFrame, type Tint } from './AppFrame.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let root: Root | undefined
async function mount(tint?: Tint) {
  root ??= createRoot(document.body.appendChild(document.createElement('div')))
  await act(async () => { root!.render(tint === undefined ? <AppFrame>Page</AppFrame> : <AppFrame tint={tint}>Page</AppFrame>) })
}
const tintNow = () => document.documentElement.getAttribute('data-tint')
afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  document.documentElement.removeAttribute('data-tint')
})

describe('the frame tint', () => {
  it('sets <html data-tint>, and removes it for day and on unmount', async () => {
    await mount('night')
    expect(tintNow()).toBe('night')
    await mount('dusk')
    expect(tintNow()).toBe('dusk')
    await mount('day')
    expect(tintNow()).toBeNull()
    await mount('night')
    expect(tintNow()).toBe('night')
    await act(async () => root!.unmount())
    root = undefined
    expect(tintNow()).toBeNull()
  })

  it('never sets it without a tint', async () => {
    await mount()
    expect(tintNow()).toBeNull()
    await mount()
    expect(tintNow()).toBeNull()
  })
})
