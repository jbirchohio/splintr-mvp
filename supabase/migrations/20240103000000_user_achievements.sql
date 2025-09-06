-- Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique achievements per user per story
  UNIQUE(user_id, story_id, achievement_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_story_id ON user_achievements(story_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Add RLS policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can only see their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own achievements (for system tracking)
CREATE POLICY "Users can insert own achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add function to increment story view count (if not exists)
CREATE OR REPLACE FUNCTION increment_story_views(story_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stories 
  SET view_count = COALESCE(view_count, 0) + 1,
      updated_at = NOW()
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_story_views(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_achievements IS 'Tracks user achievements for story completion and exploration';
COMMENT ON COLUMN user_achievements.achievement_type IS 'Type of achievement: first_completion, all_paths, speed_run, explorer, completionist';
COMMENT ON FUNCTION increment_story_views(UUID) IS 'Safely increments the view count for a story';