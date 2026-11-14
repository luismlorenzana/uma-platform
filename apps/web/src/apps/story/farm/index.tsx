// The Farm book (US1): every draft uma-farm's story session pushed, in the plain reader, and the World Book read in full
// (uma-farm F40, P167) at /story/farm/world. Its own pages beyond these wait for US4.
import { Route, Routes } from 'react-router'
import { Files } from '../shell/Files'
import WorldPage from './WorldPage'

export default function FarmBook() {
  return (
    <Routes>
      <Route path="world" element={<WorldPage />} />
      <Route path="*" element={<Files book="farm" />} />
    </Routes>
  )
}
