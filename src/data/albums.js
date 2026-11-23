// 기본 데이터 — 앨범 리뷰는 모두 글쓰기(서버)로 올림. 여기엔 예시 기획 게시물만 남김
// - 사진은 public/covers/ 에 넣고 파일명만 적기 (800px WebP 권장 — 가볍게)
const cover = (file) => `${import.meta.env.BASE_URL}covers/${file}`

// 예시 앨범 리뷰는 모두 지움 (기획 게시물은 남김)
export const albums = []

// 기획 게시물 (시즌별) — 예시
// side: 우측 칸. 글(엔터 포함)과 사진이 위에서부터 차례로 쌓임 — 엔터로 사진 위치를 내림
const text = (lines) => ({ type: 'text', text: '\n'.repeat(lines) })
const photo = (file) => ({ type: 'image', src: cover(file), w: 800, h: 800 })
const FEATURE_BODY =
  '한 시즌 동안 나온 앨범들을 다시 듣다 보면, 따로 떨어져 있던 소리들이 하나의 지도처럼 이어지는 순간이 있다. 누군가는 더 거칠어졌고, 누군가는 더 조용해졌다. 그 차이를 기록하는 것이 이 기획의 목적이다.\n\n첫 번째로 이야기할 것은 질감이다. 올해의 많은 앨범이 매끈한 마감 대신 거친 표면을 택했다. 녹음실의 잡음, 갈라진 목소리, 일부러 남겨 둔 실수들이 오히려 앨범의 얼굴이 되었다.\n\n두 번째는 협업이다. 이름 여러 개가 나란히 적힌 앨범이 유독 많았다. 혼자서는 닿지 못했을 곳까지 서로를 밀어 올린 경우도 있었고, 반대로 각자의 색이 섞이지 못하고 흩어진 경우도 있었다.\n\n마지막은 길이다. 짧고 단단한 EP와 길고 느슨한 정규 사이에서, 어느 쪽이 더 오래 남을지는 아직 모른다. 다만 다음 시즌에도 우리는 같은 자리에서 같은 질문을 던질 것이다.'

export const features = [
  {
    id: 'f-26fw-1',
    season: '26FW',
    title: '26 F/W 한국 힙합 결산',
    writer: 'FROG',
    date: '2026.11.20',
    body: FEATURE_BODY,
    side: [text(2), photo('kidmilli-sins.webp'), { type: 'text', text: 'Kid Milli & TRADE L — SINS\n\n\n\n' }, photo('nafla-instinct.webp'), { type: 'text', text: 'nafla — instinct' }],
  },
  { id: 'f-26fw-2', season: '26FW', title: '인터뷰', writer: 'FROG', date: '2026.10.12', body: FEATURE_BODY, side: [] },
  {
    id: 'f-26ss-1',
    season: '26SS',
    title: '26 S/S 결산',
    writer: 'FROG',
    date: '2026.06.30',
    body: FEATURE_BODY,
    side: [text(4), photo('drake-iceman.webp')],
  },
]
