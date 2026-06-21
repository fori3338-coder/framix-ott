-- ============================================================
-- FRAMIX OTT — watch_history 테이블 생성 (idempotent)
-- 파일명: 024_watch_history.sql
-- 작성일: 2026-06-22
--
-- 배경:
--   src/pages/Player.tsx (saveWatchHistory / loadWatchHistory),
--   src/pages/WatchHistory.tsx, src/hooks/useContinueWatching.ts는
--   이미 public.watch_history 테이블을 사용하도록 구현되어 있으나,
--   실제 운영 Supabase 프로젝트에 해당 테이블이 생성되어 있지 않아
--   "시청 기록 기능 준비 중" 안내만 표시되고 0개/0편/0분으로 남는 문제가 있었음.
--   (스키마는 supabase/migrations/001_init.sql에 정의된 원본과 동일하게 맞춤)
--
-- 이 파일은 IF NOT EXISTS / DROP POLICY IF EXISTS 가드를 사용하므로
-- 001_init.sql 적용 여부와 무관하게 안전하게 재실행할 수 있다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. watch_history 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watch_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id       uuid        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  progress_seconds int         NOT NULL DEFAULT 0,
  completed        boolean     NOT NULL DEFAULT false,
  watched_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, episode_id)   -- Player.tsx의 upsert(onConflict: "user_id,episode_id") 기준
);

COMMENT ON TABLE public.watch_history IS '사용자별 에피소드 시청 기록 (이어보기 / 시청기록 페이지용)';

CREATE INDEX IF NOT EXISTS idx_watch_history_user_date
  ON public.watch_history (user_id, watched_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. Row Level Security — 본인 데이터만 읽기/쓰기
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watch_history_owner" ON public.watch_history;
CREATE POLICY "watch_history_owner"
  ON public.watch_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
