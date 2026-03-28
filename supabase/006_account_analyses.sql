CREATE TABLE IF NOT EXISTS rmt_account_analyses (
  id uuid primary key default gen_random_uuid(),
  handle text not null,
  created_at timestamptz default now(),
  video_count integer,
  result_json jsonb
);

CREATE INDEX IF NOT EXISTS idx_rmt_account_handle ON rmt_account_analyses(handle);
