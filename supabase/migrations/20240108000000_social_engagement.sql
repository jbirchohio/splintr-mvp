-- Social engagement and discovery schema

-- Likes on stories
CREATE TABLE IF NOT EXISTS story_likes (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, user_id)
);

-- Comments with nested replies
CREATE TABLE IF NOT EXISTS story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES story_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_comments_story ON story_comments(story_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_comments_parent ON story_comments(parent_comment_id);

-- Follow system
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT follows_self_check CHECK (follower_id <> following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- Simple notifications (optional usage)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Interaction log for recommendation features
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- like, comment, share, follow, view, complete, replay, time_spent
  value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_interactions_story ON user_interactions(story_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id, type, created_at DESC);

-- Hashtags
CREATE TABLE IF NOT EXISTS hashtags (
  tag TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS story_hashtags (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  tag TEXT NOT NULL REFERENCES hashtags(tag) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (story_id, tag)
);
CREATE INDEX IF NOT EXISTS idx_story_hashtags_tag ON story_hashtags(tag);

-- RLS policies
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_hashtags ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY IF NOT EXISTS "likes_read_published"
ON story_likes FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_likes.story_id AND s.is_published)
);
CREATE POLICY IF NOT EXISTS "likes_insert_self"
ON story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "likes_delete_self"
ON story_likes FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY IF NOT EXISTS "comments_read_published"
ON story_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_comments.story_id AND s.is_published)
);
CREATE POLICY IF NOT EXISTS "comments_insert_self"
ON story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "comments_delete_owner"
ON story_comments FOR DELETE USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY IF NOT EXISTS "follows_read_all" ON user_follows FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "follows_insert_self" ON user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY IF NOT EXISTS "follows_delete_self" ON user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Interactions policies (insert by user; read aggregate by anyone)
CREATE POLICY IF NOT EXISTS "interactions_insert_self"
ON user_interactions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY IF NOT EXISTS "interactions_read"
ON user_interactions FOR SELECT USING (true);

-- Hashtags policies (managed by creators)
CREATE POLICY IF NOT EXISTS "hashtags_read" ON hashtags FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "hashtags_insert" ON hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "story_hashtags_read" ON story_hashtags FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "story_hashtags_insert_creator"
ON story_hashtags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_hashtags.story_id AND s.creator_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS "story_hashtags_delete_creator"
ON story_hashtags FOR DELETE USING (
  EXISTS (SELECT 1 FROM stories s WHERE s.id = story_hashtags.story_id AND s.creator_id = auth.uid())
);

-- Convenience views
CREATE OR REPLACE VIEW story_like_counts AS
SELECT story_id, COUNT(*)::INT AS like_count
FROM story_likes
GROUP BY story_id;

CREATE OR REPLACE VIEW story_comment_counts AS
SELECT story_id, COUNT(*)::INT AS comment_count
FROM story_comments
GROUP BY story_id;

-- Engagement metrics from playthroughs (completion rate and replay count)
CREATE OR REPLACE VIEW story_engagement_metrics AS
SELECT
  s.id AS story_id,
  COUNT(sp.id)::INT AS total_views,
  COALESCE(SUM(CASE WHEN sp.is_completed THEN 1 ELSE 0 END), 0)::INT AS completions,
  COALESCE(
    (SELECT COUNT(*) FROM (
      SELECT viewer_id FROM story_playthroughs p
      WHERE p.story_id = s.id AND p.viewer_id IS NOT NULL
      GROUP BY viewer_id HAVING COUNT(*) > 1
    ) t), 0
  )::INT AS replay_users
FROM stories s
LEFT JOIN story_playthroughs sp ON sp.story_id = s.id
GROUP BY s.id;

