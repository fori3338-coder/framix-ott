-- Migration: 003_admin_dashboard_views.sql
-- Admin Dashboard에서 series.views 합계를 집계하기 위한 인덱스
-- (필요 시 추가 최적화용)

-- series 테이블에 views 컬럼 인덱스 (조회수 DESC 정렬 최적화)
CREATE INDEX IF NOT EXISTS idx_series_views_desc ON series (views DESC NULLS LAST);

-- series 테이블에 created_at 인덱스 (최근 생성 콘텐츠 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_series_created_at_desc ON series (created_at DESC NULLS LAST);
