ALTER TABLE public.rmt_waitlist
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_source text NOT NULL DEFAULT 'waitlist_form',
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS consent_ip text;

CREATE TABLE IF NOT EXISTS public.rmt_email_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  event text NOT NULL CHECK (event IN ('grant', 'revoke')),
  marketing_consent boolean NOT NULL,
  consent_source text NOT NULL,
  consent_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmt_email_consent_log_email ON public.rmt_email_consent_log (email);
CREATE INDEX IF NOT EXISTS idx_rmt_email_consent_log_created_at ON public.rmt_email_consent_log (created_at DESC);

ALTER TABLE public.rmt_email_consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_insert_rmt_email_consent_log" ON public.rmt_email_consent_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_select_rmt_email_consent_log" ON public.rmt_email_consent_log FOR SELECT TO service_role USING (true);

CREATE TABLE IF NOT EXISTS public.rmt_cookie_consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_choice text NOT NULL CHECK (consent_choice IN ('acknowledged')),
  analytics_storage boolean NOT NULL DEFAULT false,
  consent_source text NOT NULL DEFAULT 'cookie_banner',
  consent_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rmt_cookie_consent_events_created_at ON public.rmt_cookie_consent_events (created_at DESC);

ALTER TABLE public.rmt_cookie_consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_insert_rmt_cookie_consent_events" ON public.rmt_cookie_consent_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_select_rmt_cookie_consent_events" ON public.rmt_cookie_consent_events FOR SELECT TO service_role USING (true);
