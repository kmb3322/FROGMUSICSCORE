-- 삭제한 글 id. 서버에 저장된 글은 지우고, 사이트에 기본으로 들어 있는 글(albums.js)은 여기 id로 숨김
CREATE TABLE IF NOT EXISTS deleted_posts (
  id TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);
