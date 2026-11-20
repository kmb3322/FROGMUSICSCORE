// FROG MUSIC SCORE — Cloudflare Worker
// /api/* 만 여기서 처리하고, 나머지는 정적 파일(dist)로 넘긴다.
//
// 저장소
//   D1 (DB)    : 글 — posts 테이블 (migrations/0001_init.sql)
//                강한 일관성: 올린 직후 새로고침해도 바로 보임, 동시에 올려도 서로 안 덮어씀
//   R2 (MEDIA) : 이미지 — media/<uuid>
//                큰 파일용 저장소, 내보내기(egress) 비용 없음. 응답은 엣지 캐시
//   D1 drafts  : 임시저장 (migrations/0002_drafts.sql)
//   D1 likes   : 좋아요 수 + 하루 제한용 기록 (migrations/0003_likes.sql)
//   D1 deleted_posts : 삭제한 글 id — 기본 데이터 글도 숨김 (migrations/0004_deleted.sql)
// 비밀번호: 시크릿 ADMIN_PASSWORD  (로컬은 .dev.vars)

const WEEK = 60 * 60 * 24 * 7
const MAX_IMAGE = 5 * 1024 * 1024 // 사진 한 장 5MB (브라우저에서 미리 압축해서 올림)
const MAX_DRAFT = 512 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SEASON = /^\d{2}(SS|FW)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    // 모든 주소: http로 들어오면 같은 주소의 https로 (로컬 개발 제외)
    if (url.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
      return new Response(null, {
        status: 301,
        headers: { location: `https://${url.host}${url.pathname}${url.search}`, 'cache-control': 'public, max-age=86400' },
      })
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    try {
      return await api(req, env, ctx, url)
    } catch (err) {
      console.error(err)
      return json({ error: 'server_error' }, 500)
    }
  },
}

async function api(req, env, ctx, url) {
  const path = url.pathname.slice('/api'.length)
  const method = req.method

  if (path === '/posts' && method === 'GET') {
    const [posts, deleted] = await env.DB.batch([
      env.DB.prepare('SELECT data FROM posts ORDER BY created_at'),
      env.DB.prepare('SELECT id FROM deleted_posts'),
    ])
    return json({ posts: posts.results.map((r) => JSON.parse(r.data)), deleted: deleted.results.map((r) => r.id) })
  }

  if (path.startsWith('/media/') && method === 'GET') {
    return getMedia(req, env, ctx, path.slice('/media/'.length))
  }

  // ── 좋아요 (로그인 없이 누구나, 한 사람은 리뷰마다 하루 한 번) ──
  const like = path.match(/^\/likes\/([a-z0-9][a-z0-9-]{0,80})$/)
  if (like && (method === 'GET' || method === 'POST')) {
    const albumId = like[1]
    const day = kstDay()
    const who = await likerId(req, env)
    const ipHash = who.hash
    let limited = false
    if (method === 'POST') {
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO like_log (album_id, ip_hash, day) VALUES (?, ?, ?)')
        .bind(albumId, ipHash, day)
        .run()
      if (ins.meta.changes > 0) {
        await env.DB.prepare(
          'INSERT INTO likes (album_id, count) VALUES (?, 1) ON CONFLICT(album_id) DO UPDATE SET count = count + 1',
        )
          .bind(albumId)
          .run()
        // 가끔 지난 기록 정리 (하루 제한만 확인하면 되므로 이틀 전 것부터 삭제)
        if (Math.random() < 0.05) ctx.waitUntil(env.DB.prepare('DELETE FROM like_log WHERE day < ?').bind(kstDay(-2)).run())
      } else limited = true
    }
    const [countRow, mine] = await env.DB.batch([
      env.DB.prepare('SELECT count FROM likes WHERE album_id = ?').bind(albumId),
      env.DB.prepare('SELECT 1 AS hit FROM like_log WHERE album_id = ? AND ip_hash = ? AND day = ?').bind(albumId, ipHash, day),
    ])
    return json(
      { count: countRow.results[0]?.count || 0, liked: mine.results.length > 0, limited },
      200,
      who.setCookie ? { 'set-cookie': who.setCookie } : {},
    )
  }

  if (path === '/login' && method === 'POST') {
    if (!env.ADMIN_PASSWORD) return json({ error: 'not_configured' }, 500)
    const { password } = await req.json().catch(() => ({}))
    if (typeof password !== 'string' || !(await safeEqual(password, env.ADMIN_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 800)) // 대입 공격 늦추기
      return json({ error: 'wrong_password' }, 401)
    }
    const exp = Math.floor(Date.now() / 1000) + WEEK
    const token = `${exp}.${await sign(env, `fms:${exp}`)}`
    return json({ ok: true }, 200, {
      'set-cookie': `fms_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`,
    })
  }

  if (path === '/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': 'fms_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' })
  }

  if (path === '/me' && method === 'GET') {
    return json({ ok: await authed(req, env) })
  }

  // ── 이하 로그인 필요 ──
  if (!(await authed(req, env))) return json({ error: 'unauthorized' }, 401)

  if (path === '/media' && method === 'POST') {
    const type = (req.headers.get('content-type') || '').split(';')[0]
    if (!/^image\/(webp|jpeg|png|gif)$/.test(type)) return json({ error: 'bad_type' }, 400)
    const size = Number(req.headers.get('content-length') || 0)
    if (size > MAX_IMAGE) return json({ error: 'too_large' }, 413)
    const body = await req.arrayBuffer()
    if (!body.byteLength || body.byteLength > MAX_IMAGE) return json({ error: 'bad_size' }, 400)
    const id = crypto.randomUUID()
    await env.MEDIA.put(`media/${id}`, body, { httpMetadata: { contentType: type } })
    return json({ id })
  }

  if (path === '/posts' && method === 'POST') {
    const post = validate(await req.json().catch(() => null))
    if (!post) return json({ error: 'bad_post' }, 400)
    await env.DB.prepare('INSERT INTO posts (id, kind, season, created_at, data) VALUES (?, ?, ?, ?, ?)')
      .bind(post.id, post.kind, post.season, Date.now(), JSON.stringify(post))
      .run()
    return json({ post })
  }

  // 글 수정(로그인 + 비밀번호 한 번 더): 같은 id로 덮어씀. 기본 데이터(albums.js) 글도 이 id로 저장하면 화면에서 대체됨
  const edit = path.match(/^\/posts\/([a-z0-9][a-z0-9-]{0,80})$/)
  if (edit && method === 'PUT') {
    const body = await req.json().catch(() => null)
    // 수정도 비밀번호 한 번 더
    if (typeof body?.password !== 'string' || !(await safeEqual(body.password, env.ADMIN_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 800))
      return json({ error: 'wrong_password' }, 401)
    }
    const prev = await env.DB.prepare('SELECT data FROM posts WHERE id = ?').bind(edit[1]).first()
    const date = prev ? JSON.parse(prev.data).date : /^\d{4}\.\d{2}\.\d{2}$/.test(body?.date || '') ? body.date : undefined
    const post = validate(body, { id: edit[1], date })
    if (!post) return json({ error: 'bad_post' }, 400)
    await env.DB.prepare(
      'INSERT INTO posts (id, kind, season, created_at, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, season = excluded.season, data = excluded.data',
    )
      .bind(post.id, post.kind, post.season, Date.now(), JSON.stringify(post))
      .run()
    // 사진을 바꿨으면 예전 사진은 R2에서 지움
    if (prev) ctx.waitUntil(removeMedia(env, mediaOf(JSON.parse(prev.data)).filter((m) => !mediaOf(post).includes(m)), url.origin))
    return json({ post })
  }

  // 글 삭제: 로그인 + 비밀번호 한 번 더
  const del = path.match(/^\/posts\/([a-z0-9][a-z0-9-]{0,80})\/delete$/)
  if (del && method === 'POST') {
    const { password } = await req.json().catch(() => ({}))
    if (typeof password !== 'string' || !(await safeEqual(password, env.ADMIN_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 800))
      return json({ error: 'wrong_password' }, 401)
    }
    const prev = await env.DB.prepare('SELECT data FROM posts WHERE id = ?').bind(del[1]).first()
    await env.DB.batch([
      env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(del[1]),
      // 기본 데이터 글(albums.js)도 숨겨지도록 id를 남김
      env.DB.prepare('INSERT OR REPLACE INTO deleted_posts (id, deleted_at) VALUES (?, ?)').bind(del[1], Date.now()),
    ])
    if (prev) ctx.waitUntil(removeMedia(env, mediaOf(JSON.parse(prev.data)), url.origin))
    return json({ ok: true })
  }

  // ── 임시저장 ──
  if (path === '/drafts' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT id, updated_at, data FROM drafts ORDER BY updated_at DESC').all()
    return json({ drafts: results.map((r) => ({ id: r.id, updatedAt: r.updated_at, ...JSON.parse(r.data) })) })
  }
  const draft = path.match(/^\/drafts\/([0-9a-f-]{36})$/)
  if (draft && !UUID.test(draft[1])) return json({ error: 'not_found' }, 404)
  if (draft && method === 'PUT') {
    const text = await req.text()
    if (text.length > MAX_DRAFT) return json({ error: 'too_large' }, 413)
    const parsed = JSON.parse(text || 'null')
    if (!parsed || typeof parsed !== 'object') return json({ error: 'bad_draft' }, 400)
    const now = Date.now()
    await env.DB.prepare(
      'INSERT INTO drafts (id, updated_at, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data',
    )
      .bind(draft[1], now, JSON.stringify(parsed))
      .run()
    return json({ id: draft[1], updatedAt: now })
  }
  if (draft && method === 'DELETE') {
    await env.DB.prepare('DELETE FROM drafts WHERE id = ?').bind(draft[1]).run()
    return json({ ok: true })
  }

  return json({ error: 'not_found' }, 404)
}

// 글이 쓰는 R2 사진 id 목록 (커버 · 기획 우측 칸)
const mediaOf = (p) =>
  [p.cover, ...(p.side || []).filter((b) => b.type === 'image').map((b) => b.media)].filter((m) => UUID.test(m || ''))
// R2에서 지우고, 엣지 캐시에 남은 사본도 지움 (지운 사진이 계속 보이지 않게)
async function removeMedia(env, ids, origin) {
  if (!ids.length) return
  await env.MEDIA.delete(ids.map((id) => `media/${id}`))
  await Promise.all(ids.map((id) => caches.default.delete(new Request(`${origin}/api/media/${id}`))))
}

// 이미지: R2에서 꺼내 엣지 캐시에 1년 (파일은 바뀌지 않음 — 새로 올리면 새 id)
async function getMedia(req, env, ctx, id) {
  if (!UUID.test(id)) return json({ error: 'not_found' }, 404)
  const cache = caches.default
  const hit = await cache.match(req)
  if (hit) return hit
  const obj = await env.MEDIA.get(`media/${id}`)
  if (!obj) return json({ error: 'not_found' }, 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  const res = new Response(obj.body, { headers })
  ctx.waitUntil(cache.put(req, res.clone()))
  return res
}

// ── 글 검증 ──
const str = (v, max, required = false) => {
  if (typeof v !== 'string') return required ? null : ''
  const s = v.replace(/\r\n?/g, '\n').slice(0, max)
  return required && !s.trim() ? null : s
}
const line = (v, max, required) => {
  const s = str(v, max, required)
  return s === null ? null : s.trim()
}

// keep: 수정할 때 유지할 id·평론 날짜
function validate(p, keep = {}) {
  if (!p || typeof p !== 'object' || !SEASON.test(p.season || '')) return null
  const now = new Date(Date.now() + 9 * 3600e3) // 한국 시간
  const date =
    keep.date || `${now.getUTCFullYear()}.${String(now.getUTCMonth() + 1).padStart(2, '0')}.${String(now.getUTCDate()).padStart(2, '0')}`
  const id = keep.id || `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 6)}`
  const writer = line(p.writer, 100)
  const body = str(p.body, 50000)

  if (p.kind === 'review') {
    const artist = line(p.artist, 200, true)
    const title = line(p.title, 200, true)
    const score = Number(p.score)
    // 커버: 올린 이미지(R2 id) 또는 사이트에 들어 있는 기본 커버 경로(covers/...)
    const cover = UUID.test(p.cover || '') ? p.cover : ''
    const coverPath = /^covers\/[\w.-]+$/.test(p.coverPath || '') ? p.coverPath : ''
    if (!artist || !title || (!cover && !coverPath)) return null
    if (!Number.isFinite(score) || score < 0 || score > 10) return null
    // 카테고리: 이름 그대로 (예전 데이터의 region: kr/us 도 받아 줌)
    const category = line(p.category, 30) || { kr: '한국 힙합', us: '해외 힙합' }[p.region] || ''
    if (!category) return null
    return {
      kind: 'review',
      id,
      season: p.season,
      category,
      artist,
      title,
      writer,
      score: Math.round(score * 10) / 10,
      released: DATE.test(p.released || '') ? p.released : '',
      keywords: Array.isArray(p.keywords) ? p.keywords.map((k) => line(k, 50)).filter(Boolean).slice(0, 30) : [],
      cover,
      coverPath,
      body,
      date,
    }
  }

  if (p.kind === 'feature') {
    const title = line(p.title, 300, true)
    if (!title) return null
    // 우측 칸: 글(엔터 포함)과 사진이 위에서부터 차례로 쌓이는 독립된 흐름
    const side = (Array.isArray(p.side) ? p.side : []).slice(0, 200).flatMap((b) => {
      if (b?.type === 'text') return [{ type: 'text', text: str(b.text, 10000) }]
      // 사진: 올린 이미지(R2 id) 또는 사이트에 들어 있는 기본 이미지 경로(covers/...)
      const media = UUID.test(b?.media || '') ? b.media : ''
      const path = /^covers\/[\w.-]+$/.test(b?.path || '') ? b.path : ''
      if (b?.type === 'image' && (media || path))
        return [
          {
            type: 'image',
            media,
            path,
            w: Math.max(1, Math.round(Number(b.w) || 1)),
            h: Math.max(1, Math.round(Number(b.h) || 1)),
            // 이 사진에 해당하는 본문 글 영역의 시작 위치 (지정 안 하면 없음 → 자동 배치)
            ...(Number.isInteger(b.anchor) && b.anchor >= 0 ? { anchor: Math.min(b.anchor, body.length) } : {}),
          },
        ]
      return []
    })
    return { kind: 'feature', id, season: p.season, title, writer, body, side, date }
  }

  return null
}

// ── 좋아요 보조 ──
// 한국 시간 기준 날짜 (offsetDays: -2 → 이틀 전)
const kstDay = (offsetDays = 0) => new Date(Date.now() + 9 * 3600e3 + offsetDays * 86400e3).toISOString().slice(0, 10)
// IP는 그대로 저장하지 않고 비밀 값과 섞은 해시로
async function hashIp(env, ip) {
  const key = await crypto.subtle.importKey('raw', enc.encode(`likes:${env.ADMIN_PASSWORD || 'fms'}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(ip)))
}

// 여러 사람이 같은 IPv4를 나눠 쓰는 통신사망(모바일 CGNAT 등)은 IP로 막지 않음.
// Cloudflare가 붙여 주는 망 번호(ASN)로 판별. 목록은 wrangler.jsonc 의 LIKE_SHARED_ASNS 에서 조정.
const DEFAULT_SHARED_ASNS = '9644,4766,17858,17853,9318,3786' // SKT, KT, LG U+(유선·무선), SK브로드밴드, LG데이콤
const sharedAsns = (env) => new Set(String(env.LIKE_SHARED_ASNS || DEFAULT_SHARED_ASNS).split(',').map((n) => Number(n.trim())))

// 좋아요 누른 사람 판별 키
//  - 공유 IPv4(통신사망): 브라우저마다 발급하는 쿠키 id
//  - IPv6: 기기마다 다른 /64 대역 (임시 주소가 바뀌어도 같은 사람)
//  - 그 외 IPv4: IP
async function likerId(req, env) {
  const ip = req.headers.get('cf-connecting-ip') || 'local'
  if (ip.includes(':')) return { hash: await hashIp(env, `v6:${ip.split(':').slice(0, 4).join(':')}`) }
  if (!sharedAsns(env).has(Number(req.cf?.asn))) return { hash: await hashIp(env, `v4:${ip}`) }
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)fms_lid=([0-9a-f-]{36})/)
  const lid = m && UUID.test(m[1]) ? m[1] : crypto.randomUUID()
  return {
    hash: await hashIp(env, `c:${lid}`),
    setCookie: m ? null : `fms_lid=${lid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 400}`,
  }
}

// ── 인증 ──
const enc = new TextEncoder()
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function sign(env, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.ADMIN_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)))
}

async function safeEqual(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))])
  return crypto.subtle.timingSafeEqual(x, y)
}

async function authed(req, env) {
  if (!env.ADMIN_PASSWORD) return false
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|;\s*)fms_auth=(\d+)\.([\w-]+)/)
  if (!m || Number(m[1]) < Date.now() / 1000) return false
  return safeEqual(m[2], await sign(env, `fms:${m[1]}`))
}
