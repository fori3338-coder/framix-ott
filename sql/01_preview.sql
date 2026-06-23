-- ============================================================
-- FRAMIX OTT — 병합 대상 미리보기 (읽기 전용, 수정 없음)
-- 파일명: 01_preview.sql
-- 목적: 02_fix_fragmented_series.sql 실행 전, 어떤 series row들이
--       하나로 합쳐질지 미리 확인한다. UPDATE/DELETE 없음 — 안전하게 실행 가능.
--
-- 판별 규칙: 제목이 "...<숫자>화" 로 끝나고, 숫자를 뗀 나머지(base_title)가
--           동일한 series row가 2개 이상 존재하면 "쪼개진 시리즈" 그룹으로 간주.
-- ============================================================

WITH fragment_groups AS (
  SELECT
    s.id          AS series_id,
    s.title       AS original_title,
    s.created_at,
    s.status,
    s.thumbnail_url,
    s.backdrop_url,
    regexp_replace(btrim(s.title), '\s*[0-9]+\s*화\s*$', '') AS base_title,
    (regexp_match(btrim(s.title), '([0-9]+)\s*화\s*$'))[1]::int AS ep_num
  FROM public.series s
  WHERE btrim(s.title) ~ '[0-9]+\s*화\s*$'
    AND s.status = 'active'
    AND s.title NOT LIKE '[병합됨]%'
),
group_sizes AS (
  SELECT base_title, count(*) AS series_row_count
  FROM fragment_groups
  GROUP BY base_title
  HAVING count(*) > 1
)
SELECT
  fg.base_title         AS "병합후_제목",
  fg.ep_num              AS "추출된_화수",
  fg.original_title      AS "현재_series_title",
  fg.series_id,
  fg.status,
  (SELECT count(*) FROM public.episodes e WHERE e.series_id = fg.series_id) AS "보유_episode_수",
  CASE WHEN fg.thumbnail_url IS NOT NULL THEN '있음' ELSE '없음' END AS "poster_보유",
  CASE WHEN fg.backdrop_url IS NOT NULL THEN '있음' ELSE '없음' END AS "backdrop_보유"
FROM fragment_groups fg
JOIN group_sizes gs USING (base_title)
ORDER BY fg.base_title, fg.ep_num, fg.created_at;

-- 위 결과에서 같은 "병합후_제목" 그룹이 여러 row로 보이면 02번 스크립트가
-- 이 그룹들을 ep_num이 가장 작은 row(보통 1화) 하나로 합치고 나머지는
-- status = 'inactive' 로 숨김 처리합니다. (행 삭제 없음, video_url 보존)
