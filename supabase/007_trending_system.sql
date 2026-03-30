-- Trending content tracked by cron jobs
create table if not exists rmt_trending_content (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('sound', 'format', 'hashtag', 'challenge')),
  name text not null,
  description text,
  velocity integer default 0,
  category text,
  source_url text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  status text not null default 'emerging' check (status in ('emerging', 'peak', 'declining', 'dead')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_rmt_trending_type on rmt_trending_content(type);
create index if not exists idx_rmt_trending_status on rmt_trending_content(status);
create index if not exists idx_rmt_trending_last_seen on rmt_trending_content(last_seen_at desc);
alter table rmt_trending_content enable row level security;
create policy "allow_all" on rmt_trending_content for all using (true) with check (true);

-- Snapshots for tracking rank/engagement over time
create table if not exists rmt_trending_snapshots (
  id uuid primary key default gen_random_uuid(),
  trending_content_id uuid not null references rmt_trending_content(id) on delete cascade,
  snapshot_at timestamptz default now(),
  rank integer,
  usage_count integer,
  engagement_data jsonb default '{}'::jsonb
);

create index if not exists idx_rmt_snapshots_content on rmt_trending_snapshots(trending_content_id);
create index if not exists idx_rmt_snapshots_at on rmt_trending_snapshots(snapshot_at desc);
alter table rmt_trending_snapshots enable row level security;
create policy "allow_all" on rmt_trending_snapshots for all using (true) with check (true);

-- Curated viral tips (seeded by script, updated by cron)
create table if not exists rmt_viral_tips (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hook', 'format', 'audio', 'cta', 'timing', 'general')),
  tip_text text not null,
  source text not null default 'manual' check (source in ('research', 'trend_analysis', 'manual')),
  relevance_score integer default 50 check (relevance_score between 1 and 100),
  active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_rmt_tips_category on rmt_viral_tips(category);
create index if not exists idx_rmt_tips_active on rmt_viral_tips(active) where active = true;
alter table rmt_viral_tips enable row level security;
create policy "allow_all" on rmt_viral_tips for all using (true) with check (true);
