create table if not exists rmt_viral_patterns (
  id uuid primary key default gen_random_uuid(),
  hook_type text not null,
  hook_text_example text,
  category text,
  why_it_works text,
  avg_view_multiplier float default 1.0,
  engagement_pattern text,
  best_for_niches text[],
  avoid_when text,
  created_at timestamptz default now()
);
create index if not exists idx_rmt_patterns_hook_type on rmt_viral_patterns(hook_type);
create index if not exists idx_rmt_patterns_category on rmt_viral_patterns(category);
alter table rmt_viral_patterns enable row level security;
drop policy if exists "allow_all" on rmt_viral_patterns;
drop policy if exists "public_can_read_viral_patterns" on rmt_viral_patterns;

create policy "public_can_read_viral_patterns" on rmt_viral_patterns
  for select
  to anon, authenticated
  using (true);
