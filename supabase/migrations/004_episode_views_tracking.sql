-- ============================================================
-- FRAMIX OTT — 조회수 자동 집계 마이그레이션
-- 파일명: 004_episode_views_tracking.sql
-- 작성일: 2026-06-18
-- 목적:
--   1) episode 재생 "시작" 시점에 조회 이벤트를 기록 (episode_views)
--   2) episodes.views / series.views 자동 증가
--   3) 동일 사용자(로그인 시 user, 비로그인 시 브라우저 anon id)가
--      일정 시간(기본 30분) 내에 같은 episode를 재시청해도 중복 집계하지 않음
--   4) 관리자 대시보드의 "월 누적 조회수"를 viewed_at 기준으로 실제 집계 가능하게 함
-- 주의:
--   - 기존 increment_series_views() 함수는 삭제하지 않고 그대로 둔다 (하위 호환).
--   - 기존 series / episodes 테이블 스키마는 변경하지 않는다 (컬럼 추가/삭제 없음).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. episode_views 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.episode_views (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id  uuid        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  series_id   uuid        NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  viewer_id   text        NOT NULL,   -- 'user:<uuid>' (로그인) 또는 'anon:<uuid>' (비로그인, localStorage 발급)
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.episode_views IS
  '에피소드 재생 시작 시 기록되는 조회 로그. 중복 방지 판정과 관리자 대시보드의 기간별(월별) 조회수 집계에 사용됨.';

-- 중복 방지 판정용 인덱스: 같은 episode + 같은 viewer를 최근 시각 순으로 조회
CREATE INDEX IF NOT EXISTS idx_episode_views_dedupe
  ON public.episode_views (episode_id, viewer_id, viewed_at DESC);

-- 관리자 대시보드 기간별(월별) 집계용 인덱스
CREATE INDEX IF NOT EXISTS idx_episode_views_viewed_at
  ON public.episode_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_episode_views_series_viewed_at
  ON public.episode_views (series_id, viewed_at DESC);


-- ────────────────────────────────────────────────────────────
-- 2. record_episode_view RPC 함수
--    Player.tsx: supabase.rpc("record_episode_view", { p_episode_id, p_series_id, p_viewer_id })
--    반환값: true  → 신규 조회로 집계됨 (episode_views insert + views 증가)
--            false → 중복(dedupe 윈도우 내 재시청)으로 집계되지 않음
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_episode_view(
  p_episode_id     uuid,
  p_series_id      uuid,
  p_viewer_id      text,
  p_dedupe_minutes int DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_exists boolean;
BEGIN
  IF p_episode_id IS NULL OR p_series_id IS NULL
     OR p_viewer_id IS NULL OR length(trim(p_viewer_id)) = 0 THEN
    RETURN false;
  END IF;

  -- 동일 viewer_id가 dedupe 윈도우 내에 동일 episode를 이미 조회했는지 확인
  SELECT EXISTS (
    SELECT 1
    FROM public.episode_views
    WHERE episode_id = p_episode_id
      AND viewer_id  = p_viewer_id
      AND viewed_at  > now() - (GREATEST(p_dedupe_minutes, 0) || ' minutes')::interval
  ) INTO v_recent_exists;

  IF v_recent_exists THEN
    RETURN false;
  END IF;

  INSERT INTO public.episode_views (episode_id, series_id, viewer_id)
  VALUES (p_episode_id, p_series_id, p_viewer_id);

  UPDATE public.episodes SET views = views + 1 WHERE id = p_episode_id;
  UPDATE public.series   SET views = views + 1 WHERE id = p_series_id;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.record_episode_view IS
  '에피소드 재생 시작 시 호출. 동일 viewer_id가 dedupe 윈도우(기본 30분) 내 같은 episode를 재생하면 카운트하지 않음. 신규 조회 시 episode_views insert + episodes.views/series.views 증가.';

GRANT EXECUTE ON FUNCTION public.record_episode_view(uuid, uuid, text, int) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. Row Level Security
--    - 기존 테이블들과 동일한 패턴(공개 읽기 허용)을 따른다.
--    - INSERT는 SECURITY DEFINER 함수(record_episode_view)를 통해서만 수행되며,
--      해당 함수는 RLS와 무관하게 동작하므로 별도의 anon insert 정책은 만들지 않는다.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.episode_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "episode_views_public_read"
    ON public.episode_views FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '정책 이미 존재함: episode_views_public_read';
END $$;


-- ────────────────────────────────────────────────────────────
-- 완료 확인 쿼리
-- ────────────────────────────────────────────────────────────
-- SELECT * FROM public.episode_views ORDER BY viewed_at DESC LIMIT 20;
-- SELECT count(*) FROM public.episode_views WHERE viewed_at >= date_trunc('month', now());
