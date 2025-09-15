-- Story responses (duet/collab/remix)
CREATE TABLE IF NOT EXISTS story_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  response_story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'duet', -- duet | remix | stitch
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(original_story_id, response_story_id)
);
CREATE INDEX IF NOT EXISTS idx_story_responses_original ON story_responses(original_story_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_responses_response ON story_responses(response_story_id);

ALTER TABLE story_responses ENABLE ROW LEVEL SECURITY;
-- Allow anyone to read response mappings
CREATE POLICY IF NOT EXISTS "story_responses_read" ON story_responses FOR SELECT USING (true);
-- Only allow the creator of the response story to create/delete the mapping
CREATE POLICY IF NOT EXISTS "story_responses_insert_owner" ON story_responses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM stories s WHERE s.id = story_responses.response_story_id AND s.creator_id = auth.uid()
  )
);
CREATE POLICY IF NOT EXISTS "story_responses_delete_owner" ON story_responses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM stories s WHERE s.id = story_responses.response_story_id AND s.creator_id = auth.uid()
  )
);

