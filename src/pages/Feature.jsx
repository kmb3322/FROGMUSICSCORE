import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useData } from '../data/store'
import { byWriter, metaLines, SITE } from '../data/seasons'
import LogoRow from '../components/LogoRow'
import SideColumn, { alignedRows, asLines } from '../components/PostImages'
import ReviewActions, { ShareCards } from '../components/ReviewActions'
import FeatureFlow from '../components/FeatureFlow'
import { makeFeatureCards } from '../share/featureCards'
import { refreshOgIfAdmin } from '../share/og'
import Ko from '../Ko'
import './Post.css'

// 기획 게시물: 좌측에 글이 쭉, 우측 칸에는 글·사진이 따로 쌓여 스크롤하면 나란히 지나감
export default function Feature() {
  const { id } = useParams()
  const data = useData()
  const post = data.features.find((f) => f.id === id)
  const [cards, setCards] = useState(null) // Share → 사진: 만든 카드들
  if (!post) return data.loaded ? <Navigate to="/" replace /> : null

  const rows = alignedRows(post.body, post.side) || [{ text: post.body, blocks: post.side || [] }]
  const ending = (
    <>
      <p className="post-meta">
        {/* 시즌 / 작성일 (기획 글은 발매일 없음) */}
        {metaLines(post.season, { date: post.date }).map((t) => (
          <span key={t}><Ko>{t}</Ko></span>
        ))}
      </p>
      <ReviewActions
        id={post.id}
        url={`${window.location.origin}${import.meta.env.BASE_URL}post/${post.id}`}
        shareTitle={post.title}
        makeImages={() => makeFeatureCards(post, metaLines(post.season, { date: post.date }).join('\n'))}
        onCards={setCards}
        onShareLink={() => refreshOgIfAdmin('feature', post)}
      />
      <p className="post-site">{SITE}</p>
    </>
  )

  return (
    <div className="post-page feature-page">
      {/* 스크롤하는 동안만 사진 색 그라데이션 (멈추면 원래 배경) */}
      <FeatureFlow watch={post.id} />
      {cards && <ShareCards blobs={cards} name={`frogmusicscore-${post.id}`} onClose={() => setCards(null)} />}
      <LogoRow />

      <article>
        <header className="post-info">
          <div><Ko>{post.title}</Ko></div>
          {post.writer && <div><Ko>{byWriter(post.writer)}</Ko></div>}
        </header>

        {/* 사진마다 글 영역을 지정했으면 그 구간과 사진을 같은 높이에서 시작, 아니면 두 칸이 따로 흐름.
            글 끝(시즌·날짜 · Likes·Share · 주소)은 마지막 본문 바로 뒤 — 데스크톱은 왼쪽 글 칸 안, 모바일은 맨 아래 */}
        {rows.map((row, i) => (
          <div key={i} className="post-main">
            <div className="post-col">
              <div className="post-body">
                <Ko>{asLines(row.text)}</Ko>
              </div>
              {i === rows.length - 1 && <div className="post-end post-end-wide">{ending}</div>}
            </div>
            <SideColumn blocks={row.blocks} />
          </div>
        ))}
        <div className="post-end post-end-narrow">{ending}</div>
      </article>
    </div>
  )
}
