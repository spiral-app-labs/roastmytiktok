ALTER TABLE rmt_roast_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_rmt_sessions_user_id ON rmt_roast_sessions(user_id);
