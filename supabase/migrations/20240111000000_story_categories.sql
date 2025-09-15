-- Add simple category to stories for filtering
ALTER TABLE stories ADD COLUMN IF NOT EXISTS category TEXT;
CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category) WHERE is_published = TRUE;

