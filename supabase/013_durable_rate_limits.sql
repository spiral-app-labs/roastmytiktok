ALTER TABLE rmt_roast_sessions
  ADD COLUMN IF NOT EXISTS anonymous_session_id text;

UPDATE rmt_roast_sessions
SET anonymous_session_id = session_id
WHERE anonymous_session_id IS NULL
  AND user_id IS NULL
  AND session_id IS NOT NULL
  AND session_id <> 'anonymous';

CREATE INDEX IF NOT EXISTS idx_rmt_sessions_anonymous_session_id
  ON rmt_roast_sessions(anonymous_session_id);
