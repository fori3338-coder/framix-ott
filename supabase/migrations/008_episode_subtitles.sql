-- ============================================================
-- 008_episode_subtitles.sql
-- episodes 테이블에 subtitles JSONB 컬럼 추가
-- 구조: { "ko": "https://..../ko.vtt", "en": "https://..../en.vtt", ... }
-- ============================================================

ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS subtitles jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.episodes.subtitles IS
  'VTT 자막 URL 맵. 예: {"ko": "https://…/ko.vtt", "en": "https://…/en.vtt"}';
