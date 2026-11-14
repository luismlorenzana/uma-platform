// @vitest-environment jsdom
// The places on a landscape stage (0.20.0, uma-farm's F74): `AccountPage columns={2}` lays its panels in two CSS columns
// once the page is at least 36rem wide (a container query on a wrapper that measures the page), each panel kept whole;
// `UpdateNotice clearSides` keeps clear of the left and right safe areas as well as the top. Both are opt-in: without
// them the markup is as before.
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccountPage } from './AccountPage.js'
import { UpdateLifecycle } from './update-lifecycle.js'
import { UpdateNotice } from './UpdateNotice.js'

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const classes = (element: Element | null | undefined) => (element?.getAttribute('class') ?? '').split(' ')
const page = (columns?: 1 | 2) => renderToStaticMarkup(
  <AccountPage columns={columns} rename={{ value: 'Farmer', maxLength: 20, onSave: async () => {} }} notifications={<p>Off</p>}
    sections={<><section>Name</section><section>Copies</section></>} info={[{ label: 'Build', value: 'local' }]} onSignOut={() => {}} />,
)

describe('AccountPage columns={2}', () => {
  it('sets its panels in two columns on a page at least 36rem wide, each kept whole', () => {
    const doc = parse(page(2))
    const wrapper = doc.body.firstElementChild!
    expect(wrapper.getAttribute('data-kit')).toBe('account-columns')
    expect(classes(wrapper)).toEqual(['@container'])
    const account = wrapper.firstElementChild!
    expect(account.getAttribute('data-kit')).toBe('account')
    expect(account.getAttribute('data-columns')).toBe('2')
    expect(classes(account)).toEqual(expect.arrayContaining(['@xl:columns-2', '@xl:gap-x-3', '*:break-inside-avoid', 'space-y-3']))
    // The panels are the columns' direct children, in the page's order.
    expect([...account.children].map((child) => child.textContent)).toEqual(expect.arrayContaining(['Off', 'Name', 'Copies', 'Sign out']))
    expect(account.children.length).toBeGreaterThanOrEqual(6)
  })

  it('is one column by default, or with columns={1}', () => {
    expect(page(1)).toBe(page())
    const account = parse(page()).body.firstElementChild!
    expect(account.getAttribute('data-kit')).toBe('account')
    expect(account.hasAttribute('data-columns')).toBe(false)
    expect(account.getAttribute('class')).toBe('space-y-3 px-4 pt-3 pb-24')
  })
})

describe('UpdateNotice clearSides', () => {
  const waiting = () => {
    const lifecycle = new UpdateLifecycle()
    lifecycle.workerWaiting(() => {})
    return lifecycle
  }
  const notice = (clearSides?: boolean) => parse(renderToStaticMarkup(<UpdateNotice lifecycle={waiting()} clearSides={clearSides} />))
    .querySelector('[data-kit="update-notice"]')!

  it('keeps 0.75rem clear of the left and right safe areas, as well as the top one', () => {
    const aside = notice(true)
    expect(aside.getAttribute('data-clear-sides')).toBe('true')
    expect(classes(aside)).toEqual(expect.arrayContaining([
      'fixed',
      'left-[calc(var(--inset-left,env(safe-area-inset-left))+0.75rem)]',
      'right-[calc(var(--inset-right,env(safe-area-inset-right))+0.75rem)]',
      'top-[calc(var(--inset-top,env(safe-area-inset-top))+0.75rem)]',
    ]))
    expect(classes(aside)).not.toContain('inset-x-3')
    expect(aside.textContent).toContain('Restart')
  })

  it('sits 0.75rem from the edges by default', () => {
    const aside = notice()
    expect(aside.hasAttribute('data-clear-sides')).toBe(false)
    expect(aside.getAttribute('class')).toBe('fixed inset-x-3 top-[calc(var(--inset-top,env(safe-area-inset-top))+0.75rem)] z-50 flex min-h-14 items-center gap-3 rounded-sm border border-accent/40 bg-panel px-4 py-2 text-ink shadow-3')
    expect(notice(false).outerHTML).toBe(aside.outerHTML)
  })
})
