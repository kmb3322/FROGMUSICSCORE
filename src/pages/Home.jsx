import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { albumSeason, dateLabel, sectionsFor, search, seasonLabel, yearsOf } from '../data/seasons'
import { useData } from '../data/store'
import LogoRow from '../components/LogoRow'
import Ko from '../Ko'
import './Home.css'

// SEARCH 글자 실제 폭을 재서 입력칸(비어 있을 때) 폭으로 — 글꼴(Helvetica/Acumin Pro)마다 달라서
function useFitPlaceholder(ref) {
  useEffect(() => {
    const fit = () => {
      const el = ref.current
      if (!el) return
      const cs = getComputedStyle(el)
      const ctx = document.createElement('canvas').getContext('2d')
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing
      el.style.setProperty('--search-w', `${Math.ceil(ctx.measureText(el.placeholder).width) + 2}px`)
    }
    fit()
    document.fonts?.ready.then(fit) // 글꼴을 다 불러온 뒤 다시
    window.addEventListener('resize', fit) // 모바일 글자 크기 전환
    return () => window.removeEventListener('resize', fit)
  }, [ref])
}

const MODES = [
  { key: 'album', label: '앨범' },
  { key: 'artist', label: '아티스트' },
  { key: 'text', label: '내용' },
]

// 앨범 → 그 시즌 뷰어에서 해당 앨범부터
const albumLink = (x) => `/${albumSeason(x)}?album=${x.id}`

// 마지막으로 보던 연도 (이 탭에서만) — 시즌·기획 페이지에서 메인으로 돌아오면 그 연도 그대로
const YEAR_KEY = 'fms-year'
const lastYear = () => {
  try {
    return Number(sessionStorage.getItem(YEAR_KEY)) || null
  } catch {
    return null
  }
}
const rememberYear = (y) => {
  try {
    if (y) sessionStorage.setItem(YEAR_KEY, String(y))
    else sessionStorage.removeItem(YEAR_KEY)
  } catch {
    // 저장이 막힌 브라우저면 기억 없이 최신 연도
  }
}

// 로고를 이 간격 안에 10번 연속 누르면 비밀번호 페이지로
const SECRET_CLICKS = 10
const CLICK_GAP = 1200

export default function Home() {
  const data = useData()
  const years = yearsOf(data)
  const navigate = useNavigate()
  const clicks = useRef({ n: 0, t: 0 })
  const onLogo = (e) => {
    setQuery('')
    rememberYear(null) // 메인에서 로고를 누르면 최신 연도 첫 화면으로
    const now = Date.now()
    clicks.current.n = now - clicks.current.t < CLICK_GAP ? clicks.current.n + 1 : 1
    clicks.current.t = now
    if (clicks.current.n >= SECRET_CLICKS) {
      clicks.current.n = 0
      e.preventDefault() // 로고 링크의 메인 이동 대신
      navigate('/login')
    }
  }
  const [params, setParams] = useSearchParams()
  // 주소에 연도가 있으면 그것, 없으면 마지막으로 보던 연도, 그것도 없으면 최신
  const year = [Number(params.get('year')), lastYear()].find((y) => years.includes(y)) ?? years[0]
  const yi = years.indexOf(year)
  const setYear = (y) => {
    rememberYear(y)
    setParams(y === years[0] ? {} : { year: String(y) })
  }
  useEffect(() => {
    if (data.loaded && year) rememberYear(year) // 서버 글을 받기 전 기본 데이터의 연도로 덮어쓰지 않게
  }, [data.loaded, year])

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('album')
  const [focused, setFocused] = useState(false)
  const results = search(data, query, mode)
  const searchRef = useRef(null)
  useFitPlaceholder(searchRef)
  // 검색 모드 버튼은 SEARCH를 눌렀을 때(입력 중이거나 검색어가 있을 때)만
  const showModes = focused || query.trim() !== ''

  return (
    <div className="home">
      {/* 로고 줄은 가로 전체가 메인으로 가는 링크 (마우스를 올리면 초록 띠) */}
      <LogoRow onClick={onLogo} />

      {/* 글씨는 모두 좌측 영역에 */}
      <div className="home-left">
        {/* 검색: 앨범(제목·키워드) / 아티스트 / 내용 */}
        <div className="search">
          <input
            ref={searchRef}
            className="search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="SEARCH"
            aria-label="검색"
            spellCheck="false"
            autoComplete="off"
          />
          {showModes && (
            <div className="search-modes" role="tablist">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.key}
                  className={mode === m.key ? 'is-on' : ''}
                  // 버튼을 눌러도 입력칸 포커스가 유지되도록
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setMode(m.key)}
                >
                  <Ko>{m.label}</Ko>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {query.trim() ? (
        <section className="results">
          <div className="sec-head">
            <span><Ko>{`검색 결과 ${results.length}`}</Ko></span>
          </div>
          {results.map((x) => (
            <Link key={x.id} to={albumLink(x)} className="row">
              <AlbumText album={x} season />
              <img className="row-cover" src={x.cover} alt="" loading="lazy" />
            </Link>
          ))}
        </section>
      ) : !data.loaded ? null : ( // 서버 글을 받기 전 기본 데이터로 먼저 그리면, 받은 뒤 앨범 자리가 바뀌어 보였음
        <>
          {/* 연도 단위로 리스트 넘기기 (years는 최신순) — 리스트 바로 위 */}
          <nav className="years" aria-label="연도">
            <button type="button" disabled={yi >= years.length - 1} onClick={() => setYear(years[yi + 1])}>
              ←
            </button>
            <span>{year}</span>
            <button type="button" disabled={yi <= 0} onClick={() => setYear(years[yi - 1])}>
              →
            </button>
          </nav>
          {sectionsFor(data, year).map((s) => <Section key={s.key} section={s} />)}
        </>
      )}
    </div>
  )
}

// 아티스트 / 앨범 (메인에선 작성자·평점 표시 안 함)
function AlbumText({ album, season = false }) {
  return (
    <span className="album-text">
      <span><Ko>{album.artist}</Ko></span>
      <span><Ko>{album.title}</Ko></span>
      {season && <span>{seasonLabel(albumSeason(album))}</span>}
    </span>
  )
}

function Section({ section }) {
  const [open, setOpen] = useState(false)

  if (section.type === 'features') {
    return (
      <section className="sec">
        <div className="sec-head">
          <span><Ko>{section.title}</Ko></span>
        </div>
        <div className="posts">
          {section.posts.map((p) => (
            <Link key={p.id} to={`/post/${p.id}`} className="post">
              <span><Ko>{p.title}</Ko></span>
              <span>{dateLabel(p.date)}</span>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="sec">
      <div className="sec-head">
        <Link to={`/${section.season}`}>
          <Ko>{section.title}</Ko>
        </Link>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
          <Ko>{open ? '접기' : '펼치기'}</Ko>
        </button>
      </div>

      {/* 같은 요소를 그대로 두고 배치만 바꿈 → 펼치거나 접어도 커버를 다시 그리지 않음
          접힘: 가로로 쌓인 커버 + 밑에 글, 횡스크롤 / 펼침: 세로 리스트, 좌측 글 · 우측 커버 */}
      <div className={open ? 'list is-open' : 'list'}>
        {section.albums.map((x) => (
          <Link key={x.id} to={albumLink(x)} className="item">
            <img src={x.cover} alt={`${x.artist} — ${x.title}`} loading="lazy" decoding="async" draggable="false" />
            <AlbumText album={x} />
          </Link>
        ))}
      </div>
    </section>
  )
}
