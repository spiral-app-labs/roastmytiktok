-- RoastMyTikTok: roast sessions table
create table if not exists rmt_roast_sessions (
  id text primary key,
  session_id text not null,
  created_at timestamptz default now(),
  source text check (source in ('upload','url')),
  filename text,
  video_url text,
  tiktok_url text,
  overall_score integer,
  verdict text,
  agent_scores jsonb,
  findings jsonb
);

create index if not exists idx_rmt_sessions_session_id on rmt_roast_sessions(session_id);
create index if not exists idx_rmt_sessions_created_at on rmt_roast_sessions(created_at desc);

-- Enable RLS
alter table rmt_roast_sessions enable row level security;
drop policy if exists "allow_all" on rmt_roast_sessions;
drop policy if exists "users_can_insert_own_roast_sessions" on rmt_roast_sessions;
drop policy if exists "users_can_read_own_roast_sessions" on rmt_roast_sessions;
drop policy if exists "users_can_update_own_roast_sessions" on rmt_roast_sessions;
drop policy if exists "users_can_delete_own_roast_sessions" on rmt_roast_sessions;

create policy "users_can_insert_own_roast_sessions" on rmt_roast_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users_can_read_own_roast_sessions" on rmt_roast_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users_can_update_own_roast_sessions" on rmt_roast_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users_can_delete_own_roast_sessions" on rmt_roast_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
