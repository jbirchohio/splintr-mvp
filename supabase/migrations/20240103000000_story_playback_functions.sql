-- Create function to increment story view count
CREATE OR REPLACE FUNCTION increment_story_views(story_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE stories 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = story_id;
END;
$$;

-- Create indexes for better performance on story_playthroughs queries
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_story_id ON story_playthroughs(story_id);
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_viewer_id ON story_playthroughs(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_session_id ON story_playthroughs(session_id);
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_created_at ON story_playthroughs(created_at);
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_completed_at ON story_playthroughs(completed_at);

-- Create composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_story_playthroughs_analytics 
ON story_playthroughs(story_id, created_at, is_completed);

-- Add RLS policies for story_playthroughs table
ALTER TABLE story_playthroughs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own playthroughs (or anonymous)
CREATE POLICY "Users can insert playthroughs" ON story_playthroughs
  FOR INSERT WITH CHECK (
    auth.uid() IS NULL OR viewer_id = auth.uid()
  );

-- Policy: Users can view their own playthroughs
CREATE POLICY "Users can view own playthroughs" ON story_playthroughs
  FOR SELECT USING (
    viewer_id = auth.uid()
  );

-- Policy: Story creators can view analytics for their stories
CREATE POLICY "Creators can view story analytics" ON story_playthroughs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = story_playthroughs.story_id 
      AND stories.creator_id = auth.uid()
    )
  );

-- Policy: Public can view aggregated analytics (for published stories)
CREATE POLICY "Public analytics for published stories" ON story_playthroughs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = story_playthroughs.story_id 
      AND stories.is_published = true
    )
  );