-- ============================================================
-- FRAMIX OTT — series 테이블 선택 컬럼 보장
-- 파일명: 021_series_optional_columns.sql
-- 대상: banner_enabled, banner_order, top10_rank, is_new
--
-- AdminDashboard.tsx의 2단계 fetch에서 이 컬럼들을 별도 조회함.
-- DB에 없으면 조회 실패해도 1단계(핵심 통계)는 유지되나,
-- 배너 ON/OFF / TOP10 / 신작 기능을 사용하려면 이 SQL 필요.
-- ============================================================

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS banner_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS banner_order int NOT NULL DEFAULT 0;

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS top10_rank int;

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

-- PostgREST 스키마 캐시 강제 갱신
NOTIFY pgrst, 'reload schema';

-- 검증
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'series'
  AND column_name IN ('genres', 'banner_enabled', 'banner_order', 'top10_rank', 'is_new')
ORDER BY column_name;
