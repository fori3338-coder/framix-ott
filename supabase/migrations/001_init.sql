-- ============================================================
-- FRAMIX OTT — Supabase 초기 스키마 마이그레이션 v2
-- 파일명: 001_init.sql
-- 수정일: 2026-06-14
-- 변경사항:
--   - dramas → series (코드 참조명과 일치)
--   - episodes.drama_id → series_id
--   - watch_history 테이블 추가
--   - user_favorites 테이블 추가
--   - increment_series_views RPC 함수 추가
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. series 테이블 (구 dramas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.series (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  english_title   text,
  description     text,
  thumbnail_url   text,          -- poster (세로형)
  backdrop_url    text,          -- hero banner (가로형)
  genres          text[]      NOT NULL DEFAULT '{}',
  tags            text[]      NOT NULL DEFAULT '{}',
  cast_members    text[]      NOT NULL DEFAULT '{}',
  director        text,
  age_rating      text        NOT NULL DEFAULT '15+',
  year            int         NOT NULL DEFAULT date_part('year', now())::int,
  episode_length  text,
  total_episodes  int         NOT NULL DEFAULT 0,
  is_original     boolean     NOT NULL DEFAULT false,
  is_new          boolean     NOT NULL DEFAULT true,
  is_exclusive    boolean     NOT NULL DEFAULT false,
  rating          numeric(3,1)         DEFAULT 0.0,
  views           bigint      NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'active',  -- active | inactive
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.series IS 'FRAMIX 드라마/시리즈 메타데이터';


-- ────────────────────────────────────────────────────────────
-- 2. episodes 테이블 (series_id 참조)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.episodes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id       uuid        NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  episode_number  int         NOT NULL,
  title           text        NOT NULL,
  duration        text,                  -- '12:34' 형식
  thumbnail_url   text,
  video_url       text,                  -- Storage: videos/{series_id}/{episode_id}.mp4
  is_free         boolean     NOT NULL DEFAULT false,
  sort_order      int         NOT NULL DEFAULT 0,
  views           bigint      NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (series_id, episode_number)
);

COMMENT ON TABLE public.episodes IS 'FRAMIX 에피소드 정보 및 영상 URL';

CREATE INDEX idx_episodes_series_sort ON public.episodes(series_id, sort_order ASC);


-- ────────────────────────────────────────────────────────────
-- 3. watch_history 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.watch_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id       uuid        NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  progress_seconds int         NOT NULL DEFAULT 0,
  completed        boolean     NOT NULL DEFAULT false,
  watched_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, episode_id)           -- upsert 기준 (Player.tsx와 일치)
);

COMMENT ON TABLE public.watch_history IS '사용자별 에피소드 시청 기록';

CREATE INDEX idx_watch_history_user_date ON public.watch_history(user_id, watched_at DESC);


-- ────────────────────────────────────────────────────────────
-- 4. user_favorites 테이블 (내 보관함)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.user_favorites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id   uuid        NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, series_id)
);

COMMENT ON TABLE public.user_favorites IS '사용자 즐겨찾기 (내 보관함)';

CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 5. updated_at 자동 갱신 트리거
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

CREATE TRIGGER series_updated_at
  BEFORE UPDATE ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- 6. total_episodes 자동 동기화 트리거
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_total_episodes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.series
    SET total_episodes = total_episodes + 1
    WHERE id = NEW.series_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.series
    SET total_episodes = GREATEST(total_episodes - 1, 0)
    WHERE id = OLD.series_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER episodes_sync_total
  AFTER INSERT OR DELETE ON public.episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_total_episodes();


-- ────────────────────────────────────────────────────────────
-- 7. increment_series_views RPC 함수
--    Player.tsx: supabase.rpc("increment_series_views", { series_id: id })
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_series_views(series_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.series
  SET views = views + 1
  WHERE id = series_id;
END;
$$;

COMMENT ON FUNCTION public.increment_series_views IS '영상 재생 완료 시 시리즈 조회수 +1 (Player.tsx 호출)';


-- ────────────────────────────────────────────────────────────
-- 8. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.series         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- series: 누구나 읽기
CREATE POLICY "series_public_read"
  ON public.series FOR SELECT USING (true);

-- series 쓰기: anon 허용 (관리자 Auth 구현 전 임시)
CREATE POLICY "series_anon_insert" ON public.series FOR INSERT WITH CHECK (true);
CREATE POLICY "series_anon_update" ON public.series FOR UPDATE USING (true);
CREATE POLICY "series_anon_delete" ON public.series FOR DELETE USING (true);

-- episodes: 누구나 읽기
CREATE POLICY "episodes_public_read"
  ON public.episodes FOR SELECT USING (true);

CREATE POLICY "episodes_anon_insert" ON public.episodes FOR INSERT WITH CHECK (true);
CREATE POLICY "episodes_anon_update" ON public.episodes FOR UPDATE USING (true);
CREATE POLICY "episodes_anon_delete" ON public.episodes FOR DELETE USING (true);

-- watch_history: 본인 데이터만
CREATE POLICY "watch_history_owner"
  ON public.watch_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_favorites: 본인 데이터만
CREATE POLICY "user_favorites_owner"
  ON public.user_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 9. Storage Bucket 생성
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 5368709120,
        ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('thumbnails', 'thumbnails', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners', 'banners', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('posters', 'posters', true, 10485760,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 10. Storage RLS 정책
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  CREATE POLICY "thumbnails_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: thumbnails_public_read';
END $$;

DO $$
BEGIN
  CREATE POLICY "thumbnails_anon_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'thumbnails');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: thumbnails_anon_upload';
END $$;

DO $$
BEGIN
  CREATE POLICY "thumbnails_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'thumbnails');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: thumbnails_anon_update';
END $$;

DO $$
BEGIN
  CREATE POLICY "thumbnails_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'thumbnails');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: thumbnails_anon_delete';
END $$;

DO $$
BEGIN
  CREATE POLICY "banners_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: banners_public_read';
END $$;

DO $$
BEGIN
  CREATE POLICY "banners_anon_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: banners_anon_upload';
END $$;

DO $$
BEGIN
  CREATE POLICY "banners_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'banners');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: banners_anon_update';
END $$;

DO $$
BEGIN
  CREATE POLICY "banners_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'banners');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: banners_anon_delete';
END $$;

DO $$
BEGIN
  CREATE POLICY "posters_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: posters_public_read';
END $$;

DO $$
BEGIN
  CREATE POLICY "posters_anon_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'posters');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: posters_anon_upload';
END $$;

DO $$
BEGIN
  CREATE POLICY "posters_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'posters');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: posters_anon_update';
END $$;

DO $$
BEGIN
  CREATE POLICY "posters_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'posters');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: posters_anon_delete';
END $$;

DO $$
BEGIN
  CREATE POLICY "videos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: videos_public_read';
END $$;

DO $$
BEGIN
  CREATE POLICY "videos_anon_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'videos');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: videos_anon_upload';
END $$;

DO $$
BEGIN
  CREATE POLICY "videos_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'videos');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: videos_anon_update';
END $$;

DO $$
BEGIN
  CREATE POLICY "videos_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'videos');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard > Storage > Policies에서 수동 설정 필요';
WHEN duplicate_object THEN
  RAISE NOTICE '정책이 이미 존재함: videos_anon_delete';
END $$;


-- ────────────────────────────────────────────────────────────
-- 완료 확인 쿼리
-- ────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
-- SELECT name, public FROM storage.buckets;


-- ────────────────────────────────────────────────────────────
-- 11. [PATCH] videos 버킷 public 전환 + anon 업로드 정책 보강
--     기존 false → true 로 변경 (Public URL 접근 허용)
-- ────────────────────────────────────────────────────────────
UPDATE storage.buckets
  SET public = true
  WHERE id = 'videos';

-- anon 업로드 정책 (이미 존재하면 무시)
DO $$
BEGIN
  CREATE POLICY "videos_anon_insert_v2"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '정책 이미 존재함: videos_anon_insert_v2';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard에서 수동 설정';
END $$;

DO $$
BEGIN
  CREATE POLICY "videos_anon_select_v2"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE '정책 이미 존재함: videos_anon_select_v2';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'storage.objects 정책 권한 없음 - Dashboard에서 수동 설정';
END $$;
