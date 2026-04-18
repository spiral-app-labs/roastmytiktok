ALTER TABLE rmt_roast_sessions
  ADD COLUMN IF NOT EXISTS analysis_intent text NOT NULL DEFAULT 'pre_post' CHECK (analysis_intent IN ('pre_post', 'post_post')),
  ADD COLUMN IF NOT EXISTS platform text CHECK (platform IN ('tiktok')),
  ADD COLUMN IF NOT EXISTS platform_url text,
  ADD COLUMN IF NOT EXISTS platform_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_roast_id text REFERENCES rmt_roast_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rmt_sessions_analysis_intent ON rmt_roast_sessions(analysis_intent);
CREATE INDEX IF NOT EXISTS idx_rmt_sessions_linked_roast_id ON rmt_roast_sessions(linked_roast_id);
