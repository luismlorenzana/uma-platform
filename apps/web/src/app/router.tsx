// The routes: Home's tiles, then one lazy route a sub-app (AP1), each from the registry in ../apps. A sub-app that throws
// shows its error inside the shell, so the "Update ready · Restart" prompt stays above it: an old build kept on the device
// that can't read a newer API can still restart into the new one.
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link, Navigate, useRouteError, type RouteObject } from 'react-router'
import { SUB_APPS } from '../apps'
import { Home } from '../home/Home'
import { Root } from './Root'

function Loading() {
  return <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading</div>
}

function SubAppError() {
  const error = useRouteError()
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-page p-8 text-center text-ink-soft">
      <p>This page hit an error{error instanceof Error ? `: ${error.message}` : ''}.</p>
      <p className="text-sm">If “Update ready” shows above, Restart loads the newest build.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-sm bg-raised px-4 font-semibold text-ink">Reload</button>
        <Link to="/" className="flex min-h-11 items-center rounded-sm bg-raised px-4 font-semibold text-ink">Uma Platform</Link>
      </div>
    </div>
  )
}

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      ...SUB_APPS.map((app) => {
        const Screen = lazy(app.load)
        return { path: `${app.id}/*`, element: <Suspense fallback={<Loading />}><Screen /></Suspense>, errorElement: <SubAppError /> }
      }),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
