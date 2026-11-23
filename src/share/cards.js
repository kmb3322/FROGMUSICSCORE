// 인스타 업로드용 3:4 카드 (1080×1440) 생성 — 브라우저 canvas에서 바로 그림
//  1장: 하단 1:1 구간에 앨범 커버 꽉 채움(아래로 갈수록 배경색으로 그라데이션)
//       + 상단: 아티스트(왼쪽) · 앨범명(가운데) / 평점(오른쪽 · 세로 가운데, 검정 글씨 · 초록 바탕)
//       + 하단 왼쪽 로고 (커버 색을 번진 보색으로 비춤)
//  2장~: 왼쪽 글 칸을 캡처한 듯한 화면(로고 없이). 글이 길면 잘라서 여러 장

import { SITE } from '../data/seasons'

export const W = 1080
export const H = 1440
export const PAD = 64
export const SIZE = 40 // 글자 크기 (사이트의 원사이즈를 카드 크기에 맞게 키움)
export const LINE = Math.round(SIZE * 1.15)
export const BG = '#f0f0f0'
export const FG = '#1a1a1a'
export const ACCENT = '#61bb46'
const FAMILY = '"HelveticaLocal", "AcuminMapped", "Pretendard Variable", Pretendard, sans-serif'
export const font = (px) => `700 ${px}px ${FAMILY}`
export const LOGO = ['FROG', 'MUSIC SCORE', 'KOREA']

export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

export function canvas() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.02 * SIZE}px` // 자간 줄인 느낌
  return [c, ctx]
}

export const toBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'))

// 공백 단위로 줄바꿈 (한글도 단어 단위 — keep-all), 너무 긴 단어는 글자 단위로
export function wrap(ctx, text, max) {
  const out = []
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue
      if (ctx.measureText(line + word).width <= max) {
        line += word
        continue
      }
      if (line.trim()) {
        out.push(line.trimEnd())
        line = ''
      }
      const w = word.trimStart()
      if (ctx.measureText(w).width <= max) {
        line = w
        continue
      }
      for (const ch of w) {
        // 한 단어가 한 줄보다 길 때만 글자 단위로
        if (ctx.measureText(line + ch).width > max && line) {
          out.push(line)
          line = ''
        }
        line += ch
      }
    }
    out.push(line.trimEnd())
  }
  return out
}

export function drawLogo(ctx, x, y, color = FG, px = SIZE) {
  ctx.fillStyle = color
  ctx.font = font(px)
  LOGO.forEach((t, i) => ctx.fillText(t, x, y + i * Math.round(px * 1.15)))
}

// 커버 → 흐린 보색 그라데이션을 채운 글씨 레이어 (카드 크기)
export function tintedText(img, lines, x, y, px, lh, top) {
  // 1) 커버를 아주 작게(48px) 줄인 색 지도 — 다시 크게 펼치면 부드럽게 번짐.
  //    커버와 1:1로 맞춰 그려서 글자마다 바로 그 아래 커버 자리의 색을 씀
  const n = 48
  const small = document.createElement('canvas')
  small.width = small.height = n
  const sc = small.getContext('2d', { willReadFrequently: true })
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  sc.imageSmoothingQuality = 'high'
  sc.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, n, n)
  // 2) 픽셀마다 보색(색상 180° 회전) · 채도 올림 · 밝기는 어둡게
  const data = sc.getImageData(0, 0, n, n)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const [h, sat, l] = rgbToHsl(d[i], d[i + 1], d[i + 2])
    const [r, g, b] = hslToRgb((h + 0.5) % 1, Math.min(1, sat * 1.4 + 0.1), 0.14 + (1 - l) * 0.28)
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
  sc.putImageData(data, 0, 0)
  // 3) 글씨 모양으로 오려 냄 — 색 지도는 커버 자리에 맞춰 크게 펼침
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const lc = layer.getContext('2d')
  lc.textBaseline = 'top'
  if ('letterSpacing' in lc) lc.letterSpacing = `${-0.02 * px}px`
  lc.font = font(px)
  lc.fillStyle = '#000'
  lines.forEach((t, i) => lc.fillText(t, x, y + i * lh))
  lc.globalCompositeOperation = 'source-in'
  lc.imageSmoothingQuality = 'high'
  lc.drawImage(small, 0, top, W, W)
  return layer
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToRgb(h, s, l) {
  if (!s) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    t = (t + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}

async function coverCard({ album }) {
  const [c, ctx] = canvas()
  const top = H - W // 하단 1:1 구간 위쪽 여백 (360px)

  // 하단 1:1 구간: 앨범 커버 꽉 채움
  const img = await loadImage(album.cover)
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, top, W, W)
  // 아래로 갈수록 배경색(#f0f0f0)으로 녹아드는 그라데이션
  const fade = ctx.createLinearGradient(0, top + W * 0.4, 0, H)
  fade.addColorStop(0, 'rgba(240, 240, 240, 0)')
  fade.addColorStop(1, BG)
  ctx.fillStyle = fade
  ctx.fillRect(0, top, W, W)

  const px = SIZE
  const lh = LINE
  const y = PAD // 상단 여백만 두고 위쪽에
  ctx.font = font(px)

  // 상단: 맨 위 줄 — 왼쪽 아티스트, 가로 가운데 앨범명 / 오른쪽 평점(검정 글씨 · 초록 바탕, 상단 영역 세로 가운데)
  const artist = album.artist // 원래 표기 그대로 (pH-1 등)
  const title = album.title
  const gap = px
  const titleW = Math.min(ctx.measureText(title).width, W - PAD * 2)
  const artistMax = Math.max(W * 0.2, W / 2 - titleW / 2 - gap - PAD) // 앨범명과 겹치지 않는 폭
  ctx.fillStyle = FG
  wrap(ctx, artist, artistMax).forEach((t, i) => ctx.fillText(t, PAD, y + i * lh))
  ctx.textAlign = 'center'
  ctx.fillText(title, W / 2, y, W - PAD * 2)
  ctx.textAlign = 'right'
  const score = album.score.toFixed(1)
  const sw = ctx.measureText(score).width
  ctx.fillStyle = ACCENT
  const sy = Math.round((top - lh) / 2) // 평점: 상단 영역의 세로 가운데
  ctx.fillRect(W - PAD - sw, sy, sw, lh)
  ctx.fillStyle = FG
  ctx.fillText(score, W - PAD, sy)
  ctx.textAlign = 'left'

  // 하단: 로고 (같은 가로 위치). 사이트에서 스크롤할 때처럼, 커버 색을 흐리게 번진 뒤
  // 그 자리 색의 보색으로 바꿔 글씨 안에 비춤 — 밝은 바탕 위에서도 읽히게 어둡게 눌러 줌
  ctx.drawImage(tintedText(img, LOGO, PAD, H - PAD - lh * 3, px, lh, top), 0, 0)
  return toBlob(c)
}

// 2장~: 왼쪽 글 칸
async function textCards({ album, seasonText }) {
  const [, measure] = canvas()
  measure.font = font(SIZE)
  const max = W - PAD * 2
  const lines = [
    album.artist,
    album.title,
    album.writer,
    album.score.toFixed(1),
    '',
    ...wrap(measure, album.review || '', max),
    '',
    ...seasonText.split('\n'), // 시즌 / 날짜
    '',
    '',
    '',
    SITE, // 세 줄 띄우고 사이트 주소
  ]

  const top = PAD
  const perPage = Math.floor((H - top - PAD - LINE * 2) / LINE) // 아래에 쪽 번호 자리

  const pages = []
  let i = 0
  while (i < lines.length) {
    while (pages.length && lines[i] === '') i++ // 새 장은 빈 줄로 시작하지 않게
    pages.push(lines.slice(i, i + perPage))
    i += perPage
  }

  const blobs = []
  for (const [n, page] of pages.entries()) {
    const [c, ctx] = canvas()
    ctx.font = font(SIZE)
    ctx.fillStyle = FG
    page.forEach((t, k) => ctx.fillText(t, PAD, top + k * LINE))
    if (pages.length > 1) {
      ctx.textAlign = 'right'
      ctx.fillText(`${n + 1}/${pages.length}`, W - PAD, H - PAD - LINE)
    }
    blobs.push(await toBlob(c))
  }
  return blobs
}

export async function makeCards(album, seasonText) {
  // 캔버스에 쓸 글꼴 미리 불러오기 (Pretendard는 필요한 글자 범위만)
  const sample = [album.artist, album.title, album.writer, album.review, seasonText, ...LOGO].join(' ')
  await Promise.all([document.fonts.load(font(SIZE), sample), document.fonts.load(font(250), '0123456789.')]).catch(() => {})
  const first = await coverCard({ album })
  const rest = await textCards({ album, seasonText })
  return [first, ...rest]
}

// 링크 썸네일(og:image)용: 1장만
export async function makeFirstCard(album) {
  const sample = [album.artist, album.title, album.score?.toFixed?.(1), ...LOGO].join(' ')
  await document.fonts.load(font(SIZE), sample).catch(() => {})
  return coverCard({ album })
}
