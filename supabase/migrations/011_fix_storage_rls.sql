-- ============================================================
-- 011_fix_storage_rls.sql
-- Storage RLS 정책 수정
-- ─────────────────────────────────────────────────────────────
-- 수정 배경:
--   001_init.sql의 videos 버킷 정책은 TO role 절 없이 생성되어
--   authenticated 세션의 SDK 업로드가 정책 미매칭으로 실패하는 경우가 있음.
--   ("headers must have required property 'authorization'" 오류의 근본 원인 중 하나)
--
--   이 마이그레이션은:
--   1. 기존 모호한 정책을 삭제 후 TO 절을 명시해 재생성
--   2. videos 버킷: authenticated 업로드 정책을 명확하게 보장
--   3. subtitles 버킷: Edge Function(service_role)의 업로드도 허용
--   4. 기타 buckets(thumbnails/posters/banners): anon → authenticated로 격상
--
-- 영향 범위: storage.objects 정책만 변경. 기존 데이터/테이블 변경 없음.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. videos 버킷: 기존 모호한 정책 제거 후 명시적으로 재생성
-- ────────────────────────────────────────────────────────────

-- 기존 정책 삭제 (없으면 무시)
DO $$
BEGIN
  DROP POLICY IF EXISTS "videos_anon_upload"      ON storage.objects;
  DROP POLICY IF EXISTS "videos_anon_insert_v2"   ON storage.objects;
  DROP POLICY IF EXISTS "videos_anon_update"      ON storage.objects;
  DROP POLICY IF EXISTS "videos_anon_delete"      ON storage.objects;
  DROP POLICY IF EXISTS "videos_public_read"      ON storage.objects;
  DROP POLICY IF EXISTS "videos_anon_select_v2"   ON storage.objects;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE '[011] storage.objects 정책 삭제 권한 없음 — Dashboard에서 수동 설정 필요';
END $$;

-- videos: 공개 읽기 (Player에서 직접 URL 로드)
DO $$
BEGIN
  CREATE POLICY "videos_public_read_v3"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object        THEN RAISE NOTICE '[011] videos_public_read_v3 이미 존재';
  WHEN insufficient_privilege  THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
END $$;

-- videos: authenticated 사용자(관리자) 업로드
DO $$
BEGIN
  CREATE POLICY "videos_auth_insert_v3"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object        THEN RAISE NOTICE '[011] videos_auth_insert_v3 이미 존재';
  WHEN insufficient_privilege  THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
END $$;

-- videos: authenticated 사용자 업데이트 (upsert 지원)
DO $$
BEGIN
  CREATE POLICY "videos_auth_update_v3"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object        THEN RAISE NOTICE '[011] videos_auth_update_v3 이미 존재';
  WHEN insufficient_privilege  THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
END $$;

-- videos: authenticated 사용자 삭제
DO $$
BEGIN
  CREATE POLICY "videos_auth_delete_v3"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'videos');
EXCEPTION
  WHEN duplicate_object        THEN RAISE NOTICE '[011] videos_auth_delete_v3 이미 존재';
  WHEN insufficient_privilege  THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. subtitles 버킷: service_role(Edge Function) 업로드 보장
--    Edge Function은 service_role 키를 사용해 VTT를 저장하므로
--    RLS를 우회(bypass)하지만, 명시적 정책이 있으면 더 안전.
-- ────────────────────────────────────────────────────────────
-- service_role은 RLS bypass가 기본 동작이므로 별도 정책 불필요.
-- subtitles_auth_insert(009에서 생성)로 관리자 수동 업로드도 커버됨.
-- 추가 조치 없음.

-- ────────────────────────────────────────────────────────────
-- 3. thumbnails/posters/banners: anon → authenticated 격상
--    (001_init.sql에서 anon 허용으로 생성된 정책을 교체)
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
  buckets text[] := ARRAY['thumbnails', 'posters', 'banners'];
  b text;
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    -- 기존 anon 정책 삭제
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_upload" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_update" ON storage.objects', b);
    EXECUTE format('DROP POLICY IF EXISTS "%s_anon_delete" ON storage.objects', b);

    -- authenticated 정책 재생성
    BEGIN
      EXECUTE format(
        'CREATE POLICY "%s_auth_insert_v2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
        b, b
      );
    EXCEPTION
      WHEN duplicate_object       THEN RAISE NOTICE '[011] %_auth_insert_v2 이미 존재', b;
      WHEN insufficient_privilege THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY "%s_auth_update_v2" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)',
        b, b
      );
    EXCEPTION
      WHEN duplicate_object       THEN RAISE NOTICE '[011] %_auth_update_v2 이미 존재', b;
      WHEN insufficient_privilege THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY "%s_auth_delete_v2" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
        b, b
      );
    EXCEPTION
      WHEN duplicate_object       THEN RAISE NOTICE '[011] %_auth_delete_v2 이미 존재', b;
      WHEN insufficient_privilege THEN RAISE NOTICE '[011] storage.objects 정책 권한 없음';
    END;
  END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. subtitle_jobs: Realtime 활성화 확인
--    subtitle_jobs 테이블의 UPDATE 이벤트를 브라우저가 수신하려면
--    Supabase Dashboard > Database > Replication에서
--    subtitle_jobs 테이블이 활성화되어 있어야 함.
--    (SQL로 제어 불가 — 대시보드 수동 확인 필요)
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 운영 메모
-- ────────────────────────────────────────────────────────────
-- videos 버킷 업로드 흐름:
--   1. SDK 1차 시도 → authenticated 세션으로 supabase.storage.from('videos').upload()
--   2. SDK 실패 시 → XHR fallback (Authorization + apikey 헤더 포함)
--   3. 두 방법 모두 'videos_auth_insert_v3' 정책을 통과해야 함
--
-- 만약 이 마이그레이션 적용 후에도 Storage 업로드가 실패한다면:
--   Supabase Dashboard > Storage > Policies > videos 버킷에서
--   'authenticated' 역할에 대한 INSERT 정책이 존재하는지 직접 확인.
-- ============================================================
