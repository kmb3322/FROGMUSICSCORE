-- 글 테이블 (리뷰·기획 공통). 글 내용은 data(JSON)에, 목록·정렬에 쓰는 값만 컬럼으로
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('review', 'feature')),
  season TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_created ON posts (created_at);
