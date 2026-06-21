-- ============================================================
-- FRAMIX OTT — series.genres 컬럼 보장 + PostgREST 스키마 캐시 강제 갱신
-- 파일명: 020_ensure_series_genres_column.sql
-- 작성일: 2026-06-21
--
-- 배경
-- ------------------------------------------------------------
-- 001_init.sql 기준 series.genres(text[])는 분명히 정의되어 있고,
-- AdminDashboard.tsx의 select 절도 genres(복수)만 사용하도록 이미
-- 수정되어 있다 (genre/category 단수 컬럼은 코드 어디에도 없음).
--
-- 그럼에도 실제 배포 화면에서
--   column series.genres does not exist
-- 오류가 계속 보인다면, 코드 문제가 아니라 다음 둘 중 하나다:
--   1) 001_init.sql이 실제 운영 Supabase 프로젝트에 적용되지 않았거나
--      도중에 컬럼이 삭제된 경우 (DB 자체에 컬럼이 없음)
--   2) 컬럼은 있지만 PostgREST(Supabase API 게이트웨이)가 가지고 있는
--      스키마 캐시가 오래되어, 실제 컬럼 변경 사항을 아직 인식하지
--      못하는 경우 (Supabase에서 흔히 발생 — 특히 대시보드에서 직접
--      테이블을 수정했을 때)
--
-- 이 마이그레이션은 두 경우를 모두 안전하게 처리한다:
--   - 컬럼이 없으면 추측 없이 001_init.sql과 동일한 정의로 추가
--     (IF NOT EXISTS — 이미 있으면 아무 동작 없음, 데이터 손실 없음)
--   - 마지막에 PostgREST에 스키마 재로드 신호를 보내 캐시를 강제 갱신
--     (이 NOTIFY는 Supabase 표준 권장 방법이며 데이터에 영향 없음)
-- ============================================================

-- 1) 컬럼 존재 보장 (없을 때만 추가, 있으면 무시)
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}';

-- 2) 검증: 컬럼이 실제로 존재하는지 확인 후 결과를 NOTICE로 출력
DO $$
DECLARE
  col_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'series' AND column_name = 'genres'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE NOTICE '✅ public.series.genres 컬럼 확인됨 (text[])';
  ELSE
    RAISE EXCEPTION '❌ public.series.genres 컬럼 생성 실패 — 권한 문제일 수 있음. Supabase 대시보드에서 직접 확인 필요.';
  END IF;
END $$;

-- 3) PostgREST 스키마 캐시 강제 갱신
--    Supabase는 PostgREST가 스키마 변경을 자동 감지하지 못하는 경우가 있어
--    이 NOTIFY를 공식적으로 권장한다. 데이터/구조에는 어떤 영향도 주지 않음.
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- 4. 적용 후 직접 확인할 것 (SQL Editor)
-- ────────────────────────────────────────────────────────────
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='series' ORDER BY ordinal_position;
--   -- genres | ARRAY 행이 보이면 정상.
--
--   이 마이그레이션 적용 후에도 관리자센터에서 여전히 같은 오류가
--   보인다면, 그건 DB가 아니라 "배포된 프론트엔드 빌드가 최신 코드를
--   반영하지 못한 것"이다 (Cloudflare Pages 재배포 필요).
-- ============================================================
