import Ko from '../Ko'

// 기획 게시물 우측 칸 (보기용)
// 글(엔터 포함)과 사진이 위에서부터 차례로 쌓이는 독립된 흐름. 왼쪽 본문과 따로 흐름.
// - 사진 가로폭은 고정(--img-w), 세로가 긴 사진은 1:1로 잘라서 표시

export const isTall = (im) => im.h > im.w
export const imageRatio = (im) => (isTall(im) ? '1 / 1' : `${im.w} / ${im.h}`)

// 글쓰기 칸(textarea)과 줄 수가 똑같이 보이도록: 끝의 엔터·빈 칸도 한 줄로 그려지게
export const asLines = (text) => `${text || ''}​`

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
