import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useData } from '../data/store'
import { seasonLabel } from '../data/seasons'
import LogoRow from '../components/LogoRow'
import SideColumn, { asLines } from '../components/PostImages'
import ReviewActions, { ShareCards } from '../components/ReviewActions'
import { makeFeatureCards } from '../share/featureCards'
import Ko from '../Ko'
import './Post.css'

// 기획 게시물: 좌측에 글이 쭉, 우측 칸에는 글·사진이 따로 쌓여 스크롤하면 나란히 지나감
export default function Feature() {
  const { id } = useParams()
  const data = useData()
  const post = data.features.find((f) => f.id === id)
  const [cards, setCards] = useState(null) // Share → 사진: 만든 카드들
  if (!post) return data.loaded ? <Navigate to="/" replace /> : null

  return (
    <div className="post-page">
      {cards && <ShareCards blobs={cards} name={`frogmusicscore-${post.id}`} onClose={() => setCards(null)} />}
      <LogoRow />

      <article>
        <header className="post-info">
          <div><Ko>{post.title}</Ko></div>
          {post.writer && <div><Ko>{post.writer}</Ko></div>}
        </header>

        <div className="post-main">
          <div className="post-body">
            <Ko>{asLines(post.body)}</Ko>
          </div>
          <SideColumn blocks={post.side || []} />
        </div>

        <p className="post-meta">
          <span>{seasonLabel(post.season)}</span>
          <span>{post.date}</span>
        </p>
        <ReviewActions
          id={post.id}
          url={`${window.location.origin}${import.meta.env.BASE_URL}post/${post.id}`}
          shareTitle={post.title}
          makeImages={() => makeFeatureCards(post, `${seasonLabel(post.season)}   ${post.date}`)}
          onCards={setCards}
        />
      </article>
    </div>
  )
}
