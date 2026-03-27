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

-- Enable RLS (allow all for MVP — anon key is read/write)
alter table rmt_roast_sessions enable row level security;
create policy "allow_all" on rmt_roast_sessions for all using (true) with check (true);
