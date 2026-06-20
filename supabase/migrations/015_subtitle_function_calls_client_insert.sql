-- ============================================================
-- 015_subtitle_function_calls_client_insert.sql
-- subtitle_function_calls 에 CMS 클라이언트(authenticated)의
-- INSERT 권한 추가
-- ─────────────────────────────────────────────────────────────
-- 014_subtitle_debug_tracing.sql 은 subtitle_function_calls 에
-- authenticated SELECT 정책만 부여했다. 그러나 STEP01(series insert),
-- STEP02(episode insert) 는 subtitle_jobs 행이 아직 존재하지 않는
-- 단계이므로, 이 두 단계의 실패/성공 기록은 subtitle_jobs.debug_log가
-- 아니라 subtitle_function_calls 에 클라이언트가 직접 INSERT해야 한다.
-- INSERT 정책이 없으면 RLS에 의해 조용히 막혀, STEP01/02 구간은
-- 추적 시스템의 사각지대로 남는다. 이 마이그레이션으로 보강한다.
-- 영향 범위: subtitle_function_calls 테이블 RLS 정책 1개 추가뿐.
-- 기존 테이블/컬럼/트리거/Player/Auth/Payment 변경 없음.
-- ============================================================

CREATE POLICY IF NOT EXISTS "subtitle_function_calls_auth_insert"
  ON public.subtitle_function_calls FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 전체 파이프라인 통합 조회 뷰
-- STEP01/02(클라이언트, job 생성 전)와 STEP03~15(job 생성 후)를
-- 하나의 타임라인으로 합쳐서 "어디서 멈췄는지"를 한 번에 보여준다.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.subtitle_pipeline_full_trace AS
SELECT
  created_at,
  'PRE_JOB' AS source,
  payload->>'step' AS step,
  result,
  error AS message,
  payload
FROM public.subtitle_function_calls
UNION ALL
SELECT
  sj.updated_at AS created_at,
  'JOB' AS source,
  sj.last_step AS step,
  sj.status AS result,
  sj.error_message AS message,
  jsonb_build_object('job_id', sj.id, 'episode_id', sj.episode_id, 'debug_log', sj.debug_log) AS payload
FROM public.subtitle_jobs sj
ORDER BY created_at DESC;

COMMENT ON VIEW public.subtitle_pipeline_full_trace IS
  '사용법: SELECT * FROM public.subtitle_pipeline_full_trace LIMIT 20;
   STEP01/02(PRE_JOB, subtitle_function_calls 기준)와
   STEP03~15(JOB, subtitle_jobs 기준)를 시간순으로 함께 보여줌.
   가장 최근 행의 step 컬럼이 "어디서 멈췄는지"를 직접 가리킨다.';

-- ============================================================
-- 사용법
--   SELECT * FROM public.subtitle_function_calls
--   ORDER BY created_at DESC LIMIT 10;
--   -- payload->>'step' 으로 STEP01_SERIES_INSERT / STEP02_EPISODE_INSERT /
--   -- STEP05_FUNCTION_START 등 모든 진입 시점의 성공(result='OK')/
--   -- 실패(result='FAIL', error 컬럼에 메시지)를 한 번에 확인 가능.
-- ============================================================
