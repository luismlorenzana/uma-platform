// Uma Ranker (RK1, P131): every tier board online, from the app's own bucket, and Uma Cyberpunk's enemy casting (P193).
// Its own routes under /ranker.
import './ranker.css'
import { Route, Routes } from 'react-router'
import { BoardPage } from './BoardPage'
import { CastPage } from './CastPage'
import { RankerProvider } from './data'
import { RankerHome } from './RankerHome'

export default function Ranker() {
  return (
    <RankerProvider>
      <Routes>
        <Route index element={<RankerHome />} />
        <Route path="cyberpunk" element={<CastPage game="cyberpunk" />} />
        <Route path=":board" element={<BoardPage />} />
      </Routes>
    </RankerProvider>
  )
}
