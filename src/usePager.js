import { useEffect, useRef, useState } from 'react'

// 앨범 커버 영역(areaRef)의 휠·트랙패드·터치 입력을 받아 앨범을 넘긴다.
//  - 천천히 스크롤: progress가 스크롤 양에 그대로 동기화 (mode 'sync')
//                  손을 떼면 가까운 쪽 앨범으로 부드럽게 맞춰짐
//  - 확 넘기기:     바로 다음/이전 앨범으로 넘어감 (mode 'flick')
//  - 어느 경우든 한 제스처에 최대 한 장
const SYNC_DISTANCE = 0.8 // 화면 높이의 이 비율만큼 스크롤하면 한 장
const FAST = 2.2 // px/ms, 이보다 빠르면 '확 넘기기'
const GESTURE_GAP = 160 // 휠 이벤트가 이만큼 끊기면 제스처 끝(트랙패드 관성 포함)
const SETTLE_AT = 0.25 // 손을 뗐을 때 이만큼 넘어갔으면 다음 장으로
const FLICK_MS = 650
const SETTLE_MS = 700
const TOUCH_FAST = 0.6 // px/ms

const ease = (t) => 1 - Math.pow(1 - t, 3)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export default function usePager(count, areaRef, initial = 0) {
  const [state, setState] = useState({ progress: initial, mode: 'sync', dir: 1 })

  const p = useRef(initial)
  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    let raf = 0
    let settleTimer = 0
    let flicking = false
    let base = 0 // 제스처 시작 시 앨범 번호
    let lastWheel = 0
    let gestureUsed = false
    let samples = []

    const set = (value, mode) => {
      const dir = Math.sign(value - p.current) || 1
      p.current = value
      setState({ progress: value, mode, dir })
    }

    const limit = (v) => clamp(clamp(v, base - 1, base + 1), 0, count - 1)

    const animateTo = (target, mode, ms) => {
      cancelAnimationFrame(raf)
      const from = p.current
      if (target === from) return
      const start = performance.now()
      if (mode === 'flick') flicking = true
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms)
        set(from + (target - from) * ease(t), mode)
        if (t < 1) raf = requestAnimationFrame(step)
        else flicking = false
      }
      raf = requestAnimationFrame(step)
    }

    const flick = (dir) => {
      clearTimeout(settleTimer)
      gestureUsed = true
      animateTo(limit(base + dir), 'flick', FLICK_MS)
    }

    const settle = () => {
      const moved = p.current - base
      const target = Math.abs(moved) >= SETTLE_AT ? limit(base + Math.sign(moved)) : base
      animateTo(target, 'sync', SETTLE_MS)
    }

    const onWheel = (e) => {
      e.preventDefault()
      const now = performance.now()
      const newGesture = now - lastWheel > GESTURE_GAP
      lastWheel = now
      if (flicking) return
      if (newGesture) {
        gestureUsed = false
        samples = []
        base = Math.round(p.current)
      }
      if (gestureUsed) return // 확 넘긴 뒤 이어지는 관성은 무시

      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      samples.push({ t: now, d })
      samples = samples.filter((s) => now - s.t < 60)
      const sum = samples.reduce((a, s) => a + Math.abs(s.d), 0)
      const speed = sum / Math.max(16, now - samples[0].t)

      if (speed > FAST) {
        flick(Math.sign(d))
        return
      }

      cancelAnimationFrame(raf)
      set(limit(p.current + d / (window.innerHeight * SYNC_DISTANCE)), 'sync')
      clearTimeout(settleTimer)
      settleTimer = setTimeout(settle, GESTURE_GAP)
    }

    let touch = null
    const onTouchStart = (e) => {
      if (flicking) return
      cancelAnimationFrame(raf)
      clearTimeout(settleTimer)
      base = Math.round(p.current)
      touch = { y: e.touches[0].clientY, t: performance.now(), p: p.current, lastY: e.touches[0].clientY, lastT: performance.now() }
    }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (!touch) return
      const y = e.touches[0].clientY
      set(limit(touch.p + (touch.y - y) / (window.innerHeight * SYNC_DISTANCE)), 'sync')
      touch.vy = (touch.lastY - y) / Math.max(1, performance.now() - touch.lastT)
      touch.lastY = y
      touch.lastT = performance.now()
    }
    const onTouchEnd = () => {
      if (!touch) return
      const v = touch.vy || 0
      touch = null
      if (Math.abs(v) > TOUCH_FAST) flick(Math.sign(v))
      else settle()
    }

    const onKey = (e) => {
      let dir = 0
      if (['ArrowDown', 'PageDown'].includes(e.key)) dir = 1
      else if (['ArrowUp', 'PageUp'].includes(e.key)) dir = -1
      else return
      e.preventDefault()
      if (flicking) return
      base = Math.round(p.current)
      flick(dir)
    }

    area.addEventListener('wheel', onWheel, { passive: false })
    area.addEventListener('touchstart', onTouchStart, { passive: true })
    area.addEventListener('touchmove', onTouchMove, { passive: false })
    area.addEventListener('touchend', onTouchEnd)
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settleTimer)
      area.removeEventListener('wheel', onWheel)
      area.removeEventListener('touchstart', onTouchStart)
      area.removeEventListener('touchmove', onTouchMove)
      area.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [count, areaRef])

  return state
}
