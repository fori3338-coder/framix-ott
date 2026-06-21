-- 017_episode_focus_points.sql
-- Netflix급 Dynamic Reframe: 에피소드 구간별(시간대별) 피사체 중심 좌표
-- 기존 016_episode_focal_point.sql의 episodes.focal_x/focal_y(고정 1개 좌표)를
-- 대체하지 않고 보강한다. focus_points가 있으면 우선 사용, 없으면 기존 단일 focal_x/y로 폴백.

CREATE TABLE IF NOT EXISTS episode_focus_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  start_time NUMERIC(10,3) NOT NULL,
  end_time NUMERIC(10,3) NOT NULL,
  focal_x NUMERIC(5,2) NOT NULL DEFAULT 50,
  focal_y NUMERIC(5,2) NOT NULL DEFAULT 33,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT episode_focus_points_time_valid CHECK (end_time > start_time),
  CONSTRAINT episode_focus_points_x_range CHECK (focal_x >= 0 AND focal_x <= 100),
  CONSTRAINT episode_focus_points_y_range CHECK (focal_y >= 0 AND focal_y <= 100)
);

CREATE INDEX IF NOT EXISTS idx_episode_focus_points_episode_id
  ON episode_focus_points(episode_id);

CREATE INDEX IF NOT EXISTS idx_episode_focus_points_episode_start
  ON episode_focus_points(episode_id, start_time);

COMMENT ON TABLE episode_focus_points IS '에피소드 구간별(시간대별) 피사체 중심 좌표. Player가 video.currentTime 기준으로 조회하여 실시간 object-position에 반영';
COMMENT ON COLUMN episode_focus_points.start_time IS '구간 시작(초)';
COMMENT ON COLUMN episode_focus_points.end_time IS '구간 종료(초)';
COMMENT ON COLUMN episode_focus_points.focal_x IS '피사체 중심 X좌표(%)';
COMMENT ON COLUMN episode_focus_points.focal_y IS '피사체 중심 Y좌표(%)';

-- RLS: 공개 콘텐츠 메타데이터이므로 읽기는 전체 공개, 쓰기는 service role(관리자 업로드 파이프라인)만
ALTER TABLE episode_focus_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "episode_focus_points_select_all" ON episode_focus_points;
CREATE POLICY "episode_focus_points_select_all"
  ON episode_focus_points FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "episode_focus_points_write_service_role" ON episode_focus_points;
CREATE POLICY "episode_focus_points_write_service_role"
  ON episode_focus_points FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
