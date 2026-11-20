-- 임시저장 (글쓰기 화면 상태 그대로). 사진은 R2에 올린 뒤 id만 저장
CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  updated_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS drafts_updated ON drafts (updated_at);
