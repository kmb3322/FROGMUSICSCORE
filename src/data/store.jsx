import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { albums as baseAlbums, features as baseFeatures } from './albums'
import { api, mediaUrl } from '../api'

// 기본 데이터(albums.js) + 글쓰기로 올린 글(서버)을 합쳐서 제공
const DataContext = createContext(null)

// 서버 글 → 화면에서 쓰는 모양
export function fromServer(posts) {
  const albums = []
  const features = []
  for (const p of posts) {
    if (p.kind === 'review') {
      albums.push({
        id: p.id,
        season: p.season,
        region: p.region,
        category: p.category,
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
        side: (p.side || []).map((b) =>
          b.type === 'image'
            ? { type: 'image', src: b.media ? mediaUrl(b.media) : `${import.meta.env.BASE_URL}${b.path}`, w: b.w, h: b.h, anchor: b.anchor }
            : b,
        ),
      })
    }
  }
  return { albums, features }
}

// 기본 데이터 + 서버 글. 수정본은 기본 글 자리에 그대로 바꿔 넣음(맨 뒤로 보내지 않음) → 순서가 흔들리지 않게
function merge(base, remote, deleted) {
  const byId = new Map(remote.map((r) => [r.id, r]))
  const baseIds = new Set(base.map((x) => x.id))
  return [...base.map((x) => byId.get(x.id) || x), ...remote.filter((r) => !baseIds.has(r.id))].filter(
    (x) => !deleted.includes(x.id),
  )
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
      albums: merge(baseAlbums, remote.albums, remote.deleted),
      features: merge(baseFeatures, remote.features, remote.deleted),
      loaded,
      reload,
    }),
    [remote, loaded, reload],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
