-- ============================================================
-- FRAMIX OTT — 조회수 기록 안 되는 문제 대응
-- 파일명: 005_episode_views_fallback_and_reload.sql
-- 작성일: 2026-06-18
-- 배경: 004 마이그레이션 실행 + episode_views 테이블/RPC 생성 확인됐음에도
--      실제 재생 후 episode_views에 row가 0건인 상태.
-- 가장 흔한 원인: 함수를 새로 만든 뒤 PostgREST가 스키마 캐시를 갱신하지 않아
--      supabase.rpc("record_episode_view") 호출이 "함수를 찾을 수 없음"으로
--      조용히 실패하는 경우 (보통 수 분 내 자동 반영되지만 즉시 반영되지 않을 수 있음).
-- 대응:
--   1) NOTIFY pgrst, 'reload schema' 로 즉시 캐시 리로드 강제
--   2) record_episode_view 함수를 동일 정의로 재생성 (idempotent, 데이터 영향 없음)
--   3) 클라이언트가 RPC 실패 시 직접 insert하는 폴백 경로를 쓸 수 있도록
--      episode_views에 anon insert 정책 추가 (정상 상태에서는 사용되지 않음)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. record_episode_view 함수 재생성 (정의 동일 — 캐시 동기화 목적)
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

GRANT EXECUTE ON FUNCTION public.record_episode_view(uuid, uuid, text, int) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 2. episode_views anon insert 정책 (클라이언트 직접 기록 폴백용)
--    record_episode_view RPC가 정상 동작하면 이 정책은 사용되지 않는다.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY "episode_views_anon_insert"
    ON public.episode_views FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '정책 이미 존재함: episode_views_anon_insert';
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. PostgREST 스키마 캐시 강제 리로드
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ────────────────────────────────────────────────────────────
-- 확인 쿼리
-- ────────────────────────────────────────────────────────────
-- 1) 함수가 실제로 존재하는지 확인
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'record_episode_view';
--
-- 2) RPC를 SQL Editor에서 직접 호출해 insert가 되는지 확인
--    (episode_id/series_id는 실제 존재하는 값으로 교체)
-- SELECT public.record_episode_view(
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'test:manual-check'
-- );
-- SELECT * FROM public.episode_views ORDER BY viewed_at DESC LIMIT 5;
