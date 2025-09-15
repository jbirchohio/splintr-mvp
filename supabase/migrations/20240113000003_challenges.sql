-- Challenges and story mappings
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  hashtag TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active);

CREATE TABLE IF NOT EXISTS story_challenges (
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, story_id)
);
CREATE INDEX IF NOT EXISTS idx_story_challenges_challenge ON story_challenges(challenge_id, created_at DESC);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_challenges ENABLE ROW LEVEL SECURITY;

-- Allow public read of challenges
CREATE POLICY IF NOT EXISTS "challenges_read" ON challenges FOR SELECT USING (true);
-- Allow admin insert/update via service role (no strict policy here; use API gate)
CREATE POLICY IF NOT EXISTS "story_challenges_read" ON story_challenges FOR SELECT USING (true);
-- Join allowed by owner of story
CREATE POLICY IF NOT EXISTS "story_challenges_insert_owner" ON story_challenges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_challenges.story_id AND s.creator_id = auth.uid())
);

