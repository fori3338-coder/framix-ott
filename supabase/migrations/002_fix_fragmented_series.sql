-- ============================================================
-- FRAMIX OTT — 쪼개진 series → 단일 series + 다중 episodes 병합
-- 파일명: 02_fix_fragmented_series.sql
-- 사전 조건: 00_backup.sql 을 먼저 실행했는지 확인할 것.
--
-- 무엇을 하는가:
--   1) 제목이 "<작품명> <N>화" 형태이고, 같은 <작품명>을 가진 series row가
--      2개 이상 존재하는 그룹을 찾는다 (= 쪼개진 시리즈).
--   2) 그룹에서 N이 가장 작은 row(보통 1화, 동률이면 가장 먼저 생성된 row)를
--      "대표 series"로 지정한다.
--   3) 그룹에 속한 모든 episodes row를, "추출된 화수" 기준으로 정렬한 뒤
--      대표 series 밑으로 옮기고 episode_number를 1..N으로 재부여한다.
--      (series_id, episode_number만 변경 — video_url/thumbnail_url 등
--       나머지 컬럼은 전혀 건드리지 않음 → 데이터 손실 없음)
--   4) 대표 series의 title을 "<작품명>"(접미사 제거)으로 정리하고,
--      poster/backdrop이 비어 있으면 그룹 내 다른 row의 값으로 보강한다.
--   5) 대표가 아닌 나머지 series row는 status='inactive' 로 전환해
--      Home 화면(.eq('status','active'))에서 더 이상 노출되지 않게 한다.
--      ⚠️ DELETE 하지 않음 — 행 자체는 남아있고 언제든 복구 가능.
--   6) 영향받은 모든 series의 total_episodes를 실제 episodes 수로 재계산한다.
--
-- 영향 범위: 제목이 "...N화" 패턴으로 끝나면서 동일 작품명을 공유하는
--           series가 2개 이상인 경우만 대상. 정상적으로 1개의 series row에
--           여러 episodes가 들어있는 작품은 전혀 건드리지 않는다.
-- ============================================================

BEGIN;

-- 0) 백업 존재 확인 (없으면 즉시 중단)
DO $$
BEGIN
  IF to_regclass('public.series_backup_20260618') IS NULL
     OR to_regclass('public.episodes_backup_20260618') IS NULL THEN
    RAISE EXCEPTION '백업 테이블이 없습니다. 먼저 00_backup.sql 을 실행하세요.';
  END IF;
END $$;

-- 1) 쪼개진 그룹 + 대표(canonical) series 매핑
CREATE TEMP TABLE _fragment_groups AS
SELECT
  s.id          AS series_id,
  s.created_at,
  s.thumbnail_url,
  s.backdrop_url,
  regexp_replace(btrim(s.title), '\s*[0-9]+\s*화\s*$', '') AS base_title,
  (regexp_match(btrim(s.title), '([0-9]+)\s*화\s*$'))[1]::int AS ep_num
FROM public.series s
WHERE btrim(s.title) ~ '[0-9]+\s*화\s*$'
  AND s.status = 'active'                 -- 이미 비활성화된(병합된) row는 재대상에서 제외
  AND s.title NOT LIKE '[병합됨]%';        -- 재실행(idempotent) 시 중복 처리 방지

CREATE TEMP TABLE _group_sizes AS
SELECT base_title, count(*) AS cnt
FROM _fragment_groups
GROUP BY base_title
HAVING count(*) > 1;

CREATE TEMP TABLE _target_groups AS
SELECT fg.*
FROM _fragment_groups fg
JOIN _group_sizes gs USING (base_title);

CREATE TEMP TABLE _canonical AS
SELECT DISTINCT ON (base_title)
  base_title,
  series_id AS canonical_id
FROM _target_groups
ORDER BY base_title, ep_num ASC, created_at ASC;

-- 2) poster/backdrop 보강용: 그룹 내에서 최초로 발견되는 non-null 값
CREATE TEMP TABLE _fallback_images AS
SELECT
  base_title,
  (array_agg(thumbnail_url ORDER BY ep_num) FILTER (WHERE thumbnail_url IS NOT NULL))[1] AS fallback_thumbnail,
  (array_agg(backdrop_url  ORDER BY ep_num) FILTER (WHERE backdrop_url  IS NOT NULL))[1] AS fallback_backdrop
FROM _target_groups
GROUP BY base_title;

-- 3) episodes 재배치 매핑 (그룹 내 ep_num → episode_number 1..N 순서로)
CREATE TEMP TABLE _episode_mapping AS
SELECT
  e.id AS episode_id,
  c.canonical_id,
  row_number() OVER (
    PARTITION BY tg.base_title
    ORDER BY tg.ep_num ASC, e.episode_number ASC, e.created_at ASC
  )::int AS new_episode_number
FROM public.episodes e
JOIN _target_groups tg ON tg.series_id = e.series_id
JOIN _canonical c ON c.base_title = tg.base_title;

-- 4) 1단계: 충돌 방지용 임시 episode_number (대형 offset)로 먼저 이동
UPDATE public.episodes e
SET series_id = em.canonical_id,
    episode_number = em.new_episode_number + 1000000
FROM _episode_mapping em
WHERE e.id = em.episode_id;

-- 5) 2단계: 최종 episode_number로 확정 (이 시점엔 offset 덕분에 충돌 없음)
UPDATE public.episodes e
SET episode_number = em.new_episode_number
FROM _episode_mapping em
WHERE e.id = em.episode_id;

-- 6) 대표 series 정리: 제목 정리 + poster/backdrop 보강
UPDATE public.series s
SET title = c.base_title,
    thumbnail_url = COALESCE(s.thumbnail_url, fi.fallback_thumbnail),
    backdrop_url  = COALESCE(s.backdrop_url, fi.fallback_backdrop)
FROM _canonical c
JOIN _fallback_images fi USING (base_title)
WHERE s.id = c.canonical_id;

-- 7) 대표가 아닌 나머지 row는 비활성화 (DELETE 아님 — 데이터 보존)
UPDATE public.series s
SET status = 'inactive',
    title = '[병합됨] ' || s.title
WHERE s.id IN (
  SELECT tg.series_id
  FROM _target_groups tg
  JOIN _canonical c USING (base_title)
  WHERE tg.series_id <> c.canonical_id
)
AND s.title NOT LIKE '[병합됨]%';

-- 8) total_episodes 재계산 (영향받은 모든 series — 대표 + 비활성화된 row 전부)
UPDATE public.series s
SET total_episodes = COALESCE(
  (SELECT count(*) FROM public.episodes e WHERE e.series_id = s.id), 0
)
WHERE s.id IN (
  SELECT series_id FROM _target_groups
);

COMMIT;

-- ── 결과 확인 ──────────────────────────────────────────────────
SELECT id, title, status, total_episodes, thumbnail_url, backdrop_url
FROM public.series
WHERE id IN (SELECT canonical_id FROM _canonical)
   OR title LIKE '[병합됨]%'
ORDER BY title;
