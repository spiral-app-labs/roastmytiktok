# Supabase Migrations — Run These

Go to: https://supabase.com/dashboard/project/eayiazyiotnkggnsvhto/sql/new

Run each file in order:

## 001 — Base tables (roast sessions)
Copy and run: `supabase/001_init.sql`

## 002 — Add result_json column
Copy and run: `supabase/002_add_result_json.sql`

## 003 — Trending content table
Copy and run: `supabase/003_trending_content.sql`

## 004 — Waitlist
Copy and run: `supabase/004_waitlist.sql`

## 005 — Viral patterns
Copy and run: `supabase/005_viral_patterns.sql`

## 007 — Trending system tables
Copy and run: `supabase/007_trending_system.sql`

## 008 — Niche intelligence tables
Copy and run: `supabase/008_niche_intelligence.sql`

## 009 — Roast session account ownership
Copy and run: `supabase/009_account_settings.sql`

## 010 — Usage metering columns
Copy and run: `supabase/010_usage_metering.sql`

## 011 — Usage subject index
Copy and run: `supabase/011_usage_subjects.sql`

## 012 — RLS lockdown
Copy and run: `supabase/012_lock_down_rls.sql`

The migrations are intended to be idempotent and safe to re-run.
