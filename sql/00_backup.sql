-- ============================================================
-- FRAMIX OTT — 데이터 백업 (수정 전 필수 실행)
-- 파일명: 00_backup.sql
-- 목적: series / episodes 테이블 전체를 동결 스냅샷으로 백업
--       (영상/썸네일 URL 포함 — 절대 삭제되지 않음, 사고 발생 시 01_rollback.sql로 즉시 복구 가능)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.series_backup_20260618 AS
TABLE public.series;

CREATE TABLE IF NOT EXISTS public.episodes_backup_20260618 AS
TABLE public.episodes;

-- 백업 row 수 확인 (원본과 반드시 일치해야 함)
SELECT
  (SELECT count(*) FROM public.series)                    AS series_count,
  (SELECT count(*) FROM public.series_backup_20260618)    AS series_backup_count,
  (SELECT count(*) FROM public.episodes)                  AS episodes_count,
  (SELECT count(*) FROM public.episodes_backup_20260618)  AS episodes_backup_count;
