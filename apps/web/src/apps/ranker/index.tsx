// Uma Ranker (RK1, P131): every tier board online, from the app's own bucket. Its own routes under /ranker.
import './ranker.css'
import { Route, Routes } from 'react-router'
import { BoardPage } from './BoardPage'
import { RankerProvider } from './data'
import { RankerHome } from './RankerHome'

export default function Ranker() {
  return (
    <RankerProvider>
      <Routes>
        <Route index element={<RankerHome />} />
        <Route path=":board" element={<BoardPage />} />
      </Routes>
    </RankerProvider>
  )
}
