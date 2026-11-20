import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { albums as baseAlbums, features as baseFeatures } from './albums'
import { api, mediaUrl } from '../api'

// 기본 데이터(albums.js) + 글쓰기로 올린 글(서버)을 합쳐서 제공
const DataContext = createContext(null)

// 서버 글 → 화면에서 쓰는 모양
function fromServer(posts) {
  const albums = []
  const features = []
  for (const p of posts) {
    if (p.kind === 'review') {
      albums.push({
        id: p.id,
        season: p.season,
        region: p.region,
        artist: p.artist,
        title: p.title,
        released: p.released || '',
        date: p.date,
        writer: p.writer,
        score: p.score,
        cover: p.cover ? mediaUrl(p.cover) : `${import.meta.env.BASE_URL}${p.coverPath}`,
        keywords: p.keywords || [],
        review: p.body,
      })
    } else if (p.kind === 'feature') {
      features.push({
        id: p.id,
        season: p.season,
        title: p.title,
        writer: p.writer,
        date: p.date,
        body: p.body,
        side: (p.side || []).map((b) => (b.type === 'image' ? { type: 'image', src: mediaUrl(b.media), w: b.w, h: b.h } : b)),
      })
    }
  }
  return { albums, features }
}

export function DataProvider({ children }) {
  const [remote, setRemote] = useState({ albums: [], features: [], deleted: [] })
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    try {
      const { posts, deleted } = await api.posts()
      setRemote({ ...fromServer(posts || []), deleted: deleted || [] })
    } catch {
      // API가 없으면(정적 미리보기 등) 기본 데이터만
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo(
    () => ({
      // 서버에 같은 id 글이 있으면(수정본) 기본 데이터 대신 그것을
      // 삭제한 글은 빼고
      albums: [...baseAlbums.filter((x) => !remote.albums.some((r) => r.id === x.id)), ...remote.albums].filter(
        (x) => !remote.deleted.includes(x.id),
      ),
      features: [...baseFeatures.filter((x) => !remote.features.some((r) => r.id === x.id)), ...remote.features].filter(
        (x) => !remote.deleted.includes(x.id),
      ),
      loaded,
      reload,
    }),
    [remote, loaded, reload],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
