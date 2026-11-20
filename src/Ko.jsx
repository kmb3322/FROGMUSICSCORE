// 한글 구간만 <span class="ko">로 감싸서 Pretendard 자간을 따로 줄인다.
// (CSS는 폰트별로 자간을 다르게 줄 수 없어서 글자 범위로 나눔)
const HANGUL = /([ᄀ-ᇿ㄰-㆏가-힣]+(?:[\s.,!?·'"“”‘’()\-~]*[ᄀ-ᇿ㄰-㆏가-힣]+)*)/

export default function Ko({ children }) {
  if (typeof children !== 'string') return children
  return children.split(HANGUL).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="ko">
        {part}
      </span>
    ) : (
      part
    ),
  )
}
