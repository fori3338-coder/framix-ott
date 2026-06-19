-- Migration: 007_platform_settings.sql
-- STEP6-3: 플랫폼 설정 (공지사항 / 메인 배너 문구 / 추천 알고리즘 / TOP10 자동 여부 / 신작 노출 개수)
--
-- 사전 확인 결과: 레포 내 supabase/migrations/*.sql 전체에 'settings' 또는
-- 'platform_settings' 테이블 정의가 존재하지 않음 → 신규 생성.
--
-- 싱글톤 테이블 패턴: id를 1로 고정해 항상 단 하나의 설정 행만 존재하도록 강제.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                   smallint     PRIMARY KEY DEFAULT 1,
  notice               text         NOT NULL DEFAULT '',   -- 공지사항
  hero_banner_text     text         NOT NULL DEFAULT '',   -- 메인 배너 문구
  recommend_algorithm  text         NOT NULL DEFAULT 'balanced', -- 추천 알고리즘 ('balanced' | 'views' | 'rating' | 'latest')
  top10_auto           boolean      NOT NULL DEFAULT true,  -- TOP10 자동 집계 여부 (false면 관리자 수동 지정 우선)
  new_release_count    int          NOT NULL DEFAULT 10,    -- 신작 노출 개수
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT platform_settings_singleton CHECK (id = 1)
);

COMMENT ON TABLE public.platform_settings IS 'FRAMIX 플랫폼 전역 설정 (싱글톤, 단일 행)';

-- 기본 설정 행 1개 보장 (이미 있으면 무시)
INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
