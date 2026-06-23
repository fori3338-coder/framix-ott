-- ============================================================
-- 009_subtitles_storage.sql
-- Supabase Storage: subtitles 버킷 생성 + RLS 정책
-- ============================================================

-- 1) subtitles 버킷 생성 (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subtitles',
  'subtitles',
  true,                          -- public read (Player에서 직접 URL 로드)
  5242880,                       -- 5MB per file
  ARRAY['text/vtt', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2) RLS 정책
-- ============================================================

-- Public read: 누구나 자막 파일 읽기 가능 (Player에서 사용)
CREATE POLICY IF NOT EXISTS "subtitles_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'subtitles');

-- Authenticated write: 로그인 사용자(관리자)만 업로드/삭제 가능
CREATE POLICY IF NOT EXISTS "subtitles_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'subtitles');

CREATE POLICY IF NOT EXISTS "subtitles_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'subtitles');

CREATE POLICY IF NOT EXISTS "subtitles_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'subtitles');

-- ============================================================
-- 3) episodes.subtitles 컬럼 확인 (008에서 이미 생성됨)
--    중복 방지용 IF NOT EXISTS 재확인
-- ============================================================
ALTER TABLE public.episodes
  ADD COLUMN IF NOT EXISTS subtitles jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.episodes.subtitles IS
  'VTT 자막 URL 맵. 예: {"ko": "https://…/ko.vtt", "en": "https://…/en.vtt"}';

-- ============================================================
-- 스토리지 경로 규칙
-- subtitles/{series_id}/{episode_id}/{lang_code}.vtt
-- 예: subtitles/abc-123/ep-001/ko.vtt
-- ============================================================
