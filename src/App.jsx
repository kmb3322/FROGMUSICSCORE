import { BrowserRouter, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import Home from './pages/Home'
import Season from './pages/Season'
import Feature from './pages/Feature'
import Login from './pages/Login'
import Write from './pages/Write'
import { isSeason, seasonAlbums } from './data/seasons'
import { DataProvider, useData } from './data/store'

// /26FW, /26SS → 시즌 뷰어. ?album=id 로 시작 앨범 지정
function SeasonRoute() {
  const { season } = useParams()
  const [params] = useSearchParams()
  const data = useData()
  const code = (season || '').toUpperCase()
  // 서버 글을 다 받기 전엔 그리지 않음 — 기본 데이터로 먼저 그리면 시작 앨범 번호가 정해진 뒤
  // 서버 글이 끼어들어 다른 앨범이 보이거나 순서가 바뀌었음
  if (!data.loaded) return null
  const found = isSeason(code) && seasonAlbums(data, code).length > 0
  if (!found) return <Navigate to="/" replace />
  return <Season key={code} code={code} startId={params.get('album')} />
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<Feature />} />
          <Route path="/login" element={<Login />} />
          <Route path="/write" element={<Write />} />
          <Route path="/:season" element={<SeasonRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
