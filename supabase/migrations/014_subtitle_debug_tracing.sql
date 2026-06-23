-- ============================================================
-- 014_subtitle_debug_tracing.sql
-- 자막 파이프라인 실행 추적 시스템
-- ─────────────────────────────────────────────────────────────
-- 목적: 원인을 추측하지 않고, 실제 실행이 어느 STEP에서 멈췄는지
--       SQL 조회 한 줄로 100% 확인 가능하게 만든다.
-- 영향 범위: subtitle_jobs 테이블에 컬럼 3개 추가, 신규 테이블 1개.
--            기존 컬럼/트리거/RLS/Player/Auth/Payment 변경 없음.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. subtitle_jobs 추적 컬럼 추가
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.subtitle_jobs
  ADD COLUMN IF NOT EXISTS debug_log text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_step text;

COMMENT ON COLUMN public.subtitle_jobs.debug_log IS
  '파이프라인 실행 중 발생한 모든 STEP 로그를 시간순으로 누적한 텍스트. '
  '형식: [ISO시각] STEP코드 상태(OK/FAIL) 메시지 (줄바꿈으로 구분).';
COMMENT ON COLUMN public.subtitle_jobs.last_step IS
  '가장 최근에 도달한 STEP 코드 (예: STEP09_STT_START). '
  '이 값이 어디서 멈췄는지를 즉시 보여준다.';

-- ────────────────────────────────────────────────────────────
-- 2. subtitle_function_calls 테이블
--    Edge Function 진입 자체가 실패한 경우(인증 실패, 파싱 실패,
--    런타임 크래시 등 subtitle_jobs row와 연결되지 못하는 실패)를
--    별도로 기록한다.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subtitle_function_calls (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  payload     jsonb,          -- 수신한 요청 본문 (job_id 등)
  result      text,           -- 'ok' | 'unauthorized' | 'no_job' | 'error' 등
  error       text            -- 예외 메시지 (있는 경우)
);

COMMENT ON TABLE public.subtitle_function_calls IS
  'process-subtitle-job Edge Function 의 모든 호출을 진입 즉시 기록. '
  'subtitle_jobs 행과 무관하게, 함수가 호출되었는지 / 인증을 통과했는지 '
  '/ 어떤 예외로 죽었는지를 SQL 조회만으로 확인하기 위함.';

CREATE INDEX IF NOT EXISTS idx_subtitle_function_calls_created_at
  ON public.subtitle_function_calls(created_at DESC);

ALTER TABLE public.subtitle_function_calls ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS 우회. CMS 관리자(authenticated)는 조회만 허용.
CREATE POLICY IF NOT EXISTS "subtitle_function_calls_auth_select"
  ON public.subtitle_function_calls FOR SELECT
  TO authenticated
  USING (true);

-- ────────────────────────────────────────────────────────────
-- 3. 조회 헬퍼 뷰: "어디서 죽었는지" 한 줄 조회
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.subtitle_jobs_trace AS
SELECT
  sj.id,
  sj.episode_id,
  sj.episode_number,
  sj.status,
  sj.last_step,
  sj.error_message,
  sj.retry_count,
  sj.created_at,
  sj.updated_at,
  sj.debug_log
FROM public.subtitle_jobs sj
ORDER BY sj.created_at DESC;

COMMENT ON VIEW public.subtitle_jobs_trace IS
  '사용법: SELECT * FROM public.subtitle_jobs_trace LIMIT 5;  -- 최근 5개 job의 last_step/error_message/debug_log 즉시 확인
           SELECT * FROM public.subtitle_function_calls ORDER BY created_at DESC LIMIT 5;  -- Edge Function 진입 자체 여부 확인';

-- ────────────────────────────────────────────────────────────
-- 4. RLS 보강: CMS 클라이언트(authenticated)가 debug_log/last_step을
--    직접 기록할 수 있도록 UPDATE 정책 추가.
--    (010_subtitle_jobs.sql 은 UPDATE를 service_role 전용으로 제한했었음 —
--     ContentUpload.tsx 의 STEP03/STEP04 클라이언트 측 기록을 위해
--     authenticated UPDATE를 허용한다. status/subtitle_map 등 다른 컬럼도
--     함께 업데이트 가능해지나, 이는 추적 목적상 의도된 범위이며
--     기존 핵심 로직(Edge Function의 service_role 처리)과 충돌하지 않음.)
-- ────────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "subtitle_jobs_auth_update_debug"
  ON public.subtitle_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 사용법 요약
-- 1) Edge Function이 호출이라도 됐는지:
--      SELECT * FROM public.subtitle_function_calls ORDER BY created_at DESC LIMIT 5;
-- 2) 특정 job이 어느 STEP에서 멈췄는지:
--      SELECT last_step, status, error_message, debug_log
--      FROM public.subtitle_jobs
--      ORDER BY created_at DESC LIMIT 1;
-- ============================================================
