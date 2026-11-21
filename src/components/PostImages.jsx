import Ko from '../Ko'

// 기획 게시물 우측 칸 (보기용)
// 글(엔터 포함)과 사진이 위에서부터 차례로 쌓이는 독립된 흐름. 왼쪽 본문과 따로 흐름.
// - 사진 가로폭은 고정(--img-w), 세로가 긴 사진은 1:1로 잘라서 표시

export const isTall = (im) => im.h > im.w
export const imageRatio = (im) => (isTall(im) ? '1 / 1' : `${im.w} / ${im.h}`)

// 글쓰기 칸(textarea)과 줄 수가 똑같이 보이도록: 끝의 엔터·빈 칸도 한 줄로 그려지게
export const asLines = (text) => `${text || ''}​`

// 사진에 글 영역을 지정했으면(anchor: 본문 글자 위치) 본문을 그 위치에서 끊어
// [본문 구간 | 그 사진부터의 우측 칸] 줄로 나눔 → 각 구간 첫 줄과 사진 윗변이 같은 높이에서 시작.
// 지정이 하나도 없으면 null (지금처럼 두 칸이 따로 흐름)
export const isAnchored = (b) => b.type === 'image' && Number.isInteger(b.anchor)
export function alignedRows(body = '', side = []) {
  if (!side.some(isAnchored)) return null
  const rows = [{ start: 0, blocks: [] }]
  let last = 0
  for (const b of side) {
    if (isAnchored(b)) {
      last = Math.min(Math.max(b.anchor, last), body.length) // 위에서 아래 순서 유지
      rows.push({ start: last, blocks: [b] })
    } else rows[rows.length - 1].blocks.push(b)
  }
  return rows
    .map((r, i) => ({
      text: body.slice(r.start, rows[i + 1]?.start ?? body.length), // 글쓰기에서 쓴 그대로 (빈 줄 포함)
      blocks: r.blocks,
    }))
    .filter((r) => r.text.trim() || r.blocks.length)
}

export default function SideColumn({ blocks }) {
  return (
    <div className="post-side">
      {blocks.map((b, i) =>
        b.type === 'image' ? (
          <img key={i} className="post-img" src={b.src} alt="" loading="lazy" decoding="async" style={{ aspectRatio: imageRatio(b) }} />
        ) : (
          <div key={i} className="post-side-text">
            <Ko>{asLines(b.text)}</Ko>
          </div>
        ),
      )}
    </div>
  )
}
