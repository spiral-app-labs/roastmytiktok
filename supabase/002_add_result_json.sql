-- Add result_json column to store the full RoastResult for fetching
alter table rmt_roast_sessions add column if not exists result_json jsonb;
