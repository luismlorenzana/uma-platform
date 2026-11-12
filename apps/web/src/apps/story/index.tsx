// Uma Story (US1, P141): one Story App for uma-quest's and uma-farm's stories, with three books on one cast. Its own
// routes under /story. A book's folder imports the shell and the Cast book, never the other game's book (AP53; checked
// by scripts/check-sub-apps.test.mjs), so each is loaded on its own.
import './story.css'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { StoryHome } from './StoryHome'

const Cast = lazy(() => import('./cast')), Quest = lazy(() => import('./quest')), Farm = lazy(() => import('./farm'))
const loading = <div className="fixed inset-0 flex items-center justify-center bg-page text-ink-soft">Loading</div>

export default function Story() {
  return (
    <Suspense fallback={loading}>
      <Routes>
        <Route index element={<StoryHome />} />
        <Route path="cast/*" element={<Cast />} />
        <Route path="quest/*" element={<Quest />} />
        <Route path="farm/*" element={<Farm />} />
        <Route path="*" element={<Navigate to="/story" replace />} />
      </Routes>
    </Suspense>
  )
}
