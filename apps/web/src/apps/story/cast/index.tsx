// The Cast book (US1): the Ranker's Umas by batch, and, behind its Files tab, whatever the cast session has pushed (US2).
import { Route, Routes } from 'react-router'
import { Files } from '../shell/Files'
import CastPage from './CastPage'

export default function CastBook() {
  return (
    <Routes>
      <Route index element={<CastPage />} />
      <Route path="files" element={<Files book="cast" />} />
    </Routes>
  )
}
