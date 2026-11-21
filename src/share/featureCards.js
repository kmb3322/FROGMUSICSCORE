// 기획 게시물 → 인스타용 3:4 카드 (1080×1440)
//  1장: 상단 제목·작성자, 하단 1:1 첫 사진(그라데이션) + 보색 로고 — 리뷰 카드와 같은 틀, 평점 없음
//  2장~: 사진 한 장을 카드 두 장이 나눠 가짐 (가로 1080px 사진이 두 카드의 경계에 걸침)
//        앞 카드: 왼쪽 2/3 글 · 오른쪽 1/3 사진 앞부분 / 뒤 카드: 왼쪽 2/3 사진 나머지 · 오른쪽 1/3 글
//  - 사진은 최대 10장. 글쓰기에서 사진마다 지정한 본문 영역을, 지정이 없으면 사이트 화면에서
//    그 사진 옆에 있던 본문 구간을 그 사진의 두 카드에 넣음
//  - 사진이 있는 카드의 글은 사진의 위아래 범위 안에서만 (시작·끝 모두)
//  - 글이 두 카드에 다 안 들어가면 그 뒤에 글만 있는 카드를 이어 붙임

import { SITE } from '../data/seasons'
import { BG, canvas, drawLogo, FG, font, H, LINE, loadImage, LOGO, PAD, SIZE, tintedText, toBlob, W } from './cards'

const MAX_PHOTOS = 10
const MAX_CARDS = 20 // 인스타 한 번에 최대 20장
const GAP = 40 // 글과 사진 사이

// 사이트 화면(가로 1440px 기준)의 크기 — 사진이 본문 몇 번째 줄 높이에 있었는지 계산용
const SCREEN = { size: 18, line: 18 * 1.15, body: 1440 / 3 - 48, side: Math.min(1440 * 0.42, 640) }

// 줄바꿈 결과를 원문 위치와 함께 (공백 단위, 너무 긴 단어는 글자 단위)
function layout(ctx, text, max) {
  const out = []
  let pos = 0
  for (const para of text.split('\n')) {
    if (!para.trim()) {
      out.push({ text: '', start: pos })
      pos += para.length + 1
      continue
    }
    let line = ''
    let start = pos
    const re = /\s*\S+/g
    let m
    while ((m = re.exec(para))) {
      const tok = m[0]
      const word = tok.trimStart()
      const wordStart = pos + m.index + (tok.length - word.length)
      if (line && ctx.measureText(line + tok).width <= max) {
        line += tok
        continue
      }
      if (line) out.push({ text: line, start })
      line = ''
      start = wordStart
      if (ctx.measureText(word).width <= max) {
        line = word
        continue
      }
      for (const ch of word) {
        if (line && ctx.measureText(line + ch).width > max) {
          out.push({ text: line, start })
          start += line.length
          line = ''
        }
        line += ch
      }
    }
    out.push({ text: line, start })
    pos += para.length + 1
  }
  return out
}

// 정해진 칸에 들어가는 만큼 줄을 떼어 내고 나머지 원문을 돌려줌
function take(ctx, text, max, cap) {
  const all = layout(ctx, text, max)
  let i = 0
  while (i < all.length && !all[i].text) i++ // 칸 첫 줄이 빈 줄이 되지 않게
  const lines = all.slice(i, i + cap)
  const next = all[i + cap]
  return { lines, rest: next ? text.slice(next.start) : '' }
}

const photoHeight = (im, width) => (im.h > im.w ? width : (width * im.h) / im.w)

// 각 사진이 사이트에서 본문 몇 번째 글자 높이 옆에 있었는지 (본문 원문 위치)
function anchors(post, photos) {
  const [, ctx] = canvas()
  ctx.font = font(SCREEN.size)
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${-0.02 * SCREEN.size}px`
  const body = layout(ctx, post.body || '', SCREEN.body)
  const out = new Map()
  let y = 0
  for (const b of post.side || []) {
    if (b.type === 'image') {
      if (photos.includes(b)) {
        if (Number.isInteger(b.anchor)) out.set(b, Math.min(b.anchor, (post.body || '').length)) // 글쓰기에서 지정한 영역
        else {
          const idx = Math.floor(y / SCREEN.line)
          out.set(b, idx < body.length ? body[idx].start : (post.body || '').length)
        }
      }
      y += photoHeight(b, SCREEN.side)
    } else {
      // 글쓰기 칸과 같게: 엔터 한 번 = 한 줄, 빈 칸도 한 줄
      const lines = (b.text || '').split('\n').reduce((n, p) => n + Math.max(1, layout(ctx, p, SCREEN.side).length), 0)
      y += lines * SCREEN.line
    }
  }
  return out
}

// 사진 그리기 (세로가 긴 사진은 가운데 1:1로 잘라서)
function drawPhoto(ctx, img, im, x, y, width) {
  const tall = im.h > im.w
  const sw = img.naturalWidth
  const sh = img.naturalHeight
  const s = Math.min(sw, sh)
  const [cx, cy, cw, ch] = tall ? [(sw - s) / 2, (sh - s) / 2, s, s] : [0, 0, sw, sh]
  ctx.drawImage(img, cx, cy, cw, ch, x, y, width, photoHeight(im, width))
}

function writeLines(ctx, lines, x, y = PAD) {
  ctx.fillStyle = FG
  ctx.font = font(SIZE)
  ctx.textAlign = 'left'
  lines.forEach((l, k) => ctx.fillText(l.text, x, y + k * LINE))
}

async function coverCard(post, photo) {
  const [c, ctx] = canvas()
  const top = H - W
  // 상단: 제목 · 작성자
  ctx.font = font(SIZE)
  const { lines } = take(ctx, post.title, W - PAD * 2, 4)
  if (post.writer) lines.push({ text: post.writer })
  writeLines(ctx, lines, PAD)

  if (!photo) {
    drawLogo(ctx, PAD, H - PAD - LINE * 3)
    return toBlob(c)
  }
  // 하단 1:1: 첫 사진 + 아래로 갈수록 배경색으로
  const img = await loadImage(photo.src)
  const s = Math.min(img.naturalWidth, img.naturalHeight)
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, top, W, W)
  const fade = ctx.createLinearGradient(0, top + W * 0.4, 0, H)
  fade.addColorStop(0, 'rgba(240, 240, 240, 0)')
  fade.addColorStop(1, BG)
  ctx.fillStyle = fade
  ctx.fillRect(0, top, W, W)
  ctx.drawImage(tintedText(img, LOGO, PAD, H - PAD - LINE * 3, SIZE, LINE, top), 0, 0)
  return toBlob(c)
}

// 글만 있는 카드들 (넘친 글)
async function textOnly(text) {
  const blobs = []
  const cap = Math.floor((H - PAD * 2) / LINE)
  let rest = text
  while (rest.trim() && blobs.length < MAX_CARDS) {
    const [c, ctx] = canvas()
    ctx.font = font(SIZE)
    const t = take(ctx, rest, W - PAD * 2, cap)
    writeLines(ctx, t.lines, PAD)
    rest = t.rest
    blobs.push(await toBlob(c))
  }
  return blobs
}

// 사진 한 장을 나눠 가지는 두 카드 + 넘친 글
async function pairCards(photo, text) {
  const img = await loadImage(photo.src)
  const ph = photoHeight(photo, W)
  const py = Math.round((H - ph) / 2)
  // 글은 사진의 위아래 범위 안에서만 시작하고 끝남 (넘치는 글은 다음 카드로)
  const cap = Math.floor(ph / LINE)
  const third = W / 3

  // 앞 카드: 왼쪽 2/3 글, 오른쪽 1/3에 사진 앞부분
  const [a, actx] = canvas()
  drawPhoto(actx, img, photo, third * 2, py, W)
  actx.font = font(SIZE)
  const ta = take(actx, text, third * 2 - PAD - GAP, cap)
  writeLines(actx, ta.lines, PAD, py)

  // 뒤 카드: 왼쪽 2/3에 사진 나머지, 오른쪽 1/3 글
  const [b, bctx] = canvas()
  drawPhoto(bctx, img, photo, -third, py, W)
  bctx.font = font(SIZE)
  const tb = take(bctx, ta.rest, W - PAD - (third * 2 + GAP), cap)
  writeLines(bctx, tb.lines, third * 2 + GAP, py)

  return [await toBlob(a), await toBlob(b), ...(await textOnly(tb.rest))]
}

export async function makeFeatureCards(post, seasonText) {
  const photos = (post.side || []).filter((b) => b.type === 'image').slice(0, MAX_PHOTOS)
  const body = post.body || ''
  const ending = `\n\n${seasonText}\n\n\n\n${SITE}` // 시즌 / 날짜, 세 줄 띄우고 사이트 주소
  const sample = [post.title, post.writer, body, seasonText, ...LOGO].join(' ')
  await document.fonts.load(font(SIZE), sample).catch(() => {})

  const cards = [await coverCard(post, photos[0])]
  const pairs = photos.slice(1)
  if (!pairs.length) {
    cards.push(...(await textOnly(body + ending)))
    return cards.slice(0, MAX_CARDS)
  }

  // 사진마다 그 옆에 있던(또는 지정한) 본문 구간.
  // 첫 사진 쌍: 글 영역을 지정했으면 그 위치부터 — 그 앞 글(표지 사진의 영역)은 표지 바로 뒤 글 카드로.
  //            지정 안 했으면 본문 처음부터 (자동 배치)
  const at = anchors(post, pairs)
  const firstStart = Number.isInteger(pairs[0].anchor) ? Math.min(pairs[0].anchor, body.length) : 0
  if (firstStart > 0 && body.slice(0, firstStart).trim()) cards.push(...(await textOnly(body.slice(0, firstStart))))
  let prev = firstStart
  const starts = pairs.map((p, i) => (prev = i === 0 ? firstStart : Math.max(prev, at.get(p) ?? prev)))
  for (const [i, photo] of pairs.entries()) {
    const end = i + 1 < pairs.length ? starts[i + 1] : body.length
    let text = body.slice(starts[i], end)
    if (i === pairs.length - 1) text += ending
    cards.push(...(await pairCards(photo, text)))
    if (cards.length >= MAX_CARDS) break
  }
  return cards.slice(0, MAX_CARDS)
}

