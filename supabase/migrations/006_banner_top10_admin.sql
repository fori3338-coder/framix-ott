-- Migration: 006_banner_top10_admin.sql
-- STEP6-2: 배너 관리 / TOP10 관리 / 신작 관리 (관리자 수동 제어)
--
-- 신작 관리는 기존 series.is_new 컬럼을 그대로 사용 (이미 존재, 추가 컬럼 불필요).
-- 배너 관리, TOP10 관리는 신규 컬럼이 필요하므로 아래에서 추가한다.

-- ────────────────────────────────────────────────────────────
-- 1. 배너(HeroBanner) 관리
--    banner_enabled : 관리자가 "대표 작품"으로 지정해 HeroBanner에 노출할지 여부
--    banner_order   : 배너 내 정렬 순서 (낮을수록 먼저 노출)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banner_order   int     NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.series.banner_enabled IS '관리자가 HeroBanner 대표작품으로 지정했는지 여부';
COMMENT ON COLUMN public.series.banner_order   IS 'HeroBanner 노출 순서 (오름차순)';

CREATE INDEX IF NOT EXISTS idx_series_banner
  ON public.series (banner_enabled, banner_order)
  WHERE banner_enabled = true;

-- ────────────────────────────────────────────────────────────
-- 2. TOP10 관리
--    top10_rank : NULL이면 views 기준 자동 집계, 1~10 값이 있으면 수동 고정 순위
--    (자동/수동을 컬럼 하나로 표현: NULL = 자동, 정수 = 수동 지정)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS top10_rank int;

COMMENT ON COLUMN public.series.top10_rank IS 'TOP10 수동 순위(1~10). NULL이면 views 기준 자동 집계';

CREATE INDEX IF NOT EXISTS idx_series_top10_rank
  ON public.series (top10_rank)
  WHERE top10_rank IS NOT NULL;
