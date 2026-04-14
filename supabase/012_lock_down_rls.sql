-- Migration 012: lock down permissive RLS policies on roast, waitlist, trending, and niche tables

ALTER TABLE rmt_roast_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON rmt_roast_sessions;
DROP POLICY IF EXISTS "users_can_insert_own_roast_sessions" ON rmt_roast_sessions;
DROP POLICY IF EXISTS "users_can_read_own_roast_sessions" ON rmt_roast_sessions;
DROP POLICY IF EXISTS "users_can_update_own_roast_sessions" ON rmt_roast_sessions;
DROP POLICY IF EXISTS "users_can_delete_own_roast_sessions" ON rmt_roast_sessions;

CREATE POLICY "users_can_insert_own_roast_sessions" ON rmt_roast_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_can_read_own_roast_sessions" ON rmt_roast_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users_can_update_own_roast_sessions" ON rmt_roast_sessions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_can_delete_own_roast_sessions" ON rmt_roast_sessions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

ALTER TABLE rmt_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_insert_waitlist" ON rmt_waitlist;
DROP POLICY IF EXISTS "allow_select_waitlist" ON rmt_waitlist;
DROP POLICY IF EXISTS "public_can_join_waitlist" ON rmt_waitlist;

CREATE POLICY "public_can_join_waitlist" ON rmt_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 3
    AND coalesce(free_pro, false) = false
  );

ALTER TABLE tmt_trending_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON tmt_trending_content;

ALTER TABLE rmt_viral_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON rmt_viral_patterns;
DROP POLICY IF EXISTS "public_can_read_viral_patterns" ON rmt_viral_patterns;

CREATE POLICY "public_can_read_viral_patterns" ON rmt_viral_patterns
  FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE rmt_trending_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE rmt_trending_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rmt_viral_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON rmt_trending_content;
DROP POLICY IF EXISTS "allow_all" ON rmt_trending_snapshots;
DROP POLICY IF EXISTS "allow_all" ON rmt_viral_tips;
DROP POLICY IF EXISTS "public_can_read_trending_content" ON rmt_trending_content;
DROP POLICY IF EXISTS "public_can_read_active_viral_tips" ON rmt_viral_tips;

CREATE POLICY "public_can_read_trending_content" ON rmt_trending_content
  FOR SELECT
  TO anon, authenticated
  USING (status <> 'dead');

CREATE POLICY "public_can_read_active_viral_tips" ON rmt_viral_tips
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

ALTER TABLE creator_content
  ADD COLUMN IF NOT EXISTS niche_profile_id UUID REFERENCES niche_profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_creator_content_profile_id ON creator_content(niche_profile_id);

ALTER TABLE niche_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_niche_profiles" ON niche_profiles;
DROP POLICY IF EXISTS "allow_all_creator_content" ON creator_content;
DROP POLICY IF EXISTS "allow_all_niche_patterns" ON niche_patterns;
DROP POLICY IF EXISTS "users_can_insert_own_niche_profiles" ON niche_profiles;
DROP POLICY IF EXISTS "users_can_read_own_niche_profiles" ON niche_profiles;
DROP POLICY IF EXISTS "users_can_update_own_niche_profiles" ON niche_profiles;
DROP POLICY IF EXISTS "users_can_delete_own_niche_profiles" ON niche_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_creator_content" ON creator_content;
DROP POLICY IF EXISTS "users_can_read_own_creator_content" ON creator_content;
DROP POLICY IF EXISTS "users_can_update_own_creator_content" ON creator_content;
DROP POLICY IF EXISTS "users_can_delete_own_creator_content" ON creator_content;
DROP POLICY IF EXISTS "users_can_insert_own_niche_patterns" ON niche_patterns;
DROP POLICY IF EXISTS "users_can_read_own_niche_patterns" ON niche_patterns;
DROP POLICY IF EXISTS "users_can_update_own_niche_patterns" ON niche_patterns;
DROP POLICY IF EXISTS "users_can_delete_own_niche_patterns" ON niche_patterns;

CREATE POLICY "users_can_insert_own_niche_profiles" ON niche_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_can_read_own_niche_profiles" ON niche_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users_can_update_own_niche_profiles" ON niche_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_can_delete_own_niche_profiles" ON niche_profiles
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "users_can_insert_own_creator_content" ON creator_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = creator_content.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_read_own_creator_content" ON creator_content
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = creator_content.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_update_own_creator_content" ON creator_content
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = creator_content.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = creator_content.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_delete_own_creator_content" ON creator_content
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = creator_content.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_insert_own_niche_patterns" ON niche_patterns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = niche_patterns.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_read_own_niche_patterns" ON niche_patterns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = niche_patterns.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_update_own_niche_patterns" ON niche_patterns
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = niche_patterns.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = niche_patterns.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );

CREATE POLICY "users_can_delete_own_niche_patterns" ON niche_patterns
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM niche_profiles
      WHERE niche_profiles.id = niche_patterns.niche_profile_id
        AND niche_profiles.user_id = (select auth.uid())
    )
  );
