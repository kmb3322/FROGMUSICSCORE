-- 리뷰 좋아요. 누구나 누를 수 있고, 같은 IP는 같은 리뷰에 하루(한국 시간) 한 번
CREATE TABLE IF NOT EXISTS likes (
  album_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
-- 누른 기록: IP는 원문 대신 해시만 저장. 지난 날짜 기록은 주기적으로 정리
CREATE TABLE IF NOT EXISTS like_log (
  album_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (album_id, ip_hash, day)
);
CREATE INDEX IF NOT EXISTS like_log_day ON like_log (day);
