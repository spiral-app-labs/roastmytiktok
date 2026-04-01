-- Niche Intelligence tables for Script Studio
-- Migration 008: niche_profiles, creator_content, niche_patterns

CREATE TABLE niche_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  niche_category TEXT NOT NULL,
  inspiration_creators TEXT[] DEFAULT '{}',
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE creator_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_handle TEXT NOT NULL,
  video_id TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  shares BIGINT,
  saves BIGINT,
  posted_at TIMESTAMPTZ,
  duration INTEGER,
  audio_name TEXT,
  scraped_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE niche_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche_profile_id UUID REFERENCES niche_profiles(id),
  pattern_type TEXT NOT NULL,
  pattern_data JSONB DEFAULT '{}',
  confidence_score FLOAT,
  sample_video_ids TEXT[] DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_niche_profiles_user_id ON niche_profiles(user_id);
CREATE INDEX idx_creator_content_handle ON creator_content(creator_handle);
CREATE INDEX idx_niche_patterns_profile_id ON niche_patterns(niche_profile_id);

-- RLS policies (permissive for now, tighten later)
ALTER TABLE niche_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_niche_profiles" ON niche_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_creator_content" ON creator_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_niche_patterns" ON niche_patterns FOR ALL USING (true) WITH CHECK (true);
