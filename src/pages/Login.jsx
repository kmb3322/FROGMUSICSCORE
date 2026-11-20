import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import LogoRow from '../components/LogoRow'
import Ko from '../Ko'
import './Post.css'

// 비밀번호 페이지 (메인 로고 / 리뷰 Share 10번 연속 클릭으로 진입)
// ?next=/write?edit=<id> 이면 로그인 후 그 글 수정으로
export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = (params.get('next') || '').startsWith('/write') ? params.get('next') : '/write'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 이미 로그인돼 있으면 바로 글쓰기로
  useEffect(() => {
    api.me().then((r) => r.ok && navigate(next, { replace: true }), () => {})
  }, [navigate, next])

  const submit = async (e) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.status === 401 ? '틀림' : '오류')
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="post-page">
      <LogoRow />
      <form className="login" onSubmit={submit}>
        <input
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="PASSWORD"
          aria-label="비밀번호"
          autoFocus
          autoComplete="current-password"
        />
        {error && (
          <div>
            <Ko>{error}</Ko>
          </div>
        )}
      </form>
    </div>
  )
}
