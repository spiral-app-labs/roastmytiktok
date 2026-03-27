-- Waitlist for RoastMyTikTok launch
CREATE TABLE IF NOT EXISTS rmt_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now(),
  position integer,
  free_pro boolean default false
);

-- Auto-assign position on insert
CREATE OR REPLACE FUNCTION set_waitlist_position()
RETURNS trigger AS $$
BEGIN
  NEW.position := coalesce(
    (SELECT max(position) FROM rmt_waitlist), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_waitlist_position ON rmt_waitlist;
CREATE TRIGGER trg_waitlist_position
  BEFORE INSERT ON rmt_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION set_waitlist_position();

-- RLS
ALTER TABLE rmt_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_waitlist" ON rmt_waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_select_waitlist" ON rmt_waitlist
  FOR SELECT USING (true);
