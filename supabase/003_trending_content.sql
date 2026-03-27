create table if not exists tmt_trending_content (
  id uuid primary key default gen_random_uuid(),
  fetched_at timestamptz default now(),
  category text,
  description text,
  view_count bigint,
  like_count bigint,
  audio_title text,
  hashtags text[],
  hook_text text,
  duration_sec integer,
  video_url text,
  author_username text,
  raw_data jsonb
);
create index if not exists idx_tmt_trending_fetched_at on tmt_trending_content(fetched_at desc);
alter table tmt_trending_content enable row level security;
create policy "allow_all" on tmt_trending_content for all using (true) with check (true);
