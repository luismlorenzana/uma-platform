// Getting in, as uma-quest does at 47ca16d: the kit's gates (splash → sign-in → boot → the app), with nothing to boot
// but the signed-in owner. The update prompt sits outside the gates, so a waiting build shows even on sign-in.
import { useAuth } from '@luismlorenzana/uma-kit/auth'
import { BootGates, UpdateNotice } from '@luismlorenzana/uma-kit/places'
import { Outlet } from 'react-router'
import { signInEnabled } from './firebase-config'

const boot = async (): Promise<{ firstLaunch: boolean }> => ({ firstLaunch: false })

export function Root() {
  const auth = useAuth()
  // Never run a production build signed out: every API call would fail (uma-rpg's S1 incident, its D42).
  if (import.meta.env.PROD && !signInEnabled)
    return <div className="fixed inset-0 flex items-center justify-center bg-page p-8 text-center text-ink-soft">This build is missing its sign-in configuration.</div>
  return (
    <>
      <UpdateNotice />
      <BootGates auth={auth} boot={boot} words={{ name: 'Uma Platform', tagline: 'Ranking, character art and the platform tools.' }}>
        <Outlet />
      </BootGates>
    </>
  )
}
