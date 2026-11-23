// 링크 공유 썸네일(og:image): 사진 공유 카드 1장을 링크 미리보기 표준 크기(1200×630)로.
// 카드(3:4)가 가로로 긴 썸네일에 다 안 들어가므로 위에서부터 보이게 자름 (아티스트·앨범·평점 → 커버 윗부분).
// 메신저가 가운데 기준으로 자르지 않도록 서버에 올리기 전에 미리 잘라 둠.
// 만들기: 글을 올리거나 수정할 때, 그리고 관리자로 로그인한 상태에서 Share → 링크를 누를 때 (예전 글 채우기)
import { api } from '../api'
import { makeFirstCard } from './cards'
import { makeFeatureFirstCard } from './featureCards'

export const OG_W = 1200
export const OG_H = 630

async function crop(card) {
  const img = await createImageBitmap(card)
  const c = document.createElement('canvas')
  c.width = OG_W
  c.height = OG_H
  const sh = Math.min(img.height, (img.width * OG_H) / OG_W) // 카드 폭 그대로, 위에서부터 이 높이만
  c.getContext('2d').drawImage(img, 0, 0, img.width, sh, 0, 0, OG_W, OG_H)
  img.close?.()
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))
}

// kind: 'review' (item = 앨범) | 'feature' (item = 기획 글). 실패해도 조용히
export async function publishOg(kind, item) {
  try {
    const card = kind === 'review' ? await makeFirstCard(item) : await makeFeatureFirstCard(item)
    await api.uploadOg(item.id, await crop(card))
  } catch {
    // 썸네일이 없으면 서버가 커버(또는 첫 사진)로 대신함
  }
}

// 관리자로 로그인돼 있을 때만 다시 만들어 올림
export const refreshOgIfAdmin = (kind, item) =>
  api.me().then(
    (r) => r.ok && publishOg(kind, item),
    () => {},
  )
