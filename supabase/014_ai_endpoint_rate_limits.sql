CREATE TABLE IF NOT EXISTS rmt_ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmt_ai_usage_events_subject
  ON rmt_ai_usage_events(user_id, endpoint, created_at DESC);

ALTER TABLE rmt_ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_ai_usage_events" ON rmt_ai_usage_events;
CREATE POLICY "service_role_only_ai_usage_events"
  ON rmt_ai_usage_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION consume_rmt_ai_rate_limit_slot(
  p_user_id UUID,
  p_endpoint TEXT,
  p_plan TEXT,
  p_window_seconds INTEGER,
  p_max_events INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  event_id UUID,
  remaining INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_event_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_endpoint, 0));

  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest
  FROM rmt_ai_usage_events
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at >= now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_max_events THEN
    RETURN QUERY
    SELECT
      FALSE,
      NULL::UUID,
      0,
      GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM ((v_oldest + make_interval(secs => p_window_seconds)) - now())))::INTEGER
      );
    RETURN;
  END IF;

  INSERT INTO rmt_ai_usage_events (user_id, endpoint, plan)
  VALUES (p_user_id, p_endpoint, p_plan)
  RETURNING id INTO v_event_id;

  RETURN QUERY
  SELECT
    TRUE,
    v_event_id,
    GREATEST(p_max_events - v_count - 1, 0),
    NULL::INTEGER;
END;
$$;

REVOKE ALL ON FUNCTION consume_rmt_ai_rate_limit_slot(UUID, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_rmt_ai_rate_limit_slot(UUID, TEXT, TEXT, INTEGER, INTEGER) TO service_role;
