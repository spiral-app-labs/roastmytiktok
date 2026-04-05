ALTER TABLE rmt_roast_sessions
  ADD COLUMN IF NOT EXISTS client_ip text,
  ADD COLUMN IF NOT EXISTS analysis_status text NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS processed_seconds numeric(10,2),
  ADD COLUMN IF NOT EXISTS processed_minutes numeric(10,2),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_json jsonb;

CREATE INDEX IF NOT EXISTS idx_rmt_sessions_status_created_at ON rmt_roast_sessions(analysis_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rmt_sessions_client_ip ON rmt_roast_sessions(client_ip);
