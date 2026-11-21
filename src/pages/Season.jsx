import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { dateLabel, seasonAlbums, seasonLabel, SITE } from '../data/seasons'
import { useData } from '../data/store'
import CoverStack from '../components/CoverStack'
import ColorFlow from '../components/ColorFlow'
import usePager from '../usePager'
import ReviewActions, { ShareCards } from '../components/ReviewActions'
import { makeCards } from '../share/cards'
import Ko from '../Ko'
import '../App.css'

// 시즌 페이지 (/26FW, /26SS): 그 시즌 앨범을 한 장씩 넘겨 보는 뷰어
// startId: 메인에서 누른 앨범부터 시작
export default function Season({ code, startId }) {
  const albums = seasonAlbums(useData(), code)
  const startIndex = Math.max(0, albums.findIndex((x) => x.id === startId))

  // 이 페이지에서만 문서 스크롤을 막음 (커버는 usePager가 넘김)
  useEffect(() => {
    document.documentElement.classList.add('locked')
    return () => document.documentElement.classList.remove('locked')
  }, [])

  // progress: 0 → 첫 번째 커버, 1 → 두 번째 커버 ... (위·아래 모두 한 장씩)
  // 스크롤 영역 분리: 커버 영역 = 앨범 넘기기, 글씨 영역 = 글 자체 스크롤
  const coverArea = useRef(null)
  const { progress, mode } = usePager(albums.length, coverArea, startIndex)
  // 리뷰 펼침 상태 — 다른 앨범으로 넘어가도 그대로 유지
  const [open, setOpen] = useState(false)
  const [cards, setCards] = useState(null) // Share → 사진: 만든 카드들
  const [topBand, setTopBand] = useState(false) // 상단 영역 hover
  const [infoHover, setInfoHover] = useState(false) // 앨범 정보·점수 hover
  const [clicked, setClicked] = useState(false) // 클릭 직후엔 띠 숨김 (영역을 벗어나면 해제)
  const [bandRect, setBandRect] = useState({ top: 0, height: 0 })

  const logoRef = useRef(null)
  const captionRef = useRef(null)
  const infoRef = useRef(null)
  const scoreRef = useRef(null)

  const active = Math.min(albums.length - 1, Math.max(0, Math.round(progress)))
  const album = albums[active]

  // 띠 위치 (문서 기준 좌표 — 페이지가 스크롤돼도 글과 같이 움직임)
  // 정보 띠: 아티스트 줄 위 ~ 점수 줄 아래 / 상단 띠: 로고 영역(로고 + 위아래 여백)
  // 데스크톱에선 정보 영역이 로고 영역 바로 아래에서 시작해 두 띠가 붙음
  const measureScore = () => {
    if (!infoRef.current || !scoreRef.current || !logoRef.current) return
    const y = window.scrollY
    const top = infoRef.current.getBoundingClientRect().top + y
    const bottom = scoreRef.current.getBoundingClientRect().bottom + y
    const logo = logoRef.current.getBoundingClientRect()
    const gutter = logo.top + y
    setBandRect({ top, height: Math.max(0, bottom - top), logoBand: logo.bottom + y + gutter })
  }
  const rectRef = useRef(bandRect)
  rectRef.current = bandRect

  // 가로 어디든: 상단 줄 높이면 상단 띠, 정보 영역 높이면 정보 띠
  useEffect(() => {
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return // 터치에선 hover 띠 없음
      const { top, height, logoBand } = rectRef.current
      const y = e.clientY + window.scrollY
      setTopBand(y < logoBand)
      const inside = y >= top && y < top + height
      setInfoHover(inside)
      if (!inside) setClicked(false)
    }
    const onLeave = () => {
      setClicked(false)
      setTopBand(false)
      setInfoHover(false)
    }
    window.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [])
  useLayoutEffect(measureScore, [open, active, infoHover])
  useEffect(() => {
    window.addEventListener('resize', measureScore)
    return () => window.removeEventListener('resize', measureScore)
  }, [])

  // 띠: 펼쳐져 있으면 항상, 접혀 있으면 마우스를 올렸을 때만 (접는 클릭 직후엔 숨김)
  const scoreBand = open || (infoHover && !clicked)
  const toggle = () => {
    setOpen((v) => !v)
    setClicked(true)
  }

  return (
    <div>
      {cards && <ShareCards blobs={cards} name={`frogmusicscore-${album.id}`} onClose={() => setCards(null)} />}
      <div className="base" />
      <ColorFlow albums={albums} progress={progress} mode={mode} />

      {/* 배경 위에서 글씨색이 반전(difference)되며 같이 변함. 띠도 이 안에 있어 함께 반전 */}
      <aside className="left">
        {topBand && <div className="band" style={{ top: 0, height: bandRect.logoBand }} />}
        {scoreBand && <div className="band" style={{ top: bandRect.top, height: bandRect.height }} />}

        <h1 className="logo" ref={logoRef}>
          <Link to="/">
            FROG
            <br />
            MUSIC SCORE
            <br />
            KOREA
          </Link>
        </h1>

        {/* 앨범 커버 윗변과 같은 높이에서 시작 */}
        <div className="caption" ref={captionRef}>
          <div ref={infoRef}><Ko>{album.artist}</Ko></div>
          <div><Ko>{album.title}</Ko></div>
          <div><Ko>{album.writer}</Ko></div>
          <div ref={scoreRef}>{album.score.toFixed(1)}</div>

          {open && (
            <div className="review">
              {album.review.split('\n\n').map((p, i) => (
                <p key={i}>
                  <Ko>{p}</Ko>
                </p>
              ))}
              {/* 시즌 + 평론 날짜: 글 맨 아래, 한 줄 띄우고 */}
              <p className="review-meta">
                <span>{seasonLabel(code)}</span>
                <span>{dateLabel(album.date)}</span>
              </p>
              <p className="review-site">{SITE}</p>
              <ReviewActions
                id={album.id}
                url={`${window.location.origin}${import.meta.env.BASE_URL}${code}?album=${album.id}`}
                shareTitle={`${album.artist} — ${album.title}`}
                makeImages={() => makeCards(album, `${seasonLabel(code)}   ${dateLabel(album.date)}`)}
                onCards={setCards}
              />
            </div>
          )}
        </div>

        {/* 로고 줄 가로 전체 = 메인으로 */}
        <Link to="/" className="hit" style={{ top: 0, height: bandRect.logoBand }} aria-label="메인으로" />

        {/* 번호~점수 높이의 가로 전체가 한 덩어리 버튼: 어디를 눌러도 펼침/접힘 */}
        <button
          type="button"
          className="hit"
          style={{ top: bandRect.top, height: bandRect.height }}
          aria-expanded={open}
          aria-label={open ? '리뷰 접기' : '리뷰 펼치기'}
          onClick={toggle}
        />
      </aside>

      <main className="right" ref={coverArea}>
        <CoverStack albums={albums} progress={progress} />
      </main>
    </div>
  )
}
