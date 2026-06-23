-- Migration: 023_hero_banner_cms_fix.sql
-- STEP: Hero Banner CMS 컬럼 재정의 (022_hero_banner_cms.sql 대체)
--
-- 배경:
-- 022_hero_banner_cms.sql 이 정의한 banner_image_url 컬럼은 실제 운영 DB에
-- 한 번도 적용되지 않았다. Hero 배경 이미지 소스는 처음부터 series.backdrop_url
-- (Studio 콘텐츠 업로드 시 저장됨)을 그대로 사용하는 것으로 확정한다.
-- 022_hero_banner_cms.sql 은 더 이상 적용 대상이 아니다 (사용 금지).
--
-- 실제 운영 DB 확인 결과 series 테이블에 존재하는 컬럼: backdrop_url,
-- thumbnail_url, banner_enabled, banner_order. 이 마이그레이션이 새로
-- 추가하는 컬럼은 banner_title / banner_description / banner_video_url
-- 세 개뿐이다. banner_image_url 컬럼은 생성하지 않는다.

ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS banner_title       text,
  ADD COLUMN IF NOT EXISTS banner_description text,
  ADD COLUMN IF NOT EXISTS banner_video_url    text,
  ADD COLUMN IF NOT EXISTS banner_updated_at   timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.series.banner_title       IS '배너 전용 제목 override. NULL/빈문자열이면 series.title 사용';
COMMENT ON COLUMN public.series.banner_description IS '배너 전용 설명 override. NULL/빈문자열이면 series.description 사용';
COMMENT ON COLUMN public.series.banner_video_url   IS '배너 진입 3초 후 자동재생할 프리뷰 영상 URL (선택). NULL이거나 재생 오류 시 series.backdrop_url 이미지로 폴백';
COMMENT ON COLUMN public.series.banner_updated_at  IS '배너 항목 마지막 수정 시각 (관리자 저장 시 트리거로 자동 갱신)';

-- 일부 환경에서 022_hero_banner_cms.sql 이 부분 적용되어 banner_image_url
-- 컬럼이 남아있을 가능성에 대비한 안전 제거. (현재 확인된 운영 DB에는
-- 애초에 존재하지 않으므로 정상적인 경우 no-op.)
ALTER TABLE public.series DROP COLUMN IF EXISTS banner_image_url;

-- 저장 시 자동으로 banner_updated_at 갱신 (배너 관련 컬럼이 바뀔 때만)
-- ※ 022 버전과 달리 banner_image_url 컬럼을 더 이상 참조하지 않는다.
CREATE OR REPLACE FUNCTION public.touch_banner_updated_at()
RETURNS trigger AS $$
BEGIN
  IF (NEW.banner_enabled, NEW.banner_order, NEW.banner_title, NEW.banner_description, NEW.banner_video_url)
     IS DISTINCT FROM
     (OLD.banner_enabled, OLD.banner_order, OLD.banner_title, OLD.banner_description, OLD.banner_video_url)
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

-- PostgREST 스키마 캐시를 즉시 갱신해 새 컬럼이 바로 API에 반영되도록 한다.
NOTIFY pgrst, 'reload schema';
