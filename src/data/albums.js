// 앨범 리뷰 데이터
// - 커버 이미지는 public/covers/ 에 넣고 파일명만 적기 (800px WebP 권장 — 가볍게)
// - released(발매일)로 시즌이 자동으로 정해짐: 1~6월 = S/S, 7~12월 = F/W
// - region: 'kr' 한국 힙합 / 'us' 미국 힙합
// - keywords: 앨범 검색에 같이 걸리는 단어
// - date: 평론 날짜, review: 문단은 빈 줄(\n\n)로 구분
// ※ 지금 점수·리뷰는 레이아웃 확인용 예시입니다.
const cover = (file) => `${import.meta.env.BASE_URL}covers/${file}`

const SAMPLE =
  '첫 트랙부터 이 앨범은 서두르지 않는다. 드럼은 한 발 물러서 있고, 베이스가 공간의 바닥을 단단하게 다진다. 그 위로 얹힌 목소리는 크게 외치지 않지만 끝까지 귀에 남는다.\n\n중반부의 몇 곡은 다소 비슷한 결로 흘러가며 긴장이 느슨해지기도 한다. 그러나 마지막 두 곡에서 앨범은 다시 처음의 질문으로 돌아와, 이 모든 소리가 왜 이 순서로 놓였는지를 설득력 있게 증명한다.'

const a = (id, region, artist, title, released, score, file, keywords = []) => ({
  id,
  region,
  artist,
  title,
  released,
  date: released.replaceAll('-', '.'),
  writer: 'FROG',
  score,
  cover: cover(file),
  keywords,
  review: SAMPLE,
})

export const albums = [
  // 2026 F/W
  a('kidmilli-sins', 'kr', 'Kid Milli & TRADE L', 'SINS', '2026-10-05', 8.1, 'kidmilli-sins.webp', ['콜라보']),
  a('ph1-pink-tape', 'kr', 'pH-1, lIlBOI, BIG Naughty & Woodie Gochild', 'PINK TAPE', '2026-09-15', 7.2, 'ph1-pink-tape.webp', ['콜라보', 'EP']),
  a('nafla-instinct', 'kr', 'nafla', 'instinct', '2026-08-26', 7.8, 'nafla-instinct.webp'),
  a('bignaughty-hopeful-romantic', 'kr', 'BIG Naughty', 'Hopeful Romantic', '2026-07-29', 7.0, 'bignaughty-hopeful-romantic.webp'),
  a('coogie-hbk', 'kr', 'Coogie', 'HBK', '2026-07-20', 7.5, 'coogie-hbk.webp'),
  a('bigxthaplug-better-over-time', 'us', 'BigXthaPlug', 'BETTER OVER TIME', '2026-10-30', 8.0, 'bigxthaplug-better-over-time.webp'),
  a('quavo-qromelife', 'us', 'Quavo', 'QRÖMELIFE', '2026-10-01', 7.3, 'quavo-qromelife.webp'),
  a('rodwave-dont-look-down', 'us', 'Rod Wave', "Don't Look Down", '2026-08-27', 7.4, 'rodwave-dont-look-down.webp'),
  a('future-the-real-me', 'us', 'Future', 'The Real Me', '2026-07-10', 6.8, 'future-the-real-me.webp'),

  // 2026 S/S
  a('bewhy-pop-is-cryin', 'kr', 'BewhY', "POP IS CRYIN'", '2026-05-29', 7.9, 'bewhy-pop-is-cryin.webp'),
  a('jaypark-4shoboiz-2', 'kr', 'Jay Park & LNGSHOT', '4SHOBOIZ Vol. 2: 4SHOVILLE', '2026-05-18', 6.9, 'jaypark-4shoboiz-2.webp', ['콜라보']),
  a('kidmilli-mainstream', 'kr', 'Kid Milli & OKASHII', 'MAINSTREAM', '2026-05-08', 7.6, 'kidmilli-mainstream.webp', ['콜라보']),
  a('sikk-6seoul', 'kr', 'Sik-K', '6SEOUL', '2026-02-25', 7.7, 'sikk-6seoul.webp'),
  a('drake-iceman', 'us', 'Drake', 'ICEMAN', '2026-05-15', 8.4, 'drake-iceman.webp'),
  a('drake-habibti', 'us', 'Drake', 'HABIBTI', '2026-05-15', 7.1, 'drake-habibti.webp'),
  a('drake-maid-of-honour', 'us', 'Drake', 'MAID OF HONOUR', '2026-05-15', 7.6, 'drake-maid-of-honour.webp'),
  a('jcole-the-fall-off', 'us', 'J. Cole', 'The Fall-Off', '2026-02-05', 9.0, 'jcole-the-fall-off.webp'),

  // 2025 F/W
  a('kc-kc3', 'kr', 'KC, Sik-K, HAON & JMIN', 'KC3', '2025-11-27', 7.0, 'kc-kc3.webp', ['콜라보']),
  a('justhis-lit', 'kr', '저스디스 (JUSTHIS)', 'LIT', '2025-11-20', 8.6, 'justhis-lit.webp'),
  a('dbopap-sorry-4-the-wait', 'kr', 'DBO Pap', 'SORRY 4 THE WAIT', '2025-10-11', 6.9, 'dbopap-sorry-4-the-wait.webp'),
  a('ph1-what-have-we-done', 'kr', 'pH-1', 'WHAT HAVE WE DONE', '2025-08-13', 7.8, 'ph1-what-have-we-done.webp'),
  a('loco-scraps', 'kr', 'Loco', 'SCRAPS', '2025-07-08', 7.2, 'loco-scraps.webp'),
  a('21savage-what-happened', 'us', '21 Savage', 'WHAT HAPPENED TO THE STREETS?', '2025-12-10', 7.5, '21savage-what-happened.webp'),
  a('tyler-dont-tap-the-glass', 'us', 'Tyler, The Creator', "DON'T TAP THE GLASS", '2025-07-21', 8.2, 'tyler-dont-tap-the-glass.webp'),
  a('clipse-let-god-sort-em-out', 'us', 'Clipse, Pusha T & Malice', 'Let God Sort Em Out', '2025-07-11', 9.1, 'clipse-let-god-sort-em-out.webp'),

  // 2025 S/S
  a('coogie-upset', 'kr', 'Coogie', 'UPSET', '2025-04-30', 7.3, 'coogie-upset.webp'),
  a('giriboy-tongue-tied', 'kr', 'GIRIBOY', 'I Tend to Get Tongue-tied', '2025-04-10', 7.4, 'giriboy-tongue-tied.webp'),
]

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
