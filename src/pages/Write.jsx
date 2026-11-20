import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, mediaUrl, shrinkImage } from '../api'
import { useData } from '../data/store'
import { albumSeason, allSeasons, REGIONS, seasonLabel } from '../data/seasons'
import LogoRow from '../components/LogoRow'
import { imageRatio } from '../components/PostImages'
import Ko from '../Ko'
import './Post.css'

// 글쓰기: 보이는 화면과 같은 레이아웃. 좌측에 글, 우측에 사진.
// 기획 게시물의 우측 칸은 왼쪽 글과 따로 흐르는 칸 — 사진 사이사이에 글을 쓰거나 엔터를 쳐서
// 사진의 세로 위치를 정함 (가로폭 고정, 세로가 긴 사진은 1:1)

const KINDS = [
  { key: 'review', label: '앨범 리뷰' },
  { key: 'feature', label: '기획 게시물' },
]

// 지금 시즌과 다음 시즌 (새 시즌을 바로 고를 수 있게)
function upcomingSeasons() {
  const d = new Date()
  const yy = d.getFullYear() % 100
  const pad = (n) => String(n % 100).padStart(2, '0')
  const now = `${pad(yy)}${d.getMonth() < 6 ? 'SS' : 'FW'}`
  const next = now.endsWith('SS') ? `${pad(yy)}FW` : `${pad(yy + 1)}SS`
  return [next, now]
}

const Choice = ({ options, value, onChange }) => (
  <div className="choice">
    {options.map((o) => (
      <button key={o.key} type="button" className={value === o.key ? 'is-on' : ''} onClick={() => onChange(o.key)}>
        <Ko>{o.label}</Ko>
      </button>
    ))}
  </div>
)

// 내용에 맞춰 높이가 늘어나는 입력칸
function AutoText({ value, onChange, placeholder, onFocus, className = '' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      className={`field field-body ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      rows={1}
      spellCheck="false"
    />
  )
}

const newText = (text = '') => ({ key: crypto.randomUUID(), type: 'text', text })

// 커버 주소 → 저장용 (올린 이미지면 R2 id, 사이트 기본 커버면 경로)
const BASE = import.meta.env.BASE_URL
const coverFromUrl = (url) =>
  url.includes('/api/media/') ? { url, media: url.split('/api/media/')[1] } : { url, path: url.slice(BASE.length) }
const coverUrl = (c) => (c.media ? mediaUrl(c.media) : `${BASE}${c.path}`)

export default function Write() {
  const navigate = useNavigate()
  const data = useData()
  const [authed, setAuthed] = useState(null)
  // ?edit=<id>: 리뷰 수정 (리뷰의 Share 버튼 10번 → 비밀번호 → 여기로)
  const [params] = useSearchParams()
  const editId = params.get('edit')
  const editing = editId ? data.albums.find((x) => x.id === editId) : null

  useEffect(() => {
    api.me().then(
      (r) => (r.ok ? setAuthed(true) : navigate('/login', { replace: true })),
      () => navigate('/login', { replace: true }),
    )
  }, [navigate])

  const [kind, setKind] = useState('review')
  const seasons = [...new Set([...upcomingSeasons(), ...allSeasons(data)])].sort(
    (p, q) => q.slice(0, 2).localeCompare(p.slice(0, 2)) || (p.endsWith('FW') ? -1 : 1),
  )
  const [season, setSeason] = useState(upcomingSeasons()[1])
  const [customYear, setCustomYear] = useState('')
  const [region, setRegion] = useState('kr')
  const [f, setF] = useState({ artist: '', title: '', writer: '', score: '', released: '', keywords: '', body: '' })
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: typeof e === 'string' ? e : e.target.value }))

  const [cover, setCover] = useState(null) // { url, blob, w, h }
  // 우측 칸: 글 / 사진 / 글 / 사진 / 글 … (사진 사이엔 항상 글 칸이 하나씩)
  const [side, setSide] = useState(() => [newText()])
  const [focusKey, setFocusKey] = useState(null) // 마지막으로 커서가 있던 우측 글 칸
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  // 임시저장: 서버(D1)에 저장 — 다른 기기에서도 이어 쓰기 가능
  const [draftId, setDraftId] = useState(null)
  const [drafts, setDrafts] = useState([])
  const loadDrafts = () => api.drafts().then((r) => setDrafts(r.drafts || []), () => {})
  useEffect(() => {
    if (authed) loadDrafts()
  }, [authed])

  // 수정할 리뷰 내용 채우기 (한 번만) — 서버의 최신 수정본을 다 불러온 뒤에
  const filled = useRef(null)
  useEffect(() => {
    if (!authed || !data.loaded || !editing || filled.current === editing.id) return
    filled.current = editing.id
    setKind('review')
    setSeason(albumSeason(editing))
    setRegion(editing.region || 'kr')
    setF({
      artist: editing.artist || '',
      title: editing.title || '',
      writer: editing.writer || '',
      score: String(editing.score ?? ''),
      released: editing.released || '',
      keywords: (editing.keywords || []).join(', '),
      body: editing.review || '',
    })
    setCover(coverFromUrl(editing.cover))
  }, [authed, data.loaded, editing])

  // 사진 고르기 (브라우저에서 줄인 뒤 미리보기)
  const pick = (multiple, onFiles) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    input.onchange = async () => {
      const files = [...(input.files || [])]
      const shrunk = await Promise.all(files.map((file) => shrinkImage(file)))
      onFiles(shrunk.map((s) => ({ ...s, url: URL.createObjectURL(s.blob), key: crypto.randomUUID(), type: 'image' })))
    }
    input.click()
  }

  // 사진은 커서가 있던 글 칸 바로 아래에 (없으면 맨 아래에) 들어감
  const addImages = () =>
    pick(true, (added) =>
      setSide((list) => {
        let at = list.findIndex((b) => b.key === focusKey)
        if (at < 0) at = list.length - 1
        const insert = added.flatMap((im) => [im, newText()])
        return [...list.slice(0, at + 1), ...insert, ...list.slice(at + 1)]
      }),
    )

  // 사진을 빼면 위아래 글 칸을 합침
  const removeImage = (key) =>
    setSide((list) => {
      const i = list.findIndex((b) => b.key === key)
      const before = list[i - 1]
      const after = list[i + 1]
      const merged = { ...before, text: [before.text, after?.text].filter(Boolean).join('\n') }
      return [...list.slice(0, i - 1), merged, ...list.slice(i + 2)]
    })

  const setSideText = (key) => (text) => setSide((list) => list.map((b) => (b.key === key ? { ...b, text } : b)))

  const chooseCustomSeason = (half) => {
    const yy = customYear.replace(/\D/g, '').slice(-2)
    if (yy.length === 2) setSeason(`${yy}${half}`)
  }

  // 아직 안 올린 사진(커버·우측 칸)을 R2에 올리고, 올린 id를 화면 상태에도 기록
  const uploadPending = async () => {
    let c = cover
    if (c && c.blob && !c.media) {
      setStatus('업로드')
      c = { ...c, media: (await api.uploadImage(c.blob)).id }
      setCover(c)
    }
    const pending = side.filter((b) => b.type === 'image' && !b.media).length
    let n = 0
    const next = []
    for (const b of side) {
      if (b.type === 'image' && !b.media) {
        setStatus(`업로드 ${++n}/${pending}`)
        next.push({ ...b, media: (await api.uploadImage(b.blob)).id })
      } else next.push(b)
    }
    setSide(next)
    return { cover: c, side: next }
  }

  const snapshot = (c, sideBlocks) => ({
    kind,
    season,
    region,
    f,
    cover: c?.media || c?.path ? { media: c.media, path: c.path } : null,
    side: sideBlocks.map((b) => (b.type === 'image' ? { type: 'image', media: b.media, w: b.w, h: b.h } : { type: 'text', text: b.text })),
  })

  const saveDraft = async () => {
    if (busy) return
    setBusy(true)
    try {
      const up = await uploadPending()
      const id = draftId || crypto.randomUUID()
      await api.saveDraft(id, snapshot(up.cover, up.side))
      setDraftId(id)
      setStatus(`저장 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`)
      loadDrafts()
    } catch (err) {
      if (err.status === 401) return navigate('/login', { replace: true })
      setStatus('저장 실패')
    } finally {
      setBusy(false)
    }
  }

  const openDraft = (d) => {
    setDraftId(d.id)
    setKind(d.kind || 'review')
    setSeason(d.season || upcomingSeasons()[1])
    setRegion(d.region || 'kr')
    setF((v) => ({ ...v, ...(d.f || {}) }))
    setCover(d.cover ? { ...d.cover, url: coverUrl(d.cover) } : null)
    const blocks = (d.side || []).map((b) =>
      b.type === 'image' ? { ...b, key: crypto.randomUUID(), url: mediaUrl(b.media) } : newText(b.text),
    )
    setSide(blocks.length ? blocks : [newText()])
    setStatus('')
  }

  const removeDraft = async (id) => {
    await api.deleteDraft(id).catch(() => {})
    if (id === draftId) setDraftId(null)
    loadDrafts()
  }

  const draftName = (d) =>
    (d.kind === 'review' ? [d.f?.artist, d.f?.title].filter(Boolean).join(' — ') : d.f?.title) || '—'
  const draftTime = (t) =>
    new Date(t).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const publish = async () => {
    if (busy) return
    const missing =
      kind === 'review'
        ? [!f.artist && '아티스트', !f.title && '앨범', f.score === '' && '점수', !cover && '커버'].filter(Boolean)
        : [!f.title && '제목'].filter(Boolean)
    const score = Number(f.score)
    if (missing.length) return setStatus(`빈 칸 — ${missing.join(', ')}`)
    if (kind === 'review' && !(score >= 0 && score <= 10)) return setStatus('점수 0–10')
    if (kind === 'review' && f.released && !/^\d{4}-\d{2}-\d{2}$/.test(f.released)) return setStatus('발매일 YYYY-MM-DD')

    setBusy(true)
    try {
      const up = await uploadPending()
      setStatus('업로드')
      const review = {
        kind,
        season,
        region,
        artist: f.artist,
        title: f.title,
        writer: f.writer,
        score,
        released: f.released,
        keywords: f.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        cover: up.cover?.media || '',
        coverPath: up.cover?.path || '',
        body: f.body,
      }
      const { post } = editing
        ? await api.updatePost(editing.id, { ...review, date: editing.date })
        : kind === 'review'
          ? await api.createPost(review)
          : await api.createPost({ kind, season, title: f.title, writer: f.writer, body: f.body, side: snapshot(null, up.side).side })
      if (draftId) await api.deleteDraft(draftId).catch(() => {}) // 올린 글의 임시저장은 정리
      await data.reload()
      navigate(kind === 'review' ? `/${post.season}?album=${post.id}` : `/post/${post.id}`)
    } catch (err) {
      if (err.status === 401) return navigate('/login', { replace: true })
      setStatus('실패')
    } finally {
      setBusy(false)
    }
  }

  // 삭제 (수정 중일 때만): 비밀번호를 한 번 더 확인
  const [confirmDel, setConfirmDel] = useState(false)
  const [delPw, setDelPw] = useState('')
  const removePost = async (e) => {
    e.preventDefault()
    if (!delPw || busy) return
    setBusy(true)
    try {
      await api.deletePost(editing.id, delPw)
      await data.reload()
      navigate('/', { replace: true })
    } catch (err) {
      setStatus(err.status === 401 ? '틀림' : '실패')
      setDelPw('')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    await api.logout().catch(() => {})
    navigate('/')
  }

  if (!authed || (editId && !data.loaded)) return null

  return (
    <div className="post-page write">
      <LogoRow />

      {/* 분류 · 시즌 */}
      <div className="write-opts">
        {editing ? (
          <div className="choice">
            <span className="is-on-text">
              <Ko>{`수정 — ${editing.artist} / ${editing.title}`}</Ko>
            </span>
          </div>
        ) : (
          <Choice options={KINDS} value={kind} onChange={setKind} />
        )}
        <div className="choice">
          {seasons.map((code) => (
            <button key={code} type="button" className={season === code ? 'is-on' : ''} onClick={() => setSeason(code)}>
              {seasonLabel(code)}
            </button>
          ))}
          {!seasons.includes(season) && <button type="button" className="is-on">{seasonLabel(season)}</button>}
        </div>
        <div className="choice">
          <input
            className="field field-year"
            value={customYear}
            onChange={(e) => setCustomYear(e.target.value)}
            placeholder="YY"
            aria-label="다른 시즌 연도 (두 자리)"
            inputMode="numeric"
            maxLength={2}
          />
          <button type="button" onClick={() => chooseCustomSeason('SS')}>S/S</button>
          <button type="button" onClick={() => chooseCustomSeason('FW')}>F/W</button>
        </div>
        {kind === 'review' && <Choice options={REGIONS} value={region} onChange={setRegion} />}
      </div>

      {/* 글 정보 */}
      <div className="post-info">
        {kind === 'review' ? (
          <>
            <input className="field" value={f.artist} onChange={set('artist')} placeholder="아티스트" />
            <input className="field" value={f.title} onChange={set('title')} placeholder="앨범" />
            <input className="field" value={f.writer} onChange={set('writer')} placeholder="작성자" />
            <input className="field" value={f.score} onChange={set('score')} placeholder="점수" inputMode="decimal" />
            <input className="field" value={f.released} onChange={set('released')} placeholder="발매일 YYYY-MM-DD" />
            <input className="field" value={f.keywords} onChange={set('keywords')} placeholder="키워드" />
          </>
        ) : (
          <>
            <input className="field" value={f.title} onChange={set('title')} placeholder="제목" />
            <input className="field" value={f.writer} onChange={set('writer')} placeholder="작성자" />
          </>
        )}
      </div>

      {/* 본문 + 우측 칸 */}
      <div className="post-main">
        <div className="post-body">
          <AutoText value={f.body} onChange={set('body')} placeholder={kind === 'review' ? '리뷰' : '본문'} />
        </div>

        {kind === 'review' ? (
          <div className="post-side">
            <button type="button" className="write-cover" onClick={() => pick(false, ([im]) => im && setCover(im))}>
              {cover ? <img src={cover.url} alt="" /> : <Ko>커버</Ko>}
            </button>
          </div>
        ) : (
          <div className="post-side write-side">
            <button type="button" className="write-add" onClick={addImages}>
              <Ko>+ 사진</Ko>
            </button>
            {side.map((b, i) =>
              b.type === 'image' ? (
                <div key={b.key} className="write-img" style={{ aspectRatio: imageRatio(b) }}>
                  <img src={b.url} alt="" draggable="false" />
                  <button type="button" onClick={() => removeImage(b.key)}>
                    <Ko>삭제</Ko>
                  </button>
                </div>
              ) : (
                <AutoText
                  key={b.key}
                  className="post-side-text"
                  value={b.text}
                  onChange={setSideText(b.key)}
                  onFocus={() => setFocusKey(b.key)}
                  placeholder=""
                />
              ),
            )}
          </div>
        )}
      </div>

      <div className="write-actions">
        <button type="button" className="is-on" onClick={publish} disabled={busy}>
          <Ko>{editing ? '수정하기' : '올리기'}</Ko>
        </button>
        {editing && (
          <button type="button" className={confirmDel ? 'is-on' : ''} onClick={() => setConfirmDel(!confirmDel)} disabled={busy}>
            <Ko>삭제</Ko>
          </button>
        )}
        {editing && confirmDel && (
          <form className="delete-confirm" onSubmit={removePost}>
            <input
              className="field"
              type="password"
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              placeholder="PASSWORD"
              aria-label="삭제 확인 비밀번호"
              autoFocus
              autoComplete="current-password"
            />
          </form>
        )}
        {!editing && (
          <button type="button" onClick={saveDraft} disabled={busy}>
            <Ko>임시저장</Ko>
          </button>
        )}
        {status && (
          <span>
            <Ko>{status}</Ko>
          </span>
        )}
        <button type="button" onClick={logout}>
          <Ko>로그아웃</Ko>
        </button>
      </div>

      {/* 임시저장 목록: 누르면 불러오기 */}
      {drafts.length > 0 && (
        <div className="drafts">
          <div>
            <Ko>임시저장 목록</Ko>
          </div>
          {drafts.map((d) => (
            <div key={d.id} className={d.id === draftId ? 'draft is-current' : 'draft'}>
              <button type="button" onClick={() => openDraft(d)}>
                <Ko>{draftName(d)}</Ko>
              </button>
              <span>
                <Ko>{`${d.kind === 'review' ? '리뷰' : '기획'} · ${seasonLabel(d.season || '00SS')} · ${draftTime(d.updatedAt)}`}</Ko>
              </span>
              <button type="button" onClick={() => removeDraft(d.id)}>
                <Ko>삭제</Ko>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
