import { useEffect, useRef } from 'react'

// 기획 게시물 스크롤 배경
// - 스크롤하는 동안만 사진 색 그라데이션이 번지고, 멈추면 다시 원래 배경(#f0f0f0)으로
// - 어떤 그라데이션인지는 스크롤 위치로 정해짐: 화면 가운데에 걸린 사진과 그다음 사진의 색을
//   위치 비율로 섞고, 회전 각도도 스크롤 위치에 비례 (같은 위치 = 항상 같은 그라데이션)
// - 매 프레임 React를 다시 그리지 않도록 스타일을 직접 바꿈

const IDLE = 220 // 이만큼 스크롤이 멈추면 원래 배경으로
const TURN = 0.12 // 스크롤 1px당 회전(도), 아래로 내리면 시계방향

export default function FeatureFlow({ watch }) {
  const root = useRef(null)
  const a = useRef(null)
  const b = useRef(null)

  useEffect(() => {
    let raf = 0
    let idle = 0

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

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(paint)
      root.current?.classList.add('is-on')
      clearTimeout(idle)
      idle = setTimeout(() => root.current?.classList.remove('is-on'), IDLE)
    }

    // body 배경이 그라데이션 층을 덮지 않게 (맨 아래 html 바탕색은 그대로)
    const prevBg = document.body.style.background
    document.body.style.background = 'transparent'
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.body.style.background = prevBg
      cancelAnimationFrame(raf)
      clearTimeout(idle)
      window.removeEventListener('scroll', onScroll)
    }
  }, [watch])

  return (
    <div className="flow feature-flow" ref={root} aria-hidden="true">
      <div className="flow-layer" ref={a} />
      <div className="flow-layer" ref={b} />
    </div>
  )
}
