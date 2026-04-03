-- Migration: 009_viral_hook_examples
-- Creates rmt_viral_hook_examples table for storing curated viral hook examples
-- with real creator data, view counts, and adaptable templates.
-- These power hook suggestions shown during roast/script generation.

create table if not exists public.rmt_viral_hook_examples (
  id          uuid primary key default gen_random_uuid(),
  hook_text   text    not null,                      -- the exact hook as used
  hook_type   text    not null,                      -- matches hook_type in rmt_viral_patterns
  niche       text    not null,                      -- content category
  creator_handle text not null,                      -- @handle of original creator
  approx_views  bigint not null default 0,           -- peak views at time of study
  why_it_worked text   not null,                     -- analysis of why it drove retention
  adaptable_template text not null,                  -- fill-in-the-blank version for any creator
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for lookup by hook_type (used in generate-script context injection)
create index if not exists idx_rmt_viral_hook_examples_hook_type
  on public.rmt_viral_hook_examples(hook_type);

-- Index for lookup by niche
create index if not exists idx_rmt_viral_hook_examples_niche
  on public.rmt_viral_hook_examples(niche);

-- Index for sorting by view count (surfaces highest-performing examples first)
create index if not exists idx_rmt_viral_hook_examples_views
  on public.rmt_viral_hook_examples(approx_views desc);

-- Auto-update updated_at
create or replace function update_viral_hook_examples_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_viral_hook_examples_updated_at on public.rmt_viral_hook_examples;
create trigger trg_viral_hook_examples_updated_at
  before update on public.rmt_viral_hook_examples
  for each row execute function update_viral_hook_examples_updated_at();

-- RLS: public read, service-role write
alter table public.rmt_viral_hook_examples enable row level security;

create policy "anon_read_hook_examples"
  on public.rmt_viral_hook_examples for select
  using (true);
