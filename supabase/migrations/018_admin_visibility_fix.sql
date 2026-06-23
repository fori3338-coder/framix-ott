-- ============================================================
-- FRAMIX OTT — 관리자센터 가시성 수정 마이그레이션
-- 파일명: 018_admin_visibility_fix.sql
-- 작성일: 2026-06-21
--
-- 배경 (코드 감사로 확인된 사실)
-- ------------------------------------------------------------
-- 1) src/App.tsx 의 "/admin" 라우트에는 어떤 인증/권한 검사도 없음.
--    즉 로그인 여부와 무관하게 누구나 관리자센터 화면을 열 수 있고,
--    화면의 모든 조회는 service_role이 아닌 anon/authenticated
--    클라이언트 키로 수행된다 (src/lib/supabase.ts 확인 결과 동일).
-- 2) supabase/subscriptions.sql 에 정의된 정책은
--       "Users can view own subscriptions" USING (auth.uid() = user_id)
--    뿐이라 본인 데이터 외에는 어떤 세션으로 조회해도 0건으로 보인다.
-- 3) profiles 테이블은 이 레포의 어떤 마이그레이션에도 CREATE TABLE이
--    없다 (Supabase 대시보드에서 직접 생성된 것으로 추정). 표준적인
--    "auth.uid() = id" 본인 전용 RLS 정책이 걸려 있다면 마찬가지로
--    관리자 세션이 아닌 한 0건으로 보인다 — 실제 회원이 1명 있는데도
--    관리자센터에 총 회원수 0/—, "회원 데이터를 불러올 수 없습니다"로
--    보이는 현상과 정확히 일치한다.
--
-- 이 마이그레이션이 하는 일
-- ------------------------------------------------------------
-- series/episodes 테이블에 이미 적용된 것과 동일한 "임시 관리자 모델"
-- (001_init.sql 주석: "관리자 Auth 구현 전 임시")을 profiles/subscriptions
-- 에도 동일하게 적용해 관리자센터가 실제 데이터를 읽을 수 있게 한다.
--
-- ⚠️ 보안 트레이드오프 주의
-- ------------------------------------------------------------
-- 아래 정책은 anon 키만 있으면 누구나 모든 회원의 profiles/subscriptions
-- 행을 읽을 수 있게 만든다 (이메일 등 PII 포함 가능). series_anon_*
-- 정책과 동일한 수준의 "임시" 조치이며, 실제 운영 단계에서는 반드시
-- 1) /admin 라우트에 관리자 로그인 검사를 추가하고
-- 2) 아래 정책을 "auth.uid() = id" 본인 전용 + "관리자만 전체 조회"
--    (예: profiles.is_admin = true 컬럼 또는 별도 admin_users 테이블)
--    조합으로 교체할 것을 강력히 권장한다.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. profiles 테이블 진단 + 관리자 조회 정책
--    (테이블 존재 여부를 모르는 채로 작성되었으므로 안전하게 존재
--     여부를 먼저 확인한다 — 추측으로 CREATE TABLE 하지 않음)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';

    BEGIN
      EXECUTE 'CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT USING (true)';
      RAISE NOTICE '생성됨: profiles_admin_read (관리자센터 전체 조회 허용)';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '정책 이미 존재함: profiles_admin_read';
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'profiles RLS 정책 권한 없음 — Dashboard > Authentication > Policies 에서 수동 설정 필요';
    END;
  ELSE
    RAISE NOTICE '⚠ public.profiles 테이블이 존재하지 않습니다. 회원가입 트리거가 실제로 row를 만들고 있는지(또는 raw_user_meta_data 트리거 함수가 정상 동작하는지) 먼저 확인하세요.';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. subscriptions 테이블 관리자 조회 정책 추가
--    기존 "Users can view own subscriptions" 정책은 그대로 두고,
--    관리자센터용 정책을 추가한다 (RLS 정책은 OR로 합산되므로
--    기존 본인 전용 정책과 충돌하지 않음).
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    BEGIN
      EXECUTE 'CREATE POLICY "subscriptions_admin_read" ON public.subscriptions FOR SELECT USING (true)';
      RAISE NOTICE '생성됨: subscriptions_admin_read (관리자센터 전체 조회 허용)';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '정책 이미 존재함: subscriptions_admin_read';
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'subscriptions RLS 정책 권한 없음 — Dashboard에서 수동 설정 필요';
    END;

    -- 관리자센터(AdminDashboard.tsx)는 구독 부여/취소/연장을 위해
    -- INSERT/UPDATE도 클라이언트에서 직접 수행한다 (handleGrantMembership 등).
    -- 기존 subscriptions.sql 주석은 "service_role만 insert/update 가능"이라고
    -- 되어 있으나 실제 코드는 anon/authenticated 클라이언트로 직접 쓰기 때문에,
    -- 마찬가지로 series_anon_insert/update 정책과 동일한 임시 모델을 맞춘다.
    BEGIN
      EXECUTE 'CREATE POLICY "subscriptions_admin_write" ON public.subscriptions FOR INSERT WITH CHECK (true)';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE '정책 이미 존재함: subscriptions_admin_write';
    END;
    BEGIN
      EXECUTE 'CREATE POLICY "subscriptions_admin_update" ON public.subscriptions FOR UPDATE USING (true)';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE '정책 이미 존재함: subscriptions_admin_update';
    END;
  ELSE
    RAISE NOTICE '⚠ public.subscriptions 테이블이 존재하지 않습니다.';
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. 진단용 조회 쿼리 (이 마이그레이션 적용 후 Supabase SQL Editor에서
--    직접 실행해 실제 데이터를 눈으로 확인할 것 — 추측 금지 원칙)
-- ────────────────────────────────────────────────────────────
-- 3-1) profiles 실제 컬럼 구성 확인
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
--
-- 3-2) profiles 실제 row 수 (RLS 우회한 service_role 기준 — SQL Editor는 기본적으로
--      RLS를 우회하는 권한으로 실행되므로 이 값이 "진짜" 총 회원수다)
--   SELECT count(*) AS real_profile_count FROM public.profiles;
--
-- 3-3) subscriptions 실제 컬럼 구성 확인 (membership_level/current_period_* 가
--      실제로 존재하는지 — supabase/subscriptions.sql 문서는 plan/start_date/
--      end_date로 되어 있어 현재 앱 코드와 불일치하는 "오래된 문서"일 수 있음)
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='subscriptions' ORDER BY ordinal_position;
--
-- 3-4) episode_views 실제 적재 여부 (최근 7일)
--   SELECT date_trunc('day', viewed_at) AS day, count(*) FROM public.episode_views
--   WHERE viewed_at >= now() - interval '7 days' GROUP BY 1 ORDER BY 1;
--
-- 3-5) series 테이블 실제 컬럼 구성 확인 (genre/category 컬럼이 정말 없는지 재확인)
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='series' ORDER BY ordinal_position;
-- ============================================================
