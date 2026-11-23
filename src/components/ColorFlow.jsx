// 스크롤 사이 배경 효과
// 커버 i → i+1 사이(t: 0 → 1)
//   t = 0, 1   : 원래 배경(#f0f0f0)
//   0 → 0.5    : 앞 커버의 색들이 디졸브 인
//   0.5 → 1    : 다음 커버의 색으로 바뀌고 다시 원래 배경으로 디졸브 아웃
// mode 'sync'  (천천히, 스크롤 지점과 동기화) : 시계방향 회전
// mode 'flick' (확 넘김)                    : 회전 없이 수직으로 흐름
// 커버 이미지 자체를 크게 흐려서 쓰기 때문에 여러 색이 섞인 커버도 그대로 반영된다.

import { useEffect, useRef, useState } from 'react'

// 지금 문서 스크롤 위치.
// 그릴 때(render) window.scrollY를 읽으면 브라우저가 그 자리에서 스타일 계산을 강제로 다시 함 →
// 앨범을 넘기는 동안(휠 이벤트마다 다시 그림) 매번 그 비용이 붙어 스크롤이 끊겼음.
// 그래서 스크롤 이벤트 안에서만 읽어 ref에 두고, 그릴 때는 ref 값만 씀.
// 다시 그리기는 배경이 보이는 동안(on)만
function useScrollY(on) {
  const y = useRef(0)
  const onRef = useRef(on)
  onRef.current = on
  const [, rerender] = useState(0)
  useEffect(() => {
    const read = () => {
      y.current = window.scrollY
      if (onRef.current) rerender((n) => n + 1)
    }
    y.current = window.scrollY
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])
  return y.current
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export default function ColorFlow({ albums, progress, mode }) {
  const i = Math.floor(progress)
  const t = progress - i
  const current = albums[i]
  const next = albums[i + 1]
  const visible = Boolean(current && next && t > 0.001)
  const scrollY = useScrollY(visible)
  if (!visible) return null

  const presence = Math.sin(Math.PI * t) // 끝과 끝은 0, 중간이 1
  const mix = smoothstep(0.3, 0.7, t) // 앞 → 다음 커버 색 전환

  let a, b
  if (mode === 'flick') {
    const y = (0.5 - t) * 100 // 아래로 넘기면 색이 위로 지나감
    a = `translate(-50%, calc(-50% + ${y}vh))`
    b = `translate(-50%, calc(-50% + ${y + 30}vh))`
  } else {
    const angle = t * 180 // 양수 = 시계방향
    a = `translate(-50%, -50%) rotate(${angle}deg)`
    b = `translate(-50%, -50%) rotate(${angle - 90}deg)`
  }

  return (
    // 화면 맨 위(지금 스크롤 위치)에 높이 0 묶음 → 그 안의 .flow를 화면보다 넉넉히 펼침 (App.css .flow-anchor)
    <div className="flow-anchor" style={{ top: scrollY }} aria-hidden="true">
      <div className="flow" style={{ opacity: presence }}>
        <div className="flow-layer" style={{ backgroundImage: `url("${current.cover}")`, transform: a }} />
        <div
          className="flow-layer"
          style={{ backgroundImage: `url("${next.cover}")`, transform: b, opacity: mix }}
        />
      </div>
    </div>
  )
}
