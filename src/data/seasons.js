// 시즌·리스트·검색 계산. data = { albums, features } (기본 데이터 + 서버 글 합친 것, store.jsx)

// 시즌 코드: '26FW', '26SS'  /  라벨: '26 F/W', '26 S/S'
export const seasonOf = (released) => {
  const [y, m] = released.split('-').map(Number)
  return `${String(y).slice(2)}${m <= 6 ? 'SS' : 'FW'}`
}
export const seasonLabel = (code) => `${code.slice(0, 2)} ${code.slice(2, 3)}/${code.slice(3)}`
export const seasonYear = (code) => 2000 + Number(code.slice(0, 2))
// 날짜 표시: 2026.09.15 / 2026-09-15 → 2026 09 15 (공백으로 구분)
export const dateLabel = (d) => (d || '').replace(/[.-]/g, ' ')
// 글 칸 · 카드 맨 끝에 붙는 사이트 주소
export const SITE = 'frogmusicscore.com'

export const isSeason = (code) => /^\d{2}(SS|FW)$/.test(code || '')

// 앨범의 시즌: 글쓰기에서 고른 시즌이 있으면 그것, 없으면 발매일로
export const albumSeason = (x) => x.season || seasonOf(x.released)

// 카테고리 (메인 리스트 · 글쓰기 선택지 순서). 여기에 이름을 더하면 바로 생김.
// 글쓰기 화면에서 새 이름을 직접 입력해도 되고, 글이 있는 카테고리만 메인에 섹션으로 나옴
export const CATEGORIES = ['한국 힙합', '해외 힙합', '한국 R&B', '해외 R&B', '한국 팝', '해외 팝']
// 예전 데이터: region kr/us, 예전 이름 '미국 힙합' → 지금 이름으로
const LEGACY = { kr: '한국 힙합', us: '해외 힙합' }
const RENAMED = { '미국 힙합': '해외 힙합' }
export const albumCategory = (x) => {
  const c = x.category || LEGACY[x.region] || '기타'
  return RENAMED[c] || c
}

// 정해 둔 카테고리 + 글에서 새로 쓴 카테고리
export const categoriesOf = (data) => [...new Set([...CATEGORIES, ...data.albums.map(albumCategory)])]

const sortKey = (x) => x.released || (x.date || '').replaceAll('.', '-')
const byNewest = (x, y) => sortKey(y).localeCompare(sortKey(x))

// 시즌 안 앨범 순서: 카테고리 순, 각각 최신순 (메인 리스트와 같은 순서)
export function seasonAlbums(data, code) {
  return categoriesOf(data).flatMap((c) =>
    data.albums.filter((x) => albumCategory(x) === c && albumSeason(x) === code).sort(byNewest),
  )
}

// 글이 있는 시즌 전체 (최신순)
export function allSeasons(data) {
  const codes = new Set([...data.albums.map(albumSeason), ...data.features.map((f) => f.season)])
  return [...codes].sort((p, q) => q.slice(0, 2).localeCompare(p.slice(0, 2)) || (p.endsWith('FW') ? -1 : 1))
}

// 글이 있는 연도 (최신순)
export const yearsOf = (data) => [...new Set(allSeasons(data).map(seasonYear))].sort((p, q) => q - p)

// 메인 리스트: 연도 → F/W 카테고리별, F/W 기획, S/S 카테고리별, S/S 기획
export function sectionsFor(data, year) {
  const yy = String(year).slice(2)
  return ['FW', 'SS'].flatMap((half) => {
    const code = `${yy}${half}`
    const out = categoriesOf(data)
      .map((c) => ({
        type: 'albums',
        key: `${code}-${c}`,
        season: code,
        title: `${seasonLabel(code)} ${c}`,
        albums: data.albums.filter((x) => albumCategory(x) === c && albumSeason(x) === code).sort(byNewest),
      }))
      .filter((s) => s.albums.length)
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
