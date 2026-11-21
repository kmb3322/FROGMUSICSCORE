const VISIBLE_BEHIND = 4 // 뒤에 쌓여 보이는 장수
const PEEK = 16 // 뒤 커버가 아래로 보이는 간격(px)

// 쌓인 커버. d = 이 커버가 맨 앞에서 몇 장 뒤에 있는지 (스크롤·드래그에 따라 연속으로 변함)
//  d < 0            : 지나간 커버 — 위로 빠져나감
//  0 ~ 4            : 쌓여 보이는 커버 — 아래로 16px씩
//  4 ~ 5            : 다음에 쌓일 커버 — 맨 아래에서 서서히 올라오며 나타남
//                     (드래그를 시작하는 순간부터 이미 자리에 있어서 뜬금없이 튀어나오지 않음)
//  5 이상           : 아직 안 보임 (이미지는 미리 받아 둠)
export default function CoverStack({ albums, progress }) {
  return (
    <div className="stack">
      {albums.map((album, i) => {
        const d = i - progress
        let y
        let opacity = 1
        if (d < 0) y = `${d * 110}vh`
        else if (d <= VISIBLE_BEHIND) y = `${d * PEEK}px`
        else {
          const t = Math.min(1, d - VISIBLE_BEHIND) // 0 → 1 (멀어질수록)
          y = `${(VISIBLE_BEHIND + t) * PEEK}px`
          opacity = 1 - t
        }

        return (
          <figure
            key={album.id}
            className="cover"
            style={{
              transform: `translateY(${y})`,
              opacity,
              visibility: d >= VISIBLE_BEHIND + 1 ? 'hidden' : 'visible',
              zIndex: albums.length - i,
            }}
          >
            {album.cover && (
              <img src={album.cover} alt={`${album.artist} — ${album.title}`} draggable="false" decoding="sync" />
            )}
          </figure>
        )
      })}
    </div>
  )
}
