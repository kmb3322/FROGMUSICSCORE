// Worker API 호출 (개발: vite proxy → wrangler dev / 배포: 같은 Worker)
const BASE = `${import.meta.env.BASE_URL}api`

export const mediaUrl = (id) => `${BASE}/media/${id}`

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'same-origin', ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
  return data
}

const post = (path, body) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  posts: () => call('/posts'),
  me: () => call('/me'),
  login: (password) => post('/login', { password }),
  logout: () => post('/logout', {}),
  createPost: (p) => post('/posts', p),
  updatePost: (id, p) =>
    call(`/posts/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }),
  likes: (albumId) => call(`/likes/${albumId}`),
  like: (albumId) => call(`/likes/${albumId}`, { method: 'POST' }),
  deletePost: (id, password) => post(`/posts/${id}/delete`, { password }),
  drafts: () => call('/drafts'),
  saveDraft: (id, draft) =>
    call(`/drafts/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) }),
  deleteDraft: (id) => call(`/drafts/${id}`, { method: 'DELETE' }),
  uploadImage: (blob) => call('/media', { method: 'POST', headers: { 'content-type': blob.type }, body: blob }),
}

// 사진 용량 제한 (서버도 같은 값으로 막음)
export const MAX_UPLOAD = 5 * 1024 * 1024

const encode = (canvas, type, quality) => new Promise((r) => canvas.toBlob(r, type, quality))

// 업로드 전에 브라우저에서 줄이기: 긴 변 1600px, WebP(안 되면 JPEG).
// 5MB가 넘으면 화질 → 크기 순으로 낮춰 가며 5MB 이하로 맞춤
export async function shrinkImage(file, max = 1600) {
  const bitmap = await createImageBitmap(file) // 못 여는 형식이면 여기서 오류
  let side = max
  let quality = 0.86
  let type = 'image/webp'
  try {
    for (let i = 0; i < 10; i++) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height))
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
      let blob = await encode(canvas, type, quality)
      // WebP로 못 만드는 브라우저(일부 Safari)는 PNG가 나옴 → JPEG로
      if (blob && blob.type !== type) {
        type = 'image/jpeg'
        blob = await encode(canvas, type, quality)
      }
      if (blob && blob.size <= MAX_UPLOAD) return { blob, w, h }
      if (quality > 0.6) quality -= 0.1
      else side = Math.round(side * 0.8)
    }
  } finally {
    bitmap.close?.()
  }
  throw new Error('too_large')
}
