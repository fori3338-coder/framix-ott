-- 016_episode_focal_point.sql
-- 영상 인물/피사체 중심 좌표 (object-position 동적 계산용)
-- focal_x, focal_y: 0~100 퍼센트. 미설정 시 코드 기본값(상단 1/3) 사용.

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS focal_x NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS focal_y NUMERIC(5,2);

COMMENT ON COLUMN episodes.focal_x IS '영상 피사체 중심 X좌표(%). NULL이면 기본값(50%) 사용';
COMMENT ON COLUMN episodes.focal_y IS '영상 피사체 중심 Y좌표(%). NULL이면 기본값(33%, 인물 얼굴 위치 근사) 사용';
