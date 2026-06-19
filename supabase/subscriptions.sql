-- ─── subscriptions 테이블 ────────────────────────────────────────────────────
-- Supabase SQL Editor에서 실행하세요.

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
