-- ============================================================
-- FRAMIX OTT — 회원가입 시 profiles 자동 생성 트리거
-- 파일명: 019_profile_auto_create.sql
-- 작성일: 2026-06-21
--
-- 배경 (018_admin_visibility_fix.sql 진단 결과로 확인된 사실)
-- ------------------------------------------------------------
-- auth.users 에는 실제 가입자가 1명 존재하지만 public.profiles 는
-- 0건이다. 이 레포의 어떤 마이그레이션에도 profiles CREATE TABLE이
-- 없고, auth.users → profiles 를 연결하는 트리거/함수도 전혀 없다.
-- 즉 회원가입(Auth) 자체는 정상 동작하지만, 그 다음 단계인
-- "프로필 행 생성"이 누락되어 관리자센터 회원수가 0으로 보였다.
--
-- 추가로 AdminDashboard.tsx의 "신규 가입" 통계는
--   profiles.select("id").gte("created_at", 오늘날짜)
-- 를 사용하므로, profiles.created_at 컬럼도 없으면 이 통계만 따로
-- 계속 비어 보인다. 이 마이그레이션은 그 컬럼도 함께 보장한다.
--
-- profiles 테이블의 정확한 컬럼 구성은 코드상 보장되지 않으므로
-- (Supabase 대시보드에서 수동 생성된 것으로 추정) 컬럼을 추측해서
-- CREATE TABLE 하지 않고, 실행 시점에 information_schema로 실제
-- 존재하는 컬럼만 확인해 안전하게 다룬다.
--
-- 절대 금지 원칙 준수
-- ------------------------------------------------------------
-- - profiles 테이블을 추측으로 새로 만들지 않음 (이미 있는 테이블만 다룸)
-- - id / email / created_at 외의 컬럼은 절대 건드리지 않음
-- - 기존 데이터/행을 삭제하거나 덮어쓰지 않음 (ON CONFLICT DO NOTHING)
-- - created_at 컬럼이 없을 때만 추가하며, 기본값은 표준 패턴인 now()
-- ============================================================

DO $$
DECLARE
  has_profiles boolean;
  has_email_col boolean;
  has_created_at_col boolean;
  insert_cols text;
  insert_vals text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO has_profiles;

  IF NOT has_profiles THEN
    RAISE NOTICE '⚠ public.profiles 테이블이 존재하지 않아 트리거를 생성하지 않습니다. 먼저 Supabase 대시보드에서 profiles 테이블 존재 여부를 확인하세요.';
    RETURN;
  END IF;

  -- ────────────────────────────────────────────────────────────
  -- 0. created_at 컬럼이 없으면 추가 (관리자센터 "신규 가입" 통계에 필요)
  --    이미 있으면 아무 동작 없음 — 기존 컬럼/데이터에 영향 없음.
  -- ────────────────────────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) INTO has_created_at_col;

  IF NOT has_created_at_col THEN
    BEGIN
      EXECUTE 'ALTER TABLE public.profiles ADD COLUMN created_at timestamptz NOT NULL DEFAULT now()';
      RAISE NOTICE 'profiles.created_at 컬럼 추가됨 (기존에 없었음)';
      has_created_at_col := true;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠ profiles.created_at 컬럼 추가 권한 없음 — "신규 가입" 통계는 계속 비어 보일 수 있음.';
    END;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) INTO has_email_col;

  -- ────────────────────────────────────────────────────────────
  -- 1. 함수 정의: profiles 실제 컬럼 구성에 맞춰 동적으로 INSERT 컬럼 결정
  --    (SECURITY DEFINER로 RLS 우회 — auth 트리거의 표준 패턴)
  -- ────────────────────────────────────────────────────────────
  insert_cols := 'id';
  insert_vals := 'NEW.id';
  IF has_email_col THEN
    insert_cols := insert_cols || ', email';
    insert_vals := insert_vals || ', NEW.email';
  END IF;
  IF has_created_at_col THEN
    insert_cols := insert_cols || ', created_at';
    insert_vals := insert_vals || ', NEW.created_at';
  END IF;

  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      INSERT INTO public.profiles (%s)
      VALUES (%s)
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $body$;
  $f$, insert_cols, insert_vals);

  RAISE NOTICE 'handle_new_user() 생성됨 (컬럼: %)', insert_cols;

  -- ────────────────────────────────────────────────────────────
  -- 2. 트리거 연결: auth.users INSERT 시 자동 호출
  -- ────────────────────────────────────────────────────────────
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  RAISE NOTICE '트리거 생성됨: on_auth_user_created (이후 가입자부터 profiles 자동 생성)';

  -- ────────────────────────────────────────────────────────────
  -- 3. 백필: 이미 가입했지만 profiles 행이 없는 기존 사용자 보정.
  --    created_at은 마이그레이션 실행 시각이 아니라 실제 auth.users의
  --    가입 시각을 그대로 사용한다 (그래야 "신규 가입" 통계가 오늘 실행한
  --    이 마이그레이션 때문에 부풀려지지 않음).
  -- ────────────────────────────────────────────────────────────
  EXECUTE format($f$
    INSERT INTO public.profiles (%s)
    SELECT u.id%s
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
  $f$,
    insert_cols,
    (CASE WHEN has_email_col THEN ', u.email' ELSE '' END) ||
    (CASE WHEN has_created_at_col THEN ', u.created_at' ELSE '' END)
  );

  RAISE NOTICE '백필 완료: profiles 행이 없던 기존 auth.users를 모두 보정했습니다 (가입 시각은 원래 가입일 그대로 유지).';
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. 검증용 쿼리 (적용 후 SQL Editor에서 직접 실행해 확인)
-- ────────────────────────────────────────────────────────────
--   SELECT count(*) FROM auth.users;
--   SELECT count(*) FROM public.profiles;
--   -- 위 두 값이 일치해야 정상.
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
-- ============================================================
