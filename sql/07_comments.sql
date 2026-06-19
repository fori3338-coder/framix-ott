-- FRAMIX comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  episode_id text not null,
  user_id uuid not null,
  user_name text not null,
  content text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert to authenticated with check (auth.uid() = user_id);

create index idx_comments_episode_id on comments(episode_id);
create index idx_comments_created_at on comments(created_at desc);
