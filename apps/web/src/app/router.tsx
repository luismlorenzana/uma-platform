// The routes: Home's tiles, then one lazy route a sub-app (AP1), each from the registry in ../apps.
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { SUB_APPS } from '../apps'
import { Home } from '../home/Home'
import { Root } from './Root'

function Loading() {
  return <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading</div>
}

export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      ...SUB_APPS.map((app) => {
        const Screen = lazy(app.load)
        return { path: `${app.id}/*`, element: <Suspense fallback={<Loading />}><Screen /></Suspense> }
      }),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
