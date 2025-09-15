-- Recommendation features, experiments, and exposure logging

-- Experiments table (for metadata only; optional use)
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feed exposures (who saw what at which rank and variant)
CREATE TABLE IF NOT EXISTS feed_exposures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  variant TEXT,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_exposures_user ON feed_exposures(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_exposures_session ON feed_exposures(session_id, created_at DESC);

ALTER TABLE feed_exposures ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "exposures_read_own" ON feed_exposures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "exposures_insert_self" ON feed_exposures FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Creator authority metrics (followers and average completion)
CREATE OR REPLACE VIEW creator_authority AS
SELECT
  u.id AS creator_id,
  COALESCE(f.follower_count, 0)::INT AS follower_count,
  COALESCE(a.avg_completion_rate, 0)::FLOAT AS avg_completion_rate
FROM users u
LEFT JOIN (
  SELECT following_id, COUNT(*)::INT AS follower_count
  FROM user_follows
  GROUP BY following_id
) f ON f.following_id = u.id
LEFT JOIN (
  SELECT s.creator_id, AVG(CASE WHEN sp.is_completed THEN 1 ELSE 0 END)::FLOAT AS avg_completion_rate
  FROM stories s
  LEFT JOIN story_playthroughs sp ON sp.story_id = s.id
  GROUP BY s.creator_id
) a ON a.creator_id = u.id;

-- Story interaction velocity over recent windows
CREATE OR REPLACE VIEW story_velocity AS
WITH recent AS (
  SELECT story_id, type, created_at FROM user_interactions WHERE created_at > (NOW() - INTERVAL '48 hours')
)
SELECT
  s.id AS story_id,
  COALESCE(SUM(CASE WHEN r.type = 'view' THEN 1 ELSE 0 END),0)::INT AS views_48h,
  COALESCE(SUM(CASE WHEN r.type = 'like' THEN 1 ELSE 0 END),0)::INT AS likes_48h,
  COALESCE(SUM(CASE WHEN r.type = 'comment' THEN 1 ELSE 0 END),0)::INT AS comments_48h,
  COALESCE(SUM(CASE WHEN r.type = 'share' THEN 1 ELSE 0 END),0)::INT AS shares_48h,
  COALESCE(SUM(CASE WHEN r.type = 'complete' THEN 1 ELSE 0 END),0)::INT AS completes_48h,
  COALESCE(SUM(CASE WHEN r.type = 'time_spent' THEN 1 ELSE 0 END),0)::INT AS dwell_events_48h
FROM stories s
LEFT JOIN recent r ON r.story_id = s.id
GROUP BY s.id;

