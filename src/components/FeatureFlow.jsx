import { useEffect, useRef } from 'react'

// 기획 게시물 스크롤 배경
// - 그라데이션의 진하기 = 스크롤 속도. 확 넘기면 바로 진해지고, 손을 떼고(관성) 느려질수록
//   점점 옅어져 원래 배경(#f0f0f0)으로. 확 멈추면 짧게 부드럽게 돌아옴
// - 어떤 그라데이션인지는 스크롤 위치로 정해짐: 화면 가운데에 걸린 사진과 그다음 사진의 색을
//   위치 비율로 섞고, 회전 각도도 스크롤 위치에 비례 (같은 위치 = 항상 같은 그라데이션)
// - 매 프레임 React를 다시 그리지 않도록 스타일을 직접 바꿈

const TURN = 0.12 // 스크롤 1px당 회전(도), 아래로 내리면 시계방향
const FULL = 2.2 // 이 속도(px/ms) 이상이면 최대 진하기 — 아이폰 휙 넘기기 정도
const STOP = 90 // 스크롤 이벤트가 이만큼(ms) 끊기면 멈춘 것으로
// 따라가는 빠르기 (60fps 한 프레임 기준 비율, 실제로는 시간 기준이라 120Hz 화면에서도 같은 속도)
const RISE = 0.35 // 진해질 때
const FALL = 0.16 // 옅어질 때 — 확 멈추면 약 0.3초 만에 원래 배경

export default function FeatureFlow({ watch }) {
  const root = useRef(null)
  const a = useRef(null)
  const b = useRef(null)

  useEffect(() => {
    let raf = 0
    let running = false
    let lastY = window.scrollY
    let lastT = performance.now()
    let lastEvent = 0
    let speed = 0 // 부드럽게 다듬은 스크롤 속도 (px/ms)
    let shown = 0 // 지금 진하기 (0~1)

    // 위치로 정해지는 색 · 회전
    const paint = () => {
      const imgs = [...document.querySelectorAll('.post-page .post-img')].filter((im) => im.currentSrc || im.src)
      if (!imgs.length || !root.current) return
      const mid = window.innerHeight / 2
      const centers = imgs.map((im) => {
        const r = im.getBoundingClientRect()
        return r.top + r.height / 2
      })
      // 화면 가운데 위(지나온)·아래(다가올) 사진
      let i = centers.findIndex((c) => c > mid)
      if (i === -1) i = imgs.length
      const before = Math.max(0, i - 1)
      const after = Math.min(imgs.length - 1, i)
      const mix = before === after ? 0 : Math.min(1, Math.max(0, (mid - centers[before]) / (centers[after] - centers[before])))
      const angle = window.scrollY * TURN
      const src = (im) => `url("${im.currentSrc || im.src}")`
      if (a.current.dataset.src !== src(imgs[before])) {
        a.current.style.backgroundImage = src(imgs[before])
        a.current.dataset.src = src(imgs[before])
      }
      if (b.current.dataset.src !== src(imgs[after])) {
        b.current.style.backgroundImage = src(imgs[after])
        b.current.dataset.src = src(imgs[after])
      }
      a.current.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`
      b.current.style.transform = `translate(-50%, -50%) rotate(${angle - 90}deg)`
      b.current.style.opacity = String(mix)
    }

    // 속도 → 진하기 (매 프레임, 지난 시간만큼)
    let lastTick = 0
    const tick = (now) => {
      const frames = lastTick ? Math.min(6, (now - lastTick) / 16.67) : 1
      lastTick = now
      const stopped = now - lastEvent > STOP
      if (stopped) speed = 0
      const target = Math.min(1, speed / FULL) ** 0.8
      const k = 1 - (1 - (target > shown ? RISE : FALL)) ** frames
      shown += (target - shown) * k
      if (shown < 0.004 && stopped) shown = 0
      if (root.current) root.current.style.opacity = shown.toFixed(3)
      running = shown > 0 || !stopped
      if (!running) lastTick = 0
      raf = running ? requestAnimationFrame(tick) : 0
    }

    const onScroll = () => {
      const now = performance.now()
      const dt = Math.max(8, now - lastT)
      const v = Math.abs(window.scrollY - lastY) / dt
      // 관성 스크롤의 감속을 따라가도록 최근 속도 위주로 다듬음
      speed = now - lastEvent > STOP ? v : speed * 0.6 + v * 0.4
      lastY = window.scrollY
      lastT = now
      lastEvent = now
      paint()
      if (!running) {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }

    // body 배경이 그라데이션 층을 덮지 않게 (맨 아래 html 바탕색은 그대로)
    const prevBg = document.body.style.background
    document.body.style.background = 'transparent'
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.body.style.background = prevBg
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [watch])

  return (
    <div className="flow-sticky is-feature" aria-hidden="true">
      <div className="flow feature-flow" ref={root}>
        <div className="flow-layer" ref={a} />
        <div className="flow-layer" ref={b} />
      </div>
    </div>
  )
}
