-- ============================================================
-- 010_subtitle_jobs.sql
-- AI 자막 자동 생성 Job Queue
-- ─────────────────────────────────────────────────────────────
-- 목적: 브라우저에서 직접 Whisper/번역 API를 호출하던 구 파이프라인을
--       서버 사이드(Edge Function) Job Queue 구조로 전환.
--       클라이언트는 행 INSERT만 수행 → 이후 전 과정은 백그라운드 처리.
--       브라우저 새로고침/종료와 무관하게 작업이 계속 진행됨.
-- 영향 범위: 신규 테이블 1개 + 트리거 1개. 기존 테이블/컬럼 변경 없음.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. subtitle_jobs 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subtitle_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       uuid        NOT NULL REFERENCES public.series(id)   ON DELETE CASCADE,
  episode_id      uuid        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  episode_number  int         NOT NULL,

  video_url       text        NOT NULL,   -- Storage 영상 URL (Edge Function이 다운로드)

  -- 상태: pending → transcribing → translating → uploading → registering → done
  --       오류 시 → error  (retry_count < max_retries 이면 재시도 후 pending 복귀 가능)
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                    'pending', 'transcribing', 'translating',
                    'uploading', 'registering', 'done', 'error'
                  )),

  stage_label     text        NOT NULL DEFAULT '대기 중',

  target_langs    text[]      NOT NULL DEFAULT '{}',   -- 처리 대상 언어 목록 (ko 제외, 최대 30개)
  completed_langs text[]      NOT NULL DEFAULT '{}',   -- 완료된 언어 목록 (ko 포함)
  current_lang    text,                                -- 현재 처리 중인 언어 코드

  -- 번역 제공자 추적 (1차 Gemini, 실패 시 OpenRouter로 폴백)
  provider_used   text        CHECK (provider_used IN ('gemini', 'openrouter')),

  subtitle_map    jsonb       NOT NULL DEFAULT '{}',   -- 완료된 { lang: vtt_url } 누적 결과

  retry_count     int         NOT NULL DEFAULT 0,
  max_retries     int         NOT NULL DEFAULT 3,
  error_message   text,

  force_regenerate boolean    NOT NULL DEFAULT false,  -- true면 기존 자막 무시하고 재생성

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

COMMENT ON TABLE public.subtitle_jobs IS
  'AI 자막 자동 생성 백그라운드 작업 큐. Edge Function(process-subtitle-job)이 polling/trigger로 처리.';
COMMENT ON COLUMN public.subtitle_jobs.target_langs IS
  '번역 대상 언어 코드 배열 (ko 제외). 기본 30개 언어.';
COMMENT ON COLUMN public.subtitle_jobs.subtitle_map IS
  '완료된 언어별 VTT public URL 맵. 예: {"ko": "https://…/ko.vtt"}';

CREATE INDEX IF NOT EXISTS idx_subtitle_jobs_status
  ON public.subtitle_jobs(status)
  WHERE status NOT IN ('done', 'error');

CREATE INDEX IF NOT EXISTS idx_subtitle_jobs_episode
  ON public.subtitle_jobs(episode_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subtitle_jobs_episode_active
  ON public.subtitle_jobs(episode_id)
  WHERE status NOT IN ('done', 'error');
-- 동일 에피소드에 대해 진행 중(pending~registering)인 작업은 1개만 허용.
-- (중복 트리거로 같은 영상이 두 번 처리되는 것 방지)

-- ────────────────────────────────────────────────────────────
-- 2. updated_at 자동 갱신
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.subtitle_jobs_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subtitle_jobs_updated_at ON public.subtitle_jobs;
CREATE TRIGGER trg_subtitle_jobs_updated_at
  BEFORE UPDATE ON public.subtitle_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.subtitle_jobs_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. RLS 정책
--    - 관리자(authenticated)만 INSERT 가능 (CMS 업로드 흐름)
--    - 관리자만 SELECT 가능 (CMS 상태 패널 + Realtime 구독)
--    - UPDATE/DELETE는 service_role(Edge Function)만 수행 → 클라이언트 정책 없음
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.subtitle_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "subtitle_jobs_auth_insert"
  ON public.subtitle_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "subtitle_jobs_auth_select"
  ON public.subtitle_jobs FOR SELECT
  TO authenticated
  USING (true);

-- service_role은 RLS를 우회하므로 별도 정책 불필요 (Edge Function이 service_role 키 사용)

-- ────────────────────────────────────────────────────────────
-- 4. pg_net 기반 자동 트리거
--    job이 'pending' 상태로 INSERT되면 즉시 Edge Function 호출.
--    브라우저가 닫혀도 DB 트리거가 호출하므로 작업이 계속 진행됨.
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Edge Function URL / 인증 키는 Vault 또는 DB 설정에 저장.
-- 아래 두 설정값은 마이그레이션 적용 후 1회 수동 설정 필요:
--   ALTER DATABASE postgres SET app.edge_function_base_url = 'https://<project-ref>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.edge_function_secret    = '<SUBTITLE_JOB_TRIGGER_SECRET>';
-- (service_role 키 자체를 DB 설정에 두지 않기 위해 별도 공유 시크릿을 Edge Function에서 검증)

CREATE OR REPLACE FUNCTION public.trigger_subtitle_job_processing()
RETURNS trigger AS $$
DECLARE
  v_base_url text;
  v_secret   text;
BEGIN
  IF NEW.status = 'pending' THEN
    BEGIN
      v_base_url := current_setting('app.edge_function_base_url', true);
      v_secret   := current_setting('app.edge_function_secret', true);
    EXCEPTION WHEN OTHERS THEN
      v_base_url := NULL;
      v_secret   := NULL;
    END;

    IF v_base_url IS NOT NULL AND v_base_url <> '' THEN
      PERFORM net.http_post(
        url     := v_base_url || '/process-subtitle-job',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-job-trigger-secret', COALESCE(v_secret, '')
        ),
        body    := jsonb_build_object('job_id', NEW.id)
      );
    ELSE
      RAISE WARNING
        '[subtitle_jobs] app.edge_function_base_url 미설정 — job % 은(는) 자동 트리거되지 않음. '
        'CMS의 수동 재시도 버튼 또는 cron 폴링으로 처리하세요.', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_subtitle_job_insert ON public.subtitle_jobs;
CREATE TRIGGER trg_subtitle_job_insert
  AFTER INSERT ON public.subtitle_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_subtitle_job_processing();

-- ────────────────────────────────────────────────────────────
-- 5. 안전망: 5분 간격 cron 폴링 (트리거 실패/재시도 보완용)
--    pg_cron이 활성화되어 있지 않은 프로젝트에서는 아래 블록이 조용히 스킵됨.
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('subtitle-jobs-poll')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'subtitle-jobs-poll');

    PERFORM cron.schedule(
      'subtitle-jobs-poll',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url     := current_setting('app.edge_function_base_url', true) || '/process-subtitle-job',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-job-trigger-secret', COALESCE(current_setting('app.edge_function_secret', true), '')
        ),
        body    := jsonb_build_object('job_id', id)
      )
      FROM public.subtitle_jobs
      WHERE status IN ('pending', 'error')
        AND retry_count < max_retries
        AND updated_at < now() - interval '5 minutes';
      $cron$
    );
  END IF;
END $$;

-- ============================================================
-- 운영 메모
-- - target_langs 기본값은 클라이언트(subtitlePipeline.ts)에서 INSERT 시 채워 전달.
-- - 기존 episodes.subtitles에 이미 언어가 존재하는 에피소드는
--   Edge Function 시작 시 재확인 후 force_regenerate=false면 스킵(done 처리).
-- - 본 마이그레이션은 기존 008/009의 episodes.subtitles, subtitles 버킷을 그대로 사용.
-- ============================================================
