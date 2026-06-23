-- ============================================================
-- 012_fix_episodes_subtitles_not_null.sql
-- episodes.subtitles 컬럼 NOT NULL + DEFAULT '{}' 보장
-- 문제: ContentUpload.tsx가 subtitles: null 을 INSERT 시도
--       → "null value in column subtitles violates not-null constraint"
-- 해결: DEFAULT '{}' 는 이미 008_episode_subtitles.sql에 존재하므로
--       혹시 누락된 환경에서도 안전하게 재적용
-- ============================================================

-- 기존 NULL 값이 있는 경우 빈 JSON 오브젝트로 교체
UPDATE public.episodes
   SET subtitles = '{}'::jsonb
 WHERE subtitles IS NULL;

-- NOT NULL 제약 + DEFAULT 재확인 (이미 존재하면 무시됨)
ALTER TABLE public.episodes
  ALTER COLUMN subtitles SET DEFAULT '{}'::jsonb,
  ALTER COLUMN subtitles SET NOT NULL;

COMMENT ON COLUMN public.episodes.subtitles IS
  'VTT 자막 URL 맵. 예: {"ko": "https://…/ko.vtt", "en": "https://…/en.vtt"}. 빈 경우 {} 저장.';
