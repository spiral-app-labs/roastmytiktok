# Supabase Migrations — Run These

Go to: https://supabase.com/dashboard/project/eayiazyiotnkggnsvhto/sql/new

Run each file in order:

## 001 — Base tables (roast sessions)
Copy and run: `supabase/001_init.sql`

## 002 — Add result_json column
Copy and run: `supabase/002_add_result_json.sql`

## 003 — Trending content table
Copy and run: `supabase/003_trending_content.sql`

All three are idempotent (use `CREATE IF NOT EXISTS`) — safe to re-run.
