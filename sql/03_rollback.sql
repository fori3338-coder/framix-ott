-- ============================================================
-- FRAMIX OTT — 롤백 (02_fix_fragmented_series.sql 적용 결과를 원복)
-- 파일명: 03_rollback.sql
-- 언제 쓰는가: 02번 적용 후 예상과 다른 결과가 나왔을 때만 실행.
--             00_backup.sql 에서 만든 백업 테이블로 series/episodes를
--             완전히 원래 상태로 되돌린다.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.series_backup_20260618') IS NULL
     OR to_regclass('public.episodes_backup_20260618') IS NULL THEN
    RAISE EXCEPTION '백업 테이블이 없습니다. 롤백할 수 없습니다.';
  END IF;
END $$;

-- 자식(episodes) → 부모(series) 순서로 비우고, 부모 → 자식 순서로 복원한다.
-- (episodes.series_id 가 ON DELETE CASCADE 이므로 순서를 지키지 않으면
--  방금 복원한 episodes가 series 삭제 시 같이 cascade 삭제되어 버린다)
DELETE FROM public.episodes;
DELETE FROM public.series;

INSERT INTO public.series
SELECT * FROM public.series_backup_20260618;

INSERT INTO public.episodes
SELECT * FROM public.episodes_backup_20260618;

COMMIT;

-- 복원 확인
SELECT
  (SELECT count(*) FROM public.series)   AS series_count_restored,
  (SELECT count(*) FROM public.episodes) AS episodes_count_restored;
