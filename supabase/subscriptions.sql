-- ─── subscriptions 테이블 ────────────────────────────────────────────────────
-- Supabase SQL Editor에서 실행하세요.
--
-- ⚠️ 2026-06-21 감사 노트: 이 파일의 plan/status/start_date/end_date 컬럼명은
-- 실제 앱 코드(src/hooks/useSubscription.ts, useMySubscription.ts,
-- src/pages/PaymentSuccess.tsx, MySubscription.tsx, Subscription.tsx,
-- src/pages/admin/AdminDashboard.tsx 전부)가 사용하는
-- membership_level / status / current_period_start / current_period_end 와
-- 일치하지 않는다. 즉 실제 운영 중인 테이블은 이 파일이 처음 작성된 이후
-- Supabase 대시보드에서 직접 컬럼명이 변경된 것으로 보이며, 이 파일은
-- 더 이상 실제 스키마를 반영하지 않는 "오래된 문서"다.
-- 실제 컬럼 구성은 supabase/migrations/018_admin_visibility_fix.sql 하단의
-- 진단 쿼리(3-3)로 직접 확인할 것 — 이 파일을 기준으로 추측하지 말 것.

create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan        text not null,          -- 'basic' | 'premium' | 'yearly' 등
  status      text not null,          -- 'active' | 'cancelled' | 'expired'
  start_date  timestamptz not null default now(),
  end_date    timestamptz,
  created_at  timestamptz not null default now()
);

-- 인덱스
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

-- RLS 활성화
alter table public.subscriptions enable row level security;

-- 본인 구독 데이터만 조회 가능
create policy "Users can view own subscriptions"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- 관리자(service_role)만 insert/update/delete 가능 (실제 결제 연동 시 서버에서 처리)
