-- Create user_achievements table for tracking user progress
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique achievements per user per story
  UNIQUE(user_id, story_id, achievement_type)
);

-- Create indexes for performance
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_story_id ON user_achievements(story_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);

-- Add total_duration column to story_playthroughs for speed tracking
ALTER TABLE story_playthroughs 
ADD COLUMN total_duration INTEGER, -- Duration in milliseconds
ADD COLUMN is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN choices_made JSONB; -- Store choice analytics data

-- Update existing completed playthroughs
UPDATE story_playthroughs 
SET is_completed = TRUE 
WHERE completed_at IS NOT NULL;

-- Grant permissions
GRANT ALL ON user_achievements TO authenticated;
GRANT USAGE ON SEQUENCE user_achievements_id_seq TO authenticated;