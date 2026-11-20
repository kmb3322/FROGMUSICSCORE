// 시즌·리스트·검색 계산. data = { albums, features } (기본 데이터 + 서버 글 합친 것, store.jsx)

// 시즌 코드: '26FW', '26SS'  /  라벨: '26 F/W', '26 S/S'
export const seasonOf = (released) => {
  const [y, m] = released.split('-').map(Number)
  return `${String(y).slice(2)}${m <= 6 ? 'SS' : 'FW'}`
}
export const seasonLabel = (code) => `${code.slice(0, 2)} ${code.slice(2, 3)}/${code.slice(3)}`
export const seasonYear = (code) => 2000 + Number(code.slice(0, 2))
export const isSeason = (code) => /^\d{2}(SS|FW)$/.test(code || '')

// 앨범의 시즌: 글쓰기에서 고른 시즌이 있으면 그것, 없으면 발매일로
export const albumSeason = (x) => x.season || seasonOf(x.released)

export const REGIONS = [
  { key: 'kr', label: '한국 힙합' },
  { key: 'us', label: '미국 힙합' },
]

const sortKey = (x) => x.released || (x.date || '').replaceAll('.', '-')
const byNewest = (x, y) => sortKey(y).localeCompare(sortKey(x))

// 시즌 안 앨범 순서: 한국 → 미국, 각각 최신순 (메인 리스트와 같은 순서)
export function seasonAlbums(data, code) {
  return REGIONS.flatMap((r) =>
    data.albums.filter((x) => x.region === r.key && albumSeason(x) === code).sort(byNewest),
  )
}

// 글이 있는 시즌 전체 (최신순)
export function allSeasons(data) {
  const codes = new Set([...data.albums.map(albumSeason), ...data.features.map((f) => f.season)])
  return [...codes].sort((p, q) => q.slice(0, 2).localeCompare(p.slice(0, 2)) || (p.endsWith('FW') ? -1 : 1))
}

// 글이 있는 연도 (최신순)
export const yearsOf = (data) => [...new Set(allSeasons(data).map(seasonYear))].sort((p, q) => q - p)

// 메인 리스트: 연도 → F/W 지역별, F/W 기획, S/S 지역별, S/S 기획
export function sectionsFor(data, year) {
  const yy = String(year).slice(2)
  return ['FW', 'SS'].flatMap((half) => {
    const code = `${yy}${half}`
    const out = REGIONS.map((r) => ({
      type: 'albums',
      key: `${code}-${r.key}`,
      season: code,
      title: `${seasonLabel(code)} ${r.label}`,
      albums: data.albums.filter((x) => x.region === r.key && albumSeason(x) === code).sort(byNewest),
    })).filter((s) => s.albums.length)
    const posts = data.features.filter((f) => f.season === code).sort(byNewest)
    if (posts.length) out.push({ type: 'features', key: `${code}-features`, season: code, title: `${seasonLabel(code)} 기획`, posts })
    return out
  })
}

// 검색: 앨범(제목+키워드) / 아티스트 / 내용(리뷰 글)
const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '')
export function search(data, query, mode) {
  const q = norm(query)
  if (!q) return []
  const field = {
    album: (x) => [x.title, ...(x.keywords || [])].join(' '),
    artist: (x) => x.artist,
    text: (x) => x.review,
  }[mode]
  return data.albums.filter((x) => norm(field(x)).includes(q)).sort(byNewest)
}
