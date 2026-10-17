// Getting in, the same in both games (uma-platform SD2): splash → sign-in → boot → first launch → start page. The order
// is fixed (`nextGate`); the game passes each step's content and words. Auth comes in as a value (`useAuth()` from
// `/auth`, or the game's own), so this frame never loads Firebase.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { nextGate, type GateState } from './gates.js'

export interface GateAuth {
  readonly ready: boolean
  readonly authRequired: boolean
  readonly user: { readonly uid: string } | null
  /** Why the last sign-in didn't finish, shown on the sign-in gate. */
  readonly error?: string | null
  readonly signIn: () => Promise<void>
}

export interface BootWords {
  /** The game's name, on the splash and the sign-in gate. */
  readonly name: string
  /** A line under the name on the sign-in gate. */
  readonly tagline?: string
  readonly signIn: string
  readonly signInFailed: string
  readonly bootFailed: string
  readonly retry: string
}

export const BOOT_WORDS: Omit<BootWords, 'name'> = {
  signIn: 'Sign in with Google',
  signInFailed: "Sign-in didn't finish. Try again.",
  bootFailed: "The game couldn't open on this phone.",
  retry: 'Try again',
}

export interface BootGatesProps {
  readonly auth: GateAuth
  /**
   * The game's boot, run once the user is known: opens the device save, loads what it needs. Resolves whether this is a
   * first launch (a new account that still needs its first-launch step).
   */
  readonly boot: (user: { readonly uid: string }) => Promise<{ readonly firstLaunch: boolean }>
  /** The first-launch step (uma-rpg's trainer name and tickets). Call `done` once it has made the account. */
  readonly firstLaunch?: (done: () => void) => ReactNode
  /** Where the app opens, read after the boot: a path. Only applied when the app was opened at `/`. */
  readonly startPath?: () => string
  readonly words: Partial<BootWords> & { readonly name: string }
  /** Replaces the default splash (the game's name on the page colour). */
  readonly splash?: ReactNode
  /** The app, once every gate has passed. */
  readonly children: ReactNode
}

export function Splash({ name }: { name: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-page" data-kit="splash">
      <p className="font-display text-2xl font-bold text-accent">{name}</p>
    </div>
  )
}

function SignInGate({ words, error, onSignIn }: { words: BootWords; error: string | null | undefined; onSignIn: () => void }) {
  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col items-center justify-center gap-6 bg-page px-8 text-center" data-kit="sign-in">
      <div>
        <p className="font-display text-4xl font-bold text-accent">{words.name}</p>
        {words.tagline && <p className="mt-2 text-ink-soft">{words.tagline}</p>}
      </div>
      <button type="button" onClick={onSignIn} className="font-display min-h-12 w-full max-w-xs rounded-sm bg-accent text-base font-bold text-accent-ink">
        {words.signIn}
      </button>
      {error && <p role="alert" className="max-w-xs text-[13px] text-danger">{words.signInFailed}</p>}
    </div>
  )
}

function FailedGate({ words, onRetry }: { words: BootWords; onRetry: () => void }) {
  return (
    <div className="pt-safe pb-safe fixed inset-0 flex flex-col items-center justify-center gap-4 bg-page px-8 text-center" data-kit="boot-failed">
      <p className="text-ink-soft">{words.bootFailed}</p>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-sm border border-hairline-strong bg-panel px-5 font-semibold">{words.retry}</button>
    </div>
  )
}

export function BootGates({ auth, boot, firstLaunch, startPath, words, splash, children }: BootGatesProps) {
  const say: BootWords = { ...BOOT_WORDS, ...words }
  const navigate = useNavigate()
  const location = useLocation()
  const [run, setRun] = useState<{ readonly status: GateState['boot']; readonly firstLaunch: boolean }>({ status: 'idle', firstLaunch: false })
  const [started, setStarted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const opened = useRef(location.pathname)
  const uid = auth.user?.uid ?? null
  const bootRef = useRef(boot)
  bootRef.current = boot

  // One boot per user and attempt: StrictMode runs effects twice in development, and a game's boot that returns early
  // while one is running would otherwise answer the second run before the first has finished.
  const running = useRef<{ readonly key: string; readonly promise: Promise<{ readonly firstLaunch: boolean }> } | null>(null)

  useEffect(() => {
    if (!auth.ready || uid === null) return
    let cancelled = false
    setRun({ status: 'running', firstLaunch: false })
    const key = `${uid}:${attempt}`
    if (running.current?.key !== key) running.current = { key, promise: bootRef.current({ uid }) }
    running.current.promise.then(
      (result) => { if (!cancelled) setRun({ status: 'done', firstLaunch: result.firstLaunch }) },
      () => { if (!cancelled) setRun({ status: 'failed', firstLaunch: false }) },
    )
    return () => { cancelled = true }
  }, [auth.ready, uid, attempt])

  const gate = nextGate({
    authReady: auth.ready, authRequired: auth.authRequired, signedIn: uid !== null, boot: run.status,
    // A game without a first-launch step goes straight to its start page.
    firstLaunch: run.firstLaunch && firstLaunch !== undefined, started,
  })

  useEffect(() => {
    if (gate !== 'start') return
    const path = startPath?.()
    if (path !== undefined && opened.current === '/' && path !== '/') void navigate(path, { replace: true })
    setStarted(true)
  }, [gate])

  switch (gate) {
    case 'sign-in':
      return <SignInGate words={say} error={auth.error} onSignIn={() => void auth.signIn()} />
    case 'failed':
      return <FailedGate words={say} onRetry={() => setAttempt((n) => n + 1)} />
    case 'first-launch':
      return <>{firstLaunch!(() => setRun({ status: 'done', firstLaunch: false }))}</>
    case 'ready':
      return <>{children}</>
    default:
      return <>{splash ?? <Splash name={say.name} />}</>
  }
}
