const VISIBLE_BEHIND = 4 // 뒤에 쌓여 보이는 장수
const PEEK = 16 // 뒤 커버가 아래로 보이는 간격(px)

export default function CoverStack({ albums, progress }) {
  return (
    <div className="stack">
      {albums.map((album, i) => {
        const d = i - progress // 0 = 맨 앞, 양수 = 뒤에 쌓임, 음수 = 지나감
        const y = d < 0 ? `${d * 110}vh` : `${Math.min(d, VISIBLE_BEHIND) * PEEK}px`

        return (
          <figure
            key={album.id}
            className="cover"
            style={{
              transform: `translateY(${y})`,
              visibility: d > VISIBLE_BEHIND ? 'hidden' : 'visible',
              zIndex: albums.length - i,
            }}
          >
            {album.cover && (
              <img src={album.cover} alt={`${album.artist} — ${album.title}`} draggable="false" />
            )}
          </figure>
        )
      })}
    </div>
  )
}
