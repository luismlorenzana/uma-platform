// Every places frame renders on the server with a game's props and words, and leaves out the sections it isn't given.
// A smoke test: the frames' behaviour is checked in the games (SD2's proof), their rules in places.test.ts.
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AccountPage } from './AccountPage.js'
import { BootGates } from './BootGates.js'
import { ExchangeRows } from './ExchangeRows.js'
import { ProfileFrame } from './ProfileFrame.js'
import { ShelfView } from './ShelfView.js'
import { UnlockConfirm } from './UnlockConfirm.js'

const html = (node: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

describe('the places frames', () => {
  it('draw only the Account sections a game fills, in its words', () => {
    const full = html(
      <AccountPage
        rename={{ value: 'Tester', maxLength: 24, onSave: async () => {} }}
        wallet={[{ icon: <i />, value: 20, label: 'Uma Tickets' }]}
        notifications={<p>Push here</p>}
        info={[{ label: 'App build', value: 'local' }]}
        onSignOut={() => {}}
        words={{ name: 'Trainer name', signOut: 'Leave' }}
      />,
    )
    for (const text of ['Trainer name', 'Uma Tickets', 'Appearance', 'Push here', 'App build', 'Leave']) expect(full).toContain(text)
    const bare = html(<AccountPage appearance={false} />)
    for (const text of ['Wallet', 'Appearance', 'Sign out', 'Trainer name']) expect(bare).not.toContain(text)
  })

  it('show the splash, then sign-in, before anything of the game', () => {
    const boot = async () => ({ firstLaunch: false })
    const splash = html(<BootGates auth={{ ready: false, authRequired: true, user: null, signIn: async () => {} }} boot={boot} words={{ name: 'Uma Test' }}><p>The game</p></BootGates>)
    expect(splash).toContain('Uma Test')
    expect(splash).not.toContain('The game')
    const signIn = html(<BootGates auth={{ ready: true, authRequired: true, user: null, signIn: async () => {} }} boot={boot} words={{ name: 'Uma Test', signIn: 'Come in' }}><p>The game</p></BootGates>)
    expect(signIn).toContain('Come in')
    expect(signIn).not.toContain('The game')
  })

  it('lay out shelves, exchange rows and a profile from props', () => {
    const shelves = html(
      <ShelfView shelves={[{ key: 'raw', label: 'Raw' }, { key: 'made', label: 'Made' }]} renderItem={(item) => <b>{item.id}</b>}
        items={[{ id: 'ore-1', name: 'Ore', shelf: 'raw', grade: 1, count: 3 }, { id: 'ore-2', name: 'Ore', shelf: 'raw', grade: 2, count: 1 }]} />,
    )
    for (const text of ['Raw', 'Made', 'Every grade', 'Highest', 'G1', 'G2', 'ore-1']) expect(shelves).toContain(text)
    const rows = html(<ExchangeRows rows={[{ key: 'speed', icon: <i />, name: 'Speed Ticket', detail: '30 minutes off', price: { mark: <i />, amount: 1200 } }]} balance={0} onBuy={async () => {}} />)
    expect(rows).toContain('Speed Ticket')
    expect(rows).toContain('1,200')
    const profile = html(<ProfileFrame portrait={<img alt="" />} name="Test Uma" title="[Invented]" level="T2 · Lv 7" tabs={[{ key: 'a', label: 'Skills' }, { key: 'b', label: 'Work' }]} tab="a" locked>Body</ProfileFrame>)
    for (const text of ['Test Uma', '[Invented]', 'T2 · Lv 7', 'Skills', 'Work', 'Locked', 'Body']) expect(profile).toContain(text)
    // Sheets render through a portal, so a closed one draws nothing on the server.
    expect(html(<UnlockConfirm open={false} onClose={() => {}} name="Test Uma" tickets={3} onConfirm={async () => {}} />)).toBe('')
  })
})
