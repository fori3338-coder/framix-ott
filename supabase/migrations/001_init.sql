-- ============================================================
-- FRAMIX OTT — Supabase 초기 스키마 마이그레이션
-- 파일명: 001_init.sql
-- 실행 위치: Supabase Dashboard > SQL Editor > New Query
-- 작성일: 2026-06-13
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. dramas 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.dramas (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  english_title   text,
  synopsis        text,
  poster_url      text,          -- Storage: thumbnails bucket / posters/{id}.webp
  backdrop_url    text,          -- Storage: banners bucket / {id}/hero.webp
  genres          text[]      NOT NULL DEFAULT '{}',
  tags            text[]      NOT NULL DEFAULT '{}',
  cast            text[]      NOT NULL DEFAULT '{}',
  director        text,
  age_rating      text        NOT NULL DEFAULT '15+',
  year            int         NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  episode_length  text,
  total_episodes  int         NOT NULL DEFAULT 0,
  is_original     boolean     NOT NULL DEFAULT false,
  is_new          boolean     NOT NULL DEFAULT true,
  is_exclusive    boolean     NOT NULL DEFAULT false,
  rating          numeric(3,1)         DEFAULT 0.0,
  views           bigint      NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.dramas IS 'FRAMIX 드라마 메타데이터';
COMMENT ON COLUMN public.dramas.poster_url IS 'Storage thumbnails 버킷 공개 URL';
COMMENT ON COLUMN public.dramas.backdrop_url IS 'Storage banners 버킷 공개 URL';


-- ────────────────────────────────────────────────────────────
-- 2. episodes 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.episodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  drama_id        uuid        NOT NULL REFERENCES public.dramas(id) ON DELETE CASCADE,
  episode_number  int         NOT NULL,
  title           text        NOT NULL,
  duration        text,                  -- '12:34' 형식
  thumbnail_url   text,                  -- Storage: thumbnails/episodes/{drama_id}_ep{n}.webp
  video_url       text,                  -- Storage: videos/{drama_id}/{episode_id}.mp4
  is_free         boolean     NOT NULL DEFAULT false,
  sort_order      int         NOT NULL DEFAULT 0,
  views           bigint      NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (drama_id, episode_number)      -- 동일 드라마 내 화수 중복 방지
);

COMMENT ON TABLE public.episodes IS 'FRAMIX 에피소드 정보 및 영상 URL';
COMMENT ON COLUMN public.episodes.video_url IS 'Storage videos 버킷 URL (무료: public, 유료: signed URL)';

-- 에피소드 조회 인덱스 (drama_id 기준 sort_order 정렬)
CREATE INDEX idx_episodes_drama_sort ON public.episodes(drama_id, sort_order ASC);


-- ────────────────────────────────────────────────────────────
-- 3. updated_at 자동 갱신 트리거 함수
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dramas_updated_at
  BEFORE UPDATE ON public.dramas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- 4. total_episodes 자동 동기화 트리거
--    episodes INSERT / DELETE 시 dramas.total_episodes 자동 갱신
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_total_episodes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dramas
    SET total_episodes = total_episodes + 1
    WHERE id = NEW.drama_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dramas
    SET total_episodes = GREATEST(total_episodes - 1, 0)
    WHERE id = OLD.drama_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER episodes_sync_total
  AFTER INSERT OR DELETE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_total_episodes();


-- ────────────────────────────────────────────────────────────
-- 5. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.dramas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- dramas: 누구나 읽기
CREATE POLICY "dramas_public_read"
  ON public.dramas FOR SELECT
  USING (true);

-- episodes: 누구나 읽기
CREATE POLICY "episodes_public_read"
  ON public.episodes FOR SELECT
  USING (true);

-- dramas 쓰기: anon 허용 (관리자 Auth 구현 전 임시)
-- ⚠️ 2단계 Auth 구현 후 아래 3개 정책 삭제하고 admin role 조건으로 교체
CREATE POLICY "dramas_anon_insert"
  ON public.dramas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "dramas_anon_update"
  ON public.dramas FOR UPDATE
  USING (true);

CREATE POLICY "dramas_anon_delete"
  ON public.dramas FOR DELETE
  USING (true);

-- episodes 쓰기: anon 허용 (임시)
CREATE POLICY "episodes_anon_insert"
  ON public.episodes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "episodes_anon_update"
  ON public.episodes FOR UPDATE
  USING (true);

CREATE POLICY "episodes_anon_delete"
  ON public.episodes FOR DELETE
  USING (true);


-- ────────────────────────────────────────────────────────────
-- 6. Storage Bucket 생성
-- ────────────────────────────────────────────────────────────

-- videos: Private (유료 에피소드 → Signed URL 사용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos', 'videos', false,
  5368709120,  -- 5GB
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO NOTHING;

-- thumbnails: Public (포스터, 에피소드 썸네일)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails', 'thumbnails', true,
  10485760,    -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- banners: Public (히어로 배너 대형 이미지)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners', 'banners', true,
  10485760,    -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 7. Storage RLS 정책
-- ────────────────────────────────────────────────────────────

-- thumbnails: 공개 읽기 + anon 업로드 (임시)
CREATE POLICY "thumbnails_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'thumbnails');

CREATE POLICY "thumbnails_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'thumbnails');

-- banners: 공개 읽기 + anon 업로드 (임시)
CREATE POLICY "banners_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "banners_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'banners');

CREATE POLICY "banners_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'banners');

CREATE POLICY "banners_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'banners');

-- videos: 누구나 읽기 + anon 업로드 (임시; 유료 콘텐츠는 앱 레벨에서 Signed URL로 제어)
CREATE POLICY "videos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

CREATE POLICY "videos_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

CREATE POLICY "videos_anon_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

CREATE POLICY "videos_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');


-- ────────────────────────────────────────────────────────────
-- 완료 확인 쿼리 (실행 후 결과 확인용)
-- ────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT name, public FROM storage.buckets;
