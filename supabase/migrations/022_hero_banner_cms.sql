-- Migration: 022_hero_banner_cms.sql
-- STEP: Hero Banner CMS + Video Preview CMS
--
-- ⚠️ DEPRECATED — 사용 금지 (superseded by 023_hero_banner_cms_fix.sql)
-- 이 파일은 실제 운영 DB에 적용된 적이 없으며, banner_image_url 컬럼 설계는
-- 폐기되었다. Hero 배경 이미지는 항상 series.backdrop_url을 사용한다.
-- 이 파일을 실행하지 말 것. 023_hero_banner_cms_fix.sql만 적용한다.
--
-- 006_banner_top10_admin.sql 에서 이미 banner_enabled / banner_order 컬럼을 추가했음.
-- 이번 마이그레이션은 배너에 노출되는 "내용"을 관리자가 작품 원본 데이터와
-- 별도로 지정할 수 있도록 override 컬럼을 추가한다 (전부 NULL 허용 — 비어 있으면
-- 기존처럼 series.title / description / backdrop_url을 그대로 사용해 폴백한다).

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS banner_title         text,
  ADD COLUMN IF NOT EXISTS banner_description   text,
  ADD COLUMN IF NOT EXISTS banner_image_url      text,
  ADD COLUMN IF NOT EXISTS banner_video_url      text,
  ADD COLUMN IF NOT EXISTS banner_updated_at     timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.series.banner_title       IS '배너 전용 제목 override. NULL이면 series.title 사용';
COMMENT ON COLUMN public.series.banner_description IS '배너 전용 설명 override. NULL이면 series.description 사용';
COMMENT ON COLUMN public.series.banner_image_url   IS '배너 전용 이미지 override. NULL이면 series.backdrop_url/thumbnail_url 사용';
COMMENT ON COLUMN public.series.banner_video_url   IS '배너 진입 시 자동재생할 프리뷰 영상 URL (선택, 비어있으면 이미지만 노출)';
COMMENT ON COLUMN public.series.banner_updated_at  IS '배너 항목 마지막 수정 시각 (관리자 저장 시 갱신)';

-- 저장 시 자동으로 banner_updated_at 갱신 (배너 관련 컬럼이 바뀔 때만)
CREATE OR REPLACE FUNCTION public.touch_banner_updated_at()
RETURNS trigger AS $$
BEGIN
  IF (NEW.banner_enabled, NEW.banner_order, NEW.banner_title, NEW.banner_description, NEW.banner_image_url, NEW.banner_video_url)
     IS DISTINCT FROM
     (OLD.banner_enabled, OLD.banner_order, OLD.banner_title, OLD.banner_description, OLD.banner_image_url, OLD.banner_video_url)
  THEN
    NEW.banner_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_banner_updated_at ON public.series;
CREATE TRIGGER trg_touch_banner_updated_at
  BEFORE UPDATE ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_banner_updated_at();
