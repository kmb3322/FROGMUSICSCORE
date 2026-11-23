import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Ko from '../Ko'

// 리뷰·기획 공통: Likes · Share
// Likes: 로그인 없이 누구나. 한 사람은 글마다 하루 한 번 (서버에서 제한) — 이미 눌렀으면 초록으로만
// Share: 링크 / 사진(인스타용 3:4 카드 — makeImages). 빠르게 10번 누르면 비밀번호 → 이 글 수정·삭제
const SECRET_CLICKS = 10
const CLICK_GAP = 1200
// onShareLink: 링크 공유 때 함께 할 일 (관리자면 링크 썸네일 다시 만들기)
export default function ReviewActions({ id, url, shareTitle, makeImages, onCards, onShareLink }) {
  const [likes, setLikes] = useState({ count: null, liked: false })
  const [note, setNote] = useState('')
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const clicks = useRef({ n: 0, t: 0 })
  const onShare = () => {
    const now = Date.now()
    clicks.current.n = now - clicks.current.t < CLICK_GAP ? clicks.current.n + 1 : 1
    clicks.current.t = now
    if (clicks.current.n >= SECRET_CLICKS) {
      clicks.current.n = 0
      return navigate(`/login?next=${encodeURIComponent(`/write?edit=${id}`)}`)
    }
    setMenu((v) => !v)
  }

  useEffect(() => {
    let alive = true
    setLikes({ count: null, liked: false })
    setNote('')
    setMenu(false)
    api.likes(id).then(
      (r) => alive && setLikes(r),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [id])

  const flash = (text) => {
    setNote(text)
    setTimeout(() => setNote((n) => (n === text ? '' : n)), 2000)
  }

  const like = async () => {
    if (likes.liked) return // 이미 눌렀으면 초록 그대로
    setLikes((v) => ({ count: (v.count || 0) + 1, liked: true })) // 바로 반영
    try {
      setLikes(await api.like(id))
    } catch {
      api.likes(id).then(setLikes, () => {})
    }
  }

  const shareLink = async () => {
    setMenu(false)
    onShareLink?.() // 기다리지 않음 — 공유 시트는 누른 직후에 열어야 함
    const data = { title: `${shareTitle} | FROG MUSIC SCORE`, url }
    try {
      if (navigator.share) return await navigator.share(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('복사')
    } catch {
      window.prompt('링크', url)
    }
  }

  const shareImages = async () => {
    setMenu(false)
    setBusy(true)
    try {
      onCards(await makeImages())
      setNote('')
    } catch {
      flash('실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <p className="review-actions">
      <button type="button" className={likes.liked ? 'is-on' : ''} onClick={like}>
        Likes{likes.count !== null ? ` ${likes.count}` : ''}
      </button>
      <button type="button" className={menu ? 'is-on' : ''} onClick={onShare} disabled={busy}>
        Share
      </button>
      {menu && (
        <>
          <button type="button" onClick={shareLink}>
            <Ko>링크</Ko>
          </button>
          <button type="button" onClick={shareImages}>
            <Ko>사진</Ko>
          </button>
        </>
      )}
      {note && (
        <span>
          <Ko>{note}</Ko>
        </span>
      )}
    </p>
  )
}

// 만든 카드 미리보기 + 저장 (모바일은 공유 시트 → 인스타로 바로)
export function ShareCards({ blobs, name, onClose }) {
  const [urls] = useState(() => blobs.map((b) => URL.createObjectURL(b)))
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])

  const files = () => blobs.map((b, i) => new File([b], `${name}-${i + 1}.png`, { type: 'image/png' }))

  const download = (i) => {
    const a = document.createElement('a')
    a.href = urls[i]
    a.download = `${name}-${i + 1}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const saveAll = async () => {
    const list = files()
    if (navigator.canShare?.({ files: list })) {
      try {
        return await navigator.share({ files: list })
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    for (const i of urls.keys()) {
      download(i)
      await new Promise((r) => setTimeout(r, 300))
    }
  }

  return (
    <div className="share-sheet" role="dialog" aria-label="카드 저장">
      <div className="share-bar">
        <button type="button" className="is-on" onClick={saveAll}>
          <Ko>{`저장 ${blobs.length}장`}</Ko>
        </button>
        <button type="button" onClick={onClose}>
          <Ko>닫기</Ko>
        </button>
      </div>
      <div className="share-cards">
        {urls.map((u, i) => (
          <button key={u} type="button" onClick={() => download(i)} title="이 장만 저장">
            <img src={u} alt={`카드 ${i + 1}`} />
          </button>
        ))}
      </div>
    </div>
  )
}
