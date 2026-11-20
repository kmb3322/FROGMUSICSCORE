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

// 업로드 전에 브라우저에서 줄이기: 긴 변 1600px, WebP
export async function shrinkImage(file, max = 1600) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86))
  return { blob: blob || file, w, h }
}
